@echo off
cd /d "%~dp0"
cargo build --release --manifest-path native\formref-core\Cargo.toml || exit /b 1
cd backend
call oc_install.bat || exit /b 1
cd ..\frontend
call oc_install.bat || exit /b 1
echo Installed FormRef. Run formref.bat to start.
