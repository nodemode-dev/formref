@echo off
setlocal
cd /d "%~dp0"
set "WEB_ONLY=0"
if /i "%~1"=="--web" set "WEB_ONLY=1"
if /i "%~1"=="-h" goto usage
if /i "%~1"=="--help" goto usage

echo [formref] == checking the tools
where python >nul 2>nul || (echo [formref] Python 3.12 or newer is required & exit /b 1)
where node >nul 2>nul || (echo [formref] Node 20.19 or newer is required & exit /b 1)
where cargo >nul 2>nul || (echo [formref] Rust is required: install it from https://rustup.rs & exit /b 1)
where claude >nul 2>nul && echo [formref] Claude Code found; the terminal dock's Claude Code button can start it

echo [formref] == installing the backend
if not exist backend\venv\Scripts\python.exe (
  pushd backend & call oc_install.bat || (popd & exit /b 1) & popd
) else (
  backend\venv\Scripts\python.exe -m pip install --quiet -r backend\requirements.txt || exit /b 1
)
echo [formref] == installing the window
if not exist frontend\node_modules (pushd frontend & call npm install || (popd & exit /b 1) & popd)

echo [formref] == building the Rust core
cargo build --release --manifest-path native\formref-core\Cargo.toml || exit /b 1
echo [formref] == building the window
pushd frontend & call npm run build || (popd & exit /b 1) & popd

if "%WEB_ONLY%"=="1" (
  echo [formref] web build done: formref.bat serve, then open http://127.0.0.1:8196
  exit /b 0
)
echo [formref] == building the desktop app
pushd frontend & call npm run tauri -- build || (popd & exit /b 1) & popd
echo [formref] desktop packages are in src-tauri\target\release\bundle
echo [formref] done
exit /b 0

:usage
echo build_app.bat          build FormRef from this folder: install, Rust core, window, desktop app
echo   --web                stop after the web build
exit /b 0
