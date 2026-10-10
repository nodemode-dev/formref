@echo off
cd /d "%~dp0"
set ACTION=%~1
if "%ACTION%"=="" set ACTION=dev
if "%ACTION%"=="install" (call formref_oc_install.bat & exit /b %errorlevel%)
if "%ACTION%"=="core" (cargo build --release --manifest-path native\formref-core\Cargo.toml & exit /b %errorlevel%)
if "%ACTION%"=="build" (
  cargo build --release --manifest-path native\formref-core\Cargo.toml || exit /b 1
  cd frontend
  call npm run build
  exit /b %errorlevel%
)
if "%ACTION%"=="mcp" (
  cd backend
  venv\Scripts\python.exe -m app.mcp_server
  exit /b %errorlevel%
)
if "%ACTION%"=="serve" (
  cd backend
  venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8196
  exit /b %errorlevel%
)
if "%ACTION%"=="desktop" (
  cd frontend
  call npm run tauri -- dev
  exit /b %errorlevel%
)
if "%ACTION%"=="dev" (
  start "FormRef API" cmd /k "%~dp0backend\boot_backend.bat"
  start "FormRef UI" cmd /k "%~dp0frontend\boot_frontend.bat"
  exit /b 0
)
echo Usage: formref.bat [install^|dev^|core^|build^|serve^|mcp^|desktop]
exit /b 2
