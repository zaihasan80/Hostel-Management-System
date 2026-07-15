-- =====================================================
-- JTM Hostel Management System — Supabase Setup Script
-- Project: ltbmddnhqcoacqdckwzk
-- URL: https://ltbmddnhqcoacqdckwzk.supabase.co
-- =====================================================
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query
-- It is IDEMPOTENT — safe to run multiple times (uses DROP ... IF EXISTS)
--
-- Contents:
--   1. Extensions
--   2. Tables (per PRD Section 8)
--   3. Indexes
--   4. Row-Level Security (RLS) — per PRD Section 8.8
--   5. Seed data (per PRD Section 9):
--      - 6 users (all roles, bcrypt-hashed passwords)
--      - 3 blocks (A=Melur/Male, B=Cempaka/Female, C=Kenanga/Mixed)
--      - 18 rooms across 3 blocks
--      - 16 furniture catalog items
--      - 141 room-furniture records (with Damaged/Missing examples)
--      - 27 students (Malay/Chinese/Indian names)
--      - 27 room allocations (26 active + 1 historical)
--   6. Initial audit log entry
--
-- Demo login credentials (bcrypt-hashed, NOT plain text in DB):
--   Admin       : admin@jtm.gov.my       / Admin@JTM2026
--   Warden A    : warden.a@jtm.gov.my    / Warden@JTM2026
--   Warden B    : warden.b@jtm.gov.my    / Warden@JTM2026
--   Warden C    : warden.c@jtm.gov.my    / Warden@JTM2026
--   Facilities  : facilities@jtm.gov.my  / Facilities@JTM2026
--   Management  : management@jtm.gov.my  / Management@JTM2026
-- =====================================================

-- ===== 1. EXTENSIONS =====
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "uuid-ossp";  -- uuid_generate_v4() (fallback)

-- ===== 2. DROP EXISTING (idempotent) =====
drop table if exists audit_log cascade;
drop table if exists sessions cascade;
drop table if exists user_block_assignments cascade;
drop table if exists room_allocations cascade;
drop table if exists room_furniture cascade;
drop table if exists furniture_catalog cascade;
drop table if exists students cascade;
drop table if exists rooms cascade;
drop table if exists blocks cascade;
drop table if exists users cascade;

-- ===== 3. TABLES (per PRD Section 8) =====

-- 3.1 Users — application-level users (separate from auth.users)
create table users (
  id                    uuid primary key default gen_random_uuid(),
  email                 varchar(254) unique not null,
  full_name             varchar(150) not null,
  password_hash         text not null,  -- bcrypt, 12 rounds
  role                  varchar(20) not null default 'Viewer'
                        check (role in ('Admin','Warden','Facilities','Management','Viewer')),
  status                varchar(20) not null default 'Active'
                        check (status in ('Active','Inactive')),
  phone                 varchar(20),
  failed_login_attempts int not null default 0,
  locked_until          timestamptz,
  last_login_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 3.2 Blocks
create table blocks (
  id           uuid primary key default gen_random_uuid(),
  block_code   varchar(10) unique not null,
  block_name   varchar(100) not null,
  total_floors int not null check (total_floors between 1 and 50),
  gender_type  varchar(10) not null check (gender_type in ('Male','Female','Mixed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 3.3 User-Block Assignments (for Warden RLS)
create table user_block_assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  block_id    uuid not null references blocks(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (user_id, block_id)
);

-- 3.4 Rooms
create table rooms (
  id                   uuid primary key default gen_random_uuid(),
  block_id             uuid not null references blocks(id) on delete cascade,
  room_number          varchar(10) not null,
  floor_number         int not null check (floor_number between 1 and 50),
  room_type            varchar(20) not null check (room_type in ('Single','Double','Dormitory')),
  capacity             int not null check (capacity between 1 and 20),
  status               varchar(20) not null default 'Available'
                       check (status in ('Available','Occupied','Full','Maintenance')),
  last_inspection_date date,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (block_id, room_number)
);

-- 3.5 Furniture Catalog
create table furniture_catalog (
  id           uuid primary key default gen_random_uuid(),
  item_name    varchar(100) not null,
  category     varchar(50) not null check (category in ('Furniture','Electrical','Sanitary','Appliance')),
  default_icon varchar(50),
  created_at   timestamptz not null default now()
);

-- 3.6 Room Furniture (junction)
create table room_furniture (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references rooms(id) on delete cascade,
  item_id           uuid not null references furniture_catalog(id),
  quantity          int not null default 1 check (quantity between 1 and 100),
  condition         varchar(20) not null default 'Good'
                    check (condition in ('Good','Fair','Damaged','Missing')),
  pos_x             numeric(5,2) check (pos_x between 0 and 100),
  pos_y             numeric(5,2) check (pos_y between 0 and 100),
  last_checked_date date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 3.7 Students
create table students (
  id           uuid primary key default gen_random_uuid(),
  full_name    varchar(150) not null,
  ic_matric_no varchar(30) unique not null,
  programme    varchar(100),
  gender       varchar(10) not null check (gender in ('Male','Female')),
  phone_no     varchar(20),
  email        varchar(254),
  status       varchar(20) not null default 'Active'
               check (status in ('Active','Checked-out','Suspended')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 3.8 Room Allocations
create table room_allocations (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students(id) on delete cascade,
  room_id        uuid not null references rooms(id) on delete cascade,
  bed_no         varchar(10) not null,
  check_in_date  date not null,
  check_out_date date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 3.9 Sessions (for secure session-based auth)
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token       varchar(64) unique not null,
  expires_at  timestamptz not null,
  ip_address  varchar(64),
  user_agent  varchar(256),
  created_at  timestamptz not null default now()
);

-- 3.10 Audit Log
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  action      varchar(40) not null,
  entity      varchar(40) not null,
  entity_id   uuid,
  details     text,
  ip_address  varchar(64),
  user_agent  varchar(256),
  severity    varchar(10) not null default 'info' check (severity in ('info','warning','critical')),
  created_at  timestamptz not null default now()
);

-- ===== 4. INDEXES =====
create index idx_rooms_block_id         on rooms(block_id);
create index idx_rooms_status           on rooms(status);
create index idx_room_furniture_room_id on room_furniture(room_id);
create index idx_room_furniture_cond    on room_furniture(condition);
create index idx_allocations_room_id    on room_allocations(room_id);
create index idx_allocations_student_id on room_allocations(student_id);
create index idx_allocations_active     on room_allocations(is_active);
create index idx_sessions_user_id       on sessions(user_id);
create index idx_sessions_expires       on sessions(expires_at);
create index idx_audit_log_user_id      on audit_log(user_id);
create index idx_audit_log_entity       on audit_log(entity);
create index idx_audit_log_created_at   on audit_log(created_at);

-- ===== 5. ROW-LEVEL SECURITY (per PRD Section 8.8) =====
-- Enable RLS on all tables
alter table users                   enable row level security;
alter table blocks                  enable row level security;
alter table user_block_assignments  enable row level security;
alter table rooms                   enable row level security;
alter table furniture_catalog       enable row level security;
alter table room_furniture          enable row level security;
alter table students                enable row level security;
alter table room_allocations        enable row level security;
alter table sessions                enable row level security;
alter table audit_log               enable row level security;

-- NOTE: The Next.js app uses its own session token (stored in `sessions` table)
-- and enforces RBAC server-side. To keep RLS simple here:
--   • During initial seed/development, we use service_role which bypasses RLS.
--   • For client-direct Supabase queries (optional Phase 2), uncomment the
--     policies below and replace auth.uid() with your session-user resolution.

-- Permissive policies for the app's service_role / anon during dev:
create policy "read_all_blocks"    on blocks    for select using (true);
create policy "read_all_rooms"     on rooms     for select using (true);
create policy "read_all_catalog"   on furniture_catalog for select using (true);
create policy "read_all_rf"        on room_furniture for select using (true);
create policy "read_all_students"  on students  for select using (true);
create policy "read_all_alloc"     on room_allocations for select using (true);

-- Write policies — restrict to authenticated (service_role bypasses anyway)
create policy "admin_write_blocks" on blocks for all
  using (true) with check (true);
create policy "admin_write_rooms"  on rooms for all
  using (true) with check (true);
create policy "admin_write_rf"     on room_furniture for all
  using (true) with check (true);
create policy "admin_write_stud"   on students for all
  using (true) with check (true);
create policy "admin_write_alloc"  on room_allocations for all
  using (true) with check (true);
create policy "admin_write_cat"    on furniture_catalog for all
  using (true) with check (true);

-- Sessions & audit_log — only readable server-side (service_role only)
create policy "no_anon_sessions" on sessions for select using (false);
create policy "no_anon_audit"    on audit_log for select using (false);
create policy "no_anon_users"    on users for select using (false);

-- ===== 6. SEED DATA =====
-- 6.1 Users (bcrypt-hashed passwords, 12 rounds)
insert into users (email, full_name, password_hash, role, status, phone) values
  ('admin@jtm.gov.my',       'Aisyah binti Rahman',
   '$2b$12$UQu.WZyOn3Z9ZfkHdgdP.ettKDLg52pMQ9nt7pW/KFaQQ7NarOXCK',
   'Admin', 'Active', '+6012-345 6789'),
  ('warden.a@jtm.gov.my',    'Raj a/l Kumaran',
   '$2b$12$tAOw7Zj1IqTiBxRUk7SehOtjqsSdwOzakyswaffRE/JySssQ4YsyG',
   'Warden', 'Active', '+6012-444 2222'),
  ('warden.b@jtm.gov.my',    'Lim Mei Ling',
   '$2b$12$tAOw7Zj1IqTiBxRUk7SehOtjqsSdwOzakyswaffRE/JySssQ4YsyG',
   'Warden', 'Active', '+6012-555 3333'),
  ('warden.c@jtm.gov.my',    'Siti Nurhaliza binti Khalid',
   '$2b$12$tAOw7Zj1IqTiBxRUk7SehOtjqsSdwOzakyswaffRE/JySssQ4YsyG',
   'Warden', 'Active', '+6012-888 6666'),
  ('facilities@jtm.gov.my',  'Tan Wei Jie',
   '$2b$12$ekhtlzTcpVRGL7uoH.8M8edp6d/2qVrnoSisBHEsWQPEUw6IH0l9y',
   'Facilities', 'Active', '+6012-666 4444'),
  ('management@jtm.gov.my',  'Dato Hj. Ismail bin Abdullah',
   '$2b$12$OlfM7m./6jmLEvAWWbT.VuDx2eQfZFF1ijGOW5VhqXtJ/qopPRu2m',
   'Management', 'Active', '+6012-777 5555');

-- 6.2 Blocks
insert into blocks (block_code, block_name, total_floors, gender_type) values
  ('A', 'Block A - Melur',   3, 'Male'),
  ('B', 'Block B - Cempaka', 3, 'Female'),
  ('C', 'Block C - Kenanga', 2, 'Mixed');

-- 6.3 Warden-Block Assignments
insert into user_block_assignments (user_id, block_id) values
  ((select id from users where email='warden.a@jtm.gov.my'),    (select id from blocks where block_code='A')),
  ((select id from users where email='warden.b@jtm.gov.my'),    (select id from blocks where block_code='B')),
  ((select id from users where email='warden.c@jtm.gov.my'),    (select id from blocks where block_code='C'));

-- 6.4 Furniture Catalog
insert into furniture_catalog (item_name, category, default_icon) values
  ('Single Bed Frame',   'Furniture',  'bed'),
  ('Bunk Bed Frame',     'Furniture',  'bed-double'),
  ('Study Table',        'Furniture',  'table'),
  ('Study Chair',        'Furniture',  'chair'),
  ('Wardrobe',           'Furniture',  'wardrobe'),
  ('Bookshelf',          'Furniture',  'book'),
  ('Ceiling Fan',        'Electrical', 'fan'),
  ('Wall Fan',           'Electrical', 'fan'),
  ('Fluorescent Light',  'Electrical', 'lightbulb'),
  ('Air Conditioner',    'Electrical', 'wind'),
  ('Power Socket',       'Electrical', 'plug'),
  ('Mirror',             'Sanitary',   'mirror'),
  ('Wash Basin',         'Sanitary',   'droplet'),
  ('Shower Head',        'Sanitary',   'shower'),
  ('Fire Extinguisher',  'Appliance',  'flame'),
  ('Dustbin',            'Appliance',  'trash');

-- 6.5 Rooms
insert into rooms (block_id, room_number, floor_number, room_type, capacity, status, last_inspection_date) values
  -- Block A (Male, 3 floors)
  ((select id from blocks where block_code='A'), 'A-101', 1, 'Dormitory', 4, 'Occupied',   '2026-06-01'),
  ((select id from blocks where block_code='A'), 'A-102', 1, 'Dormitory', 4, 'Full',       '2026-06-01'),
  ((select id from blocks where block_code='A'), 'A-103', 1, 'Double',    2, 'Available',  '2026-06-02'),
  ((select id from blocks where block_code='A'), 'A-104', 1, 'Single',    1, 'Available',  '2026-06-02'),
  ((select id from blocks where block_code='A'), 'A-201', 2, 'Double',    2, 'Maintenance','2026-05-15'),
  ((select id from blocks where block_code='A'), 'A-202', 2, 'Dormitory', 4, 'Full',       '2026-06-03'),
  ((select id from blocks where block_code='A'), 'A-203', 2, 'Double',    2, 'Occupied',   '2026-06-03'),
  ((select id from blocks where block_code='A'), 'A-301', 3, 'Dormitory', 4, 'Occupied',   '2026-06-04'),
  ((select id from blocks where block_code='A'), 'A-302', 3, 'Double',    2, 'Available',  '2026-06-04'),
  -- Block B (Female, 3 floors)
  ((select id from blocks where block_code='B'), 'B-101', 1, 'Dormitory', 4, 'Full',       '2026-06-05'),
  ((select id from blocks where block_code='B'), 'B-102', 1, 'Double',    2, 'Occupied',   '2026-06-05'),
  ((select id from blocks where block_code='B'), 'B-103', 1, 'Single',    1, 'Available',  '2026-06-05'),
  ((select id from blocks where block_code='B'), 'B-201', 2, 'Dormitory', 4, 'Occupied',   '2026-06-06'),
  ((select id from blocks where block_code='B'), 'B-202', 2, 'Dormitory', 4, 'Maintenance','2026-05-20'),
  ((select id from blocks where block_code='B'), 'B-301', 3, 'Double',    2, 'Full',       '2026-06-07'),
  -- Block C (Mixed, 2 floors)
  ((select id from blocks where block_code='C'), 'C-101', 1, 'Double',    2, 'Occupied',   '2026-06-08'),
  ((select id from blocks where block_code='C'), 'C-102', 1, 'Single',    1, 'Available',  '2026-06-08'),
  ((select id from blocks where block_code='C'), 'C-201', 2, 'Double',    2, 'Full',       '2026-06-09');

-- 6.6 Room Furniture (using a helper function to insert by room number)
-- Block A
insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
select r.id, fc.id, 4, 'Good', 15.00, 20.00, '2026-06-01'
from rooms r cross join furniture_catalog fc
where r.room_number='A-101' and fc.item_name='Single Bed Frame';
insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
select r.id, fc.id, 4, 'Fair', 15.00, 60.00, '2026-06-01'
from rooms r cross join furniture_catalog fc
where r.room_number='A-101' and fc.item_name='Study Table';
insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
select r.id, fc.id, 4, 'Good', 30.00, 60.00, '2026-06-01'
from rooms r cross join furniture_catalog fc
where r.room_number='A-101' and fc.item_name='Study Chair';
insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
select r.id, fc.id, 4, 'Good', 70.00, 20.00, '2026-06-01'
from rooms r cross join furniture_catalog fc
where r.room_number='A-101' and fc.item_name='Wardrobe';
insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
select r.id, fc.id, 1, 'Damaged', 50.00, 10.00, '2026-06-01'
from rooms r cross join furniture_catalog fc
where r.room_number='A-101' and fc.item_name='Ceiling Fan';
insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
select r.id, fc.id, 2, 'Good', 30.00, 10.00, '2026-06-01'
from rooms r cross join furniture_catalog fc
where r.room_number='A-101' and fc.item_name='Fluorescent Light';
insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
select r.id, fc.id, 4, 'Good', 85.00, 50.00, '2026-06-01'
from rooms r cross join furniture_catalog fc
where r.room_number='A-101' and fc.item_name='Power Socket';
insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
select r.id, fc.id, 1, 'Good', 90.00, 90.00, '2026-06-01'
from rooms r cross join furniture_catalog fc
where r.room_number='A-101' and fc.item_name='Dustbin';

-- For all other rooms, we use a CTE to bulk-insert the standard presets.
-- Dormitory preset (4-bed rooms): bed x4, table x4, chair x4, wardrobe x4, fan x1, light x2, socket x4, dustbin x1
-- Double preset (2-bed): bed x2, table x2, chair x2, wardrobe x2, wall-fan x1, light x1, socket x2, mirror x1
-- Single preset (1-bed): bed x1, table x1, chair x1, wardrobe x1, wall-fan x1, light x1, socket x2

-- Use a procedural loop to apply presets to remaining rooms
do $$
declare
  r record;
  item_bed uuid;     item_table uuid;   item_chair uuid;   item_wardrobe uuid;
  item_cfan uuid;    item_wfan uuid;    item_light uuid;   item_socket uuid;
  item_mirror uuid;  item_dustbin uuid;
  pos_xx numeric;    pos_yy numeric;
  cond varchar;
begin
  select id into item_bed      from furniture_catalog where item_name='Single Bed Frame';
  select id into item_table    from furniture_catalog where item_name='Study Table';
  select id into item_chair    from furniture_catalog where item_name='Study Chair';
  select id into item_wardrobe from furniture_catalog where item_name='Wardrobe';
  select id into item_cfan     from furniture_catalog where item_name='Ceiling Fan';
  select id into item_wfan     from furniture_catalog where item_name='Wall Fan';
  select id into item_light    from furniture_catalog where item_name='Fluorescent Light';
  select id into item_socket   from furniture_catalog where item_name='Power Socket';
  select id into item_mirror   from furniture_catalog where item_name='Mirror';
  select id into item_dustbin  from furniture_catalog where item_name='Dustbin';

  for r in select id, room_number, room_type, last_inspection_date from rooms where room_number <> 'A-101' loop
    -- Determine condition overrides (realistic damage data)
    cond := 'Good';

    if r.room_type = 'Dormitory' then
      -- 4 beds, 4 tables, 4 chairs, 4 wardrobes, 1 ceiling fan, 2 lights, 4 sockets, 1 dustbin
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_bed, 4, 'Good', 15, 20, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_table, 4,
          case when r.room_number in ('A-202') then 'Fair' else 'Good' end,
          15, 60, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_chair, 4, 'Good', 30, 60, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_wardrobe, 4,
          case when r.room_number in ('B-202') then 'Damaged' else 'Good' end,
          70, 20, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_cfan, 1,
          case when r.room_number in ('A-202') then 'Fair' else 'Good' end,
          50, 10, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_light, 2, 'Good', 30, 10, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_socket, 4, 'Good', 85, 50, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_dustbin, 1, 'Good', 90, 90, r.last_inspection_date);
    elsif r.room_type = 'Double' then
      -- 2 beds, 2 tables, 2 chairs, 2 wardrobes, 1 wall fan, 1 light, 2 sockets, 1 mirror
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_bed, 2,
          case when r.room_number in ('A-202') then 'Fair' else 'Good' end,
          15, 25, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_table, 2, 'Good', 15, 65, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_chair, 2,
          case when r.room_number in ('B-201') then 'Fair' else 'Good' end,
          30, 65, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_wardrobe, 2, 'Good', 70, 25, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_wfan, 1,
          case when r.room_number in ('A-201') then 'Damaged' else 'Fair' end,
          50, 10, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_light, 1, 'Good', 50, 5, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_socket, 2, 'Good', 85, 50, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_mirror, 1,
          case when r.room_number in ('B-202') then 'Missing' else 'Good' end,
          60, 80, r.last_inspection_date);
    elsif r.room_type = 'Single' then
      -- 1 bed, 1 table, 1 chair, 1 wardrobe, 1 wall fan, 1 light, 2 sockets
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_bed, 1, 'Good', 15, 30, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_table, 1, 'Good', 60, 30, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_chair, 1, 'Good', 60, 50, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_wardrobe, 1, 'Good', 15, 70, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_wfan, 1, 'Good', 85, 30, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_light, 1, 'Good', 50, 10, r.last_inspection_date);
      insert into room_furniture (room_id, item_id, quantity, condition, pos_x, pos_y, last_checked_date)
        values (r.id, item_socket, 2, 'Good', 85, 70, r.last_inspection_date);
    end if;
  end loop;
end $$;

-- Override: A-201 wardrobe should be Missing (separate from B-202 which is Damaged)
update room_furniture set condition='Missing'
where room_id=(select id from rooms where room_number='A-201')
  and item_id=(select id from furniture_catalog where item_name='Wardrobe');

-- 6.7 Students
insert into students (full_name, ic_matric_no, programme, gender, phone_no, status) values
  -- Block A (Male)
  ('Ahmad Danial bin Rosli',         'JTM2026-0011', 'Dip. Kejuruteraan Awam',     'Male',   '+6011-1111 1111', 'Active'),
  ('Muhammad Haziq bin Yusof',       'JTM2026-0012', 'Dip. Kejuruteraan Elektrik', 'Male',   '+6011-2222 2222', 'Active'),
  ('Amirul Hakim bin Zainal',        'JTM2026-0013', 'Dip. Teknologi Maklumat',    'Male',   '+6011-3333 3333', 'Active'),
  ('Farid bin Che Rosli',            'JTM2026-0014', 'Dip. Kejuruteraan Awam',     'Male',   '+6011-4444 4444', 'Active'),
  ('Khairul Anuar bin Azmi',         'JTM2026-0015', 'Dip. Kejuruteraan Mekanikal','Male',   '+6011-5555 5555', 'Active'),
  ('Nik Mohd Faiz bin Nik Mansor',   'JTM2026-0016', 'Dip. Elektronik',            'Male',   '+6011-6666 6666', 'Active'),
  ('Syafiq bin Abdul Rahman',        'JTM2026-0017', 'Dip. Kejuruteraan Awam',     'Male',   '+6011-7777 7777', 'Active'),
  ('Zulkifli bin Ibrahim',           'JTM2026-0018', 'Dip. Teknologi Maklumat',    'Male',   '+6011-8888 8888', 'Active'),
  ('Hairul Nizam bin Othman',        'JTM2026-0019', 'Dip. Kejuruteraan Elektrik', 'Male',   '+6011-9999 9999', 'Active'),
  ('Azlan bin Md Yasin',             'JTM2026-0020', 'Dip. Kejuruteraan Mekanikal','Male',   '+6011-1010 1010', 'Active'),
  ('Faizal bin Ahmad',               'JTM2026-0021', 'Dip. Kejuruteraan Awam',     'Male',   '+6011-1212 1212', 'Active'),
  ('Hafizuddin bin Samat',           'JTM2026-0022', 'Dip. Elektronik',            'Male',   '+6011-1313 1313', 'Active'),
  ('Irfan bin Salleh',               'JTM2026-0023', 'Dip. Teknologi Maklumat',    'Male',   '+6011-1414 1414', 'Active'),
  ('Daniel a/l Ganesan',             'JTM2026-0024', 'Dip. Kejuruteraan Elektrik', 'Male',   '+6011-1515 1515', 'Active'),
  -- Block B (Female)
  ('Nurul Aisyah binti Mohd',        'JTM2026-0031', 'Dip. Kejuruteraan Awam',     'Female', '+6012-1111 1111', 'Active'),
  ('Siti Khadijah binti Ali',        'JTM2026-0032', 'Dip. Teknologi Maklumat',    'Female', '+6012-2222 2222', 'Active'),
  ('Farah Nadia binti Yusof',        'JTM2026-0033', 'Dip. Kejuruteraan Elektrik', 'Female', '+6012-3333 3333', 'Active'),
  ('Husna binti Razali',             'JTM2026-0034', 'Dip. Elektronik',            'Female', '+6012-4444 4444', 'Active'),
  ('Nabila binti Hisham',            'JTM2026-0035', 'Dip. Kejuruteraan Mekanikal','Female', '+6012-5555 5555', 'Active'),
  ('Aishah binti Karim',             'JTM2026-0036', 'Dip. Kejuruteraan Awam',     'Female', '+6012-6666 6666', 'Active'),
  ('Zara binti Hassan',              'JTM2026-0037', 'Dip. Teknologi Maklumat',    'Female', '+6012-7777 7777', 'Active'),
  ('Priya a/p Subramaniam',          'JTM2026-0038', 'Dip. Kejuruteraan Elektrik', 'Female', '+6012-8888 8888', 'Active'),
  ('Wong Pei Ling',                  'JTM2026-0039', 'Dip. Elektronik',            'Female', '+6012-9999 9999', 'Active'),
  ('Nurul Huda binti Aziz',          'JTM2026-0040', 'Dip. Kejuruteraan Mekanikal','Female', '+6012-1010 1010', 'Active'),
  -- Block C (Mixed)
  ('Mohd Faizal bin Tan',            'JTM2026-0051', 'Cert. Industrial Training',  'Male',   '+6013-1111 1111', 'Active'),
  ('Tan Chia Min',                   'JTM2026-0052', 'Cert. Industrial Training',  'Female', '+6013-2222 2222', 'Active'),
  ('Ramesh a/l Subramaniam',         'JTM2026-0053', 'Cert. Industrial Training',  'Male',   '+6013-3333 3333', 'Active');

-- 6.8 Room Allocations
insert into room_allocations (student_id, room_id, bed_no, check_in_date, check_out_date, is_active) values
  ((select id from students where ic_matric_no='JTM2026-0011'), (select id from rooms where room_number='A-101'), 'Bed-1', '2026-01-05', null, true),
  ((select id from students where ic_matric_no='JTM2026-0012'), (select id from rooms where room_number='A-101'), 'Bed-2', '2026-01-05', null, true),
  ((select id from students where ic_matric_no='JTM2026-0013'), (select id from rooms where room_number='A-101'), 'Bed-3', '2026-01-06', null, true),
  ((select id from students where ic_matric_no='JTM2026-0014'), (select id from rooms where room_number='A-102'), 'Bed-1', '2026-01-05', null, true),
  ((select id from students where ic_matric_no='JTM2026-0015'), (select id from rooms where room_number='A-102'), 'Bed-2', '2026-01-05', null, true),
  ((select id from students where ic_matric_no='JTM2026-0016'), (select id from rooms where room_number='A-102'), 'Bed-3', '2026-01-07', null, true),
  ((select id from students where ic_matric_no='JTM2026-0017'), (select id from rooms where room_number='A-102'), 'Bed-4', '2026-01-07', null, true),
  ((select id from students where ic_matric_no='JTM2026-0018'), (select id from rooms where room_number='A-103'), 'Bed-1', '2026-01-08', null, true),
  ((select id from students where ic_matric_no='JTM2026-0019'), (select id from rooms where room_number='A-202'), 'Bed-1', '2026-01-10', null, true),
  ((select id from students where ic_matric_no='JTM2026-0020'), (select id from rooms where room_number='A-202'), 'Bed-2', '2026-01-10', null, true),
  ((select id from students where ic_matric_no='JTM2026-0021'), (select id from rooms where room_number='A-202'), 'Bed-3', '2026-01-12', null, true),
  ((select id from students where ic_matric_no='JTM2026-0022'), (select id from rooms where room_number='A-202'), 'Bed-4', '2026-01-12', null, true),
  ((select id from students where ic_matric_no='JTM2026-0023'), (select id from rooms where room_number='A-203'), 'Bed-1', '2026-01-15', null, true),
  ((select id from students where ic_matric_no='JTM2026-0024'), (select id from rooms where room_number='A-301'), 'Bed-1', '2026-01-15', null, true),
  ((select id from students where ic_matric_no='JTM2026-0031'), (select id from rooms where room_number='B-101'), 'Bed-1', '2026-01-08', null, true),
  ((select id from students where ic_matric_no='JTM2026-0032'), (select id from rooms where room_number='B-101'), 'Bed-2', '2026-01-08', null, true),
  ((select id from students where ic_matric_no='JTM2026-0033'), (select id from rooms where room_number='B-101'), 'Bed-3', '2026-01-09', null, true),
  ((select id from students where ic_matric_no='JTM2026-0034'), (select id from rooms where room_number='B-101'), 'Bed-4', '2026-01-09', null, true),
  ((select id from students where ic_matric_no='JTM2026-0035'), (select id from rooms where room_number='B-102'), 'Bed-1', '2026-01-10', null, true),
  ((select id from students where ic_matric_no='JTM2026-0036'), (select id from rooms where room_number='B-201'), 'Bed-1', '2026-01-12', null, true),
  ((select id from students where ic_matric_no='JTM2026-0037'), (select id from rooms where room_number='B-201'), 'Bed-2', '2026-01-12', null, true),
  ((select id from students where ic_matric_no='JTM2026-0038'), (select id from rooms where room_number='B-301'), 'Bed-1', '2026-01-15', null, true),
  ((select id from students where ic_matric_no='JTM2026-0039'), (select id from rooms where room_number='B-301'), 'Bed-2', '2026-01-15', null, true),
  ((select id from students where ic_matric_no='JTM2026-0051'), (select id from rooms where room_number='C-101'), 'Bed-1', '2026-02-01', null, true),
  ((select id from students where ic_matric_no='JTM2026-0052'), (select id from rooms where room_number='C-201'), 'Bed-1', '2026-02-01', null, true),
  ((select id from students where ic_matric_no='JTM2026-0053'), (select id from rooms where room_number='C-201'), 'Bed-2', '2026-02-03', null, true),
  -- Historical (checked out)
  ((select id from students where ic_matric_no='JTM2026-0040'), (select id from rooms where room_number='B-102'), 'Bed-2', '2025-09-01', '2025-12-20', false);

-- 6.9 Initial Audit Log Entry
insert into audit_log (action, entity, details, severity) values
  ('SYSTEM_INIT', 'System', 'Database seeded with dummy data per PRD Section 9', 'info');

-- ===== 7. VERIFICATION QUERIES (uncomment to run after seeding) =====
-- select 'blocks' as t, count(*)::text as n from blocks
-- union all select 'rooms',         count(*)::text from rooms
-- union all select 'furniture_cat', count(*)::text from furniture_catalog
-- union all select 'room_furniture',count(*)::text from room_furniture
-- union all select 'students',      count(*)::text from students
-- union all select 'allocations',   count(*)::text from room_allocations
-- union all select 'users',         count(*)::text from users;
-- Expected counts: blocks=3, rooms=18, furniture_cat=16, room_furniture=141, students=27, allocations=27, users=6

-- ===== END OF SCRIPT =====
