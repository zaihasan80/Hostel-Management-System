import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const catalog = await db.furnitureCatalog.findMany({
    include: { _count: { select: { roomItems: true } } },
    orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
  })

  return NextResponse.json({
    catalog: catalog.map(c => ({
      ...c,
      inUseCount: c._count.roomItems,
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Furniture', 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const itemName = sanitizeString(body?.itemName || '', 100)
    const category = sanitizeString(body?.category || '', 50)
    const defaultIcon = sanitizeString(body?.defaultIcon || '', 50) || 'box'

    if (!itemName || !category) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!['Furniture', 'Electrical', 'Sanitary', 'Appliance'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const item = await db.furnitureCatalog.create({
      data: { itemName, category, defaultIcon },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      entity: 'Furniture',
      entityId: item.id,
      details: `Added catalog item ${itemName} (${category})`,
      severity: 'info',
    })

    return NextResponse.json({ item })
  } catch (e) {
    console.error('POST furniture error:', e)
    return NextResponse.json({ error: 'Failed to create furniture item' }, { status: 500 })
  }
}
