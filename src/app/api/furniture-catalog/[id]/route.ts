import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Furniture', 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const itemName = sanitizeString(body?.itemName || '', 100)
    const category = sanitizeString(body?.category || '', 50)
    const defaultIcon = sanitizeString(body?.defaultIcon || '', 50) || 'box'

    if (!itemName || !category) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (!['Furniture', 'Electrical', 'Sanitary', 'Appliance'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const item = await db.furnitureCatalog.update({
      where: { id },
      data: { itemName, category, defaultIcon },
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Furniture',
      entityId: id,
      details: `Updated catalog item ${itemName}`,
      severity: 'info',
    })

    return NextResponse.json({ item })
  } catch (e) {
    console.error('PUT furniture error:', e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Furniture', 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await db.furnitureCatalog.findUnique({
      where: { id },
      include: { _count: { select: { roomItems: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing._count.roomItems > 0) {
      return NextResponse.json(
        { error: `Item is used in ${existing._count.roomItems} room(s). Remove from rooms first.` },
        { status: 409 }
      )
    }

    await db.furnitureCatalog.delete({ where: { id } })

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'Furniture',
      entityId: id,
      details: `Deleted catalog item ${existing.itemName}`,
      severity: 'warning',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE furniture error:', e)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
