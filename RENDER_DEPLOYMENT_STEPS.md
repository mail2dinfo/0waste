# Quick Deployment Steps for Render

## 🚀 Quick Start

### Option 1: Manual Deployment (Recommended for first time)

#### Backend API (Server)

1. **Create Web Service**
   - Go to https://dashboard.render.com
   - Click **"New +"** → **"Web Service"**
   - Connect your Git repository

2. **Configure Backend**
   - **Name:** `zerovaste-api`
   - **Root Directory:** `server` ⚠️ **IMPORTANT:** Set this to `server` so Render knows to use the server folder
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Starter ($7/month) or Free (with limitations)

3. **Environment Variables for Backend:**
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=dpg-d4dmojemcj7s73edtop0-a
   DB_NAME=zerovaste
   DB_USER=zerovaste_user
   DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
   DB_PORT=5432
   DB_SSL=true
   ```

4. **After Backend Deploys:**
   - Copy the backend URL (e.g., `https://zerovaste-api.onrender.com`)
   - Add these additional environment variables:
   ```
   FRONTEND_URL=https://your-frontend-url.onrender.com
   INVITE_BASE_URL=https://your-frontend-url.onrender.com/invite
   ```

#### Frontend Client

1. **Create Static Site**
   - Go to https://dashboard.render.com
   - Click **"New +"** → **"Static Site"**
   - Connect your Git repository

2. **Configure Frontend**
   - **Name:** `zerovaste-web`
   - **Root Directory:** `client` ⚠️ **IMPORTANT:** Set this to `client` so Render knows to use the client folder
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Plan:** Free (for static sites)

3. **Environment Variables for Frontend:**
   ```
   VITE_API_URL=https://zerovaste-api.onrender.com/api
   ```
   (Replace with your actual backend URL)

4. **Deploy and get the frontend URL**

5. **Go back to Backend settings** and update:
   ```
   FRONTEND_URL=https://zerovaste-web.onrender.com
   INVITE_BASE_URL=https://zerovaste-web.onrender.com/invite
   ```

### Option 2: Using Blueprint (render.yaml)

1. Push `render.yaml` to your repository
2. Go to Render → **"New +"** → **"Blueprint"**
3. Connect repository
4. Render will create both services automatically
5. Update environment variables as needed

## 📝 Important Notes

### Database Hostname
If connection fails, try updating `DB_HOST` to include full domain:
```
DB_HOST=dpg-d4dmojemcj7s73edtop0-a.singapore-postgres.render.com
```
(Check your Render database dashboard for the exact hostname)

### WebSocket Support
- Render's free tier has limited WebSocket support
- For production chat features, consider:
  - Upgrading to paid plan ($7/month)
  - Or using Railway/Fly.io for better WebSocket support

### CORS Configuration
The backend automatically allows the frontend URL once `FRONTEND_URL` is set correctly.

### Build Commands
- **Backend:** `npm install && npm run build` (in `server` directory)
- **Frontend:** `npm install && npm run build` (in `client` directory)

## 🔧 Troubleshooting

1. **Build fails:** Check build logs, ensure Node version is compatible
2. **Database connection error:** Verify credentials and SSL settings
3. **CORS errors:** Ensure `FRONTEND_URL` matches exactly (no trailing slash)
4. **API 404:** Check `VITE_API_URL` includes `/api` suffix
5. **WebSocket not working:** May need paid plan or alternative hosting

## ✅ Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Database connection working
- [ ] Frontend can call backend API
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] WebSocket chat working (if applicable)

