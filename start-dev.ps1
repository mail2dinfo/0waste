# Start Development Servers Script
# This script starts both backend and frontend servers

Write-Host "🚀 Starting ZeroWaste Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Check if environment files exist
if (-not (Test-Path "server\.env.local")) {
    Write-Host "❌ Error: server/.env.local not found!" -ForegroundColor Red
    Write-Host "Please run: node scripts/setup.js" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "client\.env.local")) {
    Write-Host "❌ Error: client/.env.local not found!" -ForegroundColor Red
    Write-Host "Please run: node scripts/setup.js" -ForegroundColor Yellow
    exit 1
}

# Check if database password is set
$serverEnv = Get-Content "server\.env.local" -Raw
if ($serverEnv -match "your_database_password_here") {
    Write-Host "⚠️  Warning: Database password not set!" -ForegroundColor Yellow
    Write-Host "Please update server/.env.local with your Render PostgreSQL password" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

Write-Host "Starting servers..." -ForegroundColor Green
Write-Host ""

# Start Backend Server
Write-Host "📦 Starting Backend Server (Terminal 1)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; Write-Host '🔧 Backend Server' -ForegroundColor Cyan; Write-Host '================' -ForegroundColor Cyan; Write-Host ''; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "🎨 Starting Frontend Server (Terminal 2)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\client'; Write-Host '🎨 Frontend Server' -ForegroundColor Cyan; Write-Host '==================' -ForegroundColor Cyan; Write-Host ''; npm run dev"

Write-Host ""
Write-Host "✅ Servers starting in separate windows..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "📝 Note: Keep both terminal windows open while developing" -ForegroundColor Yellow
Write-Host ""



