/**
 * Test direct Postgres connection to Supabase with various password candidates.
 */
import { Client } from 'pg'

const HOST = 'aws-0-ap-southeast-1.pooler.supabase.com'
const PORT = 6543
const USER = 'postgres.ltbmddnhqcoacqdckwzk'
const DB = 'postgres'

const candidates = [
  process.env.SUPABASE_DB_PASSWORD,  // explicit env if set
  'sb_publishable_EmrR2YvglSlooCggOBwAqg_J4P1d_MN',  // publishable key
  '',  // empty
  'postgres',  // default
  'ltbmddnhqcoacqdckwzk',  // project ref
]

for (const pwd of candidates) {
  if (pwd === undefined) continue
  const client = new Client({
    host: HOST,
    port: PORT,
    user: USER,
    password: pwd,
    database: DB,
    connectionTimeoutMillis: 8000,
    ssl: { rejectUnauthorized: false },
  })
  try {
    await client.connect()
    const r = await client.query('SELECT version()')
    console.log('✅ SUCCESS with password:', JSON.stringify(pwd.slice(0, 20) + (pwd.length > 20 ? '...' : '')))
    console.log('   Postgres version:', r.rows[0].version.slice(0, 60))
    await client.end()
    process.exit(0)
  } catch (e: any) {
    console.log('❌ FAIL with password:', JSON.stringify(pwd.slice(0, 20) + (pwd.length > 20 ? '...' : '')), '—', e.code, e.message.slice(0, 80))
  } finally {
    try { await client.end() } catch {}
  }
}

console.log('\n⚠️  No password candidate worked. User needs to provide the actual DB password.')
process.exit(1)
