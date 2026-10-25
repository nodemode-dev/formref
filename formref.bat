@echo off
setlocal EnableDelayedExpansion
set "FORMREF_CALLER_DIR=%CD%"
cd /d "%~dp0"
set "PYTHON_BIN=%~dp0backend\venv\Scripts\python.exe"
if defined FORMREF_PYTHON set "PYTHON_BIN=%FORMREF_PYTHON%"
set ACTION=%~1
if "%ACTION%"=="" set ACTION=dev
if "%ACTION%"=="--help" set ACTION=help
if "%ACTION%"=="-h" set ACTION=help
if "%ACTION%"=="help" (
  echo Usage: formref.bat [install^|dev^|core^|build^|backend^|frontend^|serve^|mcp^|desktop^|clipper [--new]^|help]
  echo        formref.bat open ^<board title or id^> [--no-window]
  echo        formref.bat import ^<folder^> [--title NAME] [--recursive] [--no-window]
  echo        formref.bat agents sync [--check]
  exit /b 0
)
if "%ACTION%"=="backend" (call backend\boot_backend.bat & exit /b !errorlevel!)
if "%ACTION%"=="frontend" (call frontend\boot_frontend.bat & exit /b !errorlevel!)
if "%ACTION%"=="install" (call formref_oc_install.bat & exit /b !errorlevel!)
if "%ACTION%"=="core" (cargo build --release --manifest-path native\formref-core\Cargo.toml & exit /b !errorlevel!)
if "%ACTION%"=="build" (
  cargo build --release --manifest-path native\formref-core\Cargo.toml || exit /b 1
  cd frontend
  call npm run build
  exit /b !errorlevel!
)
if "%ACTION%"=="mcp" (
  cd backend
  "%PYTHON_BIN%" -m app.mcp_server
  exit /b !errorlevel!
)
if "%ACTION%"=="open" goto cli
if "%ACTION%"=="import" goto cli
if "%ACTION%"=="agents" goto cli
if "%ACTION%"=="clipper" (
  cd backend
  "%PYTHON_BIN%" -m app.core.clipper %2
  exit /b !errorlevel!
)
if "%ACTION%"=="serve" (
  cd backend
  "%PYTHON_BIN%" -m uvicorn app.main:app --host 127.0.0.1 --port 8320
  exit /b !errorlevel!
)
if "%ACTION%"=="desktop" (
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8320/api/health' -TimeoutSec 2 -ErrorAction Stop | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
  if errorlevel 1 (
    start "FormRef API" cmd /k call "%~dp0backend\boot_backend.bat"
    echo Close the separate FormRef API window when you finish this desktop session.
  )
  powershell -NoProfile -Command "for ($attempt = 0; $attempt -lt 30; $attempt++) { try { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8320/api/health' -TimeoutSec 1 -ErrorAction Stop | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 200 } }; exit 1" >nul 2>nul
  if errorlevel 1 (
    echo FormRef API did not become ready. Check the API window before retrying. 1>&2
    exit /b 1
  )
  cd frontend
  call npm run tauri -- dev
  exit /b !errorlevel!
)
if "%ACTION%"=="dev" (
  start "FormRef API" cmd /k call "%~dp0backend\boot_backend.bat"
  start "FormRef UI" cmd /k call "%~dp0frontend\boot_frontend.bat"
  exit /b 0
)
echo Usage: formref.bat [install^|dev^|core^|build^|backend^|frontend^|serve^|mcp^|desktop^|clipper [--new]^|open^|import^|help]
exit /b 2

:cli
cd backend
"%PYTHON_BIN%" -m app.cli %*
exit /b !errorlevel!
