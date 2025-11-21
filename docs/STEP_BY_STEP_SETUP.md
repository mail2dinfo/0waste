# Step-by-Step Environment Setup Guide

Follow these steps to configure your application for both local development and production.

---

## 📋 Part 1: Local Development Setup

### Step 1: Create Frontend Environment File

1. **Navigate to the client folder:**
   ```bash
   cd client
   ```

2. **Create a new file named `.env.local`:**
   - **Windows**: Right-click in folder → New → Text Document → Name it `.env.local` (make sure it starts with a dot)
   - **VS Code**: Right-click in explorer → New File → Name it `.env.local`
   - **Command Line**: `type nul > .env.local` (Windows) or `touch .env.local` (Mac/Linux)

3. **Open `.env.local` and paste this content:**
   ```env
   VITE_API_URL=http://localhost:4000/api
   VITE_FRONTEND_URL=http://localhost:5173
   ```

4. **Save the file**

### Step 2: Create Backend Environment File

1. **Navigate to the server folder:**
   ```bash
   cd ../server
   ```
   (Or `cd server` if you're in the project root)

2. **Create a new file named `.env.local`** (same way as Step 1)

3. **Open `.env.local` and paste this content:**
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

4. **Update the database password:**
   - Replace `your_database_password_here` with your actual Render PostgreSQL password
   - Password can be found in Render dashboard → Database → Internal Database URL
   - Note: This uses Render PostgreSQL database for build environment

5. **Save the file**

### Step 3: Verify Files Are Created

You should now have:
- ✅ `client/.env.local` (with frontend config)
- ✅ `server/.env.local` (with backend config)

**Important:** Make sure the files are named exactly `.env.local` (starting with a dot, no extension)

### Step 4: Test Local Development

1. **Start the Backend:**
   ```bash
   cd server
   npm run dev
   ```
   - Should see: "Server running on port 4000"
   - Should see: "Database connection successful"

2. **In a NEW terminal, start the Frontend:**
   ```bash
   cd client
   npm run dev
   ```
   - Should see: "Local: http://localhost:5173"
   - Browser should open automatically

3. **Verify it's working:**
   - Open browser console (F12)
   - Check Network tab - API calls should go to `http://localhost:4000/api`
   - Try logging in or accessing the app

---

## 📋 Part 2: Production Setup (Render)

### Step 1: Configure Frontend Service on Render

1. **Go to Render Dashboard:**
   - Visit https://dashboard.render.com
   - Login to your account

2. **Select your Frontend Service:**
   - Click on your frontend service (e.g., "zerovaste-frontend" or similar)

3. **Navigate to Environment tab:**
   - Click on "Environment" in the left sidebar

4. **Add Environment Variables:**
   Click "Add Environment Variable" for each of these:

   **Variable 1:**
   - Key: `VITE_API_URL`
   - Value: `https://zerovaste.onrender.com/api`
   - Click "Save Changes"

   **Variable 2:**
   - Key: `VITE_FRONTEND_URL`
   - Value: `https://zerovaste-uga7.onrender.com`
   - Click "Save Changes"

5. **Verify both variables are saved**

### Step 2: Configure Backend Service on Render

1. **Select your Backend Service:**
   - Go back to Render dashboard
   - Click on your backend service (e.g., "zerovaste-backend" or similar)

2. **Navigate to Environment tab:**
   - Click on "Environment" in the left sidebar

3. **Add Environment Variables one by one:**
   Click "Add Environment Variable" and add each:

   **Server Configuration:**
   - `PORT` = `1000`
   - `NODE_ENV` = `production`

   **Frontend Configuration:**
   - `FRONTEND_URL` = `https://zerovaste-uga7.onrender.com`
   - `INVITE_BASE_URL` = `https://zerovaste-uga7.onrender.com/invite`

   **Database Configuration:**
   - `DB_HOST` = `dpg-d4dmojemcj7s73edtop0-a`
   - `DB_NAME` = `zerovaste`
   - `DB_USER` = `zerovaste_user`
   - `DB_PASSWORD` = `TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27`
   - `DB_PORT` = `5432`
   - `DB_SSL` = `true`
   - `DB_LOGGING` = `false`

4. **Verify all variables are saved** (should see 11 variables total)

### Step 3: Redeploy Services (if needed)

1. **For each service (Frontend & Backend):**
   - Go to the service page
   - Click "Manual Deploy" → "Deploy latest commit"
   - OR just wait for auto-deploy if you have auto-deploy enabled

2. **Wait for deployment to complete**
   - Green checkmark means deployment successful

### Step 4: Verify Production is Working

1. **Visit your frontend URL:**
   - Go to: `https://zerovaste-uga7.onrender.com`
   - App should load

2. **Check if API is connected:**
   - Open browser console (F12)
   - Check Network tab - API calls should go to `https://zerovaste.onrender.com/api`
   - Try logging in or using the app

---

## 📋 Part 3: Using Setup Scripts (Alternative Method)

If you prefer using scripts to create the `.env.local` files:

### Windows (PowerShell):

1. **Open PowerShell in the project root folder**

2. **Run the setup script:**
   ```powershell
   .\scripts\setup-env.ps1
   ```

3. **If you get an execution policy error, run this first:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   Then run the script again.

4. **Update `server/.env.local` with your local database password**

### Mac/Linux (Terminal):

1. **Open Terminal in the project root folder**

2. **Make the script executable:**
   ```bash
   chmod +x scripts/setup-env.sh
   ```

3. **Run the setup script:**
   ```bash
   ./scripts/setup-env.sh
   ```

4. **Update `server/.env.local` with your local database password**

---

## ✅ Verification Checklist

### Local Development:
- [ ] `client/.env.local` exists and has correct values
- [ ] `server/.env.local` exists and has correct values
- [ ] Backend starts without errors on port 4000
- [ ] Frontend starts without errors on port 5173
- [ ] Frontend can connect to backend API
- [ ] Database connection works

### Production (Render):
- [ ] Frontend service has `VITE_API_URL` set
- [ ] Frontend service has `VITE_FRONTEND_URL` set
- [ ] Backend service has all 11 environment variables set
- [ ] Both services deployed successfully
- [ ] Production frontend loads correctly
- [ ] Production API works correctly

---

## 🔧 Troubleshooting

### Problem: `.env.local` file not being read

**Solution:**
1. Make sure file name is exactly `.env.local` (not `.env.local.txt`)
2. Check file is in the correct folder (`client/` or `server/`)
3. Restart the dev server after creating/editing the file
4. On Windows, make sure "Hide extensions for known file types" is disabled when creating

### Problem: Frontend can't connect to backend

**Solution:**
1. Check `VITE_API_URL` in `client/.env.local` is `http://localhost:4000/api`
2. Verify backend is running on port 4000
3. Check browser console for CORS errors
4. Try accessing `http://localhost:4000/api/health` directly in browser

### Problem: Backend can't connect to database

**Solution:**
1. Verify PostgreSQL is running locally
2. Check database credentials in `server/.env.local`
3. Test connection manually: `psql -h 127.0.0.1 -U postgres -d zerovaste`
4. Verify `DB_SSL=false` for local development

### Problem: Production deployment fails

**Solution:**
1. Check all environment variables are set in Render dashboard
2. Verify variable names are exact (case-sensitive)
3. Check deployment logs in Render for specific errors
4. Ensure database service is running and accessible

---

## 📚 Additional Resources

- **Full Documentation**: See `docs/ENVIRONMENT_SETUP.md`
- **Quick Reference**: See `docs/env-templates.md`
- **Quick Start**: See `README_ENV.md`

---

## 🎯 Quick Reference

### Local Development Defaults:
- Frontend URL: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- Database Host: `127.0.0.1:5432`

### Production Defaults (Render):
- Frontend URL: `https://zerovaste-uga7.onrender.com`
- Backend API: `https://zerovaste.onrender.com/api`
- Database: Render PostgreSQL (credentials in Render dashboard)

---

## 💡 Tips

1. **Always restart dev servers** after changing `.env.local` files
2. **Keep `.env.local` files local** - never commit them to git
3. **Use different passwords** for local and production databases
4. **Test locally first** before deploying to production
5. **Check deployment logs** in Render if production issues occur

---

## 📞 Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Review the full documentation in `docs/ENVIRONMENT_SETUP.md`
3. Check Render deployment logs for production issues
4. Verify all environment variables are set correctly


