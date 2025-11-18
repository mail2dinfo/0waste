# Deployment Guide for Render

This guide will help you deploy both the client and server to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. PostgreSQL database already created on Render (or use the existing one)

## Step 1: Deploy the Backend API Server

1. Go to your Render dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Configure the service:
   - **Name:** `zerovaste-api`
   - **Root Directory:** `server` ⚠️ **CRITICAL:** This tells Render to use the `server` folder from your repo
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build` (no `cd server` needed when Root Directory is set)
   - **Start Command:** `npm start` (no `cd server` needed when Root Directory is set)
   - **Plan:** Starter (or your preferred plan)

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=dpg-d4dmojemcj7s73edtop0-a
   DB_NAME=zerovaste
   DB_USER=zerovaste_user
   DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
   DB_PORT=5432
   DB_SSL=true
   FRONTEND_URL=https://your-client-url.onrender.com
   INVITE_BASE_URL=https://your-client-url.onrender.com/invite
   ```

6. Click **"Create Web Service"**
7. Wait for the deployment to complete
8. **Copy the service URL** (e.g., `https://zerovaste-api.onrender.com`)

## Step 2: Deploy the Frontend Client

1. Go to your Render dashboard
2. Click **"New +"** → **"Static Site"** (or **"Web Service"** if you need server-side rendering)
3. Connect your Git repository
4. Configure the service:
   - **Name:** `zerovaste-web`
   - **Root Directory:** `client` ⚠️ **CRITICAL:** This tells Render to use the `client` folder from your repo
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build` (no `cd client` needed when Root Directory is set)
   - **Publish Directory:** `dist` (relative to Root Directory, so `client/dist` becomes just `dist`)
   - **Plan:** Starter (or Free tier for static sites)

5. Add Environment Variables:
   ```
   VITE_API_URL=https://your-api-url.onrender.com/api
   ```

   **Note:** Replace `your-api-url` with the actual URL from Step 1.

6. Click **"Create Static Site"** (or **"Create Web Service"**)
7. Wait for the deployment to complete
8. **Copy the service URL** (e.g., `https://zerovaste-web.onrender.com`)

## Step 3: Update Environment Variables

After both services are deployed, you need to update the environment variables:

### Update Backend (zerovaste-api):
1. Go to your backend service settings
2. Update `FRONTEND_URL` to your frontend URL: `https://zerovaste-web.onrender.com`
3. Update `INVITE_BASE_URL` to: `https://zerovaste-web.onrender.com/invite`
4. Save and redeploy

### Update Frontend (zerovaste-web):
1. Go to your frontend service settings
2. Update `VITE_API_URL` to your backend API URL: `https://zerovaste-api.onrender.com/api`
3. Save and redeploy

## Step 4: Database Connection

If your database hostname needs the full domain, update `DB_HOST` in the backend environment variables:
- Example: `dpg-d4dmojemcj7s73edtop0-a.singapore-postgres.render.com`

## Alternative: Using render.yaml (Blueprints)

If you prefer to use Render Blueprints:

1. Push the `render.yaml` file to your repository
2. Go to Render dashboard → **"New +"** → **"Blueprint"**
3. Connect your repository
4. Render will automatically detect and create both services
5. Update the environment variables as described in Step 3

## Important Notes

1. **WebSocket Support**: Render's free tier may have limitations with WebSocket connections. For production, consider upgrading to a paid plan or using a service like Railway, Fly.io, or Heroku.

2. **Database SSL**: Make sure `DB_SSL=true` is set for Render's PostgreSQL databases.

3. **Auto-Deploy**: By default, Render will auto-deploy on every push to your main branch. You can configure this in service settings.

4. **Custom Domains**: You can add custom domains in the service settings after deployment.

5. **Environment Variables**: Never commit sensitive credentials to your repository. Always use Render's environment variables.

## Troubleshooting

- **Build Fails**: Check the build logs in Render dashboard
- **Database Connection Issues**: Verify database credentials and SSL settings
- **CORS Errors**: Ensure `FRONTEND_URL` in backend matches your frontend URL exactly
- **API Not Found**: Verify `VITE_API_URL` in frontend includes `/api` suffix

## WebSocket Considerations

Since your application uses WebSockets for chat, you may need to:
1. Use Render's paid plans (WebSocket support on free tier is limited)
2. Or consider alternative hosting for WebSocket support:
   - Railway (better WebSocket support)
   - Fly.io (excellent WebSocket support)
   - Heroku (paid plans)

For Render, you might need to configure the WebSocket upgrade in your service settings.

