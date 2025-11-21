# Environment Flow - Visual Guide

## 🏠 Local Development Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR LOCAL MACHINE                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐              ┌─────────────────────┐
│   FRONTEND (Client) │              │   BACKEND (Server)  │
├─────────────────────┤              ├─────────────────────┤
│                     │              │                     │
│  File:              │              │  File:              │
│  .env.local         │              │  .env.local         │
│                     │              │                     │
│  Contents:          │              │  Contents:          │
│  VITE_API_URL=      │              │  PORT=4000          │
│    http://          │              │  DB_HOST=127.0.0.1  │
│    localhost:4000/  │              │  DB_USER=postgres   │
│    api              │              │  DB_PASSWORD=***    │
│                     │              │  DB_SSL=false       │
└─────────────────────┘              └─────────────────────┘
         │                                    │
         │ npm run dev                        │ npm run dev
         │ (Vite reads .env.local)            │ (dotenv reads .env.local)
         ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│   Development       │              │   Express Server    │
│   Server            │              │                     │
│   Port 5173         │              │   Port 4000         │
│                     │              │                     │
│  API calls →        │──────────────►│  Database →         │
│  http://localhost:  │              │  dpg-d41rn4juibrs73flltn0-a │
│  4000/api           │              │    .singapore-postgres.render.com │
│                     │              │  (Render PostgreSQL - Build Env) │
└─────────────────────┘              └─────────────────────┘
```

## 🌐 Production Environment (Render)

```
┌─────────────────────────────────────────────────────────────────┐
│                      RENDER CLOUD                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              RENDER DASHBOARD                                    │
│                                                                  │
│  FRONTEND SERVICE ENV VARS:          BACKEND SERVICE ENV VARS:  │
│  ┌─────────────────────────┐        ┌─────────────────────────┐ │
│  │ VITE_API_URL=           │        │ PORT=1000               │ │
│  │   https://zerovaste.    │        │ DB_HOST=dpg-d4dmo...    │ │
│  │   onrender.com/api      │        │ DB_USER=zerovaste_user  │ │
│  │                         │        │ DB_PASSWORD=***         │ │
│  │ VITE_FRONTEND_URL=      │        │ DB_SSL=true             │ │
│  │   https://zerovaste-    │        │ ...                     │ │
│  │   uga7.onrender.com     │        └─────────────────────────┘ │
│  └─────────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ npm run build                      │ npm start
         │ (Vite reads env vars)              │ (Node reads env vars)
         ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│   Static Files      │              │   Express Server    │
│   (Built with       │              │                     │
│    production URLs) │              │   Port 1000         │
│                     │              │                     │
│  API calls →        │──────────────►│  Database →         │
│  https://zerovaste. │              │  dpg-d4dmo...:5432  │
│  onrender.com/api   │              │  (Render PostgreSQL)│
└─────────────────────┘              └─────────────────────┘
```

## 🔄 How Values Flow Through the System

### Frontend Flow:

```
.env.local (Local)           OR          Render Dashboard (Production)
     │                                      │
     ▼                                      ▼
VITE_API_URL=http://localhost:4000/api    VITE_API_URL=https://zerovaste.onrender.com/api
     │                                      │
     ▼                                      ▼
npm run dev (reads .env.local)    OR    npm run build (reads Render env)
     │                                      │
     ▼                                      ▼
import.meta.env.VITE_API_URL              import.meta.env.VITE_API_URL
     │                                      │
     ▼                                      ▼
axios.create({                            axios.create({
  baseURL: "...localhost:4000..."  OR      baseURL: "...zerovaste.onrender.com..."
})                                        })
     │                                      │
     └──────────────────────────────────────┘
                      │
                      ▼
              API HTTP Requests
```

### Backend Flow:

```
.env.local (Local)           OR          Render Dashboard (Production)
     │                                      │
     ▼                                      ▼
DB_HOST=127.0.0.1                         DB_HOST=dpg-d4dmojemcj7s73edtop0-a
DB_PASSWORD=local_pass                    DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
PORT=4000                                 PORT=1000
     │                                      │
     ▼                                      ▼
dotenv/config (loads .env.local)    OR    process.env (injected by Render)
     │                                      │
     ▼                                      ▼
process.env.DB_HOST                       process.env.DB_HOST
process.env.DB_PASSWORD                   process.env.DB_PASSWORD
     │                                      │
     ▼                                      ▼
env.ts (reads process.env)               env.ts (reads process.env)
     │                                      │
     ▼                                      ▼
sequelize.connect()                      sequelize.connect()
     │                                      │
     └──────────────────────────────────────┘
                      │
                      ▼
            PostgreSQL Connection
```

## ⚡ Quick Decision Tree

```
Start Application
       │
       ├─ Are you running locally?
       │   │
       │   ├─ YES → Uses .env.local files
       │   │         • Frontend: client/.env.local
       │   │         • Backend: server/.env.local
       │   │         • Reads automatically
       │   │
       │   └─ NO → Uses Render environment variables
       │             • Frontend: From Render dashboard
       │             • Backend: From Render dashboard
       │             • Injected automatically
       │
       └─ Result: Correct configuration used automatically!
```

## 🎯 Key Takeaway

**The application automatically detects which environment it's running in:**

- **Local**: Looks for `.env.local` files
- **Production**: Uses environment variables from Render

**You never need to manually switch anything!**

Just:
1. ✅ Create `.env.local` files for local dev (one-time)
2. ✅ Set environment variables in Render dashboard for production (one-time)
3. ✅ Run the same commands everywhere

The magic happens automatically! ✨


