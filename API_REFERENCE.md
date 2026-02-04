# API Reference

Complete REST API documentation for the Crane Maintenance Inspection System.

**Base URL:** `http://localhost:5000/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Error Codes](#error-codes)
4. [Inspections API](#inspections-api)
5. [Cranes API](#cranes-api)
6. [Configuration API](#configuration-api)
7. [Examples](#examples)

---

## Authentication

Currently, the API does not require authentication. For production deployment, implement JWT-based authentication.

**Future Implementation:**
```http
Authorization: Bearer <token>
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "count": 10  // For list endpoints
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Error message"
    }
  ]
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (validation error) |
| 404  | Not Found |
| 500  | Internal Server Error |

---

## Inspections API

### Create Inspection

Create a new crane inspection.

**Endpoint:** `POST /inspections`

**Request Body:**
```json
{
  "inspection_date": "2024-01-15",
  "recorded_by": "John Doe",
  "shed_id": 1,
  "crane_id": 1,
  "maintenance_start_time": "09:00",
  "maintenance_stop_time": "10:30",
  "remarks": "General inspection remarks",
  "sections": [
    {
      "section_id": 1,
      "items": [
        {
          "item_id": 1,
          "selected_value": "NORMAL",
          "remarks": "Item-specific remarks"
        },
        {
          "item_id": 2,
          "selected_value": "NO",
          "remarks": null
        }
      ]
    }
  ]
}
```

**Validation Rules:**
- `inspection_date`: Required, valid date, not in future
- `recorded_by`: Required, 2-200 characters
- `shed_id`: Required, must exist in database
- `crane_id`: Required, must exist in database
- `maintenance_start_time`: Optional, format HH:MM
- `maintenance_stop_time`: Optional, format HH:MM
- `remarks`: Optional
- `sections`: Required, at least one section
- `sections[].section_id`: Required, must exist
- `sections[].items[].item_id`: Required, must exist
- `sections[].items[].selected_value`: Must be in allowed dropdown values
- **Section completeness**: If any item in section has value, all COMPULSORY items required

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Inspection created successfully",
  "data": {
    "id": 1,
    "inspection_date": "2024-01-15",
    "crane_id": 1,
    "shed_id": 1,
    "recorded_by": "John Doe",
    "crane_status": "OK",
    "has_alerts": false,
    "maintenance_start_time": "09:00",
    "maintenance_stop_time": "10:30",
    "remarks": "General inspection remarks",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

Duplicate inspection:
```json
{
  "success": false,
  "message": "Inspection already exists for this crane on 2024-01-15. Only one inspection per crane per day is allowed."
}
```

Invalid dropdown value:
```json
{
  "success": false,
  "message": "Invalid value \"INVALID\" for item \"Oil Level\". Allowed values: HIGH, NORMAL, LOW",
  "field": "Oil Level",
  "section": 1
}
```

Missing compulsory field:
```json
{
  "success": false,
  "message": "Section \"LT Gear Box – 1 (Cabin Side)\" has values but missing compulsory field: \"Noise\"",
  "field": "Noise",
  "section": "LT Gear Box – 1 (Cabin Side)"
}
```

---

### Get All Inspections

Retrieve list of inspections with optional filters.

**Endpoint:** `GET /inspections`

**Query Parameters:**
- `crane_id` (integer, optional): Filter by crane
- `shed_id` (integer, optional): Filter by shed
- `from_date` (date, optional): Filter from date (YYYY-MM-DD)
- `to_date` (date, optional): Filter to date (YYYY-MM-DD)
- `has_alerts` (boolean, optional): Filter by alert status

**Example:**
```http
GET /inspections?crane_id=1&from_date=2024-01-01&to_date=2024-01-31
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "inspection_date": "2024-01-15",
      "crane_id": 1,
      "shed_id": 1,
      "shed_name": "Shed A",
      "crane_number": "CR-A-001",
      "recorded_by": "John Doe",
      "crane_status": "OK",
      "has_alerts": false,
      "items_checked": 6,
      "alert_count": 0,
      "maintenance_start_time": "09:00",
      "maintenance_stop_time": "10:30",
      "remarks": "General remarks",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Get Inspection by ID

Retrieve detailed inspection data including all values.

**Endpoint:** `GET /inspections/:id`

**Example:**
```http
GET /inspections/1
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "inspection_date": "2024-01-15",
    "crane_id": 1,
    "shed_id": 1,
    "shed_name": "Shed A",
    "crane_number": "CR-A-001",
    "maintenance_frequency": "DAILY",
    "recorded_by": "John Doe",
    "crane_status": "OK",
    "has_alerts": false,
    "maintenance_start_time": "09:00",
    "maintenance_stop_time": "10:30",
    "remarks": "General remarks",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "values": [
      {
        "id": 1,
        "inspection_id": 1,
        "section_id": 1,
        "item_id": 1,
        "section_name": "LT Gear Box – 1 (Cabin Side)",
        "item_name": "Oil Level",
        "selected_value": "NORMAL",
        "is_alert": false,
        "remarks": null,
        "dropdown_values": ["HIGH", "NORMAL", "LOW"],
        "alert_condition": "EQUAL_TO",
        "alert_value": "LOW",
        "created_at": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "message": "Inspection not found"
}
```

---

### Export to Excel

Download inspection data as Excel file.

**Endpoint:** `GET /inspections/:id/export/excel`

**Example:**
```http
GET /inspections/1/export/excel
```

**Response:** Binary file download

**Headers:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="Inspection_CR-A-001_2024-01-15.xlsx"
```

**Excel Structure:**
- One row per inspection item
- Columns: Date, Shed, Crane No, Section Name, Inspection Item, Selected Value, Status, Recorded By, Remarks, Maintenance Start Time, Maintenance Stop Time, Crane Status, Next Maintenance Date
- Alert rows highlighted in orange
- Auto-filter enabled
- Professional formatting

---

### Export to PDF

Download inspection report as PDF file.

**Endpoint:** `GET /inspections/:id/export/pdf`

**Example:**
```http
GET /inspections/1/export/pdf
```

**Response:** Binary file download

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Inspection_CR-A-001_2024-01-15.pdf"
```

**PDF Structure:**
- Header with inspection details
- Sections grouped
- Alerts highlighted
- Professional layout
- Page numbers

---

### Sync to Google Sheets

Manually trigger Google Sheets synchronization.

**Endpoint:** `POST /inspections/:id/sync`

**Example:**
```http
POST /inspections/1/sync
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Inspection synced to Google Sheets successfully"
}
```

**Error Response:** `500 Internal Server Error`
```json
{
  "success": false,
  "message": "Failed to sync to Google Sheets",
  "error": "The caller does not have permission"
}
```

---

## Cranes API

### Get All Cranes

Retrieve list of all cranes.

**Endpoint:** `GET /cranes`

**Query Parameters:**
- `shed_id` (integer, optional): Filter by shed

**Example:**
```http
GET /cranes?shed_id=1
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "shed_id": 1,
      "crane_number": "CR-A-001",
      "maintenance_frequency": "DAILY",
      "last_inspection_date": "2024-01-15",
      "next_maintenance_date": "2024-01-16",
      "current_status": "OK",
      "current_maintenance_status": "OK",
      "is_active": true,
      "shed_name": "Shed A",
      "shed_code": "SHA",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Get Crane by ID

Retrieve single crane details.

**Endpoint:** `GET /cranes/:id`

**Example:**
```http
GET /cranes/1
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "shed_id": 1,
    "crane_number": "CR-A-001",
    "maintenance_frequency": "DAILY",
    "last_inspection_date": "2024-01-15",
    "next_maintenance_date": "2024-01-16",
    "current_status": "OK",
    "current_maintenance_status": "OK",
    "is_active": true,
    "shed_name": "Shed A",
    "shed_code": "SHA",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Get Cranes by Shed

Retrieve cranes for specific shed.

**Endpoint:** `GET /cranes/shed/:shed_id`

**Example:**
```http
GET /cranes/shed/1
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "shed_id": 1,
      "crane_number": "CR-A-001",
      "maintenance_frequency": "DAILY",
      "last_inspection_date": "2024-01-15",
      "next_maintenance_date": "2024-01-16",
      "current_status": "OK",
      "current_maintenance_status": "OK",
      "is_active": true,
      "shed_name": "Shed A",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Get Maintenance Notifications

Retrieve cranes with DUE or PENDING maintenance.

**Endpoint:** `GET /cranes/notifications`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "crane_id": 2,
      "shed_name": "Shed A",
      "crane_number": "CR-A-002",
      "maintenance_frequency": "DAILY",
      "last_inspection_date": "2024-01-10",
      "next_maintenance_date": "2024-01-11",
      "current_status": "MAINTENANCE_REQUIRED",
      "notification_status": "PENDING",
      "days_overdue": 4
    },
    {
      "crane_id": 3,
      "shed_name": "Shed B",
      "crane_number": "CR-B-001",
      "maintenance_frequency": "WEEKLY",
      "last_inspection_date": "2024-01-08",
      "next_maintenance_date": "2024-01-15",
      "current_status": "OK",
      "notification_status": "DUE",
      "days_overdue": 0
    }
  ],
  "count": 2
}
```

---

### Get Dashboard Statistics

Retrieve dashboard statistics.

**Endpoint:** `GET /cranes/dashboard/stats`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_cranes": 6,
    "cranes_ok": 4,
    "cranes_maintenance_required": 2,
    "maintenance_due_today": 1,
    "maintenance_pending": 1
  }
}
```

---

### Create Crane

Create new crane.

**Endpoint:** `POST /cranes`

**Request Body:**
```json
{
  "shed_id": 1,
  "crane_number": "CR-A-003",
  "maintenance_frequency": "DAILY"
}
```

**Validation:**
- `shed_id`: Required, must exist
- `crane_number`: Required, unique per shed
- `maintenance_frequency`: Required, one of: DAILY, WEEKLY, MONTHLY

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Crane created successfully",
  "data": {
    "id": 7,
    "shed_id": 1,
    "crane_number": "CR-A-003",
    "maintenance_frequency": "DAILY",
    "last_inspection_date": null,
    "next_maintenance_date": null,
    "current_status": "OK",
    "current_maintenance_status": "OK",
    "is_active": true,
    "created_at": "2024-01-15T11:00:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z"
  }
}
```

**Error:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Crane number already exists for this shed"
}
```

---

### Update Crane

Update existing crane.

**Endpoint:** `PUT /cranes/:id`

**Request Body:**
```json
{
  "shed_id": 1,
  "crane_number": "CR-A-003-UPDATED",
  "maintenance_frequency": "WEEKLY"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Crane updated successfully",
  "data": { ... }
}
```

---

### Delete Crane

Soft delete crane (sets `is_active = false`).

**Endpoint:** `DELETE /cranes/:id`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Crane deleted successfully"
}
```

---

## Configuration API

### Get Sheds

Retrieve all sheds.

**Endpoint:** `GET /config/sheds`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Shed A",
      "code": "SHA",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get Sections with Items

Retrieve all inspection sections with their items.

**Endpoint:** `GET /config/sections`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "LT Gear Box – 1 (Cabin Side)",
      "display_order": 1,
      "is_compulsory": false,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "items": [
        {
          "id": 1,
          "section_id": 1,
          "item_name": "Oil Level",
          "display_order": 1,
          "dropdown_values": ["HIGH", "NORMAL", "LOW"],
          "compulsory": "COMPULSORY",
          "alert_condition": "EQUAL_TO",
          "alert_value": "LOW",
          "is_active": true,
          "created_at": "2024-01-01T00:00:00.000Z",
          "updated_at": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

---

### Test Google Sheets Connection

Test Google Sheets API connection.

**Endpoint:** `GET /config/test-google-sheets`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Connected to Google Sheets successfully",
  "spreadsheet": "Crane Maintenance Inspections"
}
```

**Error:** `500 Internal Server Error`
```json
{
  "success": false,
  "message": "Failed to connect to Google Sheets",
  "error": "credentials file not found"
}
```

---

## Examples

### cURL Examples

**Create Inspection:**
```bash
curl -X POST http://localhost:5000/api/inspections \
  -H "Content-Type: application/json" \
  -d '{
    "inspection_date": "2024-01-15",
    "recorded_by": "John Doe",
    "shed_id": 1,
    "crane_id": 1,
    "sections": [
      {
        "section_id": 1,
        "items": [
          {"item_id": 1, "selected_value": "NORMAL"},
          {"item_id": 2, "selected_value": "NO"}
        ]
      }
    ]
  }'
```

**Get Inspections:**
```bash
curl http://localhost:5000/api/inspections?crane_id=1
```

**Export to Excel:**
```bash
curl -O -J http://localhost:5000/api/inspections/1/export/excel
```

**Get Notifications:**
```bash
curl http://localhost:5000/api/cranes/notifications
```

### JavaScript Examples

**Using Axios:**
```javascript
import axios from 'axios';

// Create inspection
const response = await axios.post('http://localhost:5000/api/inspections', {
  inspection_date: '2024-01-15',
  recorded_by: 'John Doe',
  shed_id: 1,
  crane_id: 1,
  sections: [/* ... */]
});

// Get inspections
const inspections = await axios.get('http://localhost:5000/api/inspections', {
  params: { crane_id: 1 }
});

// Export to Excel
const excelBlob = await axios.get(
  'http://localhost:5000/api/inspections/1/export/excel',
  { responseType: 'blob' }
);
```

### Python Examples

**Using requests:**
```python
import requests

# Create inspection
response = requests.post(
    'http://localhost:5000/api/inspections',
    json={
        'inspection_date': '2024-01-15',
        'recorded_by': 'John Doe',
        'shed_id': 1,
        'crane_id': 1,
        'sections': [...]
    }
)

# Get inspections
response = requests.get(
    'http://localhost:5000/api/inspections',
    params={'crane_id': 1}
)
inspections = response.json()

# Export to Excel
response = requests.get(
    'http://localhost:5000/api/inspections/1/export/excel'
)
with open('inspection.xlsx', 'wb') as f:
    f.write(response.content)
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production, consider:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Webhooks (Future)

Future implementation may include webhooks for:
- Inspection created
- Alert detected
- Maintenance due
- Maintenance overdue

---

**End of API Reference**
