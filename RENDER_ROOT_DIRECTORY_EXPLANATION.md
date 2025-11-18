# How Render Knows Which Folder to Use

## The Answer: Root Directory Setting

When you have a repository with multiple folders like:
```
your-repo/
├── client/
├── server/
├── ai-service/
└── docs/
```

Render uses the **"Root Directory"** setting to know which folder to use for each service.

## How It Works

### For Backend (Server)

1. When creating a **Web Service** in Render
2. After connecting your Git repository (`https://github.com/mail2dinfo/0waste`)
3. In the configuration form, you'll see a field called **"Root Directory"**
4. **Set this to:** `server`
5. This tells Render: "All commands should run inside the `server` folder"

**What happens:**
- Render clones your repo
- Changes directory to `server/`
- Runs `npm install` (installs from `server/package.json`)
- Runs `npm run build` (builds the server code)
- Runs `npm start` (starts the server)

### For Frontend (Client)

1. When creating a **Static Site** in Render
2. After connecting your Git repository
3. Set **"Root Directory"** to: `client`
4. This tells Render: "All commands should run inside the `client` folder"

**What happens:**
- Render clones your repo
- Changes directory to `client/`
- Runs `npm install` (installs from `client/package.json`)
- Runs `npm run build` (builds the React app to `client/dist`)
- Serves files from `dist/` (relative to the Root Directory)

## Visual Guide

### Backend Service Configuration:
```
Repository: https://github.com/mail2dinfo/0waste
Root Directory: server          ← This is the key!
Build Command: npm install && npm run build
Start Command: npm start
```

### Frontend Service Configuration:
```
Repository: https://github.com/mail2dinfo/0waste
Root Directory: client          ← This is the key!
Build Command: npm install && npm run build
Publish Directory: dist
```

## Important Notes

1. **If you don't set Root Directory:**
   - Render will use the repository root
   - Your build commands would need `cd server && ...` or `cd client && ...`
   - This is more error-prone

2. **If you set Root Directory:**
   - All commands run from that folder
   - No need for `cd` in build commands
   - Cleaner and more reliable

3. **Each service is independent:**
   - Backend service: Root Directory = `server`
   - Frontend service: Root Directory = `client`
   - They can both use the same repository but different folders

## Example: What Render Sees

### Backend Service (Root Directory: `server`)
```
Repository root: /opt/render/project/src/
Root Directory: server
Working directory: /opt/render/project/src/server/
├── package.json          ← npm install reads this
├── src/
│   └── index.ts
└── dist/                 ← npm run build creates this
```

### Frontend Service (Root Directory: `client`)
```
Repository root: /opt/render/project/src/
Root Directory: client
Working directory: /opt/render/project/src/client/
├── package.json          ← npm install reads this
├── src/
│   └── App.tsx
└── dist/                 ← npm run build creates this, and Render serves from here
```

## Step-by-Step in Render UI

1. **Connect Repository:**
   - Paste: `https://github.com/mail2dinfo/0waste`
   - Render will detect it's a GitHub repo

2. **Fill in the form:**
   - Name: `zerovaste-api` (or `zerovaste-web`)
   - **Scroll down to find "Root Directory" field**
   - **Type:** `server` (for backend) or `client` (for frontend)
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start` (for backend)
   - Publish Directory: `dist` (for frontend)

3. **Render automatically:**
   - Clones the repo
   - Changes to the Root Directory
   - Runs your commands from there

## Troubleshooting

**Problem:** Build fails with "package.json not found"
- **Solution:** Make sure Root Directory is set correctly (`server` or `client`)

**Problem:** Build succeeds but wrong files are served
- **Solution:** Check Publish Directory is relative to Root Directory (`dist` not `client/dist`)

**Problem:** Can't find the Root Directory field
- **Solution:** It's in the advanced settings or scroll down in the form. It might be labeled as "Root Directory" or "Working Directory"

