@echo off
echo ============================================
echo   AI Workflow Demo - Starting...
echo ============================================

REM ── Backend ──────────────────────────────────
echo.
echo [1/3] Setting up Python backend...
cd backend

if not exist ".env" (
    copy .env.example .env
    echo.
    echo  !! .env created from .env.example
    echo  !! IMPORTANT: Edit backend\.env and set your OPENAI_API_KEY
    echo  !! Then re-run this script.
    echo.
    pause
    exit /b 1
)

pip install -r requirements.txt --quiet
echo Backend dependencies installed.

REM ── Start backend in new window ───────────────
echo [2/3] Starting FastAPI backend on http://localhost:8000 ...
start "AI Workflow Backend" cmd /k "uvicorn main:app --reload --port 8000"

REM ── Frontend ─────────────────────────────────
cd ..\frontend
echo [3/3] Installing frontend dependencies...
call npm install --silent
echo Starting React frontend on http://localhost:5173 ...
start "AI Workflow Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   Both servers are starting!
echo   Open http://localhost:5173 in your browser
echo ============================================
timeout /t 3
start http://localhost:5173
