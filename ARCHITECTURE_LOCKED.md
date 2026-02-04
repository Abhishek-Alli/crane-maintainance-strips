# CRANE MAINTENANCE INSPECTION SYSTEM - V3 LOCKED ARCHITECTURE

> **DOCUMENT STATUS: LOCKED - DO NOT MODIFY WITHOUT AUTHORIZATION**
>
> **Version:** 3.0.0
> **Last Updated:** 2026-01-22
> **Architecture Type:** Google Sheets as Single Source of Truth

---

## ABSOLUTE DATA STORAGE RULE (NON-NEGOTIABLE)

### What MUST be stored in DATABASE:
- Login & authentication
- Admin user management
- Roles & permissions
- Form builder & form configuration
- User -> Crane -> Form assignment
- Shed / Crane master metadata (NO inspection values)
- Audit trail (submission_log) - REFERENCES ONLY

### What MUST be stored in GOOGLE SHEETS:
- ALL inspection values
- ALL inspection results
- ALL alert statuses
- ALL maintenance dates
- ALL remarks
- ALL start/stop maintenance times

### What MUST NEVER be in DATABASE:
- Inspection values
- Inspection results
- Alert statuses (except cached in audit trail)
- Maintenance dates (actual values)
- Remarks from inspections
- Start / Stop maintenance times

---

## GOOGLE SHEETS = OFFICIAL REGISTER

Google Sheets workbook is the **SINGLE SOURCE OF TRUTH** for crane maintenance records.

- Each crane/form combination has its own sheet (tab)
- Each inspection item = ONE ROW
- Sheet is treated as a digital maintenance register
- All exports (Excel, PDF) read from Google Sheets

---

## FIXED SHEET HEADERS (MANDATORY)

Every sheet must contain these headers in ROW 1, in this exact order:

| Column | Header Name | Description |
|--------|-------------|-------------|
| A | Inspection Date | Date of inspection (YYYY-MM-DD) |
| B | Shed | Shed/location name |
| C | Crane No | Crane identification number |
| D | Form Name | Name of inspection form used |
| E | Section Name | Section within the form |
| F | Item Name | Specific item inspected |
| G | Selected Value | Value selected from dropdown |
| H | Item Status | OK / ATTENTION REQUIRED |
| I | Recorded By | Name of operator |
| J | Crane Status | OK / MAINTENANCE REQUIRED |
| K | Next Maintenance Date | Calculated next maintenance |
| L | Remarks | Optional remarks |
| M | Maintenance Start Time | Optional start time |
| N | Maintenance Stop Time | Optional stop time |
| O | Created At | Timestamp of submission |

---

## SHEET CREATION RULE

When Admin:
- Creates a new crane, OR
- Assigns a new form to a crane

System must:
1. Automatically create a new SHEET (tab) in the existing workbook
2. Name format: `{CRANE_NO}_{FORM_NAME}` (special chars removed)
3. Initialize fixed headers in Row 1
4. Freeze header row
5. Enable auto-filters
6. Prevent duplicate sheet creation

---

## SUBMISSION FLOW (STRICT)

```
+-------------------+
| 1. USER SUBMITS   |
| INSPECTION FORM   |
+--------+----------+
         |
         v
+--------+----------+
| 2. AUTHENTICATE   |<---- DATABASE
| USER              |
+--------+----------+
         |
         v
+--------+----------+
| 3. CHECK          |<---- DATABASE
| PERMISSIONS       |
+--------+----------+
         |
         v
+--------+----------+
| 4. LOAD FORM      |<---- DATABASE
| DEFINITION        |
+--------+----------+
         |
         v
+--------+----------+
| 5. VALIDATE:      |
| - Mandatory fields|
| - Section complete|
| - Alert logic     |
+--------+----------+
         |
         v
+--------+----------+
| 6. CHECK DUPLICATE|<---- GOOGLE SHEETS
| IN SHEET          |      (SOURCE OF TRUTH)
+--------+----------+
         |
    [Duplicate?]
    /        \
   YES        NO
    |          |
    v          v
+-------+  +--------+----------+
| BLOCK |  | 7. CALCULATE:     |
| ERROR |  | - Alert status    |
+-------+  | - Crane status    |
           | - Next maint date |
           +--------+----------+
                    |
                    v
           +--------+----------+
           | 8. WRITE TO       |----> GOOGLE SHEETS
           | GOOGLE SHEETS     |      (PRIMARY STORAGE)
           +--------+----------+
                    |
               [Success?]
               /        \
              NO        YES
               |          |
               v          v
           +-------+  +--------+----------+
           | REJECT|  | 9. LOG AUDIT      |----> DATABASE
           | FULLY |  | TRAIL (OPTIONAL)  |      (REFERENCE ONLY)
           +-------+  +--------+----------+
                               |
                               v
                      +--------+----------+
                      | 10. RETURN SUCCESS|
                      +-------------------+
```

### Critical Points:
- Step 6: Duplicate check reads from Google Sheets (source of truth)
- Step 8: If Google Sheets write FAILS -> Reject submission completely
- Step 9: Audit trail is optional - failure here doesn't reject submission
- Data is NEVER written to database inspection tables

---

## DATABASE SCHEMA

### Tables for Auth & Admin:

```sql
-- Configuration
google_sheets_config    -- Spreadsheet ID, credentials path

-- Master Data
sheds                   -- Shed/location definitions (metadata only)
cranes                  -- Crane definitions (metadata only, NO status)

-- User Management
roles                   -- SUPER_ADMIN, ADMIN, OPERATOR, VIEW_ONLY
users                   -- User accounts
user_shed_access        -- Which sheds user can access
user_crane_access       -- Which cranes user can access

-- Form Builder
forms                   -- Form definitions
form_sections           -- Sections within forms
form_items              -- Fields within sections (config only)
crane_form_assignments  -- Crane-to-form mapping (auto-creates sheet)

-- Audit Trail (References Only)
submission_log          -- Points to Google Sheets rows, cached status
```

### Tables NOT in Database:

```sql
-- THESE DO NOT EXIST (by design)
inspections             -- DELETED/REMOVED
inspection_values       -- DELETED/REMOVED
```

---

## EXPORT RULES

### Excel Export:
- Source: Google Sheets
- Method: Read from specific sheet, format with ExcelJS
- Database: NOT used for data

### PDF Export:
- Source: Google Sheets
- Method: Read from specific sheet, format with PDFKit
- Database: NOT used for data

---

## SECURITY RULES

1. **Service Account Access**
   - Google Sheet is writable ONLY by Service Account
   - Operators NEVER get direct sheet access
   - All writes go through backend validation

2. **API Security**
   - All endpoints require JWT authentication
   - Role-based access control enforced
   - Operators can only access assigned cranes

3. **Data Validation**
   - All inputs validated before Google Sheets write
   - Section completeness enforced
   - Alert rules applied before storage

---

## MOBILE-FIRST UI REQUIREMENTS

The frontend must follow these design principles:

1. **Large Touch Targets**
   - Minimum 44px height for all inputs
   - py-3 (12px) padding on form controls

2. **Accordion-Style Sections**
   - Sections collapse/expand on tap
   - Visual indicator of filled items per section
   - First section expanded by default

3. **Sticky Submit Button**
   - Fixed at bottom of screen
   - Always visible while scrolling
   - Reset and Submit side by side

4. **Fast and Minimal UI**
   - No unnecessary animations
   - Instant feedback on interactions
   - Clear loading states

---

## FILE STRUCTURE

```
crane-maintainance/
├── backend/
│   ├── config/
│   │   └── database.js              # PostgreSQL connection
│   ├── controllers/
│   │   ├── authController.js        # Login, authentication
│   │   ├── inspectionController-v3.js  # Google Sheets only
│   │   ├── craneController.js       # Crane master data
│   │   ├── craneFormController.js   # Crane-form assignments
│   │   ├── formController.js        # Form builder
│   │   └── userController.js        # User management
│   ├── middleware/
│   │   └── auth.js                  # JWT verification
│   ├── models/
│   │   ├── Inspection.js            # Config lookup, audit trail ONLY
│   │   ├── Crane.js                 # Crane master data
│   │   └── InspectionConfig.js      # Form configuration
│   ├── routes/
│   │   └── inspectionRoutes-v3.js   # V3 routes
│   ├── services/
│   │   └── googleSheetManagerService.js  # ALL Google Sheets operations
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── InspectionForm.jsx   # Mobile-first form
│   │   │   ├── Dashboard.jsx        # Stats from audit trail
│   │   │   └── Login.jsx
│   │   ├── services/
│   │   │   └── api.js               # API client
│   │   └── App.js
├── gsheet/
│   └── *.json                       # Service account credentials
├── database-schema-LOCKED.sql       # Locked schema
└── ARCHITECTURE_LOCKED.md           # This document
```

---

## API ENDPOINTS

### Inspection Endpoints (Google Sheets):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/inspections | Create inspection (writes to Sheets) |
| GET | /api/inspections | Get recent (from audit trail) |
| GET | /api/inspections/sheets | List all sheets in workbook |
| GET | /api/inspections/:crane/:form | Get from specific sheet |
| GET | /api/inspections/:crane/:form/:date | Get specific inspection |
| GET | /api/inspections/:crane/:form/:date/export/excel | Export from Sheets |
| GET | /api/inspections/:crane/:form/:date/export/pdf | Export from Sheets |
| GET | /api/inspections/dashboard/stats | Stats from Sheets |
| GET | /api/inspections/test-connection | Test Sheets connection |

### Auth Endpoints (Database):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| GET | /api/auth/profile | Get current user |

### Admin Endpoints (Database):

| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | /api/users | User management |
| CRUD | /api/cranes | Crane master data |
| CRUD | /api/forms | Form builder |
| CRUD | /api/crane-forms | Crane-form assignments |
| GET | /api/config/sheds | Get sheds |
| GET | /api/config/sections | Get form sections |

---

## CHANGE LOG

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | 2026-01-22 | LOCKED: Google Sheets as single source of truth |

---

## APPROVAL

This architecture is **LOCKED** and represents the official design for the Crane Maintenance Inspection System.

**Rules for modification:**
1. NO inspection data in database
2. ALL inspection data in Google Sheets
3. Exports ONLY from Google Sheets
4. Mobile-first UI required

---

*Document generated by Claude Code - Architecture Refactoring*
