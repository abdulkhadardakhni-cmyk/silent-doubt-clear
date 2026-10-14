@echo off
title Silent Doubt Wall - Acceptance Tests
echo ========================================================
echo   Running Automated Acceptance Tests & Semantic AI Engine
echo ========================================================

cd /d "%~dp0"
set PYTHONPATH=backend
python -u backend/tests/run_tests.py
python -u backend/tests/test_api_client.py
pause
