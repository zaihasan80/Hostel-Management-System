import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString, getUserAssignedBlockIds } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/allocations?roomId=...&studentId=...&active=true
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const roomId = url.searchParams.get('roomId')
  const studentId = url.searchParams.get('studentId')
  const active = url.searchParams.get('active')

  let where: any = {}
  if (roomId) where.roomId = roomId
  if (studentId) where.studentId = studentId
  if (active === 'true') where.isActive = true
  if (active === 'false') where.isActive = false

  const allocations = await db.roomAllocation.findMany({
    where,
    include: {
      student: true,
      room: { include: { block: true } },
    },
    orderBy: { checkInDate: 'desc' },
  })

  return NextResponse.json({ allocations })
}

// POST /api/allocations — allocate student to a room/bed
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Allocation', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const studentId = sanitizeString(body?.studentId || '', 64)
    const roomId = sanitizeString(body?.roomId || '', 64)
    const bedNo = sanitizeString(body?.bedNo || '', 10)
    const checkInDate = body?.checkInDate ? new Date(body.checkInDate) : new Date()

    if (!studentId || !roomId || !bedNo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const room = await db.room.findUnique({
      where: { id: roomId },
      include: {
        block: true,
        allocations: { where: { isActive: true } },
      },
    })
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.status === 'Maintenance') {
      return NextResponse.json({ error: 'Room is under maintenance' }, { status: 400 })
    }

    if (user.role === 'Warden') {
      const assigned = await getUserAssignedBlockIds(user.id)
      if (!assigned.includes(room.blockId)) {
        return NextResponse.json({ error: 'Forbidden — not your assigned block' }, { status: 403 })
      }
    }

    // Capacity check
    const activeCount = room.allocations.length
    if (activeCount >= room.capacity) {
      return NextResponse.json(
        { error: `Room is at full capacity (${room.capacity}/${room.capacity})` },
        { status: 400 }
      )
    }

    // Check student doesn't already have an active allocation elsewhere
    const existing = await db.roomAllocation.findFirst({
      where: { studentId, isActive: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Student already has an active allocation. Check them out first.' },
        { status: 400 }
      )
    }

    // Check bed uniqueness within the room
    const bedTaken = room.allocations.find(a => a.bedNo === bedNo)
    if (bedTaken) {
      return NextResponse.json({ error: `Bed ${bedNo} is already occupied` }, { status: 400 })
    }

    // Gender match check (except Mixed blocks)
    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    if (room.block.genderType !== 'Mixed' && student.gender !== room.block.genderType) {
      return NextResponse.json(
        { error: `Gender mismatch — block ${room.block.blockCode} is for ${room.block.genderType} students` },
        { status: 400 }
      )
    }

    const allocation = await db.roomAllocation.create({
      data: { studentId, roomId, bedNo, checkInDate, isActive: true },
    })

    // Update room status if now full
    if (activeCount + 1 >= room.capacity) {
      await db.room.update({ where: { id: roomId }, data: { status: 'Full' } })
    } else if (room.status === 'Available') {
      await db.room.update({ where: { id: roomId }, data: { status: 'Occupied' } })
    }

    // Update student status
    if (student.status !== 'Active') {
      await db.student.update({ where: { id: studentId }, data: { status: 'Active' } })
    }

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      entity: 'Allocation',
      entityId: allocation.id,
      details: `Allocated ${student.fullName} to ${room.roomNumber} ${bedNo}`,
      severity: 'info',
    })

    return NextResponse.json({ allocation })
  } catch (e) {
    console.error('POST allocation error:', e)
    return NextResponse.json({ error: 'Failed to create allocation' }, { status: 500 })
  }
}
