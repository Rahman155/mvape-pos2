@echo off
REM ============================================================================
REM VAPESTORE POS PWA - Build Script (Batch)
REM ============================================================================

setlocal enabledelayedexpansion

title Vapestore POS PWA - Build

echo.
echo ============================================================================
echo VAPESTORE POS PWA - BUILD SCRIPT
echo ============================================================================
echo.
echo Project Root: %cd%
echo.

REM Check if we're in the correct directory
if not exist "packages\backend" (
    echo [ERROR] Not in project root directory
    echo Please run this script from: C:\Users\rahma\Documents\Mvape-Pos-Rev
    echo.
    pause
    exit /b 1
)

REM ============================================================================
REM Run PowerShell Build Script
REM ============================================================================
echo Running PowerShell build script...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "BUILD.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed with exit code %errorlevel%
    pause
    exit /b 1
)

echo.
echo [OK] Build completed successfully
echo.
pause
exit /b 0
