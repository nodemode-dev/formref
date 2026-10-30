@echo off
setlocal
cd /d "%~dp0"
set "BACKEND=%cd%"
for %%r in ("%~dp0..") do set "ROOT=%%~fr"
set "PYTHON_BIN=%BACKEND%\venv\Scripts\python.exe"
if defined FORMREF_PYTHON set "PYTHON_BIN=%FORMREF_PYTHON%"
if not exist "%PYTHON_BIN%" (echo [formref] the backend environment is missing: run formref.bat install & exit /b 1)
where rustc >nul 2>nul || (echo [formref] rustc is required to name the sidecar for this computer & exit /b 1)
if defined FORMREF_TARGET (set "TRIPLE=%FORMREF_TARGET%") else (for /f "tokens=2" %%t in ('rustc -vV ^| findstr /b "host:"') do set "TRIPLE=%%t")
if not defined TRIPLE (echo [formref] rustc did not report a host target; set FORMREF_TARGET & exit /b 1)
if not exist "%ROOT%\frontend\dist\index.html" (echo [formref] the window is not built: run npm run build in frontend first & exit /b 1)
set "CORE=%ROOT%\native\formref-core\target\release\formref-core.exe"
if not exist "%CORE%" (echo [formref] the Rust core is not built: run formref.bat core first & exit /b 1)

"%PYTHON_BIN%" -m pip install --quiet -r requirements_desktop.txt
if errorlevel 1 exit /b 1
if exist build\pyinstaller rmdir /s /q build\pyinstaller
if exist dist-engine rmdir /s /q dist-engine
"%PYTHON_BIN%" -m PyInstaller --noconfirm --clean --onefile --log-level WARN --name formref-engine --distpath dist-engine --workpath build\pyinstaller --specpath build\pyinstaller --paths "%BACKEND%" --add-data "%ROOT%\frontend\dist;frontend\dist" --add-data "%BACKEND%\app\bundled_models;app\bundled_models" --collect-submodules app --collect-submodules uvicorn --collect-submodules mcp --collect-submodules websockets --collect-data cairosvg --collect-data cairocffi --collect-all winpty "%BACKEND%\formref_engine.py"
if errorlevel 1 exit /b 1

if not exist "%ROOT%\src-tauri\binaries" mkdir "%ROOT%\src-tauri\binaries"
copy /y dist-engine\formref-engine.exe "%ROOT%\src-tauri\binaries\formref-engine-%TRIPLE%.exe" >nul
if errorlevel 1 exit /b 1
copy /y "%CORE%" "%ROOT%\src-tauri\binaries\formref-core-%TRIPLE%.exe" >nul
if errorlevel 1 exit /b 1
"%ROOT%\src-tauri\binaries\formref-engine-%TRIPLE%.exe" --selfcheck
if errorlevel 1 exit /b 1
echo [formref] sidecars ready: formref-engine-%TRIPLE%.exe and formref-core-%TRIPLE%.exe
exit /b 0
