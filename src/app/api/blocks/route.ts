import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// GET /api/blocks — list all blocks
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const blocks = await db.block.findMany({
      include: {
        rooms: {
          select: {
            id: true,
            capacity: true,
            status: true,
            _count: { select: { allocations: { where: { isActive: true } } } },
          },
        },
        _count: { select: { userAssignments: true } },
      },
      orderBy: { blockCode: 'asc' },
    })

    const enriched = blocks.map(b => {
      const totalCapacity = b.rooms.reduce((s, r) => s + r.capacity, 0)
      const totalOccupied = b.rooms.reduce((s, r) => s + r._count.allocations, 0)
      return {
        id: b.id,
        blockCode: b.blockCode,
        blockName: b.blockName,
        totalFloors: b.totalFloors,
        genderType: b.genderType,
        createdAt: b.createdAt,
        roomCount: b.rooms.length,
        totalCapacity,
        totalOccupied,
        totalVacant: totalCapacity - totalOccupied,
        wardenCount: b._count.userAssignments,
      }
    })

    return NextResponse.json({ blocks: enriched })
  } catch (e) {
    console.error('GET blocks error:', e)
    return NextResponse.json({ error: 'Failed to load blocks' }, { status: 500 })
  }
}

// POST /api/blocks — create new block (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Block', 'admin')) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const rl = rateLimit(`api:${getClientIp(req)}`, 30, 60_000)
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await req.json()
    const blockCode = sanitizeString(body?.blockCode || '', 10).toUpperCase()
    const blockName = sanitizeString(body?.blockName || '', 100)
    const totalFloors = parseInt(body?.totalFloors, 10)
    const genderType = body?.genderType

    if (!blockCode || !blockName || !totalFloors || !['Male', 'Female', 'Mixed'].includes(genderType)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }
    if (totalFloors < 1 || totalFloors > 50) {
      return NextResponse.json({ error: 'Total floors must be between 1 and 50' }, { status: 400 })
    }

    const existing = await db.block.findUnique({ where: { blockCode } })
    if (existing) {
      return NextResponse.json({ error: `Block code ${blockCode} already exists` }, { status: 409 })
    }

    const block = await db.block.create({
      data: { blockCode, blockName, totalFloors, genderType },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      entity: 'Block',
      entityId: block.id,
      details: `Created block ${blockCode} - ${blockName}`,
      severity: 'info',
    })

    return NextResponse.json({ block })
  } catch (e) {
    console.error('POST block error:', e)
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
  }
}
