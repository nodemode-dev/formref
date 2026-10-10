@echo off
setlocal
cd /d "%~dp0"
call npm install
exit /b %errorlevel%
