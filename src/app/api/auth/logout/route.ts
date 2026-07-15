import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, destroySession, clearSessionCookie, logAudit } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (user) {
      await logAudit({
        userId: user.id,
        action: 'LOGOUT',
        entity: 'Auth',
        details: 'User logged out',
        severity: 'info',
      })
    }
    await destroySession()
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
