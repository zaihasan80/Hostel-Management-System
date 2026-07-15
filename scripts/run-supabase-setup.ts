/**
 * Connect to Supabase Postgres with the provided password and execute the SQL setup script.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD='your-password' bun run scripts/run-supabase-setup.ts
 *
 * Or set the password inline below (NOT recommended for shared repos).
 */
import { Client } from 'pg'
import { readFileSync } from 'fs'

const PASSWORD = process.env.SUPABASE_DB_PASSWORD
if (!PASSWORD) {
  console.error('❌ Set SUPABASE_DB_PASSWORD env var before running this script.')
  console.error('   Example: SUPABASE_DB_PASSWORD="your-password" bun run scripts/run-supabase-setup.ts')
  process.exit(1)
}

// Try pooler first (more permissive on network), then direct connection
const configs = [
  {
    name: 'Pooler (port 6543, transaction mode)',
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ltbmddnhqcoacqdckwzk',
  },
  {
    name: 'Direct (port 5432)',
    host: 'db.ltbmddnhqcoacqdckwzk.supabase.co',
    port: 5432,
    user: 'postgres',
  },
  {
    name: 'Pooler Session mode (port 5432)',
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ltbmddnhqcoacqdckwzk',
  },
]

let connectedClient: Client | null = null
let usedConfig: string = ''

for (const cfg of configs) {
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: PASSWORD,
    database: 'postgres',
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
  })
  try {
    console.log(`→ Trying ${cfg.name}...`)
    await client.connect()
    const r = await client.query('SELECT version()')
    console.log(`✅ Connected via ${cfg.name}`)
    console.log(`   Postgres: ${r.rows[0].version.slice(0, 80)}`)
    connectedClient = client
    usedConfig = cfg.name
    break
  } catch (e: any) {
    console.log(`❌ ${cfg.name}: ${e.code} — ${e.message.slice(0, 80)}`)
    try { await client.end() } catch {}
  }
}

if (!connectedClient) {
  console.error('\n⚠️  Could not connect with any Supabase endpoint.')
  process.exit(1)
}

// Read and execute the SQL setup script
console.log('\n📄 Reading supabase-setup.sql...')
const sql = readFileSync('/home/z/my-project/download/supabase-setup.sql', 'utf8')

console.log(`   Script size: ${sql.length} chars, ${sql.split('\n').length} lines`)

// pg's query() can run multiple statements when separated by semicolons
console.log('\n🚀 Executing SQL script (this may take 10–30 seconds)...')
try {
  await connectedClient.query(sql)
  console.log('✅ SQL script executed successfully!')
} catch (e: any) {
  console.error('❌ SQL execution failed:', e.message)
  console.error('   At position:', e.position || 'n/a')
  await connectedClient.end()
  process.exit(1)
}

// Verify row counts
console.log('\n🔍 Verifying row counts...')
const counts = await connectedClient.query(`
  select 'users'          as t, count(*)::text as n from users
  union all select 'blocks',          count(*)::text from blocks
  union all select 'user_block_assignments', count(*)::text from user_block_assignments
  union all select 'rooms',          count(*)::text from rooms
  union all select 'furniture_catalog', count(*)::text from furniture_catalog
  union all select 'room_furniture', count(*)::text from room_furniture
  union all select 'students',       count(*)::text from students
  union all select 'room_allocations', count(*)::text from room_allocations
  union all select 'audit_log',      count(*)::text from audit_log
  order by t
`)

console.log('\n📊 Final table counts:')
console.log('─'.repeat(40))
for (const row of counts.rows) {
  console.log(`  ${row.t.padEnd(28)} ${row.n}`)
}
console.log('─'.repeat(40))

// Quick sanity check — fetch the seeded admin user
const admin = await connectedClient.query("SELECT email, full_name, role, status FROM users WHERE email='admin@jtm.gov.my'")
if (admin.rows.length > 0) {
  console.log('\n✅ Admin user verified:')
  console.log(`   ${admin.rows[0].email} — ${admin.rows[0].full_name} (${admin.rows[0].role} / ${admin.rows[0].status})`)
} else {
  console.log('\n⚠️  Admin user not found in database.')
}

// Verify a sample room
const room = await connectedClient.query(`
  SELECT r.room_number, r.status, r.capacity,
    (SELECT count(*) FROM room_allocations ra WHERE ra.room_id = r.id AND ra.is_active = true) AS occupants
  FROM rooms r
  WHERE r.room_number = 'A-101'
`)
if (room.rows.length > 0) {
  const r = room.rows[0]
  console.log(`\n✅ Sample room A-101 verified: ${r.status}, ${r.occupants}/${r.capacity} occupants`)
}

await connectedClient.end()
console.log('\n🎉 Supabase setup complete! Database is ready for the HMS application.')
