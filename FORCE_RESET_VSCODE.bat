@echo off
echo ============================================
echo VSCode TypeScript Cache Reset Script
echo ============================================
echo.

REM Navigate to frontend directory
cd /d "%~dp0"

echo [1/4] Clearing TypeScript build info...
if exist "tsconfig.tsbuildinfo" del /f /q "tsconfig.tsbuildinfo"
if exist ".tsbuildinfo" del /f /q ".tsbuildinfo"

echo [2/4] Clearing Next.js cache...
if exist ".next" rmdir /s /q ".next"

echo [3/4] Clearing node_modules cache...
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

echo [4/4] Verifying src/index.ts does NOT exist...
if exist "src\index.ts" (
    echo ERROR: File still exists! Deleting it now...
    del /f /q "src\index.ts"
) else (
    echo ✓ CONFIRMED: src\index.ts does not exist
)

echo.
echo ============================================
echo Cache cleared successfully!
echo ============================================
echo.
echo NEXT STEPS (YOU MUST DO THIS MANUALLY):
echo.
echo 1. In VSCode, press Ctrl+Shift+P
echo 2. Type: "TypeScript: Restart TS Server"
echo 3. Press Enter
echo.
echo OR simply close VSCode completely and reopen it.
echo.
echo The phantom errors will disappear once VSCode
echo reloads its TypeScript language server.
echo ============================================
pause
