import { NextRequest, NextResponse } from 'next/server'
import {
  getSessionUser,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  logAudit,
  sanitizeString,
} from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = rateLimit(`pwchange:${user.id}`, 5, 60_000)
    if (!rl.ok) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })

    const body = await req.json()
    const currentPassword = body?.currentPassword || ''
    const newPassword = body?.newPassword || ''

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const fullUser = await db.user.findUnique({ where: { id: user.id } })
    if (!fullUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await verifyPassword(currentPassword, fullUser.passwordHash)
    if (!valid) {
      await logAudit({
        userId: user.id,
        action: 'PW_CHANGE_FAILED',
        entity: 'Auth',
        details: 'Current password incorrect',
        severity: 'warning',
      })
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const strength = validatePasswordStrength(newPassword)
    if (!strength.ok) {
      return NextResponse.json({ error: strength.reason }, { status: 400 })
    }

    const newHash = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    await logAudit({
      userId: user.id,
      action: 'PW_CHANGE',
      entity: 'Auth',
      details: 'User changed their password',
      severity: 'info',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Password change error:', e)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
