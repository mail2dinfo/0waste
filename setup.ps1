# Step-by-Step Setup Script for ZeroWaste (PowerShell)
# This script automates the environment setup process

Write-Host "🚀 ZeroWaste Setup Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Dependencies
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Installing frontend dependencies..."
Set-Location client
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend dependencies already installed" -ForegroundColor Green
}
Set-Location ..

Write-Host ""
Write-Host "Installing backend dependencies..."
Set-Location server
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Backend dependencies already installed" -ForegroundColor Green
}
Set-Location ..

Write-Host ""

# Step 2: Create Environment Files
Write-Host "Step 2: Creating environment files..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "scripts\setup.js") {
    node scripts/setup.js
} else {
    Write-Host "❌ Setup script not found. Creating files manually..." -ForegroundColor Red
    
    # Create client/.env.local
    if (-not (Test-Path "client\.env.local")) {
        $clientEnv = @"
# Local Development Configuration
# API Configuration
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
"@
        Set-Content -Path "client\.env.local" -Value $clientEnv
        Write-Host "✅ Created client/.env.local" -ForegroundColor Green
    } else {
        Write-Host "✅ client/.env.local already exists" -ForegroundColor Green
    }
    
    # Create server/.env.local
    if (-not (Test-Path "server\.env.local")) {
        $serverEnv = @"
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
"@
        Set-Content -Path "server\.env.local" -Value $serverEnv
        Write-Host "✅ Created server/.env.local" -ForegroundColor Green
    } else {
        Write-Host "✅ server/.env.local already exists" -ForegroundColor Green
    }
}

Write-Host ""

# Step 3: Verify Files
Write-Host "Step 3: Verifying configuration files..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "client\.env.local") {
    Write-Host "✅ client/.env.local exists" -ForegroundColor Green
} else {
    Write-Host "❌ client/.env.local not found" -ForegroundColor Red
}

if (Test-Path "server\.env.local") {
    Write-Host "✅ server/.env.local exists" -ForegroundColor Green
} else {
    Write-Host "❌ server/.env.local not found" -ForegroundColor Red
}

Write-Host ""

# Step 4: Check Database Password
Write-Host "Step 4: Checking database configuration..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "server\.env.local") {
    $serverEnvContent = Get-Content "server\.env.local" -Raw
    if ($serverEnvContent -match "your_database_password_here") {
        Write-Host "⚠️  WARNING: Database password not set!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please update server/.env.local with your Render PostgreSQL password:"
        Write-Host "  1. Go to https://dashboard.render.com"
        Write-Host "  2. Navigate to your PostgreSQL database"
        Write-Host "  3. Get the password from Internal Database URL"
        Write-Host "  4. Update DB_PASSWORD in server/.env.local"
        Write-Host ""
    } else {
        Write-Host "✅ Database password appears to be set" -ForegroundColor Green
    }
}

Write-Host ""

# Summary
Write-Host "========================" -ForegroundColor Cyan
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "1. Update server/.env.local with your Render PostgreSQL password"
Write-Host ""
Write-Host "2. Start the backend server:"
Write-Host "   cd server"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "3. Start the frontend server (in a new terminal):"
Write-Host "   cd client"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "📚 For detailed instructions, see SETUP_SCRIPTS.md"
Write-Host ""


