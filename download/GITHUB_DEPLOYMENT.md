# GitHub Deployment Guide — JTM Hostel Management System

Your HMS codebase is **fully prepared and committed** locally, ready to push to:
**https://github.com/zaihasan80/Hostel-Management-System.git**

The push requires a **GitHub Personal Access Token (PAT)** because the sandbox cannot authenticate to GitHub on your behalf. This guide walks you through the entire process.

---

## ✅ What's Already Done

1. **Git remote configured** — `origin` points to your GitHub repo
2. **History squashed** — single clean commit (`186c48c`), no traces of the database password in any reachable commit
3. **`.env` removed from tracking** — your Supabase password will NOT be exposed on GitHub
4. **`.zscripts/`, `tool-results/`, `upload/` excluded** — sandbox-internal files are gitignored
5. **All credential traces sanitized**:
   - `download/SUPABASE_SETUP.md` — placeholders instead of real password
   - `scripts/run-supabase-setup.ts` — reads password from `SUPABASE_DB_PASSWORD` env var
   - `scripts/deploy-to-github.sh` — generic leak-detection pattern
6. **Deployment files added**:
   - `README.md` — comprehensive project documentation
   - `.env.example` — template for environment variables
   - `netlify.toml` — Netlify build config
   - `vercel.json` — Vercel build config
   - `.nvmrc` — Node.js version pin
   - `scripts/deploy-to-github.sh` — automated push helper

---

## 🚀 Step-by-Step Deployment

### Step 1 — Create a GitHub Personal Access Token (PAT)

1. Go to: **https://github.com/settings/tokens/new**
2. Log in with your GitHub account (`zaihasan80`)
3. Configure the token:
   - **Note**: `HMS Deploy` (or any name you like)
   - **Expiration**: 30 days (or whatever you prefer)
   - **Scopes**: ✅ `repo` (full repo access) — required for pushing
4. Click **Generate token**
5. **Copy the token immediately** — it starts with `ghp_` and you won't be able to see it again

### Step 2 — Ensure the GitHub repo is empty

Your repo at https://github.com/zaihasan80/Hostel-Management-System should be **completely empty** (no README, no .gitignore, no license). If it has any files, the push will be rejected.

To check:
- Visit https://github.com/zaihasan80/Hostel-Management-System
- If you see any files, either delete the repo and recreate it as empty, OR run the push with `--force` (the deploy script does this automatically)

### Step 3 — Push the code

You have **two options**:

#### Option A — Use the deploy script (recommended)

```bash
cd /home/z/my-project
GH_TOKEN=ghp_your_copied_token_here bash scripts/deploy-to-github.sh
```

The script will:
- Verify no credential leaks
- Verify `.env` is not tracked
- Force-push the `main` branch to your GitHub repo
- Print next steps for Vercel/Netlify deployment

#### Option B — Manual push

```bash
cd /home/z/my-project

# Set the remote URL with the token embedded (one-time)
git remote set-url origin https://zaihasan80:ghp_your_copied_token_here@github.com/zaihasan80/Hostel-Management-System.git

# Push
git push -u origin main --force

# Reset the remote URL to remove the token (important!)
git remote set-url origin https://github.com/zaihasan80/Hostel-Management-System.git
```

### Step 4 — Verify the push

1. Visit: **https://github.com/zaihasan80/Hostel-Management-System**
2. You should see:
   - `README.md` with the project description and screenshots
   - `prisma/schema.prisma` with the PostgreSQL schema
   - `src/` with all the Next.js app code
   - `download/supabase-setup.sql` with the database setup script
   - `.env.example` (but NO `.env` — confirmed)
3. Click on **commits** — you should see only ONE commit: "Initial release: JTM Hostel Management System"

### Step 5 — Deploy to Vercel or Netlify

#### Vercel (recommended for Next.js)
1. Go to: **https://vercel.com/new**
2. Click **Import Git Repository** → find `zaihasan80/Hostel-Management-System`
3. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
4. **Environment Variables** (CRITICAL):
   - Click "Add Environment Variable"
   - Key: `DATABASE_URL`
   - Value: `postgresql://postgres.ltbmddnhqcoacqdckwzk:<YOUR-SUPABASE-PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
   - Replace `<YOUR-SUPABASE-PASSWORD>` with your actual Supabase database password
   - **Important**: URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, etc.)
5. Click **Deploy**
6. Wait ~2-3 minutes for the build to complete
7. Visit your deployed app at `https://hostel-management-system.vercel.app` (or similar)

#### Netlify
1. Go to: **https://app.netlify.com/start**
2. Click **Import an existing project** → choose GitHub → find `zaihasan80/Hostel-Management-System`
3. Configure:
   - **Base directory**: (leave empty)
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
4. **Environment Variables**:
   - Go to Site settings → Environment variables
   - Add `DATABASE_URL` = your Supabase connection string
5. Click **Deploy site**
6. Wait ~3-5 minutes
7. Visit your deployed app at `https://hostel-management-system.netlify.app` (or similar)

---

## 🔒 Security Notes

### What's protected
- ✅ `.env` is in `.gitignore` and NOT tracked in git
- ✅ Database password is NOT in any git commit (history was squashed)
- ✅ `.zscripts/` (sandbox-internal scripts with credentials) are excluded
- ✅ `download/SUPABASE_SETUP.md` uses placeholders, not real credentials
- ✅ `scripts/run-supabase-setup.ts` reads password from env var, not hardcoded

### What you need to do AFTER deployment
1. **Rotate your Supabase password** if it was ever exposed (it was committed briefly in the sandbox's local git history, but that history was squashed and never pushed). To rotate:
   - Go to Supabase Dashboard → Project Settings → Database → Reset database password
   - Update the password in your Vercel/Netlify environment variables
   - Update `.env` locally if you're still developing

2. **Set up Supabase IP restrictions** (recommended for production):
   - Supabase Dashboard → Database → Network Restrictions
   - Allow only your Vercel/Netlify deployment IPs

3. **Enable Supabase Point-in-Time Recovery** (Pro plan) for database backups

---

## 📦 What's in the Repo (131 files)

```
Hostel-Management-System/
├── .env.example                    # Template — copy to .env and fill in
├── .gitignore                      # Excludes .env, node_modules, .next, etc.
├── .nvmrc                          # Node.js 20
├── README.md                       # Full project documentation
├── netlify.toml                    # Netlify build config
├── vercel.json                     # Vercel build config
├── package.json                    # Dependencies + scripts
├── prisma/
│   └── schema.prisma               # 10 models, PostgreSQL, UUID, snake_case
├── scripts/
│   ├── seed.ts                     # Seed script (for SQLite fallback)
│   ├── run-supabase-setup.ts       # Executes SQL against Supabase
│   ├── verify-supabase-app.ts      # End-to-end verification
│   ├── deploy-to-github.sh         # Push helper script
│   └── ...
├── src/
│   ├── app/
│   │   ├── api/                    # 14 REST endpoints (auth, blocks, rooms, etc.)
│   │   ├── globals.css             # Glassmorphism design system
│   │   ├── layout.tsx
│   │   └── page.tsx                # SPA entry
│   ├── components/
│   │   ├── layout/AppShell.tsx
│   │   ├── views/                  # 11 view components
│   │   └── furniture-icons.tsx
│   └── lib/
│       ├── auth.ts                 # bcrypt, sessions, RBAC, audit, validation
│       ├── db.ts                   # Prisma client
│       ├── rate-limit.ts           # IP rate limiter
│       └── store.ts                # Zustand store
├── download/
│   ├── supabase-setup.sql          # Complete schema + RLS + seed data
│   ├── SUPABASE_SETUP.md           # Setup guide
│   ├── .env.example
│   └── *.png                       # Screenshots
└── ...
```

---

## 🧪 After Deployment — Verify It Works

1. Visit your deployed URL (e.g. `https://hostel-management-system.vercel.app`)
2. You should see the login page with the glassmorphism design
3. Log in with:
   - Email: `admin@jtm.gov.my`
   - Password: `Admin@JTM2026`
4. You should see the dashboard with live data from your Supabase database

If login fails:
- Check that `DATABASE_URL` is set correctly in Vercel/Netlify environment variables
- Check the deployment logs for Prisma connection errors
- Verify the Supabase database is accessible (it should be — the pooler is internet-accessible)

---

## ❓ Troubleshooting

**Q: The push failed with "Authentication failed"**
A: Your PAT may be expired or lack the `repo` scope. Generate a new one at https://github.com/settings/tokens/new with the `repo` scope checked.

**Q: The push failed with "Updates were rejected because the remote contains work"**
A: Your GitHub repo has files in it. Either:
- Delete the repo and recreate it as empty, OR
- Use `--force`: `git push -u origin main --force` (the deploy script does this)

**Q: The Vercel build failed with "prisma generate" error**
A: Add a `postinstall` script to `package.json`:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```
(This may already be needed because Vercel runs `npm install` which doesn't auto-generate Prisma client.)

**Q: The deployed app shows "Internal Server Error"**
A: Check that `DATABASE_URL` is set in Vercel/Netlify env vars. The value should be your full Supabase connection string with the password URL-encoded (`@` → `%40`).

**Q: I want to make changes and redeploy**
A: Just push to GitHub — Vercel/Netlify will auto-deploy on every push to `main`:
```bash
cd /home/z/my-project
git add .
git commit -m "Your change"
git push origin main
```
