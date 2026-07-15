import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'RoomFurniture', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const quantity = parseInt(body?.quantity, 10) || 1
    const condition = body?.condition || 'Good'
    const posX = body?.posX !== undefined ? parseFloat(body.posX) : null
    const posY = body?.posY !== undefined ? parseFloat(body.posY) : null
    const lastCheckedDate = body?.lastCheckedDate ? new Date(body.lastCheckedDate) : null

    if (!['Good', 'Fair', 'Damaged', 'Missing'].includes(condition)) {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 })
    }

    const item = await db.roomFurniture.update({
      where: { id },
      data: { quantity, condition, posX, posY, lastCheckedDate },
      include: { item: true },
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'RoomFurniture',
      entityId: id,
      details: `Updated room furniture: ${item.item.itemName} → ${quantity}x ${condition}`,
      severity: 'info',
    })

    return NextResponse.json({ item })
  } catch (e) {
    console.error('PUT room-furniture error:', e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'RoomFurniture', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await db.roomFurniture.findUnique({
      where: { id },
      include: { item: true },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.roomFurniture.delete({ where: { id } })

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'RoomFurniture',
      entityId: id,
      details: `Removed ${existing.item.itemName} from room`,
      severity: 'warning',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE room-furniture error:', e)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
