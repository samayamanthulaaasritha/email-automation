@echo off
title MailPilot Pro - Launcher
echo ===================================================
echo Starting MailPilot Pro (Backend + Frontend)
echo ===================================================

:: Add portable node to path if present
if exist "%USERPROFILE%\.nodejs\node-v20.18.0-win-x64" (
    set "PATH=%USERPROFILE%\.nodejs\node-v20.18.0-win-x64;%PATH%"
)

echo [1/3] Starting Python Flask Backend on port 5000...
start "MailPilot Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe app.py"

echo [2/3] Starting Vite React Frontend on port 5173...
start "MailPilot Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening application in your browser...
start http://localhost:5173/

echo ===================================================
echo MailPilot Pro is running!
echo Access URL: http://localhost:5173/
echo ===================================================
pause
