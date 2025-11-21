#!/bin/bash

# Step-by-Step Setup Script for ZeroWaste
# This script automates the environment setup process

set -e  # Exit on error

echo "🚀 ZeroWaste Setup Script"
echo "========================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install Dependencies
echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
echo ""

echo "Installing frontend dependencies..."
cd client
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi
cd ..

echo ""
echo "Installing backend dependencies..."
cd server
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Backend dependencies already installed${NC}"
fi
cd ..

echo ""

# Step 2: Create Environment Files
echo -e "${YELLOW}Step 2: Creating environment files...${NC}"
echo ""

if [ -f "scripts/setup.js" ]; then
    node scripts/setup.js
else
    echo -e "${RED}❌ Setup script not found. Creating files manually...${NC}"
    
    # Create client/.env.local
    if [ ! -f "client/.env.local" ]; then
        cat > client/.env.local << 'EOF'
# Local Development Configuration
# API Configuration
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
EOF
        echo -e "${GREEN}✅ Created client/.env.local${NC}"
    else
        echo -e "${GREEN}✅ client/.env.local already exists${NC}"
    fi
    
    # Create server/.env.local
    if [ ! -f "server/.env.local" ]; then
        cat > server/.env.local << 'EOF'
# Local Development Configuration
# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URLs
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
EOF
        echo -e "${GREEN}✅ Created server/.env.local${NC}"
    else
        echo -e "${GREEN}✅ server/.env.local already exists${NC}"
    fi
fi

echo ""

# Step 3: Verify Files
echo -e "${YELLOW}Step 3: Verifying configuration files...${NC}"
echo ""

if [ -f "client/.env.local" ]; then
    echo -e "${GREEN}✅ client/.env.local exists${NC}"
else
    echo -e "${RED}❌ client/.env.local not found${NC}"
fi

if [ -f "server/.env.local" ]; then
    echo -e "${GREEN}✅ server/.env.local exists${NC}"
else
    echo -e "${RED}❌ server/.env.local not found${NC}"
fi

echo ""

# Step 4: Check Database Password
echo -e "${YELLOW}Step 4: Checking database configuration...${NC}"
echo ""

if grep -q "your_database_password_here" server/.env.local 2>/dev/null; then
    echo -e "${RED}⚠️  WARNING: Database password not set!${NC}"
    echo ""
    echo "Please update server/.env.local with your Render PostgreSQL password:"
    echo "  1. Go to https://dashboard.render.com"
    echo "  2. Navigate to your PostgreSQL database"
    echo "  3. Get the password from Internal Database URL"
    echo "  4. Update DB_PASSWORD in server/.env.local"
    echo ""
else
    echo -e "${GREEN}✅ Database password appears to be set${NC}"
fi

echo ""

# Summary
echo "========================"
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo "========================"
echo ""
echo "Next steps:"
echo ""
echo "1. Update server/.env.local with your Render PostgreSQL password"
echo ""
echo "2. Start the backend server:"
echo "   cd server"
echo "   npm run dev"
echo ""
echo "3. Start the frontend server (in a new terminal):"
echo "   cd client"
echo "   npm run dev"
echo ""
echo "📚 For detailed instructions, see SETUP_SCRIPTS.md"
echo ""


