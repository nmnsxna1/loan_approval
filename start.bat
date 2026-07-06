@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "NODE_BACKEND=%ROOT%loan-approval-backend-node"
set "JAVA_BACKEND=%ROOT%loan-approval-backend"
set "FRONTEND=%ROOT%loan-approval-frontend"

echo ============================================================
echo   Loan Approval System - Setup ^& Launch
echo ============================================================
echo.

rem ───── Check Node.js ─────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Node.js is NOT installed. Download from https://nodejs.org/
    exit /b 1
)
for /f "tokens=1* delims=v" %%a in ('node --version') do set "NODE_VER=%%b"
echo [OK]   Node.js   : %NODE_VER%

rem ───── Check npm ─────
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] npm is NOT installed.
    exit /b 1
)
for /f "tokens=*" %%a in ('npm --version') do set "NPM_VER=%%a"
echo [OK]   npm       : v%NPM_VER%

rem ───── Check Java (optional) ─────
where java >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=3" %%a in ('java -version 2^>^&1 ^| findstr /i "version"') do set "JAVA_VER=%%~a"
    echo [OK]   Java      : %JAVA_VER%
) else (
    echo [WARN] Java NOT found - Java backend will be skipped
)

rem ───── Check Maven (optional) ─────
where mvn >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=2" %%a in ('mvn --version 2^>^&1 ^| findstr /i "Apache Maven"') do set "MAVEN_VER=%%a"
    echo [OK]   Maven     : %MAVEN_VER%
) else (
    echo [WARN] Maven NOT found - Java backend will be skipped
)

echo.

rem ───── Check / create .env for backend-node ─────
if not exist "%NODE_BACKEND%\.env" (
    echo [WARN] No .env file found in loan-approval-backend-node
    echo        Creating template .env - edit DATABASE_URL before starting
    (
        echo # Database connection ^(REQUIRED - edit this^)
        echo DATABASE_URL="postgresql://user:password@localhost:5432/loan_approval"
        echo.
        echo # Server
        echo PORT=8080
        echo.
        echo # Logging
        echo LOG_LEVEL=info
        echo LOG_PATH=../logs
        echo.
        echo # JWT Secret
        echo JWT_SECRET=change-this-to-a-random-secret
    ) > "%NODE_BACKEND%\.env"
) else (
    echo [OK]   .env file found
)

rem ───── Install Node.js backend dependencies ─────
echo [INFO] Installing Node.js backend dependencies...
cd /d "%NODE_BACKEND%"
if not exist node_modules (
    call npm install
    if !errorlevel! neq 0 (
        echo [FAIL] npm install failed for Node.js backend
        exit /b 1
    )
) else (
    echo [SKIP] node_modules exists, skipping npm install
)

rem ───── Generate Prisma client ─────
echo [INFO] Generating Prisma client...
node node_modules\prisma\build\index.js generate
if %errorlevel% neq 0 (
    echo [FAIL] Prisma client generation failed
    exit /b 1
)

rem ───── Create frontend .env template if missing ─────
if not exist "%FRONTEND%\.env" (
    echo [INFO] Creating template .env for frontend
    (
        echo # Optional: log endpoint for error reporting
        echo VITE_LOG_ENDPOINT=/api/log
        echo.
        echo # Log level: debug, info, warn, error
        echo VITE_LOG_LEVEL=info
    ) > "%FRONTEND%\.env"
)

rem ───── Install Frontend dependencies ─────
echo [INFO] Installing Frontend dependencies...
cd /d "%FRONTEND%"
if not exist node_modules (
    call npm install
    if !errorlevel! neq 0 (
        echo [FAIL] npm install failed for Frontend
        exit /b 1
    )
) else (
    echo [SKIP] node_modules exists, skipping npm install
)

echo.
echo ============================================================
echo   Launching services...
echo ============================================================
echo.

rem ───── Start Node.js backend (port 8080) ─────
echo [LAUNCH] Node.js backend (port 8080)...
start "LoanApp-Backend-Node" /D "%NODE_BACKEND%" cmd /k "npm run dev"

rem ───── Start Frontend (port 3001) ─────
echo [LAUNCH] Frontend (port 3001)...
start "LoanApp-Frontend" /D "%FRONTEND%" cmd /k "npm run dev"

rem ───── Start Java backend (port 8080 - conflicts with Node backend) ─────
where java >nul 2>&1
if %errorlevel% equ 0 (
    where mvn >nul 2>&1
    if !errorlevel! equ 0 (
        echo [WARN] Java backend will fail if Node.js backend is on port 8080.
        echo        To use Java instead of Node.js, edit start.bat or change server.port.
        echo [LAUNCH] Java backend (port 8080)...
        start "LoanApp-Backend-Java" /D "%JAVA_BACKEND%" cmd /k "mvn spring-boot:run"
    )
)

echo.
echo ============================================================
echo   Services starting in separate windows:
echo     Backend  : http://localhost:8080
echo     Frontend : http://localhost:3001
echo ============================================================
echo.
echo Close the service windows to stop each service.
echo.
endlocal
