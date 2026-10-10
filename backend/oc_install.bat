@echo off
setlocal
cd /d "%~dp0"
if defined FORMREF_PYTHON (
  "%FORMREF_PYTHON%" -m venv venv
) else (
  py -3 -m venv venv
)
if errorlevel 1 exit /b 1
call venv\Scripts\activate.bat
if errorlevel 1 exit /b 1
python -m pip install --upgrade pip
if errorlevel 1 exit /b 1
python -m pip install -r requirements.txt
exit /b %errorlevel%
