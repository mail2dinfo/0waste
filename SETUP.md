# 🚀 Environment Setup - Step by Step Instructions

Follow these exact steps to set up your environment configuration.

> **📚 Want to understand HOW it works?** See [HOW_ENV_WORKS.md](docs/HOW_ENV_WORKS.md) for a detailed explanation of the environment system.

---

## ⚡ Quick Setup (Automatic)

Run this command from the project root:

```bash
node scripts/setup.js
```

This will automatically create both `client/.env.local` and `server/.env.local` files.

Then skip to **Step 3** below.

---

## 📝 Manual Setup (Step by Step)

### Step 1: Create Frontend Environment File

1. **Open your project in a code editor (VS Code recommended)**

2. **Navigate to the `client` folder:**
   - In file explorer: Open `client` folder
   - Or in terminal: `cd client`

3. **Create a new file:**
   - **VS Code**: Right-click in the file explorer → "New File"
   - **Windows File Explorer**: Right-click → New → Text Document
   - **Mac Finder**: Right-click → New Document → Text Document

4. **Name the file exactly:** `.env.local`
   - ⚠️ Must start with a dot (.)
   - ⚠️ No file extension (not `.env.local.txt`)
   - On Windows: Make sure "Hide extensions for known file types" is OFF

5. **Open the file and paste this content:**
   ```env
   VITE_API_URL=http://localhost:4000/api
   VITE_FRONTEND_URL=http://localhost:5173
   ```

6. **Save the file** (Ctrl+S or Cmd+S)

7. **Verify:** You should see a file named `.env.local` in the `client` folder

### Step 2: Create Backend Environment File

1. **Navigate to the `server` folder:**
   - In file explorer: Open `server` folder
   - Or in terminal: `cd server` (if you were in client: `cd ../server`)

2. **Create a new file named:** `.env.local` (same process as Step 1)

3. **Open the file and paste this content:**
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

4. **⚠️ IMPORTANT: Update the database password:**
   - Replace `your_database_password_here` with your actual Render PostgreSQL password
   - Password can be found in Render dashboard → Database → Internal Database URL
   - Note: This uses Render PostgreSQL database (not local PostgreSQL) for build environment

5. **Save the file**

6. **Verify:** You should see a file named `.env.local` in the `server` folder

### Step 3: Verify Setup

**Check that you have these files:**
- ✅ `client/.env.local` (exists)
- ✅ `server/.env.local` (exists)

**Verify file contents:**
- ✅ `client/.env.local` has `VITE_API_URL` and `VITE_FRONTEND_URL`
- ✅ `server/.env.local` has database credentials (updated with your password)

### Step 4: Test the Setup

1. **Start Backend Server:**

   Open a terminal in the project root:
   ```bash
   cd server
   npm run dev
   ```

   **Expected output:**
   - Should see: "Server running on port 4000"
   - Should see: "Database connection successful" (or similar)
   - Should NOT see database connection errors

2. **Start Frontend (in a NEW terminal):**

   Open a second terminal:
   ```bash
   cd client
   npm run dev
   ```

   **Expected output:**
   - Should see: "Local: http://localhost:5173"
   - Browser should open automatically
   - Should NOT see API connection errors

3. **Test in Browser:**

   - Open browser console (F12)
   - Go to Network tab
   - Try logging in or using the app
   - Check that API calls go to `http://localhost:4000/api`

---

## 🌐 Production Setup (Render)

### Step 1: Configure Frontend on Render

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Login to your account

2. **Select Frontend Service:**
   - Click on your frontend service (e.g., "zerovaste-frontend")

3. **Go to Environment Tab:**
   - Click "Environment" in the left sidebar

4. **Add Environment Variables:**

   Click "Add Environment Variable" button, then add:

   **Variable 1:**
   - Key: `VITE_API_URL`
   - Value: `https://zerovaste.onrender.com/api`
   - Click "Save Changes"

   **Variable 2:**
   - Key: `VITE_FRONTEND_URL`
   - Value: `https://zerovaste-uga7.onrender.com`
   - Click "Save Changes"

5. **Verify:**
   - Should see 2 environment variables listed
   - Both should have green checkmarks

### Step 2: Configure Backend on Render

1. **Select Backend Service:**
   - Click on your backend service (e.g., "zerovaste-backend")

2. **Go to Environment Tab:**
   - Click "Environment" in the left sidebar

3. **Add Environment Variables:**

   Add each variable one by one by clicking "Add Environment Variable":

   **Server Config:**
   - `PORT` = `1000`
   - `NODE_ENV` = `production`

   **Frontend Config:**
   - `FRONTEND_URL` = `https://zerovaste-uga7.onrender.com`
   - `INVITE_BASE_URL` = `https://zerovaste-uga7.onrender.com/invite`

   **Database Config:**
   - `DB_HOST` = `dpg-d4dmojemcj7s73edtop0-a`
   - `DB_NAME` = `zerovaste`
   - `DB_USER` = `zerovaste_user`
   - `DB_PASSWORD` = `TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27`
   - `DB_PORT` = `5432`
   - `DB_SSL` = `true`
   - `DB_LOGGING` = `false`

4. **Verify:**
   - Should see 11 environment variables total
   - All should have green checkmarks

### Step 3: Redeploy Services

1. **For Frontend Service:**
   - Go to frontend service page
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for deployment to complete (green checkmark)

2. **For Backend Service:**
   - Go to backend service page
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for deployment to complete (green checkmark)

### Step 4: Test Production

1. **Visit Frontend:**
   - Go to: `https://zerovaste-uga7.onrender.com`
   - App should load without errors

2. **Check API Connection:**
   - Open browser console (F12)
   - Go to Network tab
   - Try using the app
   - API calls should go to `https://zerovaste.onrender.com/api`

---

## ✅ Checklist

### Local Development:
- [ ] Created `client/.env.local` file
- [ ] Created `server/.env.local` file
- [ ] Updated `server/.env.local` with database password
- [ ] Backend starts successfully on port 4000
- [ ] Frontend starts successfully on port 5173
- [ ] Frontend can connect to backend API
- [ ] Database connection works

### Production (Render):
- [ ] Added `VITE_API_URL` to frontend service
- [ ] Added `VITE_FRONTEND_URL` to frontend service
- [ ] Added all 11 environment variables to backend service
- [ ] Both services deployed successfully
- [ ] Production frontend loads correctly
- [ ] Production API works correctly

---

## 🔧 Troubleshooting

### Issue: Can't create `.env.local` file

**Solution:**
- Windows: Make sure "Hide extensions for known file types" is OFF
- Try creating it as `.env.local` (with quotes) in Command Prompt
- Or use: `type nul > .env.local` (Windows) or `touch .env.local` (Mac/Linux)

### Issue: Backend can't connect to database

**Solution:**
- Verify PostgreSQL is running locally
- Check database credentials in `server/.env.local`
- Test connection manually: `psql -h 127.0.0.1 -U postgres -d zerovaste`
- Make sure `DB_PASSWORD` is correct

### Issue: Frontend can't connect to backend

**Solution:**
- Check `VITE_API_URL` in `client/.env.local` is `http://localhost:4000/api`
- Verify backend is running on port 4000
- Restart frontend dev server after changing `.env.local`
- Check browser console for CORS errors

### Issue: Production deployment fails

**Solution:**
- Check all environment variables are set in Render dashboard
- Verify variable names are exact (case-sensitive)
- Check deployment logs in Render for specific errors
- Ensure database service is running

---

## 📚 Need More Help?

- **Full Documentation**: See `docs/ENVIRONMENT_SETUP.md`
- **Quick Reference**: See `docs/env-templates.md`
- **Detailed Guide**: See `docs/STEP_BY_STEP_SETUP.md`

