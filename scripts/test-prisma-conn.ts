import { PrismaClient } from '@prisma/client'
const url = process.env.DATABASE_URL!
console.log('URL (first 30 chars):', JSON.stringify(url.slice(0, 30)))
console.log('URL starts with postgresql://?', url.startsWith('postgresql://'))
console.log('Length:', url.length)
const db = new PrismaClient({ log: ['error', 'warn'] })
try {
  const n = await db.user.count()
  console.log('✅ User count:', n)
} catch (e: any) {
  console.log('❌', e.message.slice(0, 200))
} finally {
  await db.$disconnect()
}
