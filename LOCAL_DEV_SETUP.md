# Local Development Setup

## Issue
The database hostname `dpg-d4dmojemcj7s73edtop0-a` is incomplete. Render PostgreSQL databases require the full domain name.

## Solution

### Step 1: Get Full Database Hostname from Render

1. Go to your Render dashboard
2. Open your PostgreSQL database
3. Find the **"Internal Database URL"** or **"Hostname"**
4. It should look like:
   - `dpg-d4dmojemcj7s73edtop0-a.singapore-postgres.render.com`
   - `dpg-d4dmojemcj7s73edtop0-a.oregon-postgres.render.com`
   - Or similar (region may vary)

### Step 2: Create `.env` File

1. In the `server` folder, create a file named `.env`
2. Copy the content from `server/.env.example`
3. Update `DB_HOST` with the **full hostname** from Step 1

Example:
```env
DB_HOST=dpg-d4dmojemcj7s73edtop0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=zerovaste_user
DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
DB_SSL=true
```

### Step 3: Run Server

```bash
cd server
npm run dev
```

## Alternative: Use Local Database

If you prefer to use a local PostgreSQL database:

1. Install PostgreSQL locally
2. Create a database named `zerovaste`
3. Update `.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
```

## Quick Fix

If you just want to test quickly, you can also use the **DATABASE_URL** from Render:

1. In Render dashboard → Database → Copy **"Internal Database URL"**
2. Add to `.env`:
```env
DATABASE_URL=postgresql://zerovaste_user:TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27@dpg-d4dmojemcj7s73edtop0-a.singapore-postgres.render.com:5432/zerovaste?sslmode=require
```

