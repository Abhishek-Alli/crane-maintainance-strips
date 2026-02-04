#!/bin/bash

# Crane Maintenance System - Automated Setup Script
# This script automates the initial setup process

set -e  # Exit on error

echo "=========================================="
echo "Crane Maintenance System - Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL from https://www.postgresql.org/download/"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL found${NC}"
echo ""

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo -e "${GREEN}✓ All dependencies installed${NC}"
echo ""

# Create backend .env if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "Creating backend .env file..."
    cat > backend/.env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crane_maintenance
DB_USER=postgres
DB_PASSWORD=

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Google Sheets Configuration (Optional)
# GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
# GOOGLE_SHEETS_SPREADSHEET_ID=
# GOOGLE_SHEETS_SHEET_NAME=Inspection_Data
EOF
    echo -e "${YELLOW}⚠ Please edit backend/.env and add your database password${NC}"
else
    echo -e "${GREEN}✓ backend/.env already exists${NC}"
fi

# Create frontend .env if it doesn't exist
if [ ! -f frontend/.env ]; then
    echo "Creating frontend .env file..."
    cat > frontend/.env << 'EOF'
REACT_APP_API_URL=http://localhost:5000/api
EOF
    echo -e "${GREEN}✓ frontend/.env created${NC}"
else
    echo -e "${GREEN}✓ frontend/.env already exists${NC}"
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Create PostgreSQL database:"
echo "   psql -U postgres"
echo "   CREATE DATABASE crane_maintenance;"
echo "   \\q"
echo ""
echo "2. Run database schema:"
echo "   psql -U postgres -d crane_maintenance -f database-schema.sql"
echo ""
echo "3. Update backend/.env with your database password"
echo ""
echo "4. Start the application:"
echo "   npm run dev"
echo ""
echo "5. Open browser:"
echo "   http://localhost:3000"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
