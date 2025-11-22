# Environment Configuration Guide

## Overview

The application automatically uses the correct database based on the environment:

- **Local Development** → DEV Database
- **Production (Render)** → PROD Database

---

## 🔧 How It Works

### **Local Development**

1. **Configuration File:** `server/.env.local`
2. **Loaded By:** `dotenv` package (automatically loads `.env.local`)
3. **Database:** DEV environment database
4. **When:** Running `npm run dev` locally

### **Production (Render)**

1. **Configuration Source:** Render Dashboard → Environment Variables
2. **Loaded By:** Render platform (injects as `process.env`)
3. **Database:** PROD environment database
4. **When:** Deployed on Render platform

---

## 📋 Database Credentials

### **DEV Database (Local Development)**

Used in `server/.env.local`:

```env
DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=investo_3mo3
DB_USER=investo_3mo3_user
DB_PASSWORD=8UExBu4D44YsoQOEtGa9PTw9do3XUQ5E
DB_SSL=true
DB_LOGGING=true
```

### **PROD Database (Production)**

Set in Render Dashboard environment variables:

```env
DB_HOST=dpg-d4dmojemcj7s73edtop0-a
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=zerovaste_user
DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
DB_SSL=true
DB_LOGGING=false
```

---

## 🚀 Setup Instructions

### **For Local Development:**

1. **Run setup script:**
   ```bash
   node scripts/setup.js
   ```

2. **Verify configuration:**
   ```bash
   cd server
   cat .env.local
   ```

3. **Start backend:**
   ```bash
   npm run dev
   ```

   The backend will automatically:
   - Read `server/.env.local`
   - Connect to DEV database
   - Use DEV credentials

### **For Production:**

1. **Set environment variables in Render Dashboard:**
   - Go to your Render service
   - Navigate to "Environment" section
   - Add all PROD database variables

2. **Deploy:**
   - Render automatically reads environment variables
   - Connects to PROD database
   - Uses PROD credentials

---

## 🔍 How Configuration is Loaded

### **Code Flow:**

1. **Server starts** → `server/src/index.ts`
2. **Loads config** → `server/src/config/env.ts`
3. **Reads environment** → `process.env.*` (from `.env.local` or Render)
4. **Connects database** → `server/src/db/sequelize.ts`
5. **Uses credentials** → From `env` object

### **Environment Detection:**

```typescript
// server/src/config/env.ts
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  dbHost: process.env.DB_HOST,
  dbName: process.env.DB_NAME ?? "investo",
  dbUser: process.env.DB_USER ?? "postgres",
  dbPassword: process.env.DB_PASSWORD ?? "",
  // ... other config
};
```

- **Local:** Reads from `server/.env.local` (loaded by `dotenv`)
- **Production:** Reads from Render environment variables

---

## ✅ Verification

### **Check Local Configuration:**

```powershell
cd server
Get-Content .env.local | Select-String "DB_"
```

**Expected output:**
```
DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=investo_3mo3
DB_USER=investo_3mo3_user
DB_PASSWORD=8UExBu4D44YsoQOEtGa9PTw9do3XUQ5E
DB_SSL=true
DB_LOGGING=true
```

### **Check Production Configuration (Render):**

1. Go to Render Dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Verify all `DB_*` variables are set

### **Verify Database Connection:**

After starting backend, check logs:
- ✅ `Database connected successfully` → Working
- ❌ `Database connection failed` → Check credentials

---

## 🎯 Summary Table

| Environment | Config File | Database | When Used |
|------------|-------------|----------|-----------|
| **Local Dev** | `server/.env.local` | DEV DB | `npm run dev` locally |
| **Production** | Render Dashboard | PROD DB | Deployed on Render |

---

## 🔐 Security Notes

1. **`.env.local` is gitignored** - Never committed to repository
2. **Production credentials** - Only in Render dashboard
3. **Different databases** - DEV and PROD are completely separate
4. **SSL enabled** - Both DEV and PROD use SSL connections

---

## 📚 Related Files

- `server/src/config/env.ts` - Environment configuration
- `server/src/db/sequelize.ts` - Database connection
- `scripts/setup.js` - Setup script (creates `.env.local`)
- `server/.env.local` - Local development config (gitignored)



