/**
 * HMS Auth Library — secure session-based authentication
 * Features:
 *   - bcrypt password hashing (12 rounds)
 *   - Cryptographically secure session tokens
 *   - httpOnly + SameSite cookies
 *   - Session expiry & rotation
 *   - Account lockout after 5 failed attempts (15 min)
 *   - Audit logging for auth events
 */
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const SESSION_COOKIE = 'hms_session'
const SESSION_TTL_HOURS = 8
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export type AuthRole = 'Admin' | 'Warden' | 'Facilities' | 'Management' | 'Viewer'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: AuthRole
  status: string
}

// =====================================================
// PASSWORD HASHING
// =====================================================
export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 8) throw new Error('Password must be at least 8 characters')
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

// =====================================================
// SESSION MANAGEMENT
// =====================================================
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(user: { id: string }, req?: Request): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000)

  const ip = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || 'unknown'
  const ua = req?.headers.get('user-agent') || 'unknown'

  await db.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
      ipAddress: ip.slice(0, 64),
      userAgent: ua.slice(0, 256),
    },
  })

  return token
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (session.user.status !== 'Active') {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    role: session.user.role as AuthRole,
    status: session.user.status,
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

// =====================================================
// ACCOUNT LOCKOUT (rate-limit on failed logins)
// =====================================================
export async function recordFailedLogin(email: string): Promise<{ locked: boolean; attemptsLeft: number }> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return { locked: false, attemptsLeft: 0 }

  const newCount = user.failedLoginAttempts + 1
  const shouldLock = newCount >= MAX_FAILED_ATTEMPTS

  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: newCount,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : user.lockedUntil,
    },
  })

  await logAudit({
    userId: user.id,
    action: 'LOGIN_FAILED',
    entity: 'Auth',
    details: `Failed attempt #${newCount}${shouldLock ? ' — account locked for 15 min' : ''}`,
    severity: shouldLock ? 'critical' : 'warning',
  })

  return {
    locked: shouldLock,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - newCount),
  }
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.lockedUntil) return false
  if (user.lockedUntil > new Date()) return true
  // lockout expired — reset
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })
  return false
}

export async function resetFailedLogin(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  })
}

// =====================================================
// AUDIT LOG
// =====================================================
export async function logAudit(entry: {
  userId?: string
  action: string
  entity: string
  entityId?: string
  details?: string
  severity?: 'info' | 'warning' | 'critical'
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        details: entry.details || null,
        severity: entry.severity || 'info',
      },
    })
  } catch (e) {
    console.error('Audit log failed:', e)
  }
}

// =====================================================
// ROLE-BASED ACCESS CONTROL
// =====================================================
export function canAccess(role: AuthRole, resource: string, action: 'read' | 'write' | 'delete' | 'admin'): boolean {
  // Admin has full access to everything
  if (role === 'Admin') return true

  // Management: read-only across all
  if (role === 'Management') return action === 'read'

  // Facilities: read everything, write furniture
  if (role === 'Facilities') {
    if (action === 'read') return true
    if (action === 'write' && (resource === 'Furniture' || resource === 'RoomFurniture')) return true
    return false
  }

  // Warden: read everything, write rooms/allocation in assigned blocks
  if (role === 'Warden') {
    if (action === 'read') return true
    if (action === 'write' && (resource === 'Room' || resource === 'Allocation' || resource === 'Student')) return true
    return false
  }

  // Viewer: read-only
  return action === 'read'
}

export async function getUserAssignedBlockIds(userId: string): Promise<string[]> {
  const assignments = await db.userBlockAssignment.findMany({
    where: { userId },
    select: { blockId: true },
  })
  return assignments.map(a => a.blockId)
}

// =====================================================
// INPUT VALIDATION — basic sanitization helpers
// =====================================================
export function sanitizeString(input: string, maxLength = 200): string {
  if (typeof input !== 'string') return ''
  // Strip control chars and angle brackets
  return input
    .replace(/[\x00-\x1F<>]/g, '')
    .trim()
    .slice(0, maxLength)
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

// Password must be 8+ chars, contain upper+lower+number+symbol
export function validatePasswordStrength(password: string): { ok: boolean; reason?: string } {
  if (password.length < 8) return { ok: false, reason: 'Password must be at least 8 characters' }
  if (!/[A-Z]/.test(password)) return { ok: false, reason: 'Password must include an uppercase letter' }
  if (!/[a-z]/.test(password)) return { ok: false, reason: 'Password must include a lowercase letter' }
  if (!/[0-9]/.test(password)) return { ok: false, reason: 'Password must include a number' }
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, reason: 'Password must include a symbol' }
  return { ok: true }
}
