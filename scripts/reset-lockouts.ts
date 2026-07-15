import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  await db.user.updateMany({ data: { failedLoginAttempts: 0, lockedUntil: null } })
  console.log('Reset all login attempts')
}
main().then(() => db.$disconnect())
