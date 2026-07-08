@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "HOST=127.0.0.1"
set "PORT=5173"
set "PORT_CHECK="
set "URL="

where corepack >nul 2>nul
if errorlevel 1 (
  echo Corepack was not found. Install Node.js with Corepack support, then try again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies with pnpm...
  call corepack pnpm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

for /f %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = [Net.IPAddress]::Parse('127.0.0.1'); try { $l = [Net.Sockets.TcpListener]::new($ip, 5173); $l.Start(); $l.Stop(); Write-Output 5173; exit 0 } catch { exit 1 }"') do set "PORT_CHECK=%%P"

if not "%PORT_CHECK%"=="5173" (
  echo Port 5173 is already in use. Close the process using it, then run this file again.
  pause
  exit /b 1
)

set "URL=http://%HOST%:%PORT%/"

if not defined SKIP_SERVER_START (
  echo Starting Master Gun server on !URL!
  start "Master Gun Server" cmd /k "cd /d ""%~dp0"" && echo Close this window to stop the Master Gun server. && corepack pnpm dev -- --port %PORT% --strictPort"
  timeout /t 3 /nobreak >nul
)

echo Opening !URL!
start "" "!URL!"

endlocal
