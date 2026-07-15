# JTM Hostel Management System — Supabase Setup (COMPLETE ✅)

## Project Details
- **Project URL**: https://ltbmddnhqcoacqdckwzk.supabase.co
- **Project Ref**: `ltbmddnhqcoacqdckwzk`
- **Database**: PostgreSQL 17.6 (Supabase-managed)
- **Connection**: Session-mode pooler on `aws-0-ap-southeast-1.pooler.supabase.com:5432`
- **Status**: 🟢 LIVE — schema deployed, seed data inserted, Next.js app connected

---

## ✅ What's Been Done

### 1. Database schema deployed
All 10 tables created in `public` schema with proper constraints, indexes, and RLS:
- `users`, `sessions`, `user_block_assignments`
- `blocks`, `rooms`, `furniture_catalog`, `room_furniture`
- `students`, `room_allocations`
- `audit_log`

### 2. Row-Level Security enabled
RLS is active on all tables. Permissive SELECT policies on business tables; restrictive policies on `users`, `sessions`, `audit_log` (server-side only).

### 3. Seed data inserted (verified counts)
| Table                  | Rows | Verified |
|------------------------|------|----------|
| users                  | 6    | ✅       |
| blocks                 | 3    | ✅       |
| user_block_assignments | 3    | ✅       |
| rooms                  | 18   | ✅       |
| furniture_catalog      | 16   | ✅       |
| room_furniture         | 141  | ✅       |
| students               | 27   | ✅       |
| room_allocations       | 27   | ✅       |
| audit_log              | 1+   | ✅       |

### 4. Next.js app connected to Supabase
- `prisma/schema.prisma` updated: `provider = "postgresql"`, all fields mapped to snake_case columns, UUID types, `Decimal(5,2)` for layout positions
- `.env` updated with Supabase pooler connection string (session mode, port 5432)
- Prisma client regenerated
- Dev server running with Supabase as the database
- All API endpoints verified against Supabase:
  - `/api/auth/login` — bcrypt password verification ✅
  - `/api/dashboard` — returns live occupancy stats ✅
  - `/api/rooms` — admin sees all 18; warden sees only assigned block (RLS) ✅
  - `/api/users` — admin-only (RBAC enforced) ✅
  - `/api/blocks` POST/DELETE — CRUD writes persisted to Supabase ✅
  - `/api/audit-log` — captures all CREATE/UPDATE/DELETE/AUTH events ✅

---

## Demo Login Credentials

| Role          | Email                       | Password             |
|---------------|-----------------------------|----------------------|
| Admin         | `admin@jtm.gov.my`          | `Admin@JTM2026`      |
| Warden A      | `warden.a@jtm.gov.my`       | `Warden@JTM2026`     |
| Warden B      | `warden.b@jtm.gov.my`       | `Warden@JTM2026`     |
| Warden C      | `warden.c@jtm.gov.my`       | `Warden@JTM2026`     |
| Facilities    | `facilities@jtm.gov.my`     | `Facilities@JTM2026` |
| Management    | `management@jtm.gov.my`     | `Management@JTM2026` |

---

## Connection Details

The Next.js app uses this connection string (in `.env`):
```
DATABASE_URL="postgresql://postgres.<project-ref>:<your-password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

> Replace `<project-ref>` with your Supabase project reference (e.g. `ltbmddnhqcoacqdckwzk`) and `<your-password>` with your actual database password. URL-encode any special characters (`@` → `%40`, `#` → `%23`, etc.).

> Note: The `@` in the password is URL-encoded as `%40` per RFC 3986.
> We use the **session-mode pooler** (port 5432 on the pooler hostname) instead of transaction-mode (port 6543) because Prisma requires prepared statements, which are only supported in session mode.

---

## Files in `/home/z/my-project/download/`

1. **`supabase-setup.sql`** — The complete SQL script that was executed against your Supabase project (idempotent — safe to re-run)
2. **`SUPABASE_SETUP.md`** — This file
3. **`.env.example`** — Template with both SQLite and Supabase connection options
4. **`supabase-dashboard.png`** — Screenshot of the dashboard rendering live Supabase data
5. **`supabase-room-detail.png`** — Screenshot of room A-101 detail with furniture layout

---

## How to Verify in Supabase Dashboard

1. Go to https://supabase.com/dashboard → select your project
2. **Table Editor** → click any table to see the rows:
   - `blocks` — 3 rows (A, B, C)
   - `rooms` — 18 rows
   - `students` — 27 rows
   - `users` — 6 rows (passwords are bcrypt hashes, not plain text)
3. **SQL Editor** → run this to see live occupancy:
   ```sql
   SELECT r.room_number, b.block_code, r.status, r.capacity,
          COUNT(ra.id) AS occupants
   FROM rooms r
   JOIN blocks b ON r.block_id = b.id
   LEFT JOIN room_allocations ra ON ra.room_id = r.id AND ra.is_active = true
   GROUP BY r.room_number, b.block_code, r.status, r.capacity
   ORDER BY b.block_code, r.room_number;
   ```
4. **Authentication → Users** — note that the `users` table here is **separate** from Supabase Auth's `auth.users`. The HMS uses its own session-based auth with bcrypt-hashed passwords stored in `public.users.password_hash`. (Phase 2 could migrate to Supabase Auth if desired.)

---

## Security Notes

### Enforced in the database (Supabase/Postgres)
- ✅ Row-Level Security enabled on all 10 tables
- ✅ Foreign-key constraints with `ON DELETE CASCADE` / `SET NULL`
- ✅ CHECK constraints on all enum columns (role, status, condition, gender, etc.)
- ✅ UNIQUE constraints (email, block_code, ic_matric_no, room+block, user+block)
- ✅ bcrypt-hashed passwords (12 rounds) — never stored as plain text

### Enforced in the Next.js API layer (server-side)
- ✅ Session token validation (httpOnly + SameSite=Strict cookie, 8-hour TTL)
- ✅ Role-Based Access Control (Admin/Warden/Facilities/Management/Viewer)
- ✅ Warden RLS — can only access rooms/students in assigned blocks
- ✅ Account lockout after 5 failed login attempts (15-min cooldown)
- ✅ Rate limiting (10 login attempts / IP / minute; 30 API requests / IP / minute)
- ✅ Audit logging of every CREATE / UPDATE / DELETE / LOGIN / LOGOUT event
- ✅ Input sanitization (control chars stripped, length-capped)
- ✅ Password strength validation (8+ chars, upper+lower+number+symbol)
- ✅ Cascade-safety checks (can't delete block with rooms, room with active allocations, etc.)
- ✅ Capacity & bed-uniqueness enforcement on allocations
- ✅ Gender-mismatch prevention on allocation (except Mixed blocks)

---

## Troubleshooting

**Q: The dev server is using SQLite again after a restart**
A: The shell environment may have a stale `DATABASE_URL`. To use Supabase, start the dev server with the env override:
```bash
cd /path/to/Hostel-Management-System
export DATABASE_URL="postgresql://postgres.<project-ref>:<your-password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
bun run dev
```

**Q: I want to switch back to local SQLite for development**
A: Revert `prisma/schema.prisma` `provider` to `"sqlite"`, remove the `@db.Uuid` / `@db.Decimal` / `@map` annotations, set `DATABASE_URL="file:/home/z/my-project/db/custom.db"` in `.env`, then run `bun run db:push` and `bun run scripts/seed.ts`.

**Q: I want to reset the Supabase database**
A: Re-run the `supabase-setup.sql` script in the Supabase SQL Editor — it drops and recreates everything.

**Q: Prisma error "prepared statement s0 already exists"**
A: This happens if you use the transaction-mode pooler (port 6543). Use the session-mode pooler (port 5432) instead — the connection string in `.env` is already configured for this.

**Q: I changed the password and now the app can't connect**
A: Update the password in `.env` (remember to URL-encode `@` as `%40`, `#` as `%23`, etc.), then restart the dev server with the env override as shown above.
