# Configuration Management Guide

This guide explains how to configure the application for both **local development** and **production (Render)** environments.

## Overview

The application uses environment variables to configure:
- **Frontend**: API URLs, frontend URLs
- **Backend**: Database connection, CORS origins, ports

## File Structure

```
.
├── client/
│   ├── .env.local              # Local development config (gitignored)
│   └── .env.production         # Production config template
├── server/
│   ├── .env.local              # Local development config (gitignored)
│   └── .env.production         # Production config template
└── docs/
    └── CONFIG_SETUP.md         # This file
```

## Setup Instructions

### 1. Local Development Setup

#### Frontend (Client)

Create `client/.env.local`:
```env
# Local API URL (backend running on port 4000)
VITE_API_URL=http://localhost:4000/api

# Local frontend URL (Vite dev server)
VITE_FRONTEND_URL=http://localhost:5173
```

#### Backend (Server)

Create `server/.env.local`:
```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend Configuration
FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite

# Database Configuration (Local PostgreSQL)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=postgres
DB_PASSWORD=your_local_password
DB_SSL=false
DB_LOGGING=true
```

### 2. Production Setup (Render)

#### Frontend Environment Variables (Render Dashboard)

Go to your **frontend service** → **Environment** tab and add:

```env
VITE_API_URL=https://zerovaste.onrender.com/api
VITE_FRONTEND_URL=https://zerovaste-uga7.onrender.com
```

#### Backend Environment Variables (Render Dashboard)

Go to your **backend service** → **Environment** tab and add:

```env
# Server Configuration
PORT=1000
NODE_ENV=production

# Frontend Configuration
FRONTEND_URL=https://zerovaste-uga7.onrender.com
INVITE_BASE_URL=https://zerovaste-uga7.onrender.com/invite

# Database Configuration (Render PostgreSQL)
DB_HOST=dpg-d4dmojemcj7s73edtop0-a
DB_NAME=zerovaste
DB_USER=zerovaste_user
DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
DB_PORT=5432
DB_SSL=true
DB_LOGGING=false
```

## Switching Between Environments

### Method 1: Using .env Files (Recommended for Local)

1. **For Local Development:**
   - Use `.env.local` files
   - These files are gitignored and won't be committed

2. **For Production:**
   - Set environment variables in Render dashboard
   - No `.env` files needed (they're set in Render)

### Method 2: Using npm scripts (Optional)

You can create npm scripts that load different env files:

```json
// client/package.json
{
  "scripts": {
    "dev": "vite",
    "dev:local": "vite --mode local",
    "dev:prod": "vite --mode production"
  }
}
```

Then create:
- `client/.env.local` for local
- `client/.env.production` for production preview

### Method 3: Direct Environment Variables

Set environment variables directly in your terminal:

**Windows (PowerShell):**
```powershell
$env:VITE_API_URL="http://localhost:4000/api"
npm run dev
```

**Mac/Linux:**
```bash
VITE_API_URL=http://localhost:4000/api npm run dev
```

## Quick Reference

### Frontend Variables

| Variable | Local Default | Production Value |
|----------|--------------|------------------|
| `VITE_API_URL` | `http://localhost:4000/api` | `https://zerovaste.onrender.com/api` |
| `VITE_FRONTEND_URL` | `http://localhost:5173` | `https://zerovaste-uga7.onrender.com` |

### Backend Variables

| Variable | Local Default | Production Value |
|----------|--------------|------------------|
| `PORT` | `4000` | `1000` |
| `NODE_ENV` | `development` | `production` |
| `FRONTEND_URL` | `http://localhost:5173` | `https://zerovaste-uga7.onrender.com` |
| `INVITE_BASE_URL` | `http://localhost:5173/invite` | `https://zerovaste-uga7.onrender.com/invite` |
| `DB_HOST` | `127.0.0.1` | `dpg-d4dmojemcj7s73edtop0-a` |
| `DB_NAME` | `zerovaste` | `zerovaste` |
| `DB_USER` | `postgres` | `zerovaste_user` |
| `DB_PASSWORD` | _(your local)_ | `TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27` |
| `DB_PORT` | `5432` | `5432` |
| `DB_SSL` | `false` | `true` |
| `DB_LOGGING` | `true` | `false` |

## Testing Your Configuration

### Frontend
```bash
cd client
npm run dev
# Check browser console for: API URL: http://localhost:4000/api
```

### Backend
```bash
cd server
npm run dev
# Should connect to database and start on port 4000
# Check terminal for: Server running on http://localhost:4000
```

## Troubleshooting

### Issue: Frontend can't connect to API
- Check `VITE_API_URL` is set correctly
- Ensure backend is running
- Check CORS settings in backend

### Issue: Backend can't connect to database
- Verify database credentials
- Check if database is running (local) or accessible (production)
- Verify `DB_SSL=true` for production, `false` for local

### Issue: Environment variables not loading
- Restart dev server after changing `.env` files
- Clear browser cache
- Check file is named exactly `.env.local` (not `.env.local.txt`)

## Security Notes

⚠️ **Never commit `.env.local` files to git!**

They contain sensitive information like:
- Database passwords
- API keys
- Secrets

Make sure `.env.local` is in `.gitignore`:
```
# .gitignore
.env.local
.env*.local
```

## Next Steps

1. Create `.env.local` files for both client and server
2. Set production variables in Render dashboard
3. Test local development
4. Deploy to production



