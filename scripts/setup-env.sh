#!/bin/bash

# Environment Setup Script
# This script helps you create .env.local files for local development

echo "🚀 Setting up environment configuration for local development..."
echo ""

# Check if .env.local already exists
if [ -f "client/.env.local" ]; then
    echo "⚠️  client/.env.local already exists. Skipping..."
else
    echo "📝 Creating client/.env.local..."
    cat > client/.env.local << EOF
# Local Development Configuration
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
EOF
    echo "✅ Created client/.env.local"
fi

if [ -f "server/.env.local" ]; then
    echo "⚠️  server/.env.local already exists. Skipping..."
else
    echo "📝 Creating server/.env.local..."
    cat > server/.env.local << EOF
# Local Development Configuration
PORT=4000
NODE_ENV=development

# Frontend Configuration
FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite

# Database Configuration (Local PostgreSQL)
# ⚠️  UPDATE THESE VALUES WITH YOUR LOCAL DATABASE CREDENTIALS
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=postgres
DB_PASSWORD=your_local_password_here
DB_SSL=false
DB_LOGGING=true
EOF
    echo "✅ Created server/.env.local"
    echo ""
    echo "⚠️  IMPORTANT: Update server/.env.local with your local database credentials!"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update server/.env.local with your local database credentials"
echo "2. Start backend: cd server && npm run dev"
echo "3. Start frontend: cd client && npm run dev"
echo ""
echo "For production, set environment variables in Render dashboard."
echo "See docs/ENVIRONMENT_SETUP.md for details."




