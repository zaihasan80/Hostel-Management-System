import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const student = await db.student.findUnique({
    where: { id },
    include: {
      allocations: {
        include: { room: { include: { block: true } } },
        orderBy: { checkInDate: 'desc' },
      },
    },
  })

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  return NextResponse.json({ student })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Student', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const fullName = sanitizeString(body?.fullName || '', 150)
    const icMatricNo = sanitizeString(body?.icMatricNo || '', 30).toUpperCase()
    const programme = sanitizeString(body?.programme || '', 100)
    const gender = body?.gender
    const phoneNo = sanitizeString(body?.phoneNo || '', 20)
    const email = body?.email ? sanitizeString(body?.email, 254).toLowerCase() : null
    const status = body?.status || 'Active'

    const existing = await db.student.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const conflict = await db.student.findUnique({ where: { icMatricNo } })
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: 'Matric/IC no. already in use' }, { status: 409 })
    }

    const student = await db.student.update({
      where: { id },
      data: { fullName, icMatricNo, programme, gender, phoneNo, email, status },
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Student',
      entityId: id,
      details: `Updated student ${fullName} (${icMatricNo})`,
      severity: 'info',
    })

    return NextResponse.json({ student })
  } catch (e) {
    console.error('PUT student error:', e)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Student', 'admin')) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const { id } = await params
    const existing = await db.student.findUnique({
      where: { id },
      include: { allocations: { where: { isActive: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    if (existing.allocations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete — student has an active room allocation. Check them out first.' },
        { status: 409 }
      )
    }

    await db.student.delete({ where: { id } })

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'Student',
      entityId: id,
      details: `Deleted student ${existing.fullName} (${existing.icMatricNo})`,
      severity: 'critical',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE student error:', e)
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}
