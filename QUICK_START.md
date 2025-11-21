# Quick Start Guide

## 🚀 How to Run the Application

### **Local Development (Uses DEV Database)**

#### **1. Run Setup Script (One-time)**
```powershell
node scripts/setup.js
```

This creates `client/.env.local` and `server/.env.local` with DEV database credentials.

#### **2. Start Backend Server**
```powershell
cd server
npm run dev
```

Backend will connect to **DEV database** automatically.

#### **3. Start Frontend Server (New Terminal)**
```powershell
cd client
npm run dev
```

#### **4. Access Application**
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

---

### **Production (Uses PROD Database)**

Production on Render automatically uses **PROD database** from Render dashboard environment variables.

**No configuration needed** - Render uses production environment variables.

---

## 📋 Environment Configuration

### **Local Development**
- **File:** `server/.env.local`
- **Database:** DEV database
- **Host:** `dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com`
- **Database:** `investo_3mo3`
- **User:** `investo_3mo3_user`

### **Production (Render)**
- **Source:** Render Dashboard → Environment Variables
- **Database:** PROD database
- **Host:** `dpg-d4dmojemcj7s73edtop0-a`
- **Database:** `zerovaste`
- **User:** `zerovaste_user`

---

## ✅ Quick Verification

### **Check Local Config:**
```powershell
cd server
Get-Content .env.local | Select-String "DB_"
```

### **Verify Backend Connection:**
After starting backend, check terminal for:
- ✅ `Database connected successfully`
- ❌ No connection errors

---

## 🎯 Summary

| Environment | Database | Configuration Source |
|------------|----------|---------------------|
| **Local** | DEV | `server/.env.local` |
| **Production** | PROD | Render Dashboard |

**That's it!** The application automatically uses the correct database based on where it's running.


