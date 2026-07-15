import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  recordFailedLogin,
  isAccountLocked,
  resetFailedLogin,
  logAudit,
  validateEmail,
  sanitizeString,
} from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)

    // Rate limit: max 10 login attempts per IP per minute
    const rl = rateLimit(`login:${ip}`, 10, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const email = sanitizeString(body?.email || '', 254).toLowerCase()
    const password = body?.password || ''

    if (!validateEmail(email) || typeof password !== 'string' || password.length < 1) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 })
    }

    // Check account lockout
    if (await isAccountLocked(email)) {
      await logAudit({
        action: 'LOGIN_BLOCKED',
        entity: 'Auth',
        details: `Blocked login attempt for locked account: ${email}`,
        severity: 'critical',
      })
      return NextResponse.json(
        { error: 'Account is temporarily locked due to multiple failed attempts. Try again in 15 minutes.' },
        { status: 423 }
      )
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      // Generic error to prevent user enumeration
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    if (user.status !== 'Active') {
      return NextResponse.json({ error: 'Account is inactive. Contact your administrator.' }, { status: 403 })
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      const { locked, attemptsLeft } = await recordFailedLogin(email)
      if (locked) {
        return NextResponse.json(
          { error: 'Account locked for 15 minutes due to too many failed attempts.' },
          { status: 423 }
        )
      }
      return NextResponse.json(
        { error: `Invalid email or password. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.` },
        { status: 401 }
      )
    }

    // Success — create session and reset failure count
    await resetFailedLogin(user.id)
    const token = await createSession(user, req)
    await setSessionCookie(token)

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entity: 'Auth',
      details: `User logged in from ${ip}`,
      severity: 'info',
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
    })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
