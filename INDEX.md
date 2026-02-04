# Crane Maintenance Inspection System - Documentation Index

## Welcome!

This is a complete, production-ready web-based Crane Maintenance Inspection Software that replaces handwritten maintenance forms.

---

## Quick Navigation

### 🚀 Getting Started

**New User? Start Here:**
1. [QUICKSTART.md](QUICKSTART.md) - Get running in 10 minutes
2. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Understand what's been built
3. [README.md](README.md) - Complete documentation

### 📚 Documentation Files

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[README.md](README.md)** | Complete system documentation | Full understanding of the system |
| **[QUICKSTART.md](QUICKSTART.md)** | 10-minute setup guide | First-time setup |
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Executive overview & features | Understanding deliverables |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Technical architecture details | Development & customization |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Production deployment guide | Going to production |
| **[API_REFERENCE.md](API_REFERENCE.md)** | Complete API documentation | API integration |
| **[GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)** | Google Sheets integration | Cloud backup setup |

### 📁 Project Structure

```
crane-maintenance/
├── 📄 Documentation (you are here)
│   ├── INDEX.md                    → This file
│   ├── README.md                   → Complete documentation
│   ├── QUICKSTART.md               → 10-minute setup
│   ├── PROJECT_SUMMARY.md          → Executive summary
│   ├── ARCHITECTURE.md             → Technical details
│   ├── DEPLOYMENT.md               → Deployment guide
│   ├── API_REFERENCE.md            → API documentation
│   └── GOOGLE_SHEETS_SETUP.md      → Google Sheets guide
│
├── 🗄️ Database
│   └── database-schema.sql         → PostgreSQL schema
│
├── 🔧 Backend (Node.js + Express)
│   ├── config/                     → Database config
│   ├── controllers/                → Request handlers
│   ├── models/                     → Data access layer
│   ├── routes/                     → API endpoints
│   ├── services/                   → Business logic
│   ├── validators/                 → Input validation
│   ├── server.js                   → Main server
│   └── package.json                → Dependencies
│
├── 🎨 Frontend (React)
│   ├── src/
│   │   ├── components/            → UI components
│   │   ├── services/              → API client
│   │   └── App.js                 → Main app
│   └── package.json               → Dependencies
│
└── 🛠️ Scripts
    ├── setup.sh                    → Linux/Mac setup
    └── setup.bat                   → Windows setup
```

---

## Documentation by Role

### 👨‍💼 For Managers & Decision Makers

**Read These First:**
1. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - What has been built
2. [README.md](README.md) - Features and capabilities
3. [DEPLOYMENT.md](DEPLOYMENT.md) - Production requirements

**Key Points:**
- ✅ Completely replaces handwritten forms
- ✅ Automatic alert detection
- ✅ Maintenance scheduling
- ✅ Excel/PDF/Google Sheets export
- ✅ Production-ready
- ✅ Fully documented

### 👨‍💻 For Developers

**Read These First:**
1. [QUICKSTART.md](QUICKSTART.md) - Get development environment running
2. [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
3. [API_REFERENCE.md](API_REFERENCE.md) - API documentation

**Key Files:**
- `backend/models/` - Database queries
- `backend/controllers/` - Business logic
- `frontend/src/components/` - UI components
- `database-schema.sql` - Database structure

**Development Commands:**
```bash
# Start both backend and frontend
npm run dev

# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm start
```

### 🔧 For System Administrators

**Read These First:**
1. [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
2. [README.md](README.md) - System requirements
3. [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) - Cloud integration

**Key Tasks:**
- Database setup and backups
- Server configuration (nginx, PM2)
- SSL certificate setup
- Google Sheets API configuration
- Monitoring and logging

### 👤 For End Users

**Read These First:**
1. [README.md - User Guide](README.md#user-guide) - How to use the system
2. [QUICKSTART.md](QUICKSTART.md) - First inspection walkthrough

**Main Features:**
- Create inspections (dropdown-only)
- View dashboard
- Export to Excel/PDF
- Maintenance notifications

---

## Common Tasks

### Setting Up for Development

1. **Prerequisites:**
   - Node.js v16+
   - PostgreSQL v13+

2. **Quick Setup:**
   ```bash
   # Windows
   scripts\setup.bat

   # Linux/Mac
   bash scripts/setup.sh
   ```

3. **Manual Setup:**
   - Follow [QUICKSTART.md](QUICKSTART.md)

### Creating Your First Inspection

1. Start the application: `npm run dev`
2. Open browser: http://localhost:3000
3. Click "New Inspection"
4. Fill header (all required)
5. Fill at least one section
6. Submit

See: [QUICKSTART.md - First Inspection](QUICKSTART.md#first-inspection)

### Customizing Inspection Items

All inspection items are in the database and can be modified:

```sql
-- Add new item
INSERT INTO inspection_items (...) VALUES (...);

-- Update dropdown values
UPDATE inspection_items
SET dropdown_values = ARRAY['NEW', 'VALUES']
WHERE item_name = 'Oil Level';
```

See: [README.md - Customize](README.md#customize)

### Setting Up Google Sheets

1. Create Google Cloud Project
2. Enable Google Sheets API
3. Create Service Account
4. Download credentials
5. Configure application

See: [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)

### Deploying to Production

**Options:**
- Manual deployment (Linux server)
- Docker deployment
- Cloud platforms (AWS, GCP)
- Windows Server

See: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Features Overview

### ✅ Core Features

| Feature | Description | Documentation |
|---------|-------------|---------------|
| **Digital Forms** | One crane = one form per day | [README.md](README.md) |
| **Dropdown Data Entry** | Eliminates handwriting errors | [README.md](README.md) |
| **Alert Detection** | Automatic rule-based alerts | [ARCHITECTURE.md](ARCHITECTURE.md) |
| **Maintenance Scheduling** | Daily/Weekly/Monthly tracking | [README.md](README.md) |
| **Excel Export** | Formatted inspection reports | [API_REFERENCE.md](API_REFERENCE.md) |
| **PDF Export** | Professional PDF reports | [API_REFERENCE.md](API_REFERENCE.md) |
| **Google Sheets Sync** | Automatic cloud backup | [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) |
| **Dashboard** | Real-time statistics | [README.md](README.md) |
| **Notifications** | DUE/PENDING maintenance | [README.md](README.md) |

### ✅ Technical Features

- PostgreSQL with ACID compliance
- RESTful API architecture
- React with modern hooks
- Transaction-based operations
- Frontend + Backend validation
- Google Sheets API integration
- Scalable architecture

See: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## API Endpoints

### Quick Reference

```
Inspections:
  POST   /api/inspections              Create
  GET    /api/inspections              List
  GET    /api/inspections/:id          Details
  GET    /api/inspections/:id/export/excel
  GET    /api/inspections/:id/export/pdf
  POST   /api/inspections/:id/sync     Google Sheets

Cranes:
  GET    /api/cranes                   List
  GET    /api/cranes/notifications     DUE/PENDING
  GET    /api/cranes/dashboard/stats   Statistics

Config:
  GET    /api/config/sheds             Sheds
  GET    /api/config/sections          Sections with items
```

See: [API_REFERENCE.md](API_REFERENCE.md)

---

## Troubleshooting

### Common Issues

| Problem | Solution | Documentation |
|---------|----------|---------------|
| Database connection error | Check `.env` password | [QUICKSTART.md](QUICKSTART.md#troubleshooting) |
| Port already in use | Kill process on port | [QUICKSTART.md](QUICKSTART.md#troubleshooting) |
| Google Sheets sync fails | Check credentials | [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md#troubleshooting) |
| Blank frontend page | Check API URL in `.env` | [README.md](README.md#troubleshooting) |
| Validation errors | Review business rules | [ARCHITECTURE.md](ARCHITECTURE.md) |

---

## Database Reference

### Key Tables

| Table | Purpose |
|-------|---------|
| `sheds` | Locations (Shed A, B, C) |
| `cranes` | Crane definitions |
| `inspection_sections` | 7 main sections |
| `inspection_items` | Individual checkpoints |
| `inspections` | Form headers |
| `inspection_values` | Actual data |
| `google_sheets_log` | Sync audit |

See: [ARCHITECTURE.md - Database Design](ARCHITECTURE.md#database-design)

### Sample Queries

```sql
-- View recent inspections
SELECT * FROM v_inspection_summary
ORDER BY inspection_date DESC
LIMIT 10;

-- Check maintenance notifications
SELECT * FROM v_maintenance_notifications;

-- Sync log
SELECT * FROM google_sheets_log
WHERE sync_status = 'FAILED';
```

See: [README.md - Maintenance](README.md#system-maintenance)

---

## Support & Resources

### Getting Help

1. **Documentation Issues:**
   - Check relevant doc file
   - See troubleshooting sections

2. **Technical Issues:**
   - Check logs (backend terminal, browser console)
   - Review database for errors
   - Test API endpoints directly

3. **Database Issues:**
   ```bash
   # Test connection
   psql -U postgres -d crane_maintenance

   # Check data
   SELECT COUNT(*) FROM inspections;
   ```

### External Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Google Sheets API](https://developers.google.com/sheets/api)

---

## Version History

**v1.0.0** (Current)
- ✅ Complete CRUD operations
- ✅ Alert rule engine
- ✅ Maintenance scheduling
- ✅ Excel/PDF export
- ✅ Google Sheets integration
- ✅ Responsive dashboard
- ✅ Complete documentation

---

## Next Steps

### For New Users:
1. ✅ Read [QUICKSTART.md](QUICKSTART.md)
2. ✅ Set up development environment
3. ✅ Create first inspection
4. ✅ Test export features
5. ✅ Set up Google Sheets (optional)

### For Production:
1. ✅ Review [DEPLOYMENT.md](DEPLOYMENT.md)
2. ✅ Set up production server
3. ✅ Configure database backups
4. ✅ Set up SSL certificates
5. ✅ Train users
6. ✅ Go live!

---

## Quick Links

- **Homepage:** [README.md](README.md)
- **Quick Start:** [QUICKSTART.md](QUICKSTART.md)
- **Summary:** [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Deployment:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **API Docs:** [API_REFERENCE.md](API_REFERENCE.md)
- **Google Sheets:** [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)

---

## Contact & Support

For technical support:
- Check documentation first
- Review troubleshooting sections
- Test with sample data
- Contact system administrator

---

**Welcome to the Crane Maintenance Inspection System!**

This is a complete, production-ready solution. All documentation is comprehensive and up-to-date. Choose your path above based on your role and needs.

**Happy inspecting! 🏗️**
