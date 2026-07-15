import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, getUserAssignedBlockIds } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// POST /api/allocations/[id]/checkout — check student out (transfer / vacate)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Allocation', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const checkOutDate = body?.checkOutDate ? new Date(body.checkOutDate) : new Date()

    const allocation = await db.roomAllocation.findUnique({
      where: { id },
      include: { room: { include: { block: true, allocations: { where: { isActive: true } } } }, student: true },
    })

    if (!allocation) return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
    if (!allocation.isActive) {
      return NextResponse.json({ error: 'Allocation is already checked out' }, { status: 400 })
    }

    if (user.role === 'Warden') {
      const assigned = await getUserAssignedBlockIds(user.id)
      if (!assigned.includes(allocation.room.blockId)) {
        return NextResponse.json({ error: 'Forbidden — not your block' }, { status: 403 })
      }
    }

    await db.roomAllocation.update({
      where: { id },
      data: { isActive: false, checkOutDate },
    })

    // Update room status — if no more active allocations, mark Available
    const remaining = allocation.room.allocations.filter(a => a.id !== id).length
    if (remaining === 0) {
      await db.room.update({
        where: { id: allocation.roomId },
        data: { status: 'Available' },
      })
    } else if (allocation.room.status === 'Full') {
      await db.room.update({
        where: { id: allocation.roomId },
        data: { status: 'Occupied' },
      })
    }

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Allocation',
      entityId: id,
      details: `Checked out ${allocation.student.fullName} from ${allocation.room.roomNumber} ${allocation.bedNo}`,
      severity: 'info',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Checkout error:', e)
    return NextResponse.json({ error: 'Failed to check out' }, { status: 500 })
  }
}
