# Quick Start Guide

Get your Crane Maintenance Inspection System running in 10 minutes!

---

## Prerequisites

- Node.js v16+ installed ([Download](https://nodejs.org/))
- PostgreSQL v13+ installed ([Download](https://www.postgresql.org/download/))
- Git (optional)

---

## Installation Steps

### 1. Install Dependencies

```bash
# From project root
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 2. Setup Database

```bash
# Login to PostgreSQL (Windows)
psql -U postgres

# Login to PostgreSQL (Linux/Mac)
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE crane_maintenance;
\q
```

Run the schema:
```bash
# Windows
psql -U postgres -d crane_maintenance -f database-schema.sql

# Linux/Mac
psql -U postgres -d crane_maintenance -f database-schema.sql
```

### 3. Configure Backend

```bash
cd backend

# Copy example environment file
cp .env.example .env

# Edit .env file with your settings
# Windows: notepad .env
# Linux/Mac: nano .env
```

**Minimal .env configuration:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crane_maintenance
DB_USER=postgres
DB_PASSWORD=your_postgres_password

PORT=5000
NODE_ENV=development

CORS_ORIGIN=http://localhost:3000

# Google Sheets (optional - can skip initially)
# GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
# GOOGLE_SHEETS_SPREADSHEET_ID=
# GOOGLE_SHEETS_SHEET_NAME=Inspection_Data
```

### 4. Configure Frontend

```bash
cd ../frontend

# Copy example environment file
cp .env.example .env

# Edit if needed (default works for local development)
```

Default .env:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Start the Application

**Option A: Run both together (recommended)**
```bash
# From project root
npm run dev
```

**Option B: Run separately**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm start
```

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the Crane Maintenance System dashboard!

---

## Initial Setup

### Default Data

The system comes pre-loaded with:

**3 Sheds:**
- Shed A
- Shed B
- Shed C

**6 Sample Cranes:**
- CR-A-001 (Shed A, Daily maintenance)
- CR-A-002 (Shed A, Daily maintenance)
- CR-B-001 (Shed B, Weekly maintenance)
- CR-B-002 (Shed B, Daily maintenance)
- CR-C-001 (Shed C, Monthly maintenance)
- CR-C-002 (Shed C, Daily maintenance)

**7 Inspection Sections:**
1. LT Gear Box – 1 (Cabin Side)
2. LT Gear Box – 2 (Opposite Side)
3. CT – 1 (Cabin Side)
4. CT – 2 (Opposite Cabin Side)
5. Main Hoist – 1 (Cabin Side)
6. Main Hoist – 2 (Opposite Side)
7. Auxiliary Hoist

**42 Inspection Items** across all sections with configured dropdown values and alert rules.

---

## First Inspection

### Step-by-Step

1. **Click "New Inspection"** in the navigation bar

2. **Fill the header** (all required):
   - Date: Select today's date
   - Recorded By: Enter your name
   - Shed: Select "Shed A"
   - Crane No: Select "CR-A-001"

3. **Fill an inspection section**:
   - Scroll to "LT Gear Box – 1 (Cabin Side)"
   - Oil Level: Select "NORMAL"
   - Oil Leakage: Select "NO"
   - Noise: Select "NORMAL"
   - Vibration: Select "NORMAL"
   - Bearing Condition: Select "GOOD"
   - Gear Condition: Select "GOOD"

4. **Click "Submit Inspection"**

5. **View the result** on the Dashboard

---

## Testing Alert Detection

Create another inspection with an alert condition:

1. Click "New Inspection"
2. Fill header fields (use CR-A-002)
3. In "LT Gear Box – 1" section:
   - Oil Level: Select **"LOW"** → This will trigger an alert!
   - Fill other compulsory fields
4. Submit

You'll see:
- Yellow alert box before submission
- Inspection marked as "MAINTENANCE REQUIRED" on dashboard
- Alert count displayed

---

## Testing Export Features

1. Go to Dashboard
2. Find a recent inspection
3. Click **"Excel"** to download Excel report
4. Click **"PDF"** to download PDF report

Both files will download automatically with all inspection data formatted.

---

## Optional: Google Sheets Integration

### Setup Steps

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project

2. **Enable Google Sheets API**
   - APIs & Services → Library
   - Search "Google Sheets API"
   - Click Enable

3. **Create Service Account**
   - APIs & Services → Credentials
   - Create Credentials → Service Account
   - Download JSON key file

4. **Configure Application**
   ```bash
   # Save JSON file as:
   backend/config/google-credentials.json
   ```

5. **Create Google Spreadsheet**
   - Create new Google Sheet
   - Share with service account email (from JSON file)
   - Grant Editor access
   - Copy Spreadsheet ID from URL

6. **Update .env**
   ```env
   GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
   GOOGLE_SHEETS_SHEET_NAME=Inspection_Data
   ```

7. **Restart Backend**
   ```bash
   cd backend
   npm run dev
   ```

8. **Test Connection**
   - Browser: http://localhost:5000/api/config/test-google-sheets
   - Should return success message

Now all inspections will automatically sync to Google Sheets!

---

## Troubleshooting

### Port Already in Use

**Backend (Port 5000):**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

**Frontend (Port 3000):**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Database Connection Error

1. Verify PostgreSQL is running:
   ```bash
   # Windows
   services.msc (look for PostgreSQL)

   # Linux
   sudo systemctl status postgresql
   ```

2. Check password in `.env` file

3. Test connection:
   ```bash
   psql -U postgres -d crane_maintenance
   ```

### Cannot Find Module Errors

```bash
# Delete node_modules and reinstall
cd backend
rm -rf node_modules
npm install

cd ../frontend
rm -rf node_modules
npm install
```

### Blank Page on Frontend

1. Check browser console for errors (F12)
2. Verify backend is running: http://localhost:5000/health
3. Check CORS settings in backend `.env`

---

## Next Steps

### Customize Inspection Items

Inspection items are stored in the database and can be modified:

```sql
-- Add new inspection item
INSERT INTO inspection_items
(section_id, item_name, display_order, dropdown_values, compulsory, alert_condition, alert_value)
VALUES
(1, 'Temperature', 7, ARRAY['NORMAL', 'HIGH', 'VERY HIGH'], 'COMPULSORY', 'NOT_EQUAL_TO', 'NORMAL');

-- Update existing item
UPDATE inspection_items
SET dropdown_values = ARRAY['EXCELLENT', 'GOOD', 'FAIR', 'POOR']
WHERE item_name = 'Bearing Condition';
```

### Add More Cranes

```sql
INSERT INTO cranes (shed_id, crane_number, maintenance_frequency)
VALUES
(1, 'CR-A-003', 'DAILY'),
(2, 'CR-B-003', 'WEEKLY');
```

### Add More Sheds

```sql
INSERT INTO sheds (name, code)
VALUES ('Shed D', 'SHD');
```

---

## Production Deployment

When ready for production, see:
- [README.md](README.md) - Complete documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture details

---

## Support

### Check API Status
```
http://localhost:5000/health
```

### Check Database
```sql
-- Count inspections
SELECT COUNT(*) FROM inspections;

-- View recent inspections
SELECT * FROM v_inspection_summary ORDER BY inspection_date DESC LIMIT 10;

-- Check maintenance notifications
SELECT * FROM v_maintenance_notifications;
```

### Logs

**Backend logs:** Check terminal where backend is running

**Frontend logs:** Browser console (F12)

**Database logs:** Check PostgreSQL logs directory

---

## Quick Reference

### Commands

```bash
# Start both (from root)
npm run dev

# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm start

# Database schema reload
psql -U postgres -d crane_maintenance -f database-schema.sql
```

### URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/health

### API Endpoints

- `GET /api/cranes` - List all cranes
- `GET /api/config/sections` - Get inspection sections
- `POST /api/inspections` - Create inspection
- `GET /api/inspections` - List inspections
- `GET /api/cranes/notifications` - Maintenance notifications
- `GET /api/cranes/dashboard/stats` - Dashboard statistics

---

**Happy Inspecting! 🏗️**

For detailed documentation, see [README.md](README.md)
