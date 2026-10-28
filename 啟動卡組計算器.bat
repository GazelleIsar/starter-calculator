@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "PYTHON_CMD="

where py.exe >nul 2>&1
if not errorlevel 1 py -3 -c "import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)" >nul 2>&1
if not errorlevel 1 set "PYTHON_CMD=py -3"

if not defined PYTHON_CMD (
  where python.exe >nul 2>&1
  if not errorlevel 1 python -c "import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)" >nul 2>&1
  if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
  echo.
  echo [ERROR] Python 3 was not found.
  echo Install Python 3, then run this launcher again.
  echo.
  pause
  exit /b 1
)

echo Starting YGOPro Starter Draw Calculator...
%PYTHON_CMD% -B server.py
set "APP_EXIT_CODE=%errorlevel%"

if "%APP_EXIT_CODE%"=="0" exit /b 0

echo.
echo [ERROR] The application stopped unexpectedly. Exit code: %APP_EXIT_CODE%
echo Copy the message above when reporting this problem.
echo.
pause
exit /b %APP_EXIT_CODE%
