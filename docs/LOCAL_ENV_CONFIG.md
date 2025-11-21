# Local Development Environment Configuration

## Database Configuration

For local development and build environment, use the Render PostgreSQL database:

### Database Credentials:

```
Host: dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
Database: investo_3mo3
Username: investo_3mo3_user
Port: 5432
SSL: true (required for Render PostgreSQL)
```

### Setup Instructions:

1. **Create `server/.env.local` file** with these values:

```env
PORT=4000
NODE_ENV=development

FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite

# Database Configuration (Render PostgreSQL - Build Environment)
DB_HOST=dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com
DB_PORT=5432
DB_NAME=investo_3mo3
DB_USER=investo_3mo3_user
DB_PASSWORD=your_database_password_here
DB_SSL=true
DB_LOGGING=true
```

2. **Update the password:**
   - Replace `your_database_password_here` with your actual Render PostgreSQL password
   - Password can be found in Render dashboard → Database → Internal Database URL

3. **Test connection:**
   ```bash
   cd server
   npm run dev
   ```
   - Should connect to the database successfully

## Notes

- This uses Render's PostgreSQL database (not local PostgreSQL)
- SSL is required (`DB_SSL=true`) for Render PostgreSQL connections
- This is the "build environment" database configuration


