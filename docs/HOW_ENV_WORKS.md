# How Development & Production Environments Work

This document explains how the application automatically uses the correct configuration for local development and production.

---

## 🎯 Overview

The application uses **environment variables** to switch between configurations. No code changes needed - just different environment variable values.

---

## 🔄 How It Works - Step by Step

### **Frontend (Client) - Vite**

#### **Local Development:**

1. **When you run `npm run dev`:**
   - Vite looks for `.env.local` file in `client/` folder
   - Reads `VITE_API_URL` from `.env.local`
   - Replaces `import.meta.env.VITE_API_URL` in code with the value
   - Result: `import.meta.env.VITE_API_URL` = `"http://localhost:4000/api"`

2. **Code reads the value:**
   ```typescript
   // client/src/hooks/useApi.ts
   const api = axios.create({
     baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api"
   });
   ```
   - Uses: `http://localhost:4000/api` (from `.env.local`)

3. **All API calls go to:**
   - `http://localhost:4000/api/*`

#### **Production (Render):**

1. **When you build/deploy:**
   - Render sets environment variables from dashboard
   - During `npm run build`, Vite reads `VITE_API_URL` from Render environment
   - Replaces `import.meta.env.VITE_API_URL` in code with production value
   - Result: `import.meta.env.VITE_API_URL` = `"https://zerovaste.onrender.com/api"`

2. **Built files contain production URL:**
   - The compiled JavaScript has the production URL baked in
   - No `.env.local` file needed on production

3. **All API calls go to:**
   - `https://zerovaste.onrender.com/api/*`

---

### **Backend (Server) - Node.js**

#### **Local Development:**

1. **When you run `npm run dev`:**
   - Node.js loads `dotenv/config` package
   - Looks for `.env.local` file in `server/` folder
   - Reads all environment variables from the file
   - Makes them available via `process.env.*`

2. **Config loads the values:**
   ```typescript
   // server/src/config/env.ts
   export const env = {
     port: Number(process.env.PORT ?? 4000),
     dbHost: process.env.DB_HOST,
     dbPassword: process.env.DB_PASSWORD,
     // ... etc
   };
   ```
   - `process.env.PORT` = `"4000"` (from `.env.local`)
   - `process.env.DB_HOST` = `"127.0.0.1"` (from `.env.local`)
   - `process.env.DB_PASSWORD` = your local password (from `.env.local`)

3. **Server connects to:**
   - Render PostgreSQL at `dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com:5432`
   - Uses Render database credentials for build environment

#### **Production (Render):**

1. **When you deploy:**
   - Render sets environment variables from dashboard
   - Node.js reads `process.env.*` directly (no `.env.local` file)
   - Environment variables are injected by Render at runtime

2. **Config loads the values:**
   ```typescript
   // Same code, different values!
   export const env = {
     port: Number(process.env.PORT ?? 4000),
     dbHost: process.env.DB_HOST,
     dbPassword: process.env.DB_PASSWORD,
     // ... etc
   };
   ```
   - `process.env.PORT` = `"1000"` (from Render dashboard)
   - `process.env.DB_HOST` = `"dpg-d4dmojemcj7s73edtop0-a"` (from Render dashboard)
   - `process.env.DB_PASSWORD` = production password (from Render dashboard)

3. **Server connects to:**
   - Render PostgreSQL at `dpg-d4dmojemcj7s73edtop0-a:5432`
   - Uses production database credentials

---

## 📊 Visual Flow Diagram

### **Local Development Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│                     LOCAL DEVELOPMENT                        │
└─────────────────────────────────────────────────────────────┘

FRONTEND:
  client/.env.local
    ↓
  VITE_API_URL=http://localhost:4000/api
    ↓
  npm run dev (Vite reads .env.local)
    ↓
  import.meta.env.VITE_API_URL = "http://localhost:4000/api"
    ↓
  API calls → http://localhost:4000/api

BACKEND:
  server/.env.local
    ↓
  PORT=4000, DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com, etc.
    ↓
  npm run dev (Node.js reads .env.local via dotenv)
    ↓
  process.env.PORT = "4000"
  process.env.DB_HOST = "127.0.0.1"
    ↓
  Server starts on port 4000
  Connects to local PostgreSQL
```

### **Production Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION (RENDER)                     │
└─────────────────────────────────────────────────────────────┘

FRONTEND:
  Render Dashboard → Environment Variables
    ↓
  VITE_API_URL=https://zerovaste.onrender.com/api
    ↓
  npm run build (Vite reads Render env vars)
    ↓
  import.meta.env.VITE_API_URL = "https://zerovaste.onrender.com/api"
    ↓
  Built files contain production URL
    ↓
  API calls → https://zerovaste.onrender.com/api

BACKEND:
  Render Dashboard → Environment Variables
    ↓
  PORT=1000, DB_HOST=dpg-d4dmo..., etc.
    ↓
  npm start (Node.js reads Render env vars)
    ↓
  process.env.PORT = "1000"
  process.env.DB_HOST = "dpg-d4dmojemcj7s73edtop0-a"
    ↓
  Server starts on port 1000
  Connects to Render PostgreSQL
```

---

## 🔍 Detailed Explanation

### **Frontend Environment Variables (Vite)**

#### How Vite Works:

1. **During Development (`npm run dev`):**
   - Vite reads `.env.local` file
   - Injects values into `import.meta.env.*`
   - **Important**: Only variables starting with `VITE_` are exposed
   - Variables are available in browser

2. **During Build (`npm run build`):**
   - Vite reads environment variables from the system (Render dashboard)
   - Inlines the values into the compiled JavaScript
   - **Result**: Production build has production URLs baked in
   - No `.env.local` file needed in production

3. **Why `VITE_` prefix?**
   - Security: Only explicitly exposed variables are available
   - Prevents accidentally exposing server secrets
   - Must use: `VITE_API_URL`, `VITE_FRONTEND_URL`

#### Example:

```typescript
// This code works in both dev and production
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api"
});

// Local dev: import.meta.env.VITE_API_URL = "http://localhost:4000/api"
// Production: import.meta.env.VITE_API_URL = "https://zerovaste.onrender.com/api"
```

---

### **Backend Environment Variables (Node.js)**

#### How Node.js Works:

1. **During Development:**
   - `dotenv/config` loads `.env.local` file
   - Sets `process.env.*` variables
   - Available throughout the application

2. **During Production:**
   - Render injects environment variables
   - Already available as `process.env.*`
   - No `.env.local` file needed

3. **Config Module (`server/src/config/env.ts`):**
   - Reads all environment variables
   - Provides defaults if not set
   - Centralized configuration object

#### Example:

```typescript
// server/src/config/env.ts
export const env = {
  port: Number(process.env.PORT ?? 4000),  // Defaults to 4000
  dbHost: process.env.DB_HOST,              // Required (or error)
  dbPassword: process.env.DB_PASSWORD,      // Required
  // ...
};

// Local dev: Uses .env.local values
// Production: Uses Render dashboard values
```

---

## 🔄 Switching Between Environments

### **To Work Locally:**

1. **Ensure `.env.local` files exist:**
   - `client/.env.local` ✅
   - `server/.env.local` ✅

2. **Start servers:**
   ```bash
   # Terminal 1
   cd server && npm run dev
   
   # Terminal 2
   cd client && npm run dev
   ```

3. **Result:**
   - Frontend connects to `http://localhost:4000/api`
   - Backend uses local database
   - Everything works locally

### **To Deploy to Production:**

1. **Set environment variables in Render dashboard** (one-time setup)

2. **Push code to repository:**
   ```bash
   git push origin main
   ```

3. **Render automatically:**
   - Reads environment variables from dashboard
   - Builds frontend with production URLs
   - Starts backend with production config
   - Connects to production database

4. **Result:**
   - Frontend connects to `https://zerovaste.onrender.com/api`
   - Backend uses production database
   - Everything works in production

**No code changes needed!** Same code, different environment variables.

---

## 📋 Configuration Matrix

| Setting | Local Dev | Production | Where Set |
|---------|-----------|------------|-----------|
| **Frontend** | | | |
| API URL | `http://localhost:4000/api` | `https://zerovaste.onrender.com/api` | `.env.local` / Render |
| Frontend URL | `http://localhost:5173` | `https://zerovaste-uga7.onrender.com` | `.env.local` / Render |
| **Backend** | | | |
| Port | `4000` | `1000` | `.env.local` / Render |
| Database Host | `127.0.0.1` | `dpg-d4dmojemcj7s73edtop0-a` | `.env.local` / Render |
| Database User | `postgres` | `zerovaste_user` | `.env.local` / Render |
| Database Password | _(local)_ | `TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27` | `.env.local` / Render |
| Database SSL | `false` | `true` | `.env.local` / Render |
| Logging | `true` | `false` | `.env.local` / Render |

---

## 🎯 Key Points

1. **Same Code, Different Config:**
   - Code doesn't change
   - Only environment variables change
   - Automatic switching based on environment

2. **Frontend (Vite):**
   - Reads `.env.local` during `npm run dev`
   - Reads Render env vars during `npm run build`
   - Values baked into compiled code

3. **Backend (Node.js):**
   - Reads `.env.local` during `npm run dev` (via dotenv)
   - Reads Render env vars during `npm start`
   - Values available at runtime

4. **No Manual Switching:**
   - Local: Uses `.env.local` files automatically
   - Production: Uses Render dashboard automatically
   - Just set environment variables once

5. **Security:**
   - `.env.local` files are gitignored (never committed)
   - Production secrets only in Render dashboard
   - No hardcoded credentials in code

---

## ✅ Verification

### **Check Local Development:**

1. **Frontend:**
   ```bash
   cd client
   npm run dev
   # Check browser console: API calls should go to localhost:4000
   ```

2. **Backend:**
   ```bash
   cd server
   npm run dev
   # Check terminal: Should connect to local database
   ```

### **Check Production:**

1. **Frontend:**
   - Visit: `https://zerovaste-uga7.onrender.com`
   - Check browser console: API calls should go to production API

2. **Backend:**
   - Check Render logs: Should connect to production database
   - Check Render dashboard: All env vars should be set

---

## 🔧 Troubleshooting

### **Frontend using wrong API URL:**

- ✅ Check `client/.env.local` exists and has correct `VITE_API_URL`
- ✅ Restart dev server after changing `.env.local`
- ✅ Check browser console for actual API URL being used

### **Backend using wrong database:**

- ✅ Check `server/.env.local` exists and has correct DB credentials
- ✅ Restart server after changing `.env.local`
- ✅ Check server logs for database connection errors

### **Production not working:**

- ✅ Verify all environment variables are set in Render dashboard
- ✅ Check Render deployment logs
- ✅ Verify variable names are exact (case-sensitive)

---

## 📚 Summary

**Development:**
- Uses `.env.local` files
- Loaded automatically by Vite (frontend) and dotenv (backend)
- No manual configuration needed once files are created

**Production:**
- Uses Render dashboard environment variables
- Injected automatically by Render
- No `.env.local` files needed

**The beauty:** Same codebase, different configurations, automatic switching! 🎉


