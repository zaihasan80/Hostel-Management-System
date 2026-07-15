import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, logAudit, canAccess, sanitizeString, getUserAssignedBlockIds } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/students?blockId=...&roomId=...&search=...&status=...
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const blockId = url.searchParams.get('blockId')
    const roomId = url.searchParams.get('roomId')
    const search = url.searchParams.get('search')?.toLowerCase()
    const status = url.searchParams.get('status')

    // For Warden RLS, filter by assigned blocks
    let assignedBlockIds: string[] | null = null
    if (user.role === 'Warden') {
      assignedBlockIds = await getUserAssignedBlockIds(user.id)
    }

    // Build filter on allocations
    let allocationWhere: any = {}
    if (roomId) {
      allocationWhere.roomId = roomId
    } else if (blockId) {
      allocationWhere.room = { blockId }
    }
    if (assignedBlockIds) {
      allocationWhere.room = { ...(allocationWhere.room || {}), blockId: { in: assignedBlockIds } }
    }

    let studentWhere: any = {}
    if (status) studentWhere.status = status
    if (search) {
      studentWhere.OR = [
        { fullName: { contains: search } },
        { icMatricNo: { contains: search } },
        { programme: { contains: search } },
      ]
    }

    const students = await db.student.findMany({
      where: studentWhere,
      include: {
        allocations: {
          where: Object.keys(allocationWhere).length > 0 ? allocationWhere : undefined,
          include: { room: { include: { block: true } } },
          orderBy: { checkInDate: 'desc' },
        },
      },
      orderBy: { fullName: 'asc' },
    })

    const enriched = students
      .map(s => {
        const activeAlloc = s.allocations.find(a => a.isActive)
        return {
          id: s.id,
          fullName: s.fullName,
          icMatricNo: s.icMatricNo,
          programme: s.programme,
          gender: s.gender,
          phoneNo: s.phoneNo,
          email: s.email,
          status: s.status,
          currentAllocation: activeAlloc
            ? {
                id: activeAlloc.id,
                bedNo: activeAlloc.bedNo,
                checkInDate: activeAlloc.checkInDate,
                room: activeAlloc.room,
              }
            : null,
          allocationHistory: s.allocations.map(a => ({
            id: a.id,
            isActive: a.isActive,
            bedNo: a.bedNo,
            checkInDate: a.checkInDate,
            checkOutDate: a.checkOutDate,
            room: a.room,
          })),
        }
      })
      // If blockId/roomId filter applied, only include students that have matching allocations
      .filter(s => {
        if (!blockId && !roomId && !assignedBlockIds) return true
        return s.allocationHistory.length > 0
      })

    return NextResponse.json({ students: enriched, total: enriched.length })
  } catch (e) {
    console.error('GET students error:', e)
    return NextResponse.json({ error: 'Failed to load students' }, { status: 500 })
  }
}

// POST /api/students — create student (Admin/Warden)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccess(user.role, 'Student', 'write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const fullName = sanitizeString(body?.fullName || '', 150)
    const icMatricNo = sanitizeString(body?.icMatricNo || '', 30).toUpperCase()
    const programme = sanitizeString(body?.programme || '', 100)
    const gender = body?.gender
    const phoneNo = sanitizeString(body?.phoneNo || '', 20)
    const email = body?.email ? sanitizeString(body?.email, 254).toLowerCase() : null
    const status = body?.status || 'Active'

    if (!fullName || !icMatricNo || !programme || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!['Male', 'Female'].includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 })
    }
    if (!['Active', 'Checked-out', 'Suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const existing = await db.student.findUnique({ where: { icMatricNo } })
    if (existing) {
      return NextResponse.json({ error: `Matric/IC no. ${icMatricNo} already exists` }, { status: 409 })
    }

    const student = await db.student.create({
      data: { fullName, icMatricNo, programme, gender, phoneNo, email, status },
    })

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      entity: 'Student',
      entityId: student.id,
      details: `Created student ${fullName} (${icMatricNo})`,
      severity: 'info',
    })

    return NextResponse.json({ student })
  } catch (e) {
    console.error('POST student error:', e)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}
