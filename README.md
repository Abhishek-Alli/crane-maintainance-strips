# Crane Maintenance Inspection System

## Production-Ready Web Application

A comprehensive digital solution to replace handwritten crane maintenance forms with strict validation, automated alerts, maintenance scheduling, and multi-format export capabilities.

---

## Table of Contents

1. [Features](#features)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Database Setup](#database-setup)
7. [Running the Application](#running-the-application)
8. [API Documentation](#api-documentation)
9. [Business Rules](#business-rules)
10. [User Guide](#user-guide)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Features

### Core Features
- **Digital Inspection Forms**: One crane = one inspection form per day
- **Dropdown-Only Data Entry**: Eliminates handwriting errors
- **Automatic Alert Detection**: Rule-based alert engine (EQUAL_TO, NOT_EQUAL_TO)
- **Maintenance Scheduling**: Daily/Weekly/Monthly frequency with DUE/PENDING notifications
- **Multi-Format Export**:
  - Excel (.xlsx)
  - PDF with formatted report
  - Google Sheets auto-sync
- **Real-Time Dashboard**: Statistics, notifications, recent inspections
- **Fully Configurable**: All inspection items, sections, and rules stored in database

### Technical Features
- Frontend + Backend validation (identical rules)
- RESTful API architecture
- PostgreSQL with referential integrity
- Transaction-based inspection creation
- Automatic next maintenance date calculation
- Google Sheets API integration
- Responsive UI with Tailwind CSS

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                    React + Tailwind CSS                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────┴──────────────────────────────────┐
│                     API SERVER (Node.js)                     │
│  Express + Validation + Business Logic + Export Services    │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │PostgreSQL│      │  Google  │      │  File    │
  │ Database │      │  Sheets  │      │  Export  │
  │          │      │   API    │      │(Excel/PDF)│
  └──────────┘      └──────────┘      └──────────┘
```

---

## Technology Stack

### Backend
- **Node.js** (v16+)
- **Express.js** - Web framework
- **PostgreSQL** (v13+) - Database
- **pg** - PostgreSQL client
- **express-validator** - Request validation
- **ExcelJS** - Excel generation
- **PDFKit** - PDF generation
- **googleapis** - Google Sheets integration

### Frontend
- **React** (v18+)
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **React Hook Form** - Form management
- **Axios** - HTTP client
- **React DatePicker** - Date selection
- **React Toastify** - Notifications

---

## Installation

### Prerequisites
- Node.js v16 or higher
- PostgreSQL v13 or higher
- npm or yarn package manager
- Google Cloud Platform account (for Google Sheets integration)

### Step 1: Clone Repository
```bash
cd /path/to/crane-maintainance
```

### Step 2: Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Configuration

### Backend Configuration

1. **Create `.env` file** in `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crane_maintenance
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Server Configuration
PORT=5000
NODE_ENV=production

# Google Sheets Configuration
GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SHEET_NAME=Inspection_Data

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

2. **Google Sheets Setup**:

   a. Go to [Google Cloud Console](https://console.cloud.google.com/)

   b. Create a new project

   c. Enable Google Sheets API

   d. Create Service Account credentials

   e. Download JSON key file

   f. Save as `backend/config/google-credentials.json`

   g. Share your Google Spreadsheet with the service account email

   h. Copy Spreadsheet ID from URL and update `.env`

### Frontend Configuration

1. **Create `.env` file** in `frontend/` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Database Setup

### Step 1: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE crane_maintenance;

# Exit
\q
```

### Step 2: Run Schema Migration

```bash
cd backend

# Run the schema SQL file
psql -U postgres -d crane_maintenance -f ../database-schema.sql
```

This will:
- Create all tables (sheds, cranes, inspection_sections, inspection_items, inspections, etc.)
- Create enums for data types
- Set up foreign key constraints
- Create indexes for performance
- Insert seed data (3 sheds, 7 sections, 42 inspection items, 6 sample cranes)

### Database Schema Overview

**Master Tables:**
- `sheds` - Shed/location definitions
- `inspection_sections` - 7 main inspection sections
- `inspection_items` - Individual inspection items with dropdown values and alert rules
- `cranes` - Crane definitions with maintenance frequency

**Transaction Tables:**
- `inspections` - Inspection form headers
- `inspection_values` - Actual inspection data (one row per item checked)
- `maintenance_schedule` - Maintenance due tracking
- `google_sheets_log` - Sync audit trail

---

## Running the Application

### Development Mode

**Option 1: Run Both Together (Recommended)**
```bash
# From root directory
npm run dev
```

**Option 2: Run Separately**

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

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build folder with a web server (nginx, Apache, etc.)
```

### Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

---

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Inspections

**Create Inspection**
```http
POST /inspections
Content-Type: application/json

{
  "inspection_date": "2024-01-15",
  "recorded_by": "John Doe",
  "shed_id": 1,
  "crane_id": 1,
  "maintenance_start_time": "09:00",
  "maintenance_stop_time": "10:30",
  "remarks": "General remarks",
  "sections": [
    {
      "section_id": 1,
      "items": [
        {
          "item_id": 1,
          "selected_value": "NORMAL",
          "remarks": "Item-specific remarks"
        }
      ]
    }
  ]
}
```

**Get All Inspections**
```http
GET /inspections?crane_id=1&from_date=2024-01-01&to_date=2024-01-31
```

**Get Inspection by ID**
```http
GET /inspections/:id
```

**Export to Excel**
```http
GET /inspections/:id/export/excel
```

**Export to PDF**
```http
GET /inspections/:id/export/pdf
```

**Sync to Google Sheets**
```http
POST /inspections/:id/sync
```

#### Cranes

**Get All Cranes**
```http
GET /cranes?shed_id=1
```

**Get Dashboard Stats**
```http
GET /cranes/dashboard/stats
```

**Get Maintenance Notifications**
```http
GET /cranes/notifications
```

**Create Crane**
```http
POST /cranes
Content-Type: application/json

{
  "shed_id": 1,
  "crane_number": "CR-A-003",
  "maintenance_frequency": "DAILY"
}
```

#### Configuration

**Get Sheds**
```http
GET /config/sheds
```

**Get Sections with Items**
```http
GET /config/sections
```

**Test Google Sheets Connection**
```http
GET /config/test-google-sheets
```

---

## Business Rules

### 1. ONE CRANE = ONE FORM PER DAY
- Database enforces unique constraint: `UNIQUE(crane_id, inspection_date)`
- API validates before insertion
- Frontend prevents duplicate submission

### 2. COMPULSORY HEADER FIELDS
All must be filled:
- Date (date picker)
- Recorded By (text)
- Shed (dropdown)
- Crane No (dropdown, filtered by shed)

Form submission blocked if any missing.

### 3. SECTION-LEVEL RULES
- **Entire section is UNCOMPULSORY** - can be completely skipped
- **If ANY field in a section is filled** → All COMPULSORY fields in that section MUST be filled
- Validation enforced on backend AND frontend

### 4. DROPDOWN-ONLY VALUES
- All inspection values come from `inspection_items.dropdown_values`
- Backend validates selected value against allowed values
- No free text for inspection values

### 5. ALERT RULE ENGINE

**EQUAL_TO**: Alert if value equals `alert_value`
```
Example: Oil Level = LOW → ALERT
```

**NOT_EQUAL_TO**: Alert if value does NOT equal `alert_value`
```
Example: Wire Rope Drum != OKAY → ALERT
```

**NONE**: No alert for this item

### 6. CRANE STATUS LOGIC
After form submission:
```
IF any inspection_value.is_alert = true
  → crane_status = 'MAINTENANCE_REQUIRED'
ELSE
  → crane_status = 'OK'
```

### 7. MAINTENANCE SCHEDULING

**Next Maintenance Date Calculation:**
```
Next Date = Inspection Date + Frequency

DAILY   → +1 day
WEEKLY  → +7 days
MONTHLY → +1 month
```

**Daily Status Check:**
```
IF today < next_date → OK
IF today = next_date → DUE
IF today > next_date → PENDING
```

### 8. GOOGLE SHEETS AUTO-SYNC
- Every inspection submission automatically syncs to Google Sheets
- Asynchronous (doesn't block response)
- One row per inspection item
- Audit log in `google_sheets_log` table

---

## User Guide

### Creating an Inspection

1. **Navigate to "New Inspection"**
2. **Fill Header (All Required)**:
   - Select Date
   - Enter Recorded By name
   - Select Shed (dropdown will populate)
   - Select Crane No (filtered by shed)
   - Optionally: Maintenance times and general remarks

3. **Fill Inspection Sections**:
   - Each section has GREEN header
   - Sections are optional - skip entirely if not applicable
   - If you fill ANY field in a section:
     - All fields marked with `*` (red asterisk) become required
   - Select values from dropdowns
   - Add item-specific remarks if needed

4. **Review Alerts**:
   - Alert preview appears at bottom if any alerts detected
   - Yellow warning box shows items requiring attention

5. **Submit**:
   - Click "Submit Inspection"
   - Success notification appears
   - Data automatically syncs to Google Sheets
   - Redirects to Dashboard

### Dashboard Features

**Statistics Cards:**
- Total Cranes
- Cranes OK
- Maintenance Required
- Due Today
- Pending (overdue)

**Maintenance Notifications Table:**
- Shows cranes with DUE or PENDING maintenance
- Sorted by days overdue
- Color-coded: Yellow (DUE), Red (PENDING)

**Recent Inspections Table:**
- Latest inspections across all cranes
- Status indicators (OK / MAINTENANCE REQUIRED)
- Alert count highlighted
- Export buttons (Excel, PDF)

### Exporting Data

**Excel Export:**
- Click "Excel" button on any inspection
- Downloads `.xlsx` file
- One row per inspection item
- Alerts highlighted in orange

**PDF Export:**
- Click "PDF" button on any inspection
- Downloads formatted PDF report
- Sections grouped
- Alerts highlighted

**Google Sheets:**
- Automatic on every submission
- Manual sync: `POST /api/inspections/:id/sync`
- Check sync status in `google_sheets_log` table

---

## Deployment

### Production Deployment Checklist

#### 1. Environment Variables
- Set `NODE_ENV=production`
- Use strong database password
- Configure proper CORS origin
- Secure Google Sheets credentials

#### 2. Database
- Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- Enable automated backups
- Set up connection pooling
- Create database read replicas for scaling

#### 3. Backend
- Use process manager (PM2, systemd)
- Set up reverse proxy (nginx)
- Enable HTTPS/SSL
- Configure rate limiting
- Set up logging (Winston, Morgan)

#### 4. Frontend
- Build production bundle: `npm run build`
- Serve with nginx or CDN
- Enable gzip compression
- Configure caching headers
- Use environment-specific API URLs

#### 5. Google Sheets
- Use service account credentials
- Restrict API key permissions
- Monitor API quotas
- Set up error notifications

### Sample nginx Configuration

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/crane-maintenance/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### PM2 Process Management

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start server.js --name crane-api

# Save PM2 configuration
pm2 save

# Set up auto-restart on server reboot
pm2 startup
```

---

## Troubleshooting

### Database Connection Issues

**Error: `ECONNREFUSED`**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Verify connection
psql -U postgres -d crane_maintenance
```

**Error: `password authentication failed`**
- Check `.env` file for correct password
- Verify PostgreSQL user exists
- Check `pg_hba.conf` for authentication method

### Google Sheets Sync Failures

**Error: `credentials file not found`**
- Verify path in `.env`: `GOOGLE_SHEETS_CREDENTIALS_PATH`
- Ensure file exists at specified location
- Check file permissions (readable by Node.js process)

**Error: `The caller does not have permission`**
- Share spreadsheet with service account email
- Grant "Editor" access
- Verify Spreadsheet ID in `.env`

**Error: `API quotas exceeded`**
- Google Sheets API has rate limits
- Implement exponential backoff
- Consider batching multiple inspections

### Frontend Issues

**Blank Page After Build**
- Check browser console for errors
- Verify API URL in `.env`
- Ensure backend is running
- Check CORS configuration

**Dropdown Not Populating**
- Check API endpoint: `GET /api/config/sections`
- Verify database has seed data
- Check browser network tab for failed requests

### Validation Errors

**Section Completeness Validation**
- Error occurs when section has some fields filled but missing compulsory fields
- Review which fields are marked `COMPULSORY` in database
- Check frontend validation matches backend logic

**Duplicate Inspection Error**
- One crane can only have one inspection per day
- Check existing inspections: `GET /api/inspections?crane_id=X&inspection_date=YYYY-MM-DD`
- Delete or update existing inspection if needed

---

## System Maintenance

### Regular Tasks

**Daily:**
- Monitor Google Sheets sync logs
- Check error logs for failed API calls
- Review maintenance notifications

**Weekly:**
- Database backup verification
- Review disk space usage
- Check API response times

**Monthly:**
- Database vacuum and analyze
- Archive old inspection data
- Review and optimize slow queries

### Database Queries

**Check Sync Status:**
```sql
SELECT * FROM google_sheets_log
WHERE sync_status = 'FAILED'
ORDER BY synced_at DESC;
```

**Find Overdue Maintenance:**
```sql
SELECT * FROM v_maintenance_notifications
WHERE notification_status = 'PENDING';
```

**Inspection Statistics:**
```sql
SELECT
  DATE_TRUNC('month', inspection_date) as month,
  COUNT(*) as total_inspections,
  COUNT(CASE WHEN has_alerts THEN 1 END) as inspections_with_alerts
FROM inspections
GROUP BY month
ORDER BY month DESC;
```

---

## Support & Contribution

### Logs Location
- Backend logs: `console.log` (configure Winston for file logging)
- Frontend: Browser console
- Database: PostgreSQL logs (location depends on installation)

### Performance Optimization

**Database:**
- Indexes already created on frequently queried columns
- Use `EXPLAIN ANALYZE` for slow queries
- Consider partitioning `inspections` table by date for large datasets

**API:**
- Response times < 200ms for most endpoints
- Use Redis for caching if needed
- Implement pagination for large result sets

**Frontend:**
- Code splitting with React.lazy()
- Image optimization
- Implement service workers for offline capability

---

## License

Proprietary - All Rights Reserved

---

## Version History

**v1.0.0** (2024-01-15)
- Initial production release
- Complete CRUD operations for inspections
- Automatic alert detection
- Maintenance scheduling
- Excel/PDF export
- Google Sheets integration
- Responsive dashboard

---

## Contact

For technical support or feature requests, please contact your system administrator.

---

## Appendix

### Sample Inspection Items

**LT Gear Box – 1 (Cabin Side):**
1. Oil Level (HIGH/NORMAL/LOW) - Alert if LOW
2. Oil Leakage (YES/NO) - Alert if YES
3. Noise (NORMAL/ABNORMAL) - Alert if ABNORMAL
4. Vibration (NORMAL/ABNORMAL) - Alert if ABNORMAL
5. Bearing Condition (GOOD/FAIR/POOR) - Alert if NOT GOOD
6. Gear Condition (GOOD/WORN/DAMAGED) - Alert if NOT GOOD

**CT – 1 (Cabin Side):**
1. Wire Rope Condition (GOOD/WORN/DAMAGED) - Alert if NOT GOOD
2. Wire Rope Drum (OKAY/DAMAGED) - Alert if NOT OKAY
3. Brake Condition (WORKING/NOT WORKING) - Alert if NOT WORKING
4. Hook Condition (GOOD/WORN/DAMAGED) - Alert if NOT GOOD
5. Pulley Condition (GOOD/WORN/DAMAGED) - Alert if NOT GOOD
6. Motor Temperature (NORMAL/HIGH) - Alert if HIGH

(See `database-schema.sql` for complete list)

---

**End of Documentation**
