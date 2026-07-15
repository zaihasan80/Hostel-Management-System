import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// POST /api/room-furniture — add furniture to a room
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'RoomFurniture', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const roomId = sanitizeString(body?.roomId || '', 64)
    const itemId = sanitizeString(body?.itemId || '', 64)
    const quantity = parseInt(body?.quantity, 10) || 1
    const condition = body?.condition || 'Good'
    const posX = body?.posX !== undefined ? parseFloat(body.posX) : null
    const posY = body?.posY !== undefined ? parseFloat(body.posY) : null
    const lastCheckedDate = body?.lastCheckedDate ? new Date(body.lastCheckedDate) : null

    if (!roomId || !itemId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (!['Good', 'Fair', 'Damaged', 'Missing'].includes(condition)) {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 })
    }
    if (quantity < 1 || quantity > 100) {
      return NextResponse.json({ error: 'Quantity must be 1-100' }, { status: 400 })
    }

    const item = await db.roomFurniture.create({
      data: { roomId, itemId, quantity, condition, posX, posY, lastCheckedDate },
      include: { item: true },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      entity: 'RoomFurniture',
      entityId: item.id,
      details: `Added ${quantity}x ${item.item.itemName} (${condition}) to room`,
      severity: 'info',
    })

    return NextResponse.json({ item })
  } catch (e) {
    console.error('POST room-furniture error:', e)
    return NextResponse.json({ error: 'Failed to add furniture' }, { status: 500 })
  }
}
