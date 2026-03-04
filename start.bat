@echo off
echo Starting Invest Portfolio Tracker...

echo Checking dependencies...
call npm install --no-audit

echo Freeing port 3000 (killing previous process if running)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING"') do (
    echo Found process %%a on port 3000, terminating...
    taskkill /PID %%a /F >nul 2>&1
)

REM Delete old lock file if it exists
if exist ".next\dev\lock" (
    del /f ".next\dev\lock" >nul 2>&1
    echo Lock file removed.
)

echo Starting Next.js development server...
timeout /t 1 >nul
start http://localhost:3000
call npm run dev

pause
