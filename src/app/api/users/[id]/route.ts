import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, hashPassword, sanitizeString, validatePasswordStrength } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (currentUser.role !== 'Admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const fullName = sanitizeString(body?.fullName || '', 150)
    const role = body?.role
    const phone = sanitizeString(body?.phone || '', 20)
    const status = body?.status || 'Active'
    const password = body?.password || null
    const blockIds: string[] = Array.isArray(body?.blockIds) ? body.blockIds : []

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (!['Admin', 'Warden', 'Facilities', 'Management', 'Viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (!['Active', 'Inactive'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const data: any = { fullName, role, phone, status }
    if (password && password.length > 0) {
      const strength = validatePasswordStrength(password)
      if (!strength.ok) return NextResponse.json({ error: strength.reason }, { status: 400 })
      data.passwordHash = await hashPassword(password)
    }

    // Update block assignments if warden
    if (role === 'Warden' || role === 'Facilities') {
      // Replace all block assignments
      await db.userBlockAssignment.deleteMany({ where: { userId: id } })
      if (blockIds.length > 0) {
        await db.userBlockAssignment.createMany({
          data: blockIds.map(blockId => ({ userId: id, blockId })),
        })
      }
    } else {
      // Non-wardens don't have block assignments
      await db.userBlockAssignment.deleteMany({ where: { userId: id } })
    }

    const updated = await db.user.update({
      where: { id },
      data,
      include: { blockAssignments: { include: { block: true } } },
    })

    await logAudit({
      userId: currentUser.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      details: `Updated user ${existing.email} — role=${role}, status=${status}`,
      severity: 'warning',
    })

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        status: updated.status,
        phone: updated.phone,
        assignedBlocks: updated.blockAssignments.map(a => a.block),
      },
    })
  } catch (e) {
    console.error('PUT user error:', e)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (currentUser.role !== 'Admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

    const { id } = await params
    if (id === currentUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Revoke all sessions
    await db.session.deleteMany({ where: { userId: id } }).catch(() => {})

    await db.user.update({
      where: { id },
      data: { status: 'Inactive' },
    })

    await logAudit({
      userId: currentUser.id,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      details: `Deactivated user ${existing.email} (${existing.fullName})`,
      severity: 'critical',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE user error:', e)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
