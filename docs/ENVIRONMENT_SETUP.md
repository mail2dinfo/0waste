# Environment Configuration Setup

This document explains how to configure the application for **local development** and **production (Render)**.

## 🎯 Goal

Easily switch between local and production environments without code changes - everything configurable via environment variables.

## 📋 Approach

### 1. **Environment Files Structure**

```
project/
├── client/
│   ├── .env.local              # Local dev (gitignored - create manually)
│   └── vite.config.ts          # Uses VITE_* env vars
├── server/
│   ├── .env.local              # Local dev (gitignored - create manually)
│   └── src/config/env.ts       # Loads env vars via dotenv
└── docs/
    └── ENVIRONMENT_SETUP.md    # This file
```

### 2. **How It Works**

#### Frontend (Vite)
- Vite automatically loads `.env.local` file
- Environment variables must start with `VITE_` to be exposed
- Access via: `import.meta.env.VITE_API_URL`

#### Backend (Node.js)
- Uses `dotenv/config` to load `.env.local`
- Access via: `process.env.DB_HOST`
- Fallback to defaults if not set

## 🚀 Quick Setup

### **Step 1: Local Development Setup**

#### A. Frontend Configuration

Create `client/.env.local`:
```env
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
```

#### B. Backend Configuration

Create `server/.env.local`:
```env
PORT=4000
NODE_ENV=development

FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=postgres
DB_PASSWORD=your_local_db_password
DB_SSL=false
DB_LOGGING=true
```

### **Step 2: Production Setup (Render)**

#### A. Frontend Service Environment Variables

In Render Dashboard → Frontend Service → Environment:

```env
VITE_API_URL=https://zerovaste.onrender.com/api
VITE_FRONTEND_URL=https://zerovaste-uga7.onrender.com
```

#### B. Backend Service Environment Variables

In Render Dashboard → Backend Service → Environment:

```env
PORT=1000
NODE_ENV=production

FRONTEND_URL=https://zerovaste-uga7.onrender.com
INVITE_BASE_URL=https://zerovaste-uga7.onrender.com/invite

DB_HOST=dpg-d4dmojemcj7s73edtop0-a
DB_NAME=zerovaste
DB_USER=zerovaste_user
DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
DB_PORT=5432
DB_SSL=true
DB_LOGGING=false
```

## 📝 Configuration Reference

### Frontend Variables

| Variable | Local | Production | Purpose |
|----------|-------|------------|---------|
| `VITE_API_URL` | `http://localhost:4000/api` | `https://zerovaste.onrender.com/api` | Backend API endpoint |
| `VITE_FRONTEND_URL` | `http://localhost:5173` | `https://zerovaste-uga7.onrender.com` | Frontend base URL |

### Backend Variables

| Variable | Local | Production | Purpose |
|----------|-------|------------|---------|
| `PORT` | `4000` | `1000` | Server port |
| `NODE_ENV` | `development` | `production` | Environment mode |
| `FRONTEND_URL` | `http://localhost:5173` | `https://zerovaste-uga7.onrender.com` | Allowed CORS origin |
| `INVITE_BASE_URL` | `http://localhost:5173/invite` | `https://zerovaste-uga7.onrender.com/invite` | Invite link base |
| `DB_HOST` | `127.0.0.1` | `dpg-d4dmojemcj7s73edtop0-a` | Database host |
| `DB_NAME` | `zerovaste` | `zerovaste` | Database name |
| `DB_USER` | `postgres` | `zerovaste_user` | Database user |
| `DB_PASSWORD` | _(local)_ | `TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27` | Database password |
| `DB_PORT` | `5432` | `5432` | Database port |
| `DB_SSL` | `false` | `true` | Use SSL for DB |
| `DB_LOGGING` | `true` | `false` | Log SQL queries |

## 🔄 Switching Environments

### To Work Locally:
1. Ensure `.env.local` files exist in both `client/` and `server/`
2. Start backend: `cd server && npm run dev`
3. Start frontend: `cd client && npm run dev`
4. Frontend will use local API automatically

### To Deploy to Production:
1. Set environment variables in Render dashboard (one-time setup)
2. Push code to repository
3. Render auto-deploys with production env vars
4. No code changes needed!

## ✅ Verification

### Check Frontend Config
```bash
cd client
npm run dev
# Open browser console, check API URL is correct
```

### Check Backend Config
```bash
cd server
npm run dev
# Check terminal for:
# - Server running on correct port
# - Database connection successful
# - CORS origins configured
```

## 🔧 Troubleshooting

### Frontend can't connect to API
- ✅ Check `VITE_API_URL` in `.env.local`
- ✅ Verify backend is running
- ✅ Check browser console for errors
- ✅ Restart dev server after changing `.env`

### Backend can't connect to database
- ✅ Verify database is running (local)
- ✅ Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`
- ✅ Verify `DB_SSL=true` for production, `false` for local
- ✅ Check database credentials are correct

### Environment variables not loading
- ✅ File must be named exactly `.env.local` (not `.env.local.txt`)
- ✅ Restart dev server after changes
- ✅ Clear browser cache
- ✅ Check `.gitignore` includes `.env.local` (already configured)

## 🔐 Security Notes

⚠️ **Important:**
- `.env.local` files are gitignored (won't be committed)
- Never commit actual passwords or secrets
- Production secrets should only be in Render dashboard
- Use different passwords for local and production

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Render Environment Variables](https://render.com/docs/environment-variables)




