import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString, getUserAssignedBlockIds } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/rooms?blockId=...&status=...&search=...
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const blockId = url.searchParams.get('blockId') || undefined
    const status = url.searchParams.get('status') || undefined
    const search = url.searchParams.get('search')?.toLowerCase() || undefined
    const floor = url.searchParams.get('floor')
    const roomType = url.searchParams.get('roomType') || undefined

    // RLS-equivalent: Wardens only see their assigned blocks
    let where: any = {}
    if (user.role === 'Warden') {
      const assignedBlockIds = await getUserAssignedBlockIds(user.id)
      where.blockId = { in: assignedBlockIds }
      if (blockId && !assignedBlockIds.includes(blockId)) {
        return NextResponse.json({ rooms: [], summary: { total: 0, capacity: 0, occupied: 0, vacant: 0 } })
      }
    } else if (blockId) {
      where.blockId = blockId
    }

    if (status) where.status = status
    if (roomType) where.roomType = roomType
    if (floor) where.floorNumber = parseInt(floor, 10)
    if (search) where.roomNumber = { contains: search }

    const rooms = await db.room.findMany({
      where,
      include: {
        block: true,
        allocations: {
          where: { isActive: true },
          include: { student: { select: { id: true, fullName: true, icMatricNo: true } } },
        },
        furniture: { include: { item: true } },
      },
      orderBy: [{ block: { blockCode: 'asc' } }, { roomNumber: 'asc' }],
    })

    const enriched = rooms.map(r => ({
      id: r.id,
      roomNumber: r.roomNumber,
      floorNumber: r.floorNumber,
      roomType: r.roomType,
      capacity: r.capacity,
      status: r.status,
      lastInspectionDate: r.lastInspectionDate,
      notes: r.notes,
      block: r.block,
      currentOccupancy: r.allocations.length,
      vacantBeds: r.capacity - r.allocations.length,
      hasMaintenanceIssue: r.furniture.some(f => f.condition === 'Damaged' || f.condition === 'Missing'),
      tenants: r.allocations.map(a => ({
        id: a.student.id,
        name: a.student.fullName,
        matric: a.student.icMatricNo,
        bedNo: a.bedNo,
        checkInDate: a.checkInDate,
      })),
    }))

    // Summary strip
    const total = enriched.length
    const capacity = enriched.reduce((s, r) => s + r.capacity, 0)
    const occupied = enriched.reduce((s, r) => s + r.currentOccupancy, 0)
    const vacant = capacity - occupied

    return NextResponse.json({
      rooms: enriched,
      summary: { total, capacity, occupied, vacant },
    })
  } catch (e) {
    console.error('GET rooms error:', e)
    return NextResponse.json({ error: 'Failed to load rooms' }, { status: 500 })
  }
}

// POST /api/rooms — create new room (Admin or Warden for assigned block)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Room', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const blockId = sanitizeString(body?.blockId || '', 64)
    const roomNumber = sanitizeString(body?.roomNumber || '', 10).toUpperCase()
    const floorNumber = parseInt(body?.floorNumber, 10)
    const roomType = body?.roomType
    const capacity = parseInt(body?.capacity, 10)
    const status = body?.status || 'Available'
    const lastInspectionDate = body?.lastInspectionDate || null
    const notes = sanitizeString(body?.notes || '', 500)

    if (!blockId || !roomNumber || !floorNumber || !roomType || !capacity) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }
    if (!['Single', 'Double', 'Dormitory'].includes(roomType)) {
      return NextResponse.json({ error: 'Invalid room type' }, { status: 400 })
    }
    if (!['Available', 'Occupied', 'Full', 'Maintenance'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (capacity < 1 || capacity > 20) {
      return NextResponse.json({ error: 'Capacity must be between 1 and 20' }, { status: 400 })
    }

    // Warden can only create rooms in their assigned block
    if (user.role === 'Warden') {
      const assigned = await getUserAssignedBlockIds(user.id)
      if (!assigned.includes(blockId)) {
        return NextResponse.json({ error: 'You can only manage rooms in your assigned block' }, { status: 403 })
      }
    }

    // Check for unique (block_id, room_number)
    const existing = await db.room.findFirst({
      where: { blockId, roomNumber },
    })
    if (existing) {
      return NextResponse.json({ error: `Room ${roomNumber} already exists in this block` }, { status: 409 })
    }

    const block = await db.block.findUnique({ where: { id: blockId } })
    if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

    if (floorNumber > block.totalFloors) {
      return NextResponse.json(
        { error: `Floor ${floorNumber} exceeds block total floors (${block.totalFloors})` },
        { status: 400 }
      )
    }

    const room = await db.room.create({
      data: {
        blockId,
        roomNumber,
        floorNumber,
        roomType,
        capacity,
        status,
        lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : null,
        notes: notes || null,
      },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      entity: 'Room',
      entityId: room.id,
      details: `Created room ${roomNumber} in block ${block.blockCode}`,
      severity: 'info',
    })

    return NextResponse.json({ room })
  } catch (e) {
    console.error('POST room error:', e)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
