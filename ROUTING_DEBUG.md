# Routing Debug Guide

## Problem
Invite links like `https://zerovaste-06c0.onrender.com/invite/d50e7078-d2f7-4465-a13f-942827c404e0` return "Not Found"

## Root Cause Analysis

### Why it works locally:
- Vite dev server (`npm run dev`) automatically handles SPA routing
- When you visit `/invite/:eventId`, Vite serves `index.html`
- React Router then handles the client-side routing

### Why it doesn't work on Render:
- **If configured as Static Site**: Render serves files directly, doesn't handle SPA routing
- **If configured as Web Service**: Should work with our server.js, but might not be running

## Current Setup

### ✅ What's Correct:
1. React Router route exists: `/invite/:eventId` in `App.tsx`
2. `server.js` created to handle SPA routing
3. `package.json` has `"start": "node server.js"`
4. `render.yaml` configured as web service with `startCommand: npm start`

### ❓ Potential Issues:

1. **Render Dashboard Configuration**
   - Service might still be configured as "Static Site" instead of "Web Service"
   - Check: Render Dashboard → zerovaste-web → Settings → Service Type
   - Should be: **Web Service** (not Static Site)

2. **render.yaml Not Being Used**
   - If service was manually created, Render might ignore render.yaml
   - Solution: Update settings manually in dashboard OR use render.yaml

3. **Server Not Starting**
   - Check Render logs for errors
   - Look for: "Server is running on port" message
   - If missing, server.js isn't running

4. **Build Issues**
   - `dist` folder might not exist
   - Check logs for: "ERROR: dist folder not found"

## Diagnostic Steps

### Step 1: Check Render Dashboard
1. Go to Render Dashboard
2. Click on `zerovaste-web` service
3. Check **Settings** tab:
   - **Service Type**: Should be "Web Service" (NOT "Static Site")
   - **Build Command**: Should be `npm install && npm run build`
   - **Start Command**: Should be `npm start`
   - **Root Directory**: Should be `client`

### Step 2: Check Render Logs
1. Go to Render Dashboard → zerovaste-web → Logs
2. Look for these messages:
   - `=== Server Starting ===`
   - `✓ Server is running on port`
   - `✓ SPA routing enabled`
3. When you visit `/invite/...`, you should see:
   - `Request: GET /invite/...`
   - `→ SPA route, serving index.html`
   - `✓ Served index.html successfully`

### Step 3: Test the Root URL
- Visit: `https://zerovaste-06c0.onrender.com/`
- Should load the landing page
- If this works but `/invite/...` doesn't, it's a routing issue

### Step 4: Check Build Output
- In Render logs, check if build completes successfully
- Should see: `dist/index.html` created
- Should see: `dist/assets/` folder with JS/CSS files

## Solutions

### Solution 1: Update Render Dashboard Manually
If render.yaml isn't being used:

1. Go to Render Dashboard → zerovaste-web → Settings
2. Change **Service Type** from "Static Site" to **"Web Service"**
3. Set **Build Command**: `npm install && npm run build`
4. Set **Start Command**: `npm start`
5. Set **Root Directory**: `client`
6. Save and redeploy

### Solution 2: Verify server.js is Running
Check Render logs for server startup messages. If missing:
- Server.js might have errors
- Check for syntax errors
- Verify `express` is installed: `npm list express`

### Solution 3: Alternative - Use HashRouter (Not Recommended)
Change from BrowserRouter to HashRouter:
- URLs become: `/#/invite/:eventId`
- Works without server-side routing
- But URLs look ugly

### Solution 4: Use Render's Redirects (If Static Site)
If you must use Static Site:
1. Go to Settings → Redirects/Rewrites
2. Add: Source: `/*`, Destination: `/index.html`, Action: `Rewrite`

## Expected Behavior

When working correctly:
1. Visit: `https://zerovaste-06c0.onrender.com/invite/d50e7078-d2f7-4465-a13f-942827c404e0`
2. Server receives request
3. Server serves `index.html`
4. Browser loads React app
5. React Router matches `/invite/:eventId`
6. `InvitePage` component renders
7. Component fetches event data from API
8. Page displays invite form

## Quick Fix Checklist

- [ ] Service type is "Web Service" (not "Static Site")
- [ ] Start command is `npm start`
- [ ] Build command includes `npm run build`
- [ ] `server.js` exists in `client/` folder
- [ ] `package.json` has `"start": "node server.js"`
- [ ] `express` is in dependencies
- [ ] Render logs show server starting
- [ ] Render logs show requests being handled

