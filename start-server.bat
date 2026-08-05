@echo off
title Restaurant Backend Server
echo ========================================
echo   RESTAURANT WEBSITE - Backend Server
echo ========================================
echo.

:: Navigate to project directory
cd /d "%~dp0"

:: Kill any existing node process on port 5000
echo [0/3] Checking for existing server on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":5000" ^| find "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    timeout /t 2 /nobreak >nul
)
echo   Done

:: Run database migration
echo.
echo [1/3] Running database migration...
cd database
node migrate.js 2>nul
cd ..

:: Navigate to backend and start server
echo.
echo [2/3] Starting backend server on port 5000...
echo.
echo ========================================
echo   Server starting at: http://localhost:5000
echo   Open frontend/index.html in browser
echo   Press Ctrl+C to stop the server
echo ========================================
echo.
cd backend
node server.js

pause

