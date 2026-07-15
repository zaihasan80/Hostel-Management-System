import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString, getUserAssignedBlockIds } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/rooms/[id] — full detail incl. furniture
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const room = await db.room.findUnique({
      where: { id },
      include: {
        block: true,
        furniture: {
          include: { item: true },
          orderBy: { createdAt: 'asc' },
        },
        allocations: {
          include: { student: true },
          orderBy: { checkInDate: 'desc' },
        },
      },
    })

    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    // Warden RLS check
    if (user.role === 'Warden') {
      const assigned = await getUserAssignedBlockIds(user.id)
      if (!assigned.includes(room.blockId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const activeAllocations = room.allocations.filter(a => a.isActive)
    const currentOccupancy = activeAllocations.length

    return NextResponse.json({
      room: {
        id: room.id,
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        roomType: room.roomType,
        capacity: room.capacity,
        status: room.status,
        lastInspectionDate: room.lastInspectionDate,
        notes: room.notes,
        block: room.block,
        currentOccupancy,
        vacantBeds: room.capacity - currentOccupancy,
        furniture: room.furniture.map(f => ({
          id: f.id,
          itemName: f.item.itemName,
          category: f.item.category,
          icon: f.item.defaultIcon,
          itemId: f.itemId,
          quantity: f.quantity,
          condition: f.condition,
          posX: f.posX ? Number(f.posX) : null,
          posY: f.posY ? Number(f.posY) : null,
          lastCheckedDate: f.lastCheckedDate,
        })),
        allocations: room.allocations.map(a => ({
          id: a.id,
          isActive: a.isActive,
          bedNo: a.bedNo,
          checkInDate: a.checkInDate,
          checkOutDate: a.checkOutDate,
          student: a.student,
        })),
        hasMaintenanceIssue: room.furniture.some(f => f.condition === 'Damaged' || f.condition === 'Missing'),
      },
    })
  } catch (e) {
    console.error('GET room detail error:', e)
    return NextResponse.json({ error: 'Failed to load room' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Room', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const roomNumber = sanitizeString(body?.roomNumber || '', 10).toUpperCase()
    const floorNumber = parseInt(body?.floorNumber, 10)
    const roomType = body?.roomType
    const capacity = parseInt(body?.capacity, 10)
    const status = body?.status
    const lastInspectionDate = body?.lastInspectionDate || null
    const notes = sanitizeString(body?.notes || '', 500)

    if (!roomNumber || !floorNumber || !roomType || !capacity || !status) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }
    if (!['Single', 'Double', 'Dormitory'].includes(roomType)) {
      return NextResponse.json({ error: 'Invalid room type' }, { status: 400 })
    }
    if (!['Available', 'Occupied', 'Full', 'Maintenance'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const existing = await db.room.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    if (user.role === 'Warden') {
      const assigned = await getUserAssignedBlockIds(user.id)
      if (!assigned.includes(existing.blockId)) {
        return NextResponse.json({ error: 'Forbidden — not your block' }, { status: 403 })
      }
    }

    // Prevent shrinking capacity below current occupancy
    const activeCount = await db.roomAllocation.count({
      where: { roomId: id, isActive: true },
    })
    if (capacity < activeCount) {
      return NextResponse.json(
        { error: `Cannot shrink capacity to ${capacity} — room has ${activeCount} active occupant(s)` },
        { status: 400 }
      )
    }

    const room = await db.room.update({
      where: { id },
      data: {
        roomNumber,
        floorNumber,
        roomType,
        capacity,
        status,
        lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : null,
        notes: notes || null,
      },
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Room',
      entityId: id,
      details: `Updated room ${roomNumber} (status=${status}, cap=${capacity})`,
      severity: 'info',
    })

    return NextResponse.json({ room })
  } catch (e) {
    console.error('PUT room error:', e)
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Room', 'admin')) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const { id } = await params
    const existing = await db.room.findUnique({
      where: { id },
      include: { block: true, allocations: { where: { isActive: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    if (existing.allocations.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete room — it has ${existing.allocations.length} active occupant(s). Check them out first.` },
        { status: 409 }
      )
    }

    await db.room.delete({ where: { id } })

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'Room',
      entityId: id,
      details: `Deleted room ${existing.roomNumber} in ${existing.block.blockCode}`,
      severity: 'critical',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE room error:', e)
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 })
  }
}
