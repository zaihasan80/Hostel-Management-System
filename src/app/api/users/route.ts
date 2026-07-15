import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, hashPassword, sanitizeString, validateEmail, validatePasswordStrength } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'Admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      phone: true,
      lastLoginAt: true,
      createdAt: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      blockAssignments: { include: { block: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      phone: u.phone,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      failedLoginAttempts: u.failedLoginAttempts,
      lockedUntil: u.lockedUntil,
      assignedBlocks: u.blockAssignments.map(a => a.block),
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSessionUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (currentUser.role !== 'Admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

    const body = await req.json()
    const email = sanitizeString(body?.email || '', 254).toLowerCase()
    const fullName = sanitizeString(body?.fullName || '', 150)
    const role = body?.role || 'Viewer'
    const phone = sanitizeString(body?.phone || '', 20)
    const password = body?.password || ''
    const blockIds: string[] = Array.isArray(body?.blockIds) ? body.blockIds : []

    if (!validateEmail(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    if (!fullName) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!['Admin', 'Warden', 'Facilities', 'Management', 'Viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const strength = validatePasswordStrength(password)
    if (!strength.ok) return NextResponse.json({ error: strength.reason }, { status: 400 })

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

    const passwordHash = await hashPassword(password)

    const newUser = await db.user.create({
      data: {
        email,
        fullName,
        role,
        phone,
        passwordHash,
        status: 'Active',
        blockAssignments: blockIds.length
          ? { create: blockIds.map(blockId => ({ blockId })) }
          : undefined,
      },
      include: { blockAssignments: { include: { block: true } } },
    })

    await logAudit({
      userId: currentUser.id,
      action: 'CREATE',
      entity: 'User',
      entityId: newUser.id,
      details: `Created user ${email} with role ${role}`,
      severity: 'critical',
    })

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        status: newUser.status,
        phone: newUser.phone,
        assignedBlocks: newUser.blockAssignments.map(a => a.block),
      },
    })
  } catch (e) {
    console.error('POST user error:', e)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
