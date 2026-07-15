import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Block', 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const blockCode = sanitizeString(body?.blockCode || '', 10).toUpperCase()
    const blockName = sanitizeString(body?.blockName || '', 100)
    const totalFloors = parseInt(body?.totalFloors, 10)
    const genderType = body?.genderType

    if (!blockCode || !blockName || !totalFloors || !['Male', 'Female', 'Mixed'].includes(genderType)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    const existing = await db.block.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

    // Check for unique block code (excluding current)
    const conflict = await db.block.findUnique({ where: { blockCode } })
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: 'Block code already in use' }, { status: 409 })
    }

    const block = await db.block.update({
      where: { id },
      data: { blockCode, blockName, totalFloors, genderType },
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Block',
      entityId: id,
      details: `Updated block ${blockCode}`,
      severity: 'info',
    })

    return NextResponse.json({ block })
  } catch (e) {
    console.error('PUT block error:', e)
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Block', 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await db.block.findUnique({ where: { id }, include: { rooms: true } })
    if (!existing) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

    if (existing.rooms.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete block — it still has ${existing.rooms.length} room(s). Delete or move rooms first.` },
        { status: 409 }
      )
    }

    await db.block.delete({ where: { id } })

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'Block',
      entityId: id,
      details: `Deleted block ${existing.blockCode} - ${existing.blockName}`,
      severity: 'critical',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE block error:', e)
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
  }
}
