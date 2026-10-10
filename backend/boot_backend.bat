@echo off
setlocal
cd /d "%~dp0"
set "PYTHON_BIN=%~dp0venv\Scripts\python.exe"
if defined FORMREF_PYTHON set "PYTHON_BIN=%FORMREF_PYTHON%"
if not exist "%PYTHON_BIN%" (
  echo Run formref_oc_install.bat or set FORMREF_PYTHON to an installed Python executable. 1>&2
  exit /b 1
)
"%PYTHON_BIN%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8196
exit /b %errorlevel%
