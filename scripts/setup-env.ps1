# PowerShell Environment Setup Script
# This script helps you create .env.local files for local development

Write-Host "🚀 Setting up environment configuration for local development..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local already exists
if (Test-Path "client\.env.local") {
    Write-Host "⚠️  client\.env.local already exists. Skipping..." -ForegroundColor Yellow
} else {
    Write-Host "📝 Creating client\.env.local..." -ForegroundColor Green
    @"
# Local Development Configuration
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
"@ | Out-File -FilePath "client\.env.local" -Encoding utf8
    Write-Host "✅ Created client\.env.local" -ForegroundColor Green
}

if (Test-Path "server\.env.local") {
    Write-Host "⚠️  server\.env.local already exists. Skipping..." -ForegroundColor Yellow
} else {
    Write-Host "📝 Creating server\.env.local..." -ForegroundColor Green
    @"
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
"@ | Out-File -FilePath "server\.env.local" -Encoding utf8
    Write-Host "✅ Created server\.env.local" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Update server\.env.local with your local database credentials!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update server\.env.local with your local database credentials"
Write-Host "2. Start backend: cd server && npm run dev"
Write-Host "3. Start frontend: cd client && npm run dev"
Write-Host ""
Write-Host "For production, set environment variables in Render dashboard." -ForegroundColor Gray
Write-Host "See docs/ENVIRONMENT_SETUP.md for details." -ForegroundColor Gray




