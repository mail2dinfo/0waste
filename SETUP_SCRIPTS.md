# Step-by-Step Setup Scripts

This guide provides exact commands to run for setting up your development environment with Render PostgreSQL database.

## 📋 Prerequisites

- Node.js installed (v16 or higher)
- npm installed
- Access to Render dashboard for database password

---

## 🚀 Step 1: Install Dependencies

### **Frontend Dependencies**

```bash
cd client
npm install
```

### **Backend Dependencies**

```bash
cd server
npm install
```

**Or install both at once:**

```bash
# From project root
cd client && npm install && cd ../server && npm install && cd ..
```

---

## 🔧 Step 2: Create Environment Files

### **Option A: Using Setup Script (Recommended)**

```bash
# From project root
node scripts/setup.js
```

This will automatically create:
- `client/.env.local`
- `server/.env.local`

### **Option B: Manual Creation**

#### **Frontend Environment File**

```bash
# Create client/.env.local
cd client
cat > .env.local << 'EOF'
# Local Development Configuration
# API Configuration
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
EOF
```

#### **Backend Environment File**

```bash
# Create server/.env.local
cd server
cat > .env.local << 'EOF'
# Local Development Configuration
# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URLs
FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite

# Database Configuration (Render PostgreSQL - Build Environment)
DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=investo_3mo3
DB_USER=investo_3mo3_user
DB_PASSWORD=your_database_password_here
DB_SSL=true
DB_LOGGING=true
EOF
```

---

## 🔑 Step 3: Get Database Password from Render

### **Method 1: From Render Dashboard**

1. **Go to Render Dashboard:**
   ```bash
   # Open in browser
   start https://dashboard.render.com
   ```

2. **Navigate to your PostgreSQL database:**
   - Click on your PostgreSQL service
   - Go to "Info" tab
   - Find "Internal Database URL" or "Connection String"

3. **Extract password:**
   - Connection string format: `postgres://user:password@host:port/dbname`
   - Copy the password part (between `:` and `@`)

### **Method 2: Check Existing Environment Variables**

If you already have the password in Render:
- Go to Render Dashboard → Your PostgreSQL Service → Environment
- Look for `DATABASE_URL` or connection string

---

## ✏️ Step 4: Update Database Password

### **Windows (PowerShell)**

```powershell
# Navigate to server directory
cd server

# Read current file
Get-Content .env.local

# Edit the password (replace YOUR_ACTUAL_PASSWORD)
(Get-Content .env.local) -replace 'your_database_password_here', 'YOUR_ACTUAL_PASSWORD' | Set-Content .env.local

# Verify the change
Get-Content .env.local | Select-String "DB_PASSWORD"
```

### **Windows (Command Prompt)**

```cmd
cd server
notepad .env.local
```

Then manually edit:
- Find: `DB_PASSWORD=your_database_password_here`
- Replace with: `DB_PASSWORD=YOUR_ACTUAL_PASSWORD`
- Save and close

### **Linux/Mac (Terminal)**

```bash
cd server
nano .env.local
```

Or using sed:

```bash
cd server
sed -i 's/your_database_password_here/YOUR_ACTUAL_PASSWORD/g' .env.local
cat .env.local | grep DB_PASSWORD
```

---

## ✅ Step 5: Verify Configuration

### **Check Frontend Config**

```bash
# From project root
cd client
cat .env.local
```

**Expected output:**
```
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
```

### **Check Backend Config**

```bash
# From project root
cd server
cat .env.local
```

**Expected output:**
```
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite
DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=investo_3mo3
DB_USER=investo_3mo3_user
DB_PASSWORD=YOUR_ACTUAL_PASSWORD
DB_SSL=true
DB_LOGGING=true
```

---

## 🗄️ Step 6: Verify Database Connection (Optional)

### **Test PostgreSQL Connection**

```bash
# Install psql if not available
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Test connection
psql -h dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com -p 5432 -U investo_3mo3_user -d investo_3mo3

# When prompted, enter your password
# If successful, you'll see: investo_3mo3=>
# Type \q to exit
```

---

## 🚀 Step 7: Start Development Servers

### **Option A: Separate Terminals (Recommended)**

#### **Terminal 1: Backend Server**

```bash
cd server
npm run dev
```

**Expected output:**
```
Server running on http://localhost:4000
Database connected successfully
```

#### **Terminal 2: Frontend Server**

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

### **Option B: Background Processes**

#### **Windows (PowerShell)**

```powershell
# Start backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"

# Start frontend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"
```

#### **Linux/Mac**

```bash
# Start backend in background
cd server && npm run dev > ../backend.log 2>&1 &

# Start frontend in background
cd client && npm run dev > ../frontend.log 2>&1 &

# View logs
tail -f backend.log
tail -f frontend.log
```

---

## 🧪 Step 8: Test the Application

### **1. Open Frontend**

```bash
# Open in browser
start http://localhost:5173
# Or
open http://localhost:5173
# Or manually navigate to http://localhost:5173
```

### **2. Test API Connection**

```bash
# Test backend health endpoint
curl http://localhost:4000/api/health

# Or open in browser
start http://localhost:4000/api/health
```

### **3. Verify Database Connection**

Check backend terminal for:
- ✅ `Database connected successfully`
- ❌ No connection errors

---

## 🔍 Step 9: Troubleshooting

### **Problem: Database Connection Failed**

```bash
# Check if password is correct
cd server
cat .env.local | grep DB_PASSWORD

# Verify database host is accessible
ping dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com

# Check if SSL is enabled
cat .env.local | grep DB_SSL
# Should show: DB_SSL=true
```

### **Problem: Frontend Can't Connect to Backend**

```bash
# Verify backend is running
curl http://localhost:4000/api/health

# Check frontend config
cd client
cat .env.local
# Should show: VITE_API_URL=http://localhost:4000/api

# Check CORS settings in backend
cd server
grep -r "FRONTEND_URL" src/
```

### **Problem: Port Already in Use**

```bash
# Windows: Find process using port 4000
netstat -ano | findstr :4000

# Windows: Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Linux/Mac: Find process using port 4000
lsof -i :4000

# Linux/Mac: Kill process
kill -9 <PID>
```

---

## 📝 Quick Reference Commands

### **Complete Setup (All-in-One)**

```bash
# 1. Install dependencies
cd client && npm install && cd ../server && npm install && cd ..

# 2. Create environment files
node scripts/setup.js

# 3. (Manual step) Update server/.env.local with database password

# 4. Start backend (Terminal 1)
cd server && npm run dev

# 5. Start frontend (Terminal 2)
cd client && npm run dev
```

### **Common Commands**

```bash
# View frontend logs
cd client && npm run dev

# View backend logs
cd server && npm run dev

# Check environment files
cat client/.env.local
cat server/.env.local

# Reinstall dependencies
cd client && rm -rf node_modules && npm install
cd server && rm -rf node_modules && npm install

# Clear cache (if issues)
cd client && rm -rf node_modules/.vite
cd server && rm -rf node_modules/.cache
```

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`client/node_modules` and `server/node_modules` exist)
- [ ] `client/.env.local` file exists
- [ ] `server/.env.local` file exists
- [ ] Database password updated in `server/.env.local`
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Can access frontend at `http://localhost:5173`
- [ ] Can access backend at `http://localhost:4000/api/health`
- [ ] Database connection successful (check backend logs)

---

## 🎯 Next Steps

After successful setup:

1. **Create an account** in the application
2. **Test database operations** (create event, etc.)
3. **Verify payment flow** (if applicable)
4. **Test all features** end-to-end

---

## 📚 Additional Resources

- **Detailed Setup Guide:** [SETUP.md](SETUP.md)
- **Environment Configuration:** [ENVIRONMENT_EXPLANATION.md](ENVIRONMENT_EXPLANATION.md)
- **Updated Build Config:** [docs/UPDATED_BUILD_CONFIG.md](docs/UPDATED_BUILD_CONFIG.md)
- **Troubleshooting:** [docs/STEP_BY_STEP_SETUP.md](docs/STEP_BY_STEP_SETUP.md)

---

## 💡 Tips

1. **Always check logs** when something doesn't work
2. **Verify environment files** after any changes
3. **Keep database password secure** - don't commit `.env.local` files
4. **Use separate terminals** for frontend and backend for better debugging
5. **Check Render dashboard** if database connection fails

---

**Need Help?** Check the troubleshooting section or review the detailed documentation files.


