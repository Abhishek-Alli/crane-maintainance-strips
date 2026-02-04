@echo off
REM Crane Maintenance System - Automated Setup Script (Windows)
REM This script automates the initial setup process

echo ==========================================
echo Crane Maintenance System - Setup
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [32m✓ Node.js found[0m
node --version

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [33m⚠ PostgreSQL not found in PATH[0m
    echo Please make sure PostgreSQL is installed
    echo Download from: https://www.postgresql.org/download/windows/
) else (
    echo [32m✓ PostgreSQL found[0m
)

echo.

REM Install root dependencies
echo Installing root dependencies...
call npm install

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo [32m✓ All dependencies installed[0m
echo.

REM Create backend .env if it doesn't exist
if not exist backend\.env (
    echo Creating backend .env file...
    (
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=crane_maintenance
        echo DB_USER=postgres
        echo DB_PASSWORD=Abhi122103
        echo.
        echo # Server Configuration
        echo PORT=5001
        echo NODE_ENV=development
        echo.
        echo # CORS Configuration
        echo CORS_ORIGIN=http://localhost:3000
        echo.
        echo # Google Sheets Configuration ^(Optional^)
        echo # GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
        echo # GOOGLE_SHEETS_SPREADSHEET_ID=
        echo # GOOGLE_SHEETS_SHEET_NAME=Inspection_Data
    ) > backend\.env
    echo [33m⚠ Please edit backend\.env and add your database password[0m
) else (
    echo [32m✓ backend\.env already exists[0m
)

REM Create frontend .env if it doesn't exist
if not exist frontend\.env (
    echo Creating frontend .env file...
    (
        echo REACT_APP_API_URL=http://localhost:5000/api
    ) > frontend\.env
    echo [32m✓ frontend\.env created[0m
) else (
    echo [32m✓ frontend\.env already exists[0m
)

echo.
echo ==========================================
echo Next Steps:
echo ==========================================
echo.
echo 1. Create PostgreSQL database:
echo    psql -U postgres
echo    CREATE DATABASE crane_maintenance;
echo    \q
echo.
echo 2. Run database schema:
echo    psql -U postgres -d crane_maintenance -f database-schema.sql
echo.
echo 3. Update backend\.env with your database password
echo.
echo 4. Start the application:
echo    npm run dev
echo.
echo 5. Open browser:
echo    http://localhost:3000
echo.
echo [32mSetup complete![0m
echo.
pause
