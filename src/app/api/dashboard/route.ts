import { NextResponse } from 'next/server'
import { getSessionUser, logAudit } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [blocks, rooms, students, allocations, furniture] = await Promise.all([
      db.block.findMany({ include: { rooms: true } }),
      db.room.findMany({
        include: {
          block: true,
          allocations: { where: { isActive: true } },
          furniture: { include: { item: true } },
        },
      }),
      db.student.count(),
      db.roomAllocation.findMany({ where: { isActive: true }, include: { room: true } }),
      db.roomFurniture.findMany({ include: { item: true } }),
    ])

    // Aggregate stats
    const totalBlocks = blocks.length
    const totalRooms = rooms.length
    const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0)
    const totalOccupied = allocations.length
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0

    // Per-block occupancy
    const blockStats = blocks.map(b => {
      const blockRooms = rooms.filter(r => r.blockId === b.id)
      const cap = blockRooms.reduce((s, r) => s + r.capacity, 0)
      const occ = blockRooms.reduce((s, r) => s + r.allocations.length, 0)
      return {
        blockCode: b.blockCode,
        blockName: b.blockName,
        totalRooms: blockRooms.length,
        capacity: cap,
        occupied: occ,
        vacant: cap - occ,
        occupancyRate: cap > 0 ? Math.round((occ / cap) * 100) : 0,
      }
    })

    // Room status counts
    const statusCounts = rooms.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Furniture condition breakdown
    const conditionCounts = furniture.reduce(
      (acc, f) => {
        acc[f.condition] = (acc[f.condition] || 0) + f.quantity
        return acc
      },
      { Good: 0, Fair: 0, Damaged: 0, Missing: 0 } as Record<string, number>
    )

    // Maintenance flags — rooms with damaged/missing furniture OR status Maintenance
    const maintenanceFlags = rooms.filter(
      r =>
        r.status === 'Maintenance' ||
        r.furniture.some(f => f.condition === 'Damaged' || f.condition === 'Missing')
    ).length

    // Active students count
    const activeStudents = await db.student.count({ where: { status: 'Active' } })

    return NextResponse.json({
      summary: {
        totalBlocks,
        totalRooms,
        totalCapacity,
        totalOccupied,
        totalVacant: totalCapacity - totalOccupied,
        occupancyRate,
        activeStudents,
        totalStudents: students,
        maintenanceFlags,
      },
      blockStats,
      statusCounts,
      conditionCounts,
    })
  } catch (e) {
    console.error('Dashboard error:', e)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
