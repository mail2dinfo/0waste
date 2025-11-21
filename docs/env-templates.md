# Environment Configuration Templates

## Frontend (Client) Configuration

### Local Development - Create `client/.env.local`

```env
# Local Development Configuration
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
```

### Production (Render) - Set in Render Dashboard

```env
VITE_API_URL=https://zerovaste.onrender.com/api
VITE_FRONTEND_URL=https://zerovaste-uga7.onrender.com
```

## Backend (Server) Configuration

### Local Development - Create `server/.env.local`

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend Configuration
FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite

# Database Configuration (Local PostgreSQL)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=postgres
DB_PASSWORD=your_local_password_here
DB_SSL=false
DB_LOGGING=true
```

### Production (Render) - Set in Render Dashboard

```env
# Server Configuration
PORT=1000
NODE_ENV=production

# Frontend Configuration
FRONTEND_URL=https://zerovaste-uga7.onrender.com
INVITE_BASE_URL=https://zerovaste-uga7.onrender.com/invite

# Database Configuration (Render PostgreSQL)
DB_HOST=dpg-d4dmojemcj7s73edtop0-a
DB_NAME=zerovaste
DB_USER=zerovaste_user
DB_PASSWORD=TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27
DB_PORT=5432
DB_SSL=true
DB_LOGGING=false
```

## Quick Setup Commands

### Local Development

**Frontend:**
```bash
cd client
# Create .env.local file with local values (see above)
npm run dev
```

**Backend:**
```bash
cd server
# Create .env.local file with local values (see above)
npm run dev
```

### Production (Render)

Set environment variables in Render Dashboard for each service (frontend and backend) - see production values above.



