import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'Admin' && user.role !== 'Management') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const action = url.searchParams.get('action')
  const entity = url.searchParams.get('entity')
  const severity = url.searchParams.get('severity')

  let where: any = {}
  if (action) where.action = action
  if (entity) where.entity = entity
  if (severity) where.severity = severity

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { email: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs: logs.map(l => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      details: l.details,
      severity: l.severity,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt,
      user: l.user ? {
        email: l.user.email,
        fullName: l.user.fullName,
        role: l.user.role,
      } : null,
    })),
    total,
    limit,
    offset,
  })
}
