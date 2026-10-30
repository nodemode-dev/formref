@echo off
setlocal
cd /d "%~dp0"
set "ROOT=%cd%"
set "WEB_ONLY=0"
set "TAURI_ARGS="

:args
if "%~1"=="" goto args_done
if /i "%~1"=="-h" goto usage
if /i "%~1"=="--help" goto usage
if /i "%~1"=="--web" (
  set "WEB_ONLY=1"
  shift
  goto args
)
if "%~1"=="--" (
  shift
  goto args
)
set TAURI_ARGS=%TAURI_ARGS% %1
shift
goto args
:args_done
if not defined TAURI_ARGS if defined FORMCOMPILER_CONFIG_ARG set "TAURI_ARGS=%FORMCOMPILER_CONFIG_ARG%"

echo [formref] == checking the tools
where python >nul 2>nul || (echo [formref] Python 3.12 or newer is required & exit /b 1)
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" || (echo [formref] Python 3.12 or newer is required & exit /b 1)
where node >nul 2>nul || (echo [formref] Node 20.19 or newer is required & exit /b 1)
where cargo >nul 2>nul || (echo [formref] Rust is required: install it from https://rustup.rs & exit /b 1)
where claude >nul 2>nul && echo [formref] Claude Code found; the terminal dock's Claude Code button can start it

echo [formref] == installing the backend
for /f "delims=" %%p in ('python -c "import sys; print(sys.executable)"') do set "BOOT_PYTHON=%%p"
if not exist backend\venv\Scripts\python.exe goto make_venv
backend\venv\Scripts\python.exe -m pip install --quiet -r backend\requirements.txt
if errorlevel 1 exit /b 1
goto venv_done
:make_venv
pushd backend
set "FORMREF_PYTHON=%BOOT_PYTHON%"
call oc_install.bat
if errorlevel 1 exit /b 1
set "FORMREF_PYTHON="
popd
:venv_done

echo [formref] == installing the window
if exist frontend\node_modules goto window_ready
pushd frontend
call npm install
if errorlevel 1 exit /b 1
popd
:window_ready

echo [formref] == building the Rust core
cargo build --release --manifest-path native\formref-core\Cargo.toml
if errorlevel 1 exit /b 1
echo [formref] == building the window
pushd frontend
call npm run build
if errorlevel 1 exit /b 1
popd

if "%WEB_ONLY%"=="1" (
  echo [formref] web build done: formref.bat serve, then open http://127.0.0.1:8320
  exit /b 0
)

echo [formref] == freezing the engine
set "FORMREF_PYTHON=%ROOT%\backend\venv\Scripts\python.exe"
call backend\freeze_engine.bat
if errorlevel 1 exit /b 1
set "FORMREF_PYTHON="

echo [formref] == building the desktop app
pushd frontend
call npm run tauri -- build %TAURI_ARGS%
if errorlevel 1 exit /b 1
popd
echo [formref] desktop packages are in src-tauri\target\release\bundle; the app starts its own engine
echo [formref] done
exit /b 0

:usage
echo build_app.bat          build FormRef from this folder: install, Rust core, window, engine sidecar, desktop app
echo   --web                stop after the web build
echo   --                   everything else goes to tauri build (for example --config FILE); without any,
echo                        %%FORMCOMPILER_CONFIG_ARG%% is used when it is set
exit /b 0
