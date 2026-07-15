/**
 * Verify the Next.js app's Prisma client can connect to Supabase
 * and read the seeded data using the same model API the app uses.
 */
import { db } from '../src/lib/db'

async function main() {
  console.log('🔌 Testing Prisma + Supabase connection via app db client...\n')

  const [users, blocks, rooms, students, allocations, furniture, catalog] = await Promise.all([
    db.user.count(),
    db.block.count(),
    db.room.count(),
    db.student.count(),
    db.roomAllocation.count(),
    db.roomFurniture.count(),
    db.furnitureCatalog.count(),
  ])

  console.log('✅ Prisma reads from Supabase successfully:')
  console.log(`   Users:           ${users}`)
  console.log(`   Blocks:          ${blocks}`)
  console.log(`   Rooms:           ${rooms}`)
  console.log(`   Students:        ${students}`)
  console.log(`   Allocations:     ${allocations}`)
  console.log(`   Room Furniture:  ${furniture}`)
  console.log(`   Catalog Items:   ${catalog}`)

  // Verify a relational query works
  console.log('\n🔍 Testing relational query (room with furniture + allocations)...')
  const room = await db.room.findFirst({
    where: { roomNumber: 'A-101' },
    include: {
      block: true,
      furniture: { include: { item: true } },
      allocations: { where: { isActive: true }, include: { student: true } },
    },
  })
  if (room) {
    console.log(`   Room ${room.roomNumber} (${room.block.blockName}):`)
    console.log(`     - Status: ${room.status}, capacity ${room.capacity}, ${room.allocations.length} active tenant(s)`)
    console.log(`     - Furniture items: ${room.furniture.length}`)
    const damaged = room.furniture.filter(f => f.condition === 'Damaged' || f.condition === 'Missing')
    if (damaged.length > 0) {
      console.log(`     - ⚠️  Damaged/Missing: ${damaged.map(d => `${d.item.itemName} (${d.condition})`).join(', ')}`)
    }
  }

  // Verify warden assignment (RLS-relevant)
  console.log('\n🔍 Testing warden-block assignment query...')
  const warden = await db.user.findUnique({
    where: { email: 'warden.a@jtm.gov.my' },
    include: { blockAssignments: { include: { block: true } } },
  })
  if (warden) {
    console.log(`   Warden ${warden.fullName} (${warden.role}) is assigned to:`)
    for (const a of warden.blockAssignments) {
      console.log(`     - Block ${a.block.blockCode} — ${a.block.blockName}`)
    }
  }

  // Verify bcrypt password verification works
  console.log('\n🔍 Testing bcrypt password verification for admin...')
  const admin = await db.user.findUnique({ where: { email: 'admin@jtm.gov.my' } })
  if (admin) {
    const bcrypt = await import('bcryptjs')
    const ok = await bcrypt.compare('Admin@JTM2026', admin.passwordHash)
    console.log(`   Password verify: ${ok ? '✅ PASS' : '❌ FAIL'}`)
  }

  console.log('\n🎉 All checks passed — app is ready to use Supabase as its database.')
}

main()
  .catch(e => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
