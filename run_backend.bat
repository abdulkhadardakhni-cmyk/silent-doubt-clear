@echo off
title Silent Doubt Wall - Backend API
echo ========================================================
echo   Starting Silent Doubt Wall - Python FastAPI Backend
echo   API URL: http://127.0.0.1:8000
echo   Docs:    http://127.0.0.1:8000/docs
echo ========================================================

cd /d "%~dp0"
set PYTHONPATH=backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
