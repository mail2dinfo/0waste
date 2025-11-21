# Quick Environment Setup Guide

## 🎯 Goal

Switch between local development and production (Render) easily - all via environment variables.

## ⚡ Quick Start

### **Option 1: Using Setup Script (Recommended)**

**Windows (PowerShell):**
```powershell
.\scripts\setup-env.ps1
```

**Mac/Linux:**
```bash
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

### **Option 2: Manual Setup**

#### Frontend (Client)
Create `client/.env.local`:
```env
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
```

#### Backend (Server)
Create `server/.env.local`:
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite
DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=investo_3mo3
DB_USER=investo_3mo3_user
DB_PASSWORD=your_database_password_here
DB_SSL=true
DB_LOGGING=true
```

## 📋 Configuration Files

| Environment | Frontend File | Backend File |
|------------|---------------|--------------|
| **Local** | `client/.env.local` | `server/.env.local` |
| **Production** | Render Dashboard | Render Dashboard |

## 🔄 How It Works

### Local Development
- Uses `.env.local` files (gitignored)
- Frontend: `VITE_API_URL` → Backend at `localhost:4000`
- Backend: `DB_HOST` → Local PostgreSQL

### Production (Render)
- Environment variables set in Render dashboard
- Frontend: `VITE_API_URL` → `https://zerovaste.onrender.com/api`
- Backend: `DB_HOST` → Render PostgreSQL

## ✅ Verify Setup

1. **Start Backend:**
   ```bash
   cd server
   npm run dev
   # Should start on port 4000
   ```

2. **Start Frontend:**
   ```bash
   cd client
   npm run dev
   # Should connect to localhost:4000/api
   ```

## 📚 Full Documentation

See `docs/ENVIRONMENT_SETUP.md` for complete details and troubleshooting.


