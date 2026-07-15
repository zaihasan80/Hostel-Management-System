/**
 * HMS Seed Script — populates the database with realistic JTM dummy data per PRD Section 9.
 * Run with: bun run scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding HMS database...')

  // =====================================================
  // 1. USERS — with role-based access (passwords hashed with bcrypt)
  // =====================================================
  console.log('→ Creating users...')
  const pwdAdmin = await bcrypt.hash('Admin@JTM2026', 12)
  const pwdWarden = await bcrypt.hash('Warden@JTM2026', 12)
  const pwdFacilities = await bcrypt.hash('Facilities@JTM2026', 12)
  const pwdMgmt = await bcrypt.hash('Management@JTM2026', 12)

  const users = await Promise.all([
    db.user.create({
      data: {
        email: 'admin@jtm.gov.my',
        fullName: 'Aisyah binti Rahman',
        passwordHash: pwdAdmin,
        role: 'Admin',
        status: 'Active',
        phone: '+6012-345 6789',
      },
    }),
    db.user.create({
      data: {
        email: 'warden.a@jtm.gov.my',
        fullName: 'Raj a/l Kumaran',
        passwordHash: pwdWarden,
        role: 'Warden',
        status: 'Active',
        phone: '+6012-444 2222',
      },
    }),
    db.user.create({
      data: {
        email: 'warden.b@jtm.gov.my',
        fullName: 'Lim Mei Ling',
        passwordHash: pwdWarden,
        role: 'Warden',
        status: 'Active',
        phone: '+6012-555 3333',
      },
    }),
    db.user.create({
      data: {
        email: 'facilities@jtm.gov.my',
        fullName: 'Tan Wei Jie',
        passwordHash: pwdFacilities,
        role: 'Facilities',
        status: 'Active',
        phone: '+6012-666 4444',
      },
    }),
    db.user.create({
      data: {
        email: 'management@jtm.gov.my',
        fullName: 'Dato Hj. Ismail bin Abdullah',
        passwordHash: pwdMgmt,
        role: 'Management',
        status: 'Active',
        phone: '+6012-777 5555',
      },
    }),
    db.user.create({
      data: {
        email: 'warden.c@jtm.gov.my',
        fullName: 'Siti Nurhaliza binti Khalid',
        passwordHash: pwdWarden,
        role: 'Warden',
        status: 'Active',
        phone: '+6012-888 6666',
      },
    }),
  ])
  console.log(`  ✓ Created ${users.length} users`)

  // =====================================================
  // 2. BLOCKS — per PRD Section 9.1
  // =====================================================
  console.log('→ Creating blocks...')
  const blockA = await db.block.create({
    data: { blockCode: 'A', blockName: 'Block A - Melur', totalFloors: 3, genderType: 'Male' },
  })
  const blockB = await db.block.create({
    data: { blockCode: 'B', blockName: 'Block B - Cempaka', totalFloors: 3, genderType: 'Female' },
  })
  const blockC = await db.block.create({
    data: { blockCode: 'C', blockName: 'Block C - Kenanga', totalFloors: 2, genderType: 'Mixed' },
  })
  console.log('  ✓ Created 3 blocks')

  // =====================================================
  // 3. USER-BLOCK ASSIGNMENTS (Wardens assigned to their blocks)
  // =====================================================
  console.log('→ Creating warden block assignments...')
  await db.userBlockAssignment.createMany({
    data: [
      { userId: users[1].id, blockId: blockA.id },
      { userId: users[2].id, blockId: blockB.id },
      { userId: users[5].id, blockId: blockC.id },
    ],
  })
  console.log('  ✓ Assigned wardens to blocks')

  // =====================================================
  // 4. FURNITURE CATALOG
  // =====================================================
  console.log('→ Creating furniture catalog...')
  const catalog = await db.furnitureCatalog.createMany({
    data: [
      { itemName: 'Single Bed Frame', category: 'Furniture', defaultIcon: 'bed' },
      { itemName: 'Bunk Bed Frame', category: 'Furniture', defaultIcon: 'bed-double' },
      { itemName: 'Study Table', category: 'Furniture', defaultIcon: 'table' },
      { itemName: 'Study Chair', category: 'Furniture', defaultIcon: 'chair' },
      { itemName: 'Wardrobe', category: 'Furniture', defaultIcon: 'wardrobe' },
      { itemName: 'Bookshelf', category: 'Furniture', defaultIcon: 'book' },
      { itemName: 'Ceiling Fan', category: 'Electrical', defaultIcon: 'fan' },
      { itemName: 'Wall Fan', category: 'Electrical', defaultIcon: 'fan' },
      { itemName: 'Fluorescent Light', category: 'Electrical', defaultIcon: 'lightbulb' },
      { itemName: 'Air Conditioner', category: 'Electrical', defaultIcon: 'wind' },
      { itemName: 'Power Socket', category: 'Electrical', defaultIcon: 'plug' },
      { itemName: 'Mirror', category: 'Sanitary', defaultIcon: 'mirror' },
      { itemName: 'Wash Basin', category: 'Sanitary', defaultIcon: 'droplet' },
      { itemName: 'Shower Head', category: 'Sanitary', defaultIcon: 'shower' },
      { itemName: 'Fire Extinguisher', category: 'Appliance', defaultIcon: 'flame' },
      { itemName: 'Dustbin', category: 'Appliance', defaultIcon: 'trash' },
    ],
  })
  console.log(`  ✓ Created ${catalog.count} catalog items`)

  const cat = await db.furnitureCatalog.findMany()
  const catByName = Object.fromEntries(cat.map(c => [c.itemName, c]))

  // =====================================================
  // 5. ROOMS
  // =====================================================
  console.log('→ Creating rooms...')
  const rooms = [
    { block: blockA, roomNumber: 'A-101', floor: 1, type: 'Dormitory', cap: 4, status: 'Occupied', inspect: '2026-06-01' },
    { block: blockA, roomNumber: 'A-102', floor: 1, type: 'Dormitory', cap: 4, status: 'Full', inspect: '2026-06-01' },
    { block: blockA, roomNumber: 'A-103', floor: 1, type: 'Double', cap: 2, status: 'Available', inspect: '2026-06-02' },
    { block: blockA, roomNumber: 'A-104', floor: 1, type: 'Single', cap: 1, status: 'Available', inspect: '2026-06-02' },
    { block: blockA, roomNumber: 'A-201', floor: 2, type: 'Double', cap: 2, status: 'Maintenance', inspect: '2026-05-15' },
    { block: blockA, roomNumber: 'A-202', floor: 2, type: 'Dormitory', cap: 4, status: 'Full', inspect: '2026-06-03' },
    { block: blockA, roomNumber: 'A-203', floor: 2, type: 'Double', cap: 2, status: 'Occupied', inspect: '2026-06-03' },
    { block: blockA, roomNumber: 'A-301', floor: 3, type: 'Dormitory', cap: 4, status: 'Occupied', inspect: '2026-06-04' },
    { block: blockA, roomNumber: 'A-302', floor: 3, type: 'Double', cap: 2, status: 'Available', inspect: '2026-06-04' },
    { block: blockB, roomNumber: 'B-101', floor: 1, type: 'Dormitory', cap: 4, status: 'Full', inspect: '2026-06-05' },
    { block: blockB, roomNumber: 'B-102', floor: 1, type: 'Double', cap: 2, status: 'Occupied', inspect: '2026-06-05' },
    { block: blockB, roomNumber: 'B-103', floor: 1, type: 'Single', cap: 1, status: 'Available', inspect: '2026-06-05' },
    { block: blockB, roomNumber: 'B-201', floor: 2, type: 'Dormitory', cap: 4, status: 'Occupied', inspect: '2026-06-06' },
    { block: blockB, roomNumber: 'B-202', floor: 2, type: 'Dormitory', cap: 4, status: 'Maintenance', inspect: '2026-05-20' },
    { block: blockB, roomNumber: 'B-301', floor: 3, type: 'Double', cap: 2, status: 'Full', inspect: '2026-06-07' },
    { block: blockC, roomNumber: 'C-101', floor: 1, type: 'Double', cap: 2, status: 'Occupied', inspect: '2026-06-08' },
    { block: blockC, roomNumber: 'C-102', floor: 1, type: 'Single', cap: 1, status: 'Available', inspect: '2026-06-08' },
    { block: blockC, roomNumber: 'C-201', floor: 2, type: 'Double', cap: 2, status: 'Full', inspect: '2026-06-09' },
  ]

  const createdRooms: Record<string, any> = {}
  for (const r of rooms) {
    const room = await db.room.create({
      data: {
        blockId: r.block.id,
        roomNumber: r.roomNumber,
        floorNumber: r.floor,
        roomType: r.type,
        capacity: r.cap,
        status: r.status,
        lastInspectionDate: new Date(r.inspect),
      },
    })
    createdRooms[r.roomNumber] = room
  }
  console.log(`  ✓ Created ${rooms.length} rooms`)

  // =====================================================
  // 6. ROOM FURNITURE
  // =====================================================
  console.log('→ Creating room furniture assignments...')
  const layoutPresets: Record<string, { item: string; qty: number; cond: string; pos: [number, number] }[]> = {
    Dormitory: [
      { item: 'Single Bed Frame', qty: 4, cond: 'Good', pos: [15, 20] },
      { item: 'Study Table', qty: 4, cond: 'Fair', pos: [15, 60] },
      { item: 'Study Chair', qty: 4, cond: 'Good', pos: [30, 60] },
      { item: 'Wardrobe', qty: 4, cond: 'Good', pos: [70, 20] },
      { item: 'Ceiling Fan', qty: 1, cond: 'Good', pos: [50, 10] },
      { item: 'Fluorescent Light', qty: 2, cond: 'Good', pos: [30, 10] },
      { item: 'Power Socket', qty: 4, cond: 'Good', pos: [85, 50] },
      { item: 'Dustbin', qty: 1, cond: 'Good', pos: [90, 90] },
    ],
    Double: [
      { item: 'Single Bed Frame', qty: 2, cond: 'Good', pos: [15, 25] },
      { item: 'Study Table', qty: 2, cond: 'Good', pos: [15, 65] },
      { item: 'Study Chair', qty: 2, cond: 'Good', pos: [30, 65] },
      { item: 'Wardrobe', qty: 2, cond: 'Good', pos: [70, 25] },
      { item: 'Wall Fan', qty: 1, cond: 'Fair', pos: [50, 10] },
      { item: 'Fluorescent Light', qty: 1, cond: 'Good', pos: [50, 5] },
      { item: 'Power Socket', qty: 2, cond: 'Good', pos: [85, 50] },
      { item: 'Mirror', qty: 1, cond: 'Good', pos: [60, 80] },
    ],
    Single: [
      { item: 'Single Bed Frame', qty: 1, cond: 'Good', pos: [15, 30] },
      { item: 'Study Table', qty: 1, cond: 'Good', pos: [60, 30] },
      { item: 'Study Chair', qty: 1, cond: 'Good', pos: [60, 50] },
      { item: 'Wardrobe', qty: 1, cond: 'Good', pos: [15, 70] },
      { item: 'Wall Fan', qty: 1, cond: 'Good', pos: [85, 30] },
      { item: 'Fluorescent Light', qty: 1, cond: 'Good', pos: [50, 10] },
      { item: 'Power Socket', qty: 2, cond: 'Good', pos: [85, 70] },
    ],
  }

  let furnitureCount = 0
  for (const [roomNumber, room] of Object.entries(createdRooms)) {
    const preset = layoutPresets[room.roomType] || layoutPresets.Double
    const overrideCondition: Record<string, Record<string, string>> = {
      'A-101': { 'Ceiling Fan': 'Damaged', 'Study Table': 'Fair' },
      'A-201': { 'Wall Fan': 'Damaged', 'Wardrobe': 'Missing' },
      'A-202': { 'Ceiling Fan': 'Fair', 'Single Bed Frame': 'Fair' },
      'B-202': { 'Wardrobe': 'Damaged', 'Mirror': 'Missing' },
      'B-201': { 'Study Chair': 'Fair' },
    }
    const overrides = overrideCondition[roomNumber] || {}

    for (const entry of preset) {
      const item = catByName[entry.item]
      if (!item) continue
      const finalCondition = overrides[entry.item] || entry.cond
      await db.roomFurniture.create({
        data: {
          roomId: room.id,
          itemId: item.id,
          quantity: entry.qty,
          condition: finalCondition,
          posX: entry.pos[0],
          posY: entry.pos[1],
          lastCheckedDate: new Date(room.lastInspectionDate || '2026-06-01'),
        },
      })
      furnitureCount++
    }
  }
  console.log(`  ✓ Created ${furnitureCount} room-furniture records`)

  // =====================================================
  // 7. STUDENTS
  // =====================================================
  console.log('→ Creating students...')
  const studentData = [
    { name: 'Ahmad Danial bin Rosli', matric: 'JTM2026-0011', prog: 'Dip. Kejuruteraan Awam', gender: 'Male', phone: '+6011-1111 1111' },
    { name: 'Muhammad Haziq bin Yusof', matric: 'JTM2026-0012', prog: 'Dip. Kejuruteraan Elektrik', gender: 'Male', phone: '+6011-2222 2222' },
    { name: 'Amirul Hakim bin Zainal', matric: 'JTM2026-0013', prog: 'Dip. Teknologi Maklumat', gender: 'Male', phone: '+6011-3333 3333' },
    { name: 'Farid bin Che Rosli', matric: 'JTM2026-0014', prog: 'Dip. Kejuruteraan Awam', gender: 'Male', phone: '+6011-4444 4444' },
    { name: 'Khairul Anuar bin Azmi', matric: 'JTM2026-0015', prog: 'Dip. Kejuruteraan Mekanikal', gender: 'Male', phone: '+6011-5555 5555' },
    { name: 'Nik Mohd Faiz bin Nik Mansor', matric: 'JTM2026-0016', prog: 'Dip. Elektronik', gender: 'Male', phone: '+6011-6666 6666' },
    { name: 'Syafiq bin Abdul Rahman', matric: 'JTM2026-0017', prog: 'Dip. Kejuruteraan Awam', gender: 'Male', phone: '+6011-7777 7777' },
    { name: 'Zulkifli bin Ibrahim', matric: 'JTM2026-0018', prog: 'Dip. Teknologi Maklumat', gender: 'Male', phone: '+6011-8888 8888' },
    { name: 'Hairul Nizam bin Othman', matric: 'JTM2026-0019', prog: 'Dip. Kejuruteraan Elektrik', gender: 'Male', phone: '+6011-9999 9999' },
    { name: 'Azlan bin Md Yasin', matric: 'JTM2026-0020', prog: 'Dip. Kejuruteraan Mekanikal', gender: 'Male', phone: '+6011-1010 1010' },
    { name: 'Faizal bin Ahmad', matric: 'JTM2026-0021', prog: 'Dip. Kejuruteraan Awam', gender: 'Male', phone: '+6011-1212 1212' },
    { name: 'Hafizuddin bin Samat', matric: 'JTM2026-0022', prog: 'Dip. Elektronik', gender: 'Male', phone: '+6011-1313 1313' },
    { name: 'Irfan bin Salleh', matric: 'JTM2026-0023', prog: 'Dip. Teknologi Maklumat', gender: 'Male', phone: '+6011-1414 1414' },
    { name: 'Daniel a/l Ganesan', matric: 'JTM2026-0024', prog: 'Dip. Kejuruteraan Elektrik', gender: 'Male', phone: '+6011-1515 1515' },
    { name: 'Nurul Aisyah binti Mohd', matric: 'JTM2026-0031', prog: 'Dip. Kejuruteraan Awam', gender: 'Female', phone: '+6012-1111 1111' },
    { name: 'Siti Khadijah binti Ali', matric: 'JTM2026-0032', prog: 'Dip. Teknologi Maklumat', gender: 'Female', phone: '+6012-2222 2222' },
    { name: 'Farah Nadia binti Yusof', matric: 'JTM2026-0033', prog: 'Dip. Kejuruteraan Elektrik', gender: 'Female', phone: '+6012-3333 3333' },
    { name: 'Husna binti Razali', matric: 'JTM2026-0034', prog: 'Dip. Elektronik', gender: 'Female', phone: '+6012-4444 4444' },
    { name: 'Nabila binti Hisham', matric: 'JTM2026-0035', prog: 'Dip. Kejuruteraan Mekanikal', gender: 'Female', phone: '+6012-5555 5555' },
    { name: 'Aishah binti Karim', matric: 'JTM2026-0036', prog: 'Dip. Kejuruteraan Awam', gender: 'Female', phone: '+6012-6666 6666' },
    { name: 'Zara binti Hassan', matric: 'JTM2026-0037', prog: 'Dip. Teknologi Maklumat', gender: 'Female', phone: '+6012-7777 7777' },
    { name: 'Priya a/p Subramaniam', matric: 'JTM2026-0038', prog: 'Dip. Kejuruteraan Elektrik', gender: 'Female', phone: '+6012-8888 8888' },
    { name: 'Wong Pei Ling', matric: 'JTM2026-0039', prog: 'Dip. Elektronik', gender: 'Female', phone: '+6012-9999 9999' },
    { name: 'Nurul Huda binti Aziz', matric: 'JTM2026-0040', prog: 'Dip. Kejuruteraan Mekanikal', gender: 'Female', phone: '+6012-1010 1010' },
    { name: 'Mohd Faizal bin Tan', matric: 'JTM2026-0051', prog: 'Cert. Industrial Training', gender: 'Male', phone: '+6013-1111 1111' },
    { name: 'Tan Chia Min', matric: 'JTM2026-0052', prog: 'Cert. Industrial Training', gender: 'Female', phone: '+6013-2222 2222' },
    { name: 'Ramesh a/l Subramaniam', matric: 'JTM2026-0053', prog: 'Cert. Industrial Training', gender: 'Male', phone: '+6013-3333 3333' },
  ]

  const createdStudents: any[] = []
  for (const s of studentData) {
    const st = await db.student.create({
      data: {
        fullName: s.name,
        icMatricNo: s.matric,
        programme: s.prog,
        gender: s.gender,
        phoneNo: s.phone,
        status: 'Active',
      },
    })
    createdStudents.push(st)
  }
  console.log(`  ✓ Created ${createdStudents.length} students`)

  // =====================================================
  // 8. ROOM ALLOCATIONS
  // =====================================================
  console.log('→ Creating room allocations...')
  const allocations: { matric: string; roomNumber: string; bed: string; checkIn: string; active: boolean }[] = [
    { matric: 'JTM2026-0011', roomNumber: 'A-101', bed: 'Bed-1', checkIn: '2026-01-05', active: true },
    { matric: 'JTM2026-0012', roomNumber: 'A-101', bed: 'Bed-2', checkIn: '2026-01-05', active: true },
    { matric: 'JTM2026-0013', roomNumber: 'A-101', bed: 'Bed-3', checkIn: '2026-01-06', active: true },
    { matric: 'JTM2026-0014', roomNumber: 'A-102', bed: 'Bed-1', checkIn: '2026-01-05', active: true },
    { matric: 'JTM2026-0015', roomNumber: 'A-102', bed: 'Bed-2', checkIn: '2026-01-05', active: true },
    { matric: 'JTM2026-0016', roomNumber: 'A-102', bed: 'Bed-3', checkIn: '2026-01-07', active: true },
    { matric: 'JTM2026-0017', roomNumber: 'A-102', bed: 'Bed-4', checkIn: '2026-01-07', active: true },
    { matric: 'JTM2026-0018', roomNumber: 'A-103', bed: 'Bed-1', checkIn: '2026-01-08', active: true },
    { matric: 'JTM2026-0019', roomNumber: 'A-202', bed: 'Bed-1', checkIn: '2026-01-10', active: true },
    { matric: 'JTM2026-0020', roomNumber: 'A-202', bed: 'Bed-2', checkIn: '2026-01-10', active: true },
    { matric: 'JTM2026-0021', roomNumber: 'A-202', bed: 'Bed-3', checkIn: '2026-01-12', active: true },
    { matric: 'JTM2026-0022', roomNumber: 'A-202', bed: 'Bed-4', checkIn: '2026-01-12', active: true },
    { matric: 'JTM2026-0023', roomNumber: 'A-203', bed: 'Bed-1', checkIn: '2026-01-15', active: true },
    { matric: 'JTM2026-0024', roomNumber: 'A-301', bed: 'Bed-1', checkIn: '2026-01-15', active: true },
    { matric: 'JTM2026-0031', roomNumber: 'B-101', bed: 'Bed-1', checkIn: '2026-01-08', active: true },
    { matric: 'JTM2026-0032', roomNumber: 'B-101', bed: 'Bed-2', checkIn: '2026-01-08', active: true },
    { matric: 'JTM2026-0033', roomNumber: 'B-101', bed: 'Bed-3', checkIn: '2026-01-09', active: true },
    { matric: 'JTM2026-0034', roomNumber: 'B-101', bed: 'Bed-4', checkIn: '2026-01-09', active: true },
    { matric: 'JTM2026-0035', roomNumber: 'B-102', bed: 'Bed-1', checkIn: '2026-01-10', active: true },
    { matric: 'JTM2026-0036', roomNumber: 'B-201', bed: 'Bed-1', checkIn: '2026-01-12', active: true },
    { matric: 'JTM2026-0037', roomNumber: 'B-201', bed: 'Bed-2', checkIn: '2026-01-12', active: true },
    { matric: 'JTM2026-0038', roomNumber: 'B-301', bed: 'Bed-1', checkIn: '2026-01-15', active: true },
    { matric: 'JTM2026-0039', roomNumber: 'B-301', bed: 'Bed-2', checkIn: '2026-01-15', active: true },
    { matric: 'JTM2026-0051', roomNumber: 'C-101', bed: 'Bed-1', checkIn: '2026-02-01', active: true },
    { matric: 'JTM2026-0052', roomNumber: 'C-201', bed: 'Bed-1', checkIn: '2026-02-01', active: true },
    { matric: 'JTM2026-0053', roomNumber: 'C-201', bed: 'Bed-2', checkIn: '2026-02-03', active: true },
    { matric: 'JTM2026-0040', roomNumber: 'B-102', bed: 'Bed-2', checkIn: '2025-09-01', active: false },
  ]

  let allocCount = 0
  for (const a of allocations) {
    const st = createdStudents.find(s => s.icMatricNo === a.matric)
    const room = createdRooms[a.roomNumber]
    if (!st || !room) continue
    await db.roomAllocation.create({
      data: {
        studentId: st.id,
        roomId: room.id,
        bedNo: a.bed,
        checkInDate: new Date(a.checkIn),
        checkOutDate: a.active ? null : new Date('2025-12-20'),
        isActive: a.active,
      },
    })
    allocCount++
  }
  console.log(`  ✓ Created ${allocCount} room allocations`)

  await db.auditLog.create({
    data: {
      action: 'SYSTEM_INIT',
      entity: 'System',
      details: 'Database seeded with dummy data per PRD Section 9',
      severity: 'info',
    },
  })

  console.log('\n✅ Seed complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Demo login credentials:')
  console.log('  Admin       : admin@jtm.gov.my / Admin@JTM2026')
  console.log('  Warden A    : warden.a@jtm.gov.my / Warden@JTM2026')
  console.log('  Warden B    : warden.b@jtm.gov.my / Warden@JTM2026')
  console.log('  Warden C    : warden.c@jtm.gov.my / Warden@JTM2026')
  console.log('  Facilities  : facilities@jtm.gov.my / Facilities@JTM2026')
  console.log('  Management  : management@jtm.gov.my / Management@JTM2026')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
