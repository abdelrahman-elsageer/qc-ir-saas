@echo off
setlocal
cd /d "%~dp0"

echo Starting JIDAAR QC / IR SaaS...
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  py backend\app.py
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python backend\app.py
  goto :end
)

echo Python was not found.
echo Please install Python 3, then run this file again.
pause

:end
endlocal
