# Database Configuration Summary

## Current Setup

### Production Database (Render)
**Location:** Hardcoded in `server/src/db/sequelize.ts` as `defaultRenderConfig`

- **Host:** `dpg-d4dmojemcj7s73edtop0-a` (needs full domain: `.singapore-postgres.render.com` or similar)
- **Database:** `zerovaste`
- **Username:** `zerovaste_user`
- **Password:** `TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27`
- **Port:** `5432`
- **SSL:** `true`

### Test/Local Database
**Location:** `.env` file (not committed to git)

- **Host:** `127.0.0.1` (localhost)
- **Database:** `zerovaste` (or `investo` from old config)
- **Username:** `postgres`
- **Password:** (your local password)
- **Port:** `5432`
- **SSL:** `false`

## How It Works

The application uses this priority:

1. **`DATABASE_URL`** environment variable (if set) - Full connection string
2. **`DB_HOST`** + other `DB_*` environment variables (if set) - Individual config
3. **Default Render config** (hardcoded fallback) - Production database

## Environment-Based Configuration

### For Local Development
Create `server/.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=postgres
DB_PASSWORD=your_local_password
DB_SSL=false
```

### For Production (Render)
Set environment variables in Render dashboard:
```env
DB_HOST=dpg-d4dmojemcj7s73edtop0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=zerovaste_user
DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
DB_SSL=true
```

Or use `DATABASE_URL`:
```env
DATABASE_URL=postgresql://zerovaste_user:TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27@dpg-d4dmojemcj7s73edtop0-a.singapore-postgres.render.com:5432/zerovaste?sslmode=require
```

## Recommendations

1. **Remove hardcoded credentials** from `sequelize.ts` for security
2. **Use environment variables** for all environments
3. **Create separate databases** for test and production
4. **Never commit `.env` files** to git

