# Complete Step-by-Step Guide: Deploying to Render (Option 1)

This guide walks you through every click and field in Render's interface.

---

## PART 1: Deploy Backend (Server)

### Step 1: Go to Render Dashboard
1. Open your browser
2. Go to: https://dashboard.render.com
3. Sign in (or create an account if you don't have one)

### Step 2: Create New Web Service
1. Click the **"New +"** button (usually in the top right or center of the dashboard)
2. From the dropdown menu, click **"Web Service"**

### Step 3: Connect Your Repository
You'll see a page asking you to connect a repository.

**Option A: If you see GitHub/GitLab/Bitbucket buttons:**
1. Click **"Connect GitHub"** (or GitLab/Bitbucket if your repo is there)
2. Authorize Render to access your repositories
3. Search for: `0waste` or `mail2dinfo/0waste`
4. Click on your repository: **`mail2dinfo/0waste`**

**Option B: If you see a repository URL field:**
1. Paste this URL: `https://github.com/mail2dinfo/0waste`
2. Click **"Connect"** or **"Continue"**

### Step 4: Configure the Service
After connecting, you'll see a form with multiple fields. Fill them in **exactly** as shown:

#### Basic Settings:
- **Name:** Type: `zerovaste-api`
  - (This will be your service name and part of your URL)

#### Environment:
- **Environment:** Select **"Node"** from the dropdown
  - (If you don't see a dropdown, it might auto-detect Node)

#### Region:
- **Region:** Choose the closest region to you (e.g., "Oregon (US West)" or "Singapore")
  - (This doesn't affect functionality, just latency)

#### Branch:
- **Branch:** Leave as `main` (or `master` if that's your default branch)

#### Root Directory: ⚠️ **THIS IS THE KEY FIELD!**
- **Root Directory:** Type: `server`
  - **Where to find it:** Scroll down in the form, look for a field labeled:
    - "Root Directory"
    - "Working Directory" 
    - "Base Directory"
    - Or it might be in an "Advanced" or "Settings" section
  - **What to type:** Just type `server` (no slashes, no paths, just the word `server`)
  - **Why:** This tells Render "use the server folder from my repo"

#### Build & Start:
- **Build Command:** Type: `npm install && npm run build`
- **Start Command:** Type: `npm start`

#### Plan:
- **Plan:** Select **"Starter"** ($7/month) or **"Free"** (with limitations)
  - Free tier works but has limitations (sleeps after inactivity, slower builds)

### Step 5: Add Environment Variables
Scroll down to find the **"Environment Variables"** section.

Click **"Add Environment Variable"** for each of these:

1. **Key:** `NODE_ENV`
   **Value:** `production`
   Click **"Add"**

2. **Key:** `PORT`
   **Value:** `10000`
   Click **"Add"**

3. **Key:** `DB_HOST`
   **Value:** `dpg-d4dmojemcj7s73edtop0-a`
   Click **"Add"`

4. **Key:** `DB_NAME`
   **Value:** `zerovaste`
   Click **"Add"`

5. **Key:** `DB_USER`
   **Value:** `zerovaste_user`
   Click **"Add"**

6. **Key:** `DB_PASSWORD`
   **Value:** `TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27`
   Click **"Add"**

7. **Key:** `DB_PORT`
   **Value:** `5432`
   Click **"Add"`

8. **Key:** `DB_SSL`
   **Value:** `true`
   Click **"Add"`

**Note:** We'll add `FRONTEND_URL` and `INVITE_BASE_URL` later after the frontend is deployed.

### Step 6: Create the Service
1. Scroll to the bottom of the page
2. Click the **"Create Web Service"** button (usually green or blue)
3. Render will start building your service
4. **Wait for deployment to complete** (this can take 5-10 minutes)
5. **Copy the service URL** - it will look like: `https://zerovaste-api.onrender.com`
   - You'll see this at the top of the service page after deployment

---

## PART 2: Deploy Frontend (Client)

### Step 1: Go Back to Dashboard
1. Click **"Dashboard"** or the Render logo to go back to the main dashboard

### Step 2: Create New Static Site
1. Click the **"New +"** button again
2. From the dropdown, click **"Static Site"**
   - (If you don't see "Static Site", you can use "Web Service" instead)

### Step 3: Connect Your Repository (Again)
1. You'll see the same repository connection page
2. Select your repository: **`mail2dinfo/0waste`** (the same one as before)
   - Or paste: `https://github.com/mail2dinfo/0waste`

### Step 4: Configure the Frontend Service
Fill in the form:

#### Basic Settings:
- **Name:** Type: `zerovaste-web`

#### Environment:
- **Environment:** Select **"Node"**

#### Branch:
- **Branch:** Leave as `main`

#### Root Directory: ⚠️ **AGAIN, THIS IS CRITICAL!**
- **Root Directory:** Type: `client`
  - (Same field as before, but this time type `client` instead of `server`)

#### Build:
- **Build Command:** Type: `npm install && npm run build`

#### Publish Directory:
- **Publish Directory:** Type: `dist`
  - (This is where Vite builds your React app)

#### Plan:
- **Plan:** Select **"Free"** (Static sites are free on Render)

### Step 5: Add Environment Variables for Frontend
In the **"Environment Variables"** section:

1. **Key:** `VITE_API_URL`
   **Value:** `https://zerovaste-api.onrender.com/api`
   - **Important:** Replace `zerovaste-api` with your actual backend service name if different
   - The URL should be: `https://YOUR-BACKEND-NAME.onrender.com/api`
   Click **"Add"**

### Step 6: Create the Frontend Service
1. Click **"Create Static Site"** (or **"Create Web Service"**)
2. Wait for deployment (5-10 minutes)
3. **Copy the frontend URL** - it will look like: `https://zerovaste-web.onrender.com`

---

## PART 3: Link Frontend and Backend

Now we need to tell the backend where the frontend is, and make sure the frontend knows the backend URL.

### Step 1: Update Backend Environment Variables
1. Go to your Render dashboard
2. Click on your **backend service** (`zerovaste-api`)
3. Click on **"Environment"** tab (or look for "Environment Variables" in the sidebar)
4. Click **"Add Environment Variable"** and add:

   **Key:** `FRONTEND_URL`
   **Value:** `https://zerovaste-web.onrender.com`
   - (Replace with your actual frontend URL)
   Click **"Save Changes"**

5. Click **"Add Environment Variable"** again:

   **Key:** `INVITE_BASE_URL`
   **Value:** `https://zerovaste-web.onrender.com/invite`
   - (Replace with your actual frontend URL + `/invite`)
   Click **"Save Changes"**

6. Render will automatically redeploy after you save environment variables

### Step 2: Verify Frontend Environment Variable
1. Go to your **frontend service** (`zerovaste-web`)
2. Click on **"Environment"** tab
3. Verify that `VITE_API_URL` is set to your backend URL with `/api`:
   - Should be: `https://zerovaste-api.onrender.com/api`
4. If it's wrong, update it and save

---

## PART 4: Finding the Root Directory Field

If you can't find the "Root Directory" field, here's where to look:

### Location 1: Main Form (Most Common)
- It's usually in the main configuration form
- Look for fields like:
  - "Name"
  - "Environment"
  - "Branch"
  - **"Root Directory"** ← Here!

### Location 2: Advanced Settings
- Some Render interfaces have an "Advanced" or "Show Advanced" button
- Click it to reveal more fields including Root Directory

### Location 3: Settings Tab (After Creation)
- If you've already created the service, you can still set it:
  1. Go to your service page
  2. Click **"Settings"** tab
  3. Look for **"Root Directory"** field
  4. Update it and save

### What the Field Looks Like:
```
┌─────────────────────────────────┐
│ Root Directory                  │
│ [server                    ]    │ ← Type "server" here
└─────────────────────────────────┘
```

### If You Still Can't Find It:
- The field might be labeled differently:
  - "Working Directory"
  - "Base Directory"
  - "Source Directory"
- Or it might be optional - if you don't see it, you can use `cd server &&` in your build command instead:
  - **Build Command:** `cd server && npm install && npm run build`
  - **Start Command:** `cd server && npm start`

---

## Troubleshooting

### Problem: "Root Directory" field doesn't exist
**Solution:** Use `cd` commands in your build/start commands:
- **Build Command:** `cd server && npm install && npm run build`
- **Start Command:** `cd server && npm start`

### Problem: Build fails with "package.json not found"
**Solution:** 
- Make sure Root Directory is set to `server` (for backend) or `client` (for frontend)
- Or use `cd server &&` in your commands

### Problem: Can't find where to add environment variables
**Solution:**
- After creating the service, go to the service page
- Click **"Environment"** tab in the sidebar
- Or look for **"Environment Variables"** section

### Problem: Service URL not working
**Solution:**
- Wait a few minutes for deployment to complete
- Check the "Logs" tab for errors
- Make sure all environment variables are set correctly

---

## Summary Checklist

### Backend Deployment:
- [ ] Created Web Service
- [ ] Connected repository: `https://github.com/mail2dinfo/0waste`
- [ ] Set Root Directory: `server`
- [ ] Set Build Command: `npm install && npm run build`
- [ ] Set Start Command: `npm start`
- [ ] Added all 8 environment variables
- [ ] Deployment completed successfully
- [ ] Copied backend URL

### Frontend Deployment:
- [ ] Created Static Site
- [ ] Connected repository: `https://github.com/mail2dinfo/0waste`
- [ ] Set Root Directory: `client`
- [ ] Set Build Command: `npm install && npm run build`
- [ ] Set Publish Directory: `dist`
- [ ] Added `VITE_API_URL` environment variable
- [ ] Deployment completed successfully
- [ ] Copied frontend URL

### Linking Services:
- [ ] Updated backend `FRONTEND_URL` environment variable
- [ ] Updated backend `INVITE_BASE_URL` environment variable
- [ ] Verified frontend `VITE_API_URL` is correct
- [ ] Both services redeployed successfully

---

## You're Done! 🎉

Your application should now be live at:
- Frontend: `https://zerovaste-web.onrender.com`
- Backend API: `https://zerovaste-api.onrender.com`

Test it by visiting your frontend URL in a browser!

