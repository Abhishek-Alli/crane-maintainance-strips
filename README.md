# SRJ Strips and Pipes — Maintenance Portal

A full-stack web application for managing crane maintenance inspections, HBM (Hot Bar Mill) checksheets, and user administration at SRJ Strips and Pipes Pvt Ltd.

---

## Table of Contents

1. [Modules](#modules)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Local Setup](#local-setup)
6. [Environment Variables](#environment-variables)
7. [Database Setup](#database-setup)
8. [Running the Application](#running-the-application)
9. [Deployment](#deployment)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Key Features](#key-features)
12. [Troubleshooting](#troubleshooting)

---

## Modules

The portal has **three separate login modules**, each with its own UI theme:

| Module | Theme | Default Route | Description |
|---|---|---|---|
| **Crane Maintenance** | Blue | `/` | Daily crane inspection forms, reports, maintenance calendar |
| **HBM Checksheets** | Emerald | `/hbm/dashboard` | 7 daily checksheets for Hot Bar Mill equipment |
| **Admin** | Slate/Dark | `/create-user` | User management, permissions, system settings |

---

## Technology Stack

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| React | 18.2.0 | UI framework |
| React Router DOM | 6.20.1 | Client-side routing |
| Tailwind CSS | 3.3.6 | Styling |
| Axios | 1.6.2 | HTTP client |
| React Hook Form | 7.48.2 | Form state management |
| React Toastify | 9.1.3 | Toast notifications |
| React DatePicker | 4.21.0 | Date selection |
| date-fns | 2.30.0 | Date utilities |

### Backend
| Tool | Version | Purpose |
|---|---|---|
| Node.js | 16+ | Runtime |
| Express.js | 4.18.2 | Web framework |
| pg | 8.11.3 | PostgreSQL client |
| jsonwebtoken | 9.0.2 | JWT authentication |
| bcryptjs | 3.0.3 | Password hashing |
| ExcelJS | 4.4.0 | Excel (.xlsx) export |
| PDFKit | 0.14.0 | PDF report generation |
| googleapis | 128.0.0 | Google Sheets integration |
| node-cron | 4.2.1 | Scheduled tasks (maintenance alerts) |
| helmet | 7.1.0 | HTTP security headers |
| cors | 2.8.5 | Cross-origin resource sharing |
| morgan | 1.10.0 | HTTP request logging |
| compression | 1.7.4 | Gzip response compression |
| joi + express-validator | latest | Input validation |

### Database
| Tool | Purpose |
|---|---|
| PostgreSQL 13+ | Primary database |
| Google Sheets API | Secondary data sync (inspection records) |

### Infrastructure
| Tool | Purpose |
|---|---|
| Vercel | Cloud deployment (frontend + API functions) |
| PM2 | Process manager for local/LAN deployment |
| Nginx | Reverse proxy for local network hosting |

---

## Project Structure

```
crane-maintainance/
├── backend/                        # Express.js API server
│   ├── config/
│   │   └── database.js             # PostgreSQL connection pool
│   ├── controllers/                # Route handlers
│   │   ├── authController.js       # Login / JWT
│   │   ├── userController.js       # User CRUD + permissions
│   │   ├── hbmController.js        # All 7 HBM checksheets
│   │   ├── inspectionController.js # Crane inspection forms
│   │   ├── reportController.js     # Excel / PDF export
│   │   └── ...
│   ├── routes/                     # Express routers
│   ├── middleware/
│   │   └── auth.js                 # authenticate + authorize middleware
│   ├── migrations/                 # SQL migration files (000–022)
│   ├── cron/                       # Scheduled jobs (alerts, daily summary)
│   ├── services/                   # Google Sheets, PDF, Excel services
│   ├── utils/                      # Telegram alerts, email helpers
│   ├── validators/                 # Joi/express-validator schemas
│   └── server.js                   # App entry point (port 5001)
│
├── frontend/                       # React application
│   ├── public/
│   │   └── srj-logo.png            # Company logo
│   ├── src/
│   │   ├── components/
│   │   │   ├── hbm/                # All HBM checksheet components
│   │   │   │   ├── HbmDashboard.jsx
│   │   │   │   ├── DcMotorForm.jsx / DcMotorView.jsx / DcMotorHistory.jsx
│   │   │   │   ├── RollingStandForm.jsx / ...
│   │   │   │   ├── MillMechForm.jsx / ...
│   │   │   │   ├── CoolingBedForm.jsx / ...
│   │   │   │   ├── PumpHouseForm.jsx / ...
│   │   │   │   ├── BarBundleAreaForm.jsx / ...
│   │   │   │   ├── BeforeRollingForm.jsx / ...
│   │   │   │   └── DownloadChecksheet.jsx
│   │   │   ├── fabrication/        # Fabrication tracking
│   │   │   ├── Login.jsx           # Login page (3 module selector)
│   │   │   ├── CreateUser.jsx      # Admin user management
│   │   │   ├── Dashboard.jsx       # Crane maintenance dashboard
│   │   │   ├── InspectionForm.jsx  # New crane inspection
│   │   │   ├── ReportGenerator.jsx # Download reports
│   │   │   ├── MaintenanceCalendarPage.jsx
│   │   │   └── TelegramSettings.jsx
│   │   ├── services/
│   │   │   └── api.js              # Axios instance + all API calls
│   │   └── App.js                  # Routes + navigation + auth
│   └── package.json
│
├── api/                            # Vercel serverless API functions
├── vercel.json                     # Vercel deployment config + cron jobs
├── package.json                    # Root scripts (dev, build, install-all)
└── README.md
```

---

## Prerequisites

- **Node.js** v16 or higher
- **npm** v8 or higher
- **PostgreSQL** v13 or higher
- Google Cloud account (only if using Google Sheets sync)

---

## Local Setup

### 1. Install Dependencies

```bash
# From the root directory — installs all (root + backend + frontend)
npm run install-all
```

Or manually:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment Variables

See [Environment Variables](#environment-variables) section below.

### 3. Set Up Database

See [Database Setup](#database-setup) section below.

### 4. Run the Application

```bash
# From root — runs backend + frontend concurrently
npm run dev
```

---

## Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
# ── Database ──────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crane_maintenance
DB_USER=postgres
DB_PASSWORD=your_password

# For cloud databases, use this instead of the above:
# DATABASE_URL=postgresql://user:password@host:5432/dbname

# ── Server ────────────────────────────────────────
PORT=5001
NODE_ENV=development

# ── Auth ──────────────────────────────────────────
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# ── CORS ──────────────────────────────────────────
CORS_ORIGIN=http://localhost:3000

# ── Google Sheets (optional) ──────────────────────
GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# ── Telegram Alerts (optional) ────────────────────
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Create a `.env` file inside the `frontend/` folder:

```env
REACT_APP_API_URL=http://localhost:5001/api
```

---

## Database Setup

### 1. Create the Database

```bash
psql -U postgres
```

```sql
CREATE DATABASE crane_maintenance;
\q
```

### 2. Run Migrations

Run all migration files in order:

```bash
cd backend

psql -U postgres -d crane_maintenance -f migrations/000_complete_schema.sql
psql -U postgres -d crane_maintenance -f migrations/008_user_type_and_hbm.sql
psql -U postgres -d crane_maintenance -f migrations/012_hbm_universal_update.sql
psql -U postgres -d crane_maintenance -f migrations/013_rolling_stand.sql
psql -U postgres -d crane_maintenance -f migrations/014_mill_mech.sql
psql -U postgres -d crane_maintenance -f migrations/015_cooling_bed.sql
psql -U postgres -d crane_maintenance -f migrations/016_pumphouse_checksheet.sql
psql -U postgres -d crane_maintenance -f migrations/017_bar_bundle_checksheet.sql
psql -U postgres -d crane_maintenance -f migrations/018_before_rolling_checksheet.sql
psql -U postgres -d crane_maintenance -f migrations/019_telegram_checksheet_subscriptions.sql
psql -U postgres -d crane_maintenance -f migrations/020_hbm_user_permissions.sql
psql -U postgres -d crane_maintenance -f migrations/021_crane_user_permissions.sql
psql -U postgres -d crane_maintenance -f migrations/022_add_off_status.sql
```

### 3. Create First Admin User

Connect to the database and insert an admin user manually:

```sql
INSERT INTO users (username, password_hash, role, user_type)
VALUES (
  'admin',
  '$2b$10$...', -- bcrypt hash of your password
  'ADMIN',
  'ADMIN'
);
```

Or use the backend seed script if available:

```bash
cd backend
node scripts/createAdmin.js
```

### Database Schema — Key Tables

| Table | Purpose |
|---|---|
| `users` | All users (Crane / HBM / Admin) |
| `hbm_user_permissions` | Per-user HBM sheet access |
| `crane_user_permissions` | Per-user crane section access |
| `hbm_dc_motor_logs` / `hbm_dc_motor_items` | DC Motor checksheet data |
| `hbm_rolling_stand_logs` / `hbm_rolling_stand_items` | Rolling Stand data |
| `hbm_mill_mech_logs` / `hbm_mill_mech_items` | Mill Mechanical data |
| `hbm_cooling_bed_logs` / `hbm_cooling_bed_items` | Cooling Bed data |
| `hbm_pumphouse_checksheets` / `hbm_pumphouse_items` | Pumphouse data |
| `hbm_bar_bundle_logs` / `hbm_bar_bundle_items` | Bar Bundle Area data |
| `hbm_before_rolling_logs` / `hbm_before_rolling_items` | Before Rolling data |
| `inspections` / `inspection_values` | Crane inspection forms |
| `cranes` / `sheds` | Crane and shed master data |
| `maintenance_schedule` | Maintenance due tracking |

---

## Running the Application

### Development

```bash
# Root directory — starts both backend and frontend
npm run dev

# Backend only (port 5001)
cd backend && npm run dev

# Frontend only (port 3000)
cd frontend && npm start
```

### Production Build

```bash
# Build React frontend
cd frontend && npm run build

# Start backend in production
cd backend && npm start
```

### Access URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5001/api |
| Health Check | http://localhost:5001/health |

---

## Deployment

### Current Deployment — Local Network (LAN)

The application runs on a local Windows/Linux machine and is accessed by all plant users over the company LAN.

**Backend — PM2:**

```bash
npm install -g pm2

cd backend
pm2 start server.js --name crane-api --env production
pm2 save
pm2 startup
```

**Frontend — Serve build with Nginx or `serve`:**

```bash
cd frontend
npm run build

# Option 1: serve package
npx serve -s build -l 3000

# Option 2: Nginx (Linux)
# Copy build/ to /var/www/html and configure nginx
```

**Nginx config (Linux LAN server):**

```nginx
server {
    listen 80;
    server_name 192.168.x.x;   # your machine IP

    # Serve React frontend
    root /var/www/crane-maintainance/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Express backend
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Users access the app at: `http://192.168.x.x/`

---

### Cloud Deployment — Vercel

The project includes a `vercel.json` for Vercel deployment.

**vercel.json summary:**

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/build",
  "crons": [
    { "path": "/api/cron/maintenance-alert", "schedule": "0 3 * * *" },
    { "path": "/api/cron/daily-summary",     "schedule": "30 12 * * *" }
  ]
}
```

**Deploy steps:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel --prod
```

Set environment variables in Vercel Dashboard → Project → Settings → Environment Variables.

---

## CI/CD Pipeline

**No automated CI/CD pipeline is configured yet.**

Deployments are currently done manually:

1. Pull latest code from Git
2. Run `npm run install-all`
3. Run any new migration files
4. Restart PM2: `pm2 restart crane-api`
5. Rebuild frontend: `cd frontend && npm run build`

### Recommended Future Setup (GitHub Actions)

To add CI/CD, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm run install-all
      - run: cd frontend && npm run build
      - name: Deploy to server
        run: |
          # rsync or SSH deploy steps here
```

---

## Key Features

### Crane Maintenance Module
- Digital daily inspection forms (one crane = one form per day)
- Dropdown-only data entry (no free-text errors)
- Automatic alert detection (rule-based: EQUAL_TO / NOT_EQUAL_TO)
- Maintenance scheduling (Daily / Weekly / Monthly) with DUE / PENDING status
- Export to Excel (.xlsx) and PDF
- Google Sheets auto-sync on every submission
- Maintenance Calendar view
- Telegram notifications for overdue maintenance

### HBM Checksheets Module
- 7 daily checksheets: DC Motor, Rolling Stand, Mill Mechanical, Cooling Bed, Pumphouse, Bar Bundle Area, Before Rolling
- Item status: **OK / NOT OK / OFF** (OFF = machine not in use that day)
- NOT OK requires mandatory Remark + Action Taken
- Per-user sheet access control (admin can restrict which sheets a user sees)
- Download checksheets as PDF/Excel
- History and view of past submissions

### Admin Module
- Create users with role: Crane Maintenance / HBM Checksheets / Admin
- Per-user HBM sheet permissions (toggle individual sheets on/off)
- Per-user crane section permissions
- Change user passwords
- Telegram alert subscriptions management

### Authentication & Access Control
- JWT-based authentication (7-day tokens)
- Three user types: `CRANE_MAINTENANCE`, `HBM_CHECKSHEETS`, `ADMIN`
- Role-based route protection (frontend + backend)
- Session persisted in `localStorage`

---

## Troubleshooting

### Backend won't start
```bash
# Check PostgreSQL is running
pg_ctl status -D /path/to/data

# Check port 5001 is free
netstat -ano | findstr :5001   # Windows
lsof -i :5001                  # Linux/Mac

# Check .env file exists in backend/
ls backend/.env
```

### 403 Forbidden on API calls
- The user's JWT token may be expired — log out and log back in
- Check user role matches the route (Admin-only routes return 403 for non-admin)

### All HBM sheets visible despite permissions set
- Ensure backend was restarted after code changes
- Check that permissions were saved correctly in admin panel (toast "Permissions saved" should appear)
- Verify `hbm_user_permissions` table has the correct row for the user

### Database migration error
```bash
# Check current tables
psql -U postgres -d crane_maintenance -c "\dt"

# Run specific migration manually
psql -U postgres -d crane_maintenance -f backend/migrations/022_add_off_status.sql
```

### Frontend shows blank page
```bash
# Check if build exists
ls frontend/build/

# Rebuild
cd frontend && npm run build

# Check API URL in frontend/.env
cat frontend/.env
```

---

## License

Proprietary — All Rights Reserved  
SRJ Strips and Pipes Pvt Ltd

---

*Last updated: April 2026*
