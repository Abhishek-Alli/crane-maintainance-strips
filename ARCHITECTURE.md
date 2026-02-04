# System Architecture Documentation

## Crane Maintenance Inspection System

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Decisions](#technology-decisions)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Frontend Architecture](#frontend-architecture)
7. [Business Logic Implementation](#business-logic-implementation)
8. [Security Architecture](#security-architecture)
9. [Scalability Design](#scalability-design)
10. [Integration Points](#integration-points)

---

## System Overview

### Purpose
Replace handwritten crane maintenance forms with a digital solution that enforces business rules, automatically detects alerts, schedules maintenance, and exports data to multiple formats.

### Key Characteristics
- **Data Integrity**: PostgreSQL with strict constraints
- **Rule-Based**: All validation and alert logic driven by database configuration
- **Export-Friendly**: Excel, PDF, and Google Sheets integration
- **Maintainable**: Clean separation of concerns, modular design

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  React Application (Port 3000)                            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │    │
│  │  │Dashboard │  │Inspection│  │ Config   │               │    │
│  │  │Component │  │  Form    │  │  Admin   │               │    │
│  │  └──────────┘  └──────────┘  └──────────┘               │    │
│  │                                                           │    │
│  │  State Management: React Hooks + Context                 │    │
│  │  Styling: Tailwind CSS                                   │    │
│  │  Forms: React Hook Form + Validation                     │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────┬───────────────────────────────────────────┘
                        │ HTTP/REST (Axios)
                        │
┌───────────────────────┴───────────────────────────────────────────┐
│                      APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Express.js Server (Port 5000)                            │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │  Middleware Stack                                 │    │    │
│  │  │  • CORS                                           │    │    │
│  │  │  • Helmet (Security)                              │    │    │
│  │  │  • Compression                                    │    │    │
│  │  │  • Body Parser                                    │    │    │
│  │  │  • Morgan (Logging)                               │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  │                                                           │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │  Routes Layer                                     │    │    │
│  │  │  • /api/inspections                               │    │    │
│  │  │  • /api/cranes                                    │    │    │
│  │  │  • /api/config                                    │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  │            ↓                                              │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │  Validation Layer (express-validator)            │    │    │
│  │  │  • Request validation                             │    │    │
│  │  │  • Custom validators                              │    │    │
│  │  │  • Business rule enforcement                      │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  │            ↓                                              │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │  Controllers                                      │    │    │
│  │  │  • InspectionController                           │    │    │
│  │  │  • CraneController                                │    │    │
│  │  │  • ConfigController                               │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  │            ↓                                              │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │  Models (Data Access Layer)                      │    │    │
│  │  │  • Inspection.js                                  │    │    │
│  │  │  • Crane.js                                       │    │    │
│  │  │  • InspectionConfig.js                            │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  │            ↓                                              │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │  Services (Business Logic)                        │    │    │
│  │  │  • ExcelService    (Excel generation)            │    │    │
│  │  │  • PDFService      (PDF generation)              │    │    │
│  │  │  • GoogleSheetsService (Sync to Sheets)          │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────┬───────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │Google Sheets │ │ File System  │
│   Database   │ │     API      │ │(Excel/PDF)   │
│              │ │              │ │              │
│ • Master     │ │ • Auto-sync  │ │ • Temp files │
│   Tables     │ │ • Audit log  │ │ • Downloads  │
│ • Transaction│ │ • Backup     │ │              │
│   Tables     │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## Technology Decisions

### Why PostgreSQL?
1. **ACID Compliance**: Critical for inspection data integrity
2. **Referential Integrity**: Foreign keys prevent orphaned data
3. **Array Types**: Store dropdown values efficiently
4. **ENUM Types**: Type-safe status fields
5. **Complex Queries**: Joins, aggregations for reporting
6. **Mature Ecosystem**: Battle-tested, well-documented

### Why React?
1. **Component Reusability**: Inspection sections are repetitive
2. **Virtual DOM**: Efficient re-renders for large forms
3. **Ecosystem**: Rich library support (forms, dates, validation)
4. **Developer Experience**: Fast development with modern tooling
5. **Community**: Large community, extensive resources

### Why Express.js?
1. **Simplicity**: Minimal overhead, easy to understand
2. **Middleware**: Flexible request pipeline
3. **REST API**: Standard HTTP methods and status codes
4. **Performance**: Fast, non-blocking I/O
5. **Ecosystem**: Huge npm package ecosystem

### Why Not MongoDB?
- Inspection data is highly relational (cranes → inspections → values)
- Need strict schema validation
- Require complex joins for reporting
- Foreign key constraints critical

### Why Not GraphQL?
- Simple REST API sufficient for requirements
- No need for flexible querying on client
- Easier to cache and optimize
- Less complexity

---

## Database Design

### Design Principles

1. **Normalization**: 3NF to eliminate redundancy
2. **Constraints**: Enforce business rules at database level
3. **Indexes**: Optimize frequent queries
4. **Enums**: Type-safe status fields
5. **Soft Deletes**: `is_active` flag for audit trail

### Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐
│    sheds    │────┬───→│   cranes    │
└─────────────┘    │    └─────────────┘
                   │           │
                   │           │ (1:N)
                   │           ↓
                   │    ┌─────────────────┐
                   └───→│  inspections    │
                        └─────────────────┘
                               │
                               │ (1:N)
                               ↓
                        ┌─────────────────┐
                        │inspection_values│
                        └─────────────────┘
                               │
                               │ (N:1)
                               ↓
       ┌────────────────┐      │      ┌──────────────────┐
       │inspection_     │←─────┘      │ inspection_items │
       │  sections      │──────────────┤                  │
       └────────────────┘   (1:N)     └──────────────────┘
```

### Key Tables

**Master Data:**
- `sheds`: Locations (Shed A, B, C)
- `inspection_sections`: 7 main sections
- `inspection_items`: Individual checkpoints with rules
- `cranes`: Crane definitions

**Transactional:**
- `inspections`: Form headers (date, crane, recorded by)
- `inspection_values`: Actual inspection data
- `maintenance_schedule`: Due date tracking
- `google_sheets_log`: Sync audit trail

### Critical Constraints

```sql
-- One inspection per crane per day
UNIQUE(crane_id, inspection_date) ON inspections

-- One value per item per inspection
UNIQUE(inspection_id, item_id) ON inspection_values

-- Crane number unique per shed
UNIQUE(shed_id, crane_number) ON cranes

-- Section and item names unique
UNIQUE(name) ON inspection_sections
UNIQUE(section_id, item_name) ON inspection_items
```

---

## API Design

### RESTful Principles

**Resource-Based URLs:**
```
/api/inspections
/api/cranes
/api/config
```

**HTTP Methods:**
- `GET`: Retrieve resources
- `POST`: Create resources
- `PUT`: Update resources
- `DELETE`: Delete resources

**Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad request (validation error)
- `404`: Not found
- `500`: Server error

### Request/Response Format

**Standard Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Standard Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "shed_id",
      "message": "Shed is required"
    }
  ]
}
```

### Validation Pipeline

```
Request
   ↓
express-validator (schema validation)
   ↓
Custom validators (business rules)
   ↓
Controller (business logic)
   ↓
Model (database operations)
   ↓
Response
```

### Example: Create Inspection Flow

```javascript
1. Request arrives: POST /api/inspections
   ↓
2. Middleware validates:
   - Header fields present
   - Date format valid
   - Shed/Crane IDs exist
   ↓
3. Custom validators check:
   - No duplicate inspection (crane + date)
   - Dropdown values allowed
   - Section completeness rules
   ↓
4. Controller processes:
   - Start database transaction
   - Insert inspection header
   - Insert inspection values
   - Check alert conditions
   - Update crane status
   - Calculate next maintenance date
   - Commit transaction
   ↓
5. Service layer (async):
   - Sync to Google Sheets
   - Log sync status
   ↓
6. Response: 201 Created
```

---

## Frontend Architecture

### Component Hierarchy

```
App
├── Dashboard
│   ├── StatisticsCards
│   ├── NotificationsTable
│   └── RecentInspectionsTable
│
└── InspectionForm
    ├── FormHeader
    │   ├── DatePicker
    │   ├── TextInput (Recorded By)
    │   ├── ShedDropdown
    │   └── CraneDropdown
    │
    └── InspectionSections (dynamic)
        └── InspectionItem (repeatable)
            ├── ItemDropdown
            └── RemarksInput
```

### State Management

**Local State (useState):**
- Form input values
- Loading states
- Alert preview

**Remote State (API calls):**
- Sheds list
- Cranes list (filtered by shed)
- Sections with items configuration

**Form State (React Hook Form):**
- Header field validation
- Form submission handling
- Error messages

### Validation Strategy

**Client-Side:**
```javascript
// Header validation
- All fields required
- Date not in future
- Shed and crane selected

// Section validation
- If ANY field in section filled
  → All COMPULSORY fields required

// Dropdown validation
- Selected value in allowed values array
```

**Server-Side:**
```javascript
// Identical rules enforced
// Additional checks:
- Database constraints
- Race conditions
- Data integrity
```

### Data Flow

```
User Input
   ↓
React Hook Form
   ↓
Client Validation
   ↓
API Call (Axios)
   ↓
Server Validation
   ↓
Database Transaction
   ↓
Response
   ↓
UI Update + Toast Notification
```

---

## Business Logic Implementation

### Alert Rule Engine

**Logic:**
```javascript
For each inspection_item:
  IF alert_condition = 'EQUAL_TO'
    AND selected_value = alert_value
    → is_alert = TRUE

  IF alert_condition = 'NOT_EQUAL_TO'
    AND selected_value ≠ alert_value
    → is_alert = TRUE

  ELSE
    → is_alert = FALSE
```

**Implementation:**
```javascript
// Backend: models/Inspection.js
const { alert_condition, alert_value } = itemConfig;
let isAlert = false;

if (alert_condition === 'EQUAL_TO' &&
    selected_value === alert_value) {
  isAlert = true;
  hasAlerts = true;
} else if (alert_condition === 'NOT_EQUAL_TO' &&
           selected_value !== alert_value) {
  isAlert = true;
  hasAlerts = true;
}
```

### Maintenance Scheduling

**Next Maintenance Date Calculation:**
```javascript
// Backend: models/Inspection.js
const frequency = crane.maintenance_frequency;
const inspectionDate = new Date(inspection_date);

let nextMaintenanceDate;

switch (frequency) {
  case 'DAILY':
    nextMaintenanceDate = addDays(inspectionDate, 1);
    break;
  case 'WEEKLY':
    nextMaintenanceDate = addDays(inspectionDate, 7);
    break;
  case 'MONTHLY':
    nextMaintenanceDate = addMonths(inspectionDate, 1);
    break;
}

// Update crane
UPDATE cranes
SET next_maintenance_date = nextMaintenanceDate
WHERE id = crane_id;
```

**Status Check (Daily Cron Job):**
```javascript
// Backend: models/Crane.js
UPDATE cranes
SET current_maintenance_status =
  CASE
    WHEN CURRENT_DATE > next_maintenance_date THEN 'PENDING'
    WHEN CURRENT_DATE = next_maintenance_date THEN 'DUE'
    ELSE 'OK'
  END
WHERE next_maintenance_date IS NOT NULL;
```

### Section Completeness Validation

**Rule:**
> If ANY field in a section has a value, ALL COMPULSORY fields in that section must be filled.

**Implementation:**
```javascript
// Backend: validators/inspectionValidator.js
for (const section of sections) {
  const hasAnyValue = section.items.some(
    item => item.selected_value
  );

  if (hasAnyValue) {
    const compulsoryItems = sectionConfig.items.filter(
      item => item.compulsory === 'COMPULSORY'
    );

    for (const compulsoryItem of compulsoryItems) {
      const submittedItem = section.items.find(
        item => item.item_id === compulsoryItem.id
      );

      if (!submittedItem || !submittedItem.selected_value) {
        return error; // Missing compulsory field
      }
    }
  }
}
```

---

## Security Architecture

### Input Validation
1. **Type Checking**: express-validator ensures correct types
2. **Length Limits**: Prevent buffer overflow attacks
3. **Whitelist**: Dropdown values from database only
4. **SQL Injection**: Parameterized queries via pg library

### Authentication (Future)
- JWT tokens for API authentication
- Role-based access control (RBAC)
- Session management

### Database Security
- Least privilege: App user has minimal permissions
- No direct database access from frontend
- Connection pooling with limits
- Prepared statements prevent SQL injection

### CORS Configuration
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
```

### Helmet.js
Adds security headers:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security

---

## Scalability Design

### Current Architecture (Single Server)
```
Load: ~100 concurrent users
Database: PostgreSQL (single instance)
Backend: Node.js (single process)
```

### Scaling Strategy

**Phase 1: Vertical Scaling (0-500 users)**
- Increase server resources (CPU, RAM)
- Upgrade database instance
- Add indexes for slow queries

**Phase 2: Horizontal Scaling (500-5000 users)**
```
┌─────────────┐
│Load Balancer│
└──────┬──────┘
       │
   ┌───┴───┬───────┐
   ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐
│API-1│ │API-2│ │API-3│
└─────┘ └─────┘ └─────┘
   │       │       │
   └───┬───┴───┬───┘
       ▼       ▼
    ┌──────┐ ┌──────┐
    │Master│ │Replica│
    │  DB  │ │  DB  │
    └──────┘ └──────┘
```

**Phase 3: Advanced Scaling (5000+ users)**
- Redis for session/cache
- CDN for frontend assets
- Database sharding by shed
- Read replicas for reporting
- Microservices (inspection, export, scheduling)

### Performance Optimizations

**Database:**
- Indexes on foreign keys (already done)
- Connection pooling (already implemented)
- Query optimization (EXPLAIN ANALYZE)
- Materialized views for complex reports

**API:**
- Response compression (already enabled)
- Rate limiting (add express-rate-limit)
- Caching (Redis for config data)
- Pagination for large result sets

**Frontend:**
- Code splitting
- Lazy loading components
- Image optimization
- Service worker for offline capability

---

## Integration Points

### Google Sheets API

**Authentication:**
- Service Account credentials (JSON key file)
- OAuth 2.0 scopes: `spreadsheets`

**Operations:**
1. Check if sheet exists → Create if not
2. Check for header row → Add if missing
3. Append inspection data rows
4. Log sync status to database

**Rate Limits:**
- 100 requests per 100 seconds per user
- Implement exponential backoff for retries

**Error Handling:**
```javascript
try {
  await GoogleSheetsService.syncInspection(id);
} catch (error) {
  // Log to google_sheets_log
  // Alert admin if repeated failures
  // Don't block inspection creation
}
```

### Export Services

**Excel Export (ExcelJS):**
- In-memory workbook generation
- Styled headers and cells
- Alert rows highlighted in orange
- Auto-filter enabled
- Frozen header row

**PDF Export (PDFKit):**
- Custom layout with company branding (optional)
- Section headers with color coding
- Alert highlighting
- Page numbers
- Multiple pages support

**File Download:**
```javascript
res.setHeader('Content-Type', 'application/...');
res.setHeader('Content-Disposition', 'attachment; filename="..."');
res.send(buffer);
```

---

## Error Handling Strategy

### Layers

**Frontend:**
```javascript
try {
  await api.create(data);
  toast.success('Created');
} catch (error) {
  toast.error(error.message);
}
```

**Backend:**
```javascript
try {
  const result = await Model.create(data);
  res.json({ success: true, data: result });
} catch (error) {
  console.error(error);
  res.status(500).json({
    success: false,
    message: error.message
  });
}
```

**Database:**
```javascript
try {
  await client.query('BEGIN');
  // operations
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
```

---

## Testing Strategy (Recommended)

### Unit Tests
- Models: CRUD operations
- Validators: Business rule enforcement
- Services: Export functions

### Integration Tests
- API endpoints
- Database transactions
- Google Sheets sync

### End-to-End Tests
- Complete inspection flow
- Dashboard loading
- Export downloads

### Tools
- **Jest**: Unit testing
- **Supertest**: API testing
- **Cypress**: E2E testing

---

## Monitoring & Logging

### Application Logs
```javascript
// Winston logger (recommended)
logger.info('Inspection created', { inspectionId, craneId });
logger.error('Database error', { error, query });
```

### Metrics to Track
- API response times
- Database query performance
- Google Sheets sync success rate
- Error rates by endpoint
- Active users count

### Tools
- **PM2**: Process monitoring
- **Grafana**: Metrics visualization
- **Sentry**: Error tracking
- **Datadog/New Relic**: APM

---

## Future Enhancements

### Phase 1 (Short-term)
- [ ] User authentication and authorization
- [ ] Mobile responsive improvements
- [ ] Offline capability (PWA)
- [ ] Advanced search and filters

### Phase 2 (Mid-term)
- [ ] Email notifications for due maintenance
- [ ] Automated reports (daily/weekly/monthly)
- [ ] Photo upload for inspection items
- [ ] Digital signatures

### Phase 3 (Long-term)
- [ ] Mobile native apps (iOS/Android)
- [ ] AI-powered anomaly detection
- [ ] Predictive maintenance analytics
- [ ] IoT sensor integration

---

**End of Architecture Documentation**
