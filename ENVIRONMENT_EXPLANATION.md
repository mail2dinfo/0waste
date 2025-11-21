# How Development & Production Work Together

## 🎯 Simple Answer

**The application automatically uses the right configuration based on WHERE it's running:**
- **On your computer**: Uses `.env.local` files
- **On Render (production)**: Uses environment variables from Render dashboard

**No code changes needed! Same code, different configurations.**

---

## 🔄 How It Works

### **Local Development (Your Computer)**

**Step 1: Create `.env.local` files**
```
client/.env.local     → Contains local API URL
server/.env.local     → Contains local database credentials
```

**Step 2: Start the servers**
```bash
# Terminal 1: Backend
cd server
npm run dev
# → Reads server/.env.local
# → Connects to Render PostgreSQL (build environment)

# Terminal 2: Frontend
cd client
npm run dev
# → Reads client/.env.local
# → Connects to http://localhost:4000/api
```

**Result:**
- ✅ Frontend connects to `http://localhost:4000/api` (local backend)
- ✅ Backend connects to Render PostgreSQL (build environment database)
- ✅ Everything works locally

---

### **Production (Render Cloud)**

**Step 1: Set environment variables in Render dashboard**
```
Frontend Service:
  VITE_API_URL = https://zerovaste.onrender.com/api
  VITE_FRONTEND_URL = https://zerovaste-uga7.onrender.com

Backend Service:
  PORT = 1000
  DB_HOST = dpg-d4dmojemcj7s73edtop0-a
  DB_PASSWORD = TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
  ... (all 11 variables)
```

**Step 2: Deploy to Render**
```bash
git push origin main
# → Render automatically:
#    1. Reads environment variables from dashboard
#    2. Builds frontend with production URLs
#    3. Starts backend with production config
#    4. Connects to production database
```

**Result:**
- ✅ Frontend connects to `https://zerovaste.onrender.com/api` (production backend)
- ✅ Backend connects to Render PostgreSQL (production database)
- ✅ Everything works in production

---

## 📊 Side-by-Side Comparison

| Aspect | Local Development | Production (Render) |
|--------|------------------|---------------------|
| **Configuration Source** | `.env.local` files | Render dashboard |
| **Frontend API URL** | `http://localhost:4000/api` | `https://zerovaste.onrender.com/api` |
| **Backend Port** | `4000` | `1000` |
| **Database Host** | `127.0.0.1` (local) | `dpg-d4dmojemcj7s73edtop0-a` (Render) |
| **Database SSL** | `false` | `true` |
| **How it loads** | Vite/dotenv reads `.env.local` | Render injects env vars |
| **When** | During `npm run dev` | During `npm run build` / `npm start` |

---

## 🔍 Technical Details

### **Frontend (Vite)**

**Local:**
```javascript
// client/.env.local
VITE_API_URL=http://localhost:4000/api

// When you run: npm run dev
// Vite reads .env.local and injects values
import.meta.env.VITE_API_URL  // = "http://localhost:4000/api"
```

**Production:**
```javascript
// Render Dashboard
VITE_API_URL=https://zerovaste.onrender.com/api

// When you run: npm run build
// Vite reads Render env vars and injects values
import.meta.env.VITE_API_URL  // = "https://zerovaste.onrender.com/api"
```

### **Backend (Node.js)**

**Local:**
```javascript
// server/.env.local
DB_HOST=127.0.0.1
DB_PASSWORD=local_password

// When you run: npm run dev
// dotenv reads .env.local
process.env.DB_HOST  // = "127.0.0.1"
```

**Production:**
```javascript
// Render Dashboard
DB_HOST=dpg-d4dmojemcj7s73edtop0-a
DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27

// When you run: npm start
// Render injects env vars
process.env.DB_HOST  // = "dpg-d4dmojemcj7s73edtop0-a"
```

---

## ✅ Verification Checklist

### **Local Development:**
1. ✅ `client/.env.local` exists
2. ✅ `server/.env.local` exists
3. ✅ `server/.env.local` has your local database password
4. ✅ Frontend dev server connects to `localhost:4000/api`
5. ✅ Backend connects to local database

### **Production:**
1. ✅ Frontend service has `VITE_API_URL` in Render dashboard
2. ✅ Frontend service has `VITE_FRONTEND_URL` in Render dashboard
3. ✅ Backend service has all 11 variables in Render dashboard
4. ✅ Both services deployed successfully
5. ✅ Production frontend connects to production API

---

## 🎯 Key Points

1. **Same Codebase**: No code changes needed
2. **Automatic Switching**: Environment detection is automatic
3. **Secure**: Local secrets stay local, production secrets stay in Render
4. **Easy**: Just set variables once, then it "just works"

---

## 📚 More Documentation

- **Setup Guide**: See [SETUP.md](SETUP.md) for step-by-step setup
- **How It Works**: See [docs/HOW_ENV_WORKS.md](docs/HOW_ENV_WORKS.md) for technical details
- **Flow Diagrams**: See [docs/ENVIRONMENT_FLOW.md](docs/ENVIRONMENT_FLOW.md) for visual flow

---

## 🔧 Quick Troubleshooting

**Local not working?**
- ✅ Check `.env.local` files exist
- ✅ Check database password is correct in `server/.env.local`
- ✅ Restart dev servers after changing `.env.local`

**Production not working?**
- ✅ Check all environment variables are set in Render dashboard
- ✅ Check deployment logs in Render
- ✅ Verify variable names are exact (case-sensitive)

---

**That's it! The system automatically switches between local and production. Just set up your environment variables once, and it works everywhere! 🎉**


