# Restaurant Website - Auto Start Server Script
# Place this in shell:startup to run automatically on Windows login

$projectPath = "C:\Users\Rajvi\Desktop\Restaurant_Website"
$backendPath = Join-Path $projectPath "backend"
$databasePath = Join-Path $projectPath "database"

# Set window title
$host.UI.RawUI.WindowTitle = "Restaurant Backend Server"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESTAURANT WEBSITE - Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing node process running on port 5000 to avoid conflicts
Write-Host "[0] Stopping any existing server instances..." -ForegroundColor Yellow
$existing = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($existing) {
    Stop-Process -Id $existing.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  Stopped existing process on port 5000" -ForegroundColor Green
}

# Step 1: Run database migration (ignore errors if already migrated)
Write-Host "[1/2] Running database migration..." -ForegroundColor Yellow
Set-Location $databasePath
node migrate.js 2>&1 | Out-Null
Write-Host "  Migration complete" -ForegroundColor Green
Write-Host ""

# Step 2: Start the backend server
Write-Host "[2/2] Starting backend server on port 5000..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Server: http://localhost:5000" -ForegroundColor White
Write-Host "  Open: frontend/index.html in browser" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $backendPath
node server.js

