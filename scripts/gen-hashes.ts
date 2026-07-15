import bcrypt from 'bcryptjs'
const passwords = ['Admin@JTM2026', 'Warden@JTM2026', 'Facilities@JTM2026', 'Management@JTM2026']
for (const p of passwords) {
  const h = await bcrypt.hash(p, 12)
  console.log(`${p}\t${h}`)
}
