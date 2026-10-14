@echo off
title Silent Doubt Wall - Master Launcher
echo ========================================================
echo   SILENT DOUBT WALL - COLLEGE HACKATHON
echo   Launching Backend (Port 8000) and Frontend (Port 5173)...
echo ========================================================

start "Silent Doubt Wall - Backend" cmd /k "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "Silent Doubt Wall - Frontend" cmd /k "%~dp0run_frontend.bat"

timeout /t 2 /nobreak >nul
start http://localhost:5173

echo ========================================================
echo   Application started!
echo   Open: http://localhost:5173
echo   Demonstration Class Code: CS101
echo   Teacher Default PIN: 1234
echo ========================================================
pause
