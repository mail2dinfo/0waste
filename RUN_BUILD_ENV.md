# How to Run in Build Environment

This guide explains how to run the application with Render PostgreSQL database (build environment).

## 📋 Prerequisites

- ✅ Dependencies installed (`npm install` completed)
- ✅ Environment files created (`.env.local` files exist)
- ✅ Database password updated in `server/.env.local`
- ✅ Render PostgreSQL database is accessible

---

## 🚀 Quick Start

### **Step 1: Verify Configuration**

Check that your `server/.env.local` has the correct database settings:

```bash
# Windows (PowerShell)
cd server
Get-Content .env.local | Select-String "DB_"

# Linux/Mac
cd server
cat .env.local | grep "DB_"
```

**Expected output:**
```
DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=investo_3mo3
DB_USER=investo_3mo3_user
DB_PASSWORD=<your_password_here>
DB_SSL=true
DB_LOGGING=true
```

### **Step 2: Start Backend Server**

#### **Windows (PowerShell):**
```powershell
cd server
npm run dev
```

#### **Linux/Mac (Terminal):**
```bash
cd server
npm run dev
```

**Expected output:**
```
Server running on http://localhost:4000
Database connected successfully
✅ Server ready!
```

**If you see database connection errors:**
- Check your password in `server/.env.local`
- Verify the database host is accessible
- Make sure `DB_SSL=true` is set

### **Step 3: Start Frontend Server**

**Open a NEW terminal window/tab:**

#### **Windows (PowerShell):**
```powershell
cd client
npm run dev
```

#### **Linux/Mac (Terminal):**
```bash
cd client
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### **Step 4: Access the Application**

Open your browser and go to:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000/api/health

---

## 🔍 Detailed Steps

### **1. Verify Environment Files Exist**

```bash
# Check frontend config
if (Test-Path "client\.env.local") { Write-Host "✅ Frontend config exists" } else { Write-Host "❌ Missing client/.env.local" }

# Check backend config
if (Test-Path "server\.env.local") { Write-Host "✅ Backend config exists" } else { Write-Host "❌ Missing server/.env.local" }
```

**If files don't exist:**
```bash
# Create them automatically
node scripts/setup.js
```

### **2. Verify Database Password is Set**

```bash
cd server
Get-Content .env.local | Select-String "DB_PASSWORD"
```

**Should NOT show:**
```
DB_PASSWORD=your_database_password_here
```

**Should show:**
```
DB_PASSWORD=<your_actual_password>
```

**If password is not set:**
1. Get password from Render dashboard
2. Edit `server/.env.local`
3. Replace `your_database_password_here` with actual password

### **3. Test Database Connection (Optional)**

You can test if the database connection works:

```bash
# Test via backend (after starting server)
curl http://localhost:4000/api/health

# Or check backend logs for "Database connected successfully"
```

### **4. Start Servers in Separate Terminals**

#### **Terminal 1: Backend**

```powershell
# Navigate to server directory
cd C:\Users\mail2\OneDrive\Desktop\Mani\Nowaste\server

# Start development server
npm run dev
```

**Keep this terminal open!** The backend must be running.

#### **Terminal 2: Frontend**

```powershell
# Navigate to client directory
cd C:\Users\mail2\OneDrive\Desktop\Mani\Nowaste\client

# Start development server
npm run dev
```

**Keep this terminal open!** The frontend must be running.

---

## 📝 Running Commands Reference

### **Complete Setup & Run**

```powershell
# 1. Install dependencies (if not done)
cd client
npm install
cd ../server
npm install
cd ..

# 2. Create environment files (if not done)
node scripts/setup.js

# 3. (Manual) Update server/.env.local with database password

# 4. Start backend (Terminal 1)
cd server
npm run dev

# 5. Start frontend (Terminal 2)
cd client
npm run dev
```

### **Quick Start (if already configured)**

```powershell
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
cd client && npm run dev
```

---

## 🐛 Troubleshooting

### **Problem: Database Connection Failed**

**Error message:**
```
Error: Database connection failed
```

**Solution:**
1. **Check password:**
   ```powershell
   cd server
   Get-Content .env.local | Select-String "DB_PASSWORD"
   ```

2. **Verify database host is correct:**
   ```powershell
   Get-Content .env.local | Select-String "DB_HOST"
   ```
   Should be: `dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com`

3. **Check SSL is enabled:**
   ```powershell
   Get-Content .env.local | Select-String "DB_SSL"
   ```
   Should be: `DB_SSL=true`

4. **Test database connectivity:**
   ```powershell
   # Try to ping the database host
   Test-NetConnection -ComputerName dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com -Port 5432
   ```

### **Problem: Port Already in Use**

**Error message:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solution:**
```powershell
# Find process using port 4000
netstat -ano | findstr :4000

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F

# Or change the port in server/.env.local
# PORT=4001
```

### **Problem: Frontend Can't Connect to Backend**

**Error message:**
```
Network Error
Failed to fetch
```

**Solution:**
1. **Verify backend is running:**
   ```powershell
   curl http://localhost:4000/api/health
   ```

2. **Check frontend API URL:**
   ```powershell
   cd client
   Get-Content .env.local | Select-String "VITE_API_URL"
   ```
   Should be: `VITE_API_URL=http://localhost:4000/api`

3. **Check CORS settings in backend** (should be configured automatically)

### **Problem: Environment Variables Not Loading**

**Solution:**
1. **Restart the servers** after changing `.env.local` files
2. **Clear cache:**
   ```powershell
   cd client
   Remove-Item -Recurse -Force node_modules\.vite
   
   cd ../server
   Remove-Item -Recurse -Force node_modules\.cache
   ```

3. **Verify file names are correct:**
   - `client/.env.local` (not `.env` or `.env.local.example`)
   - `server/.env.local` (not `.env` or `.env.local.example`)

---

## ✅ Verification Checklist

Before running, verify:

- [ ] `client/.env.local` exists and has correct values
- [ ] `server/.env.local` exists and has correct values
- [ ] Database password is updated (not the placeholder)
- [ ] `DB_HOST` is set to Render PostgreSQL host
- [ ] `DB_SSL=true` is set
- [ ] Dependencies are installed (`node_modules` folders exist)
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can access http://localhost:5173
- [ ] Can access http://localhost:4000/api/health

---

## 🎯 Current Configuration Summary

### **Environment Setup:**
- **Local Development (server/.env.local):** Uses DEV database
- **Production (Render Dashboard):** Uses PROD database

### **Backend (server/.env.local) - DEV Database:**
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite
DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=investo_3mo3
DB_USER=investo_3mo3_user
DB_PASSWORD=8UExBu4D44YsoQOEtGa9PTw9do3XUQ5E
DB_SSL=true
DB_LOGGING=true
```

### **Production (Render Dashboard) - PROD Database:**
```env
DB_HOST=dpg-d4dmojemcj7s73edtop0-a
DB_NAME=zerovaste
DB_USER=zerovaste_user
DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
DB_SSL=true
```

### **Frontend (client/.env.local):**
```env
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Start Script (Automated)

You can create a start script to automate the process:

### **Windows (start-dev.ps1):**
```powershell
# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

Write-Host "✅ Both servers starting..."
Write-Host "Backend: http://localhost:4000"
Write-Host "Frontend: http://localhost:5173"
```

**Usage:**
```powershell
.\start-dev.ps1
```

---

## 📚 Additional Resources

- **Setup Guide:** [SETUP_SCRIPTS.md](SETUP_SCRIPTS.md)
- **Environment Config:** [ENVIRONMENT_EXPLANATION.md](ENVIRONMENT_EXPLANATION.md)
- **Updated Build Config:** [docs/UPDATED_BUILD_CONFIG.md](docs/UPDATED_BUILD_CONFIG.md)

---

**Need Help?** Check the troubleshooting section above or review the detailed documentation.

