# API Reference - V3 Multi-Sheet Architecture

Complete API documentation for the Crane Maintenance Inspection System V3.

---

## Base URL

```
http://localhost:5000/api
```

---

## Authentication

All endpoints (except login) require JWT token in Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication Endpoints

### 1.1 Login

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@craneinspection.com",
      "full_name": "System Administrator",
      "role": "SUPER_ADMIN",
      "permissions": {"all": true}
    },
    "access": {
      "sheds": [{"id": 1, "name": "Shed A", "code": "SHA"}],
      "cranes": [{"id": 1, "crane_number": "CR-A-001"}]
    }
  }
}
```

### 1.2 Get Current User Profile

**GET** `/auth/me`

Get logged-in user details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@craneinspection.com",
    "full_name": "System Administrator",
    "role": "SUPER_ADMIN",
    "permissions": {"all": true},
    "access": {
      "sheds": [...],
      "cranes": [...]
    }
  }
}
```

### 1.3 Change Password

**POST** `/auth/change-password`

Change current user's password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "admin123",
  "new_password": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 2. User Management Endpoints

### 2.1 Get All Users

**GET** `/users`

Get list of all users (Admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "full_name": "System Administrator",
      "role_name": "SUPER_ADMIN",
      "is_active": true,
      "last_login": "2024-01-20T10:30:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "shed_count": 3,
      "crane_count": 6
    }
  ],
  "count": 1
}
```

### 2.2 Get User by ID

**GET** `/users/:id`

Get specific user details with access rights (Admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "username": "operator1",
    "email": "operator1@example.com",
    "full_name": "John Operator",
    "role_name": "OPERATOR",
    "role_id": 3,
    "is_active": true,
    "last_login": "2024-01-20T09:00:00Z",
    "created_at": "2024-01-15T00:00:00Z",
    "sheds": [
      {"id": 1, "name": "Shed A", "code": "SHA"}
    ],
    "cranes": [
      {"id": 1, "crane_number": "CR-A-001", "shed_name": "Shed A"}
    ]
  }
}
```

### 2.3 Create User

**POST** `/users`

Create new user (Admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "username": "operator2",
  "email": "operator2@example.com",
  "password": "secure123",
  "full_name": "Jane Operator",
  "role_id": 3,
  "shed_ids": [1, 2],
  "crane_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 6,
    "username": "operator2",
    "email": "operator2@example.com",
    "full_name": "Jane Operator",
    "is_active": true,
    "created_at": "2024-01-20T10:00:00Z"
  }
}
```

### 2.4 Update User

**PUT** `/users/:id`

Update user details (Admin only).

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "full_name": "Updated Name",
  "role_id": 3,
  "is_active": true,
  "shed_ids": [1, 2],
  "crane_ids": [1, 2]
}
```

### 2.5 Delete User

**DELETE** `/users/:id`

Soft delete user (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 2.6 Reset User Password

**POST** `/users/:id/reset-password`

Reset user password (Admin only).

**Request Body:**
```json
{
  "new_password": "newPassword123"
}
```

### 2.7 Get All Roles

**GET** `/users/roles`

Get list of all roles.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "SUPER_ADMIN",
      "description": "Full system access",
      "permissions": {"all": true}
    },
    {
      "id": 2,
      "name": "ADMIN",
      "description": "Manage users, forms, and view all data",
      "permissions": {"manage_users": true, "manage_forms": true}
    }
  ]
}
```

---

## 3. Form Management Endpoints

### 3.1 Get All Forms

**GET** `/forms`

Get list of all forms.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Standard Crane Inspection Form",
      "description": "Default inspection form",
      "version": 1,
      "is_active": true,
      "section_count": 7,
      "item_count": 42,
      "created_by_name": "System Administrator",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### 3.2 Get Form by ID

**GET** `/forms/:id`

Get form with sections and items.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Standard Crane Inspection Form",
    "description": "Default form",
    "version": 1,
    "is_active": true,
    "created_by_name": "System Administrator",
    "sections": [
      {
        "id": 1,
        "name": "LT Gear Box – 1 (Cabin Side)",
        "display_order": 1,
        "is_required": false,
        "items": [
          {
            "id": 1,
            "field_name": "Oil Level",
            "field_type": "DROPDOWN",
            "display_order": 1,
            "is_required": true,
            "dropdown_options": ["HIGH", "NORMAL", "LOW"],
            "alert_condition": "EQUAL_TO",
            "alert_value": "LOW"
          }
        ]
      }
    ]
  }
}
```

### 3.3 Create Form

**POST** `/forms`

Create new form (Admin only).

**Request Body:**
```json
{
  "name": "Weekly Maintenance Form",
  "description": "Weekly inspection checklist",
  "sections": [
    {
      "name": "Engine Check",
      "display_order": 1,
      "is_required": true,
      "items": [
        {
          "field_name": "Oil Level",
          "field_type": "DROPDOWN",
          "display_order": 1,
          "is_required": true,
          "dropdown_options": ["HIGH", "NORMAL", "LOW"],
          "alert_condition": "EQUAL_TO",
          "alert_value": "LOW"
        }
      ]
    }
  ]
}
```

### 3.4 Update Form

**PUT** `/forms/:id`

Update form (Admin only).

**Request Body:**
```json
{
  "name": "Updated Form Name",
  "description": "Updated description",
  "is_active": true
}
```

### 3.5 Delete Form

**DELETE** `/forms/:id`

Delete form (Admin only). Cannot delete if assigned to cranes.

---

## 4. Crane-Form Assignment Endpoints

### 4.1 Assign Form to Crane

**POST** `/crane-forms`

Assign form to crane and auto-create Google Sheet tab (Admin only).

**Request Body:**
```json
{
  "crane_id": 1,
  "form_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Form assigned to crane successfully",
  "data": {
    "assignment_id": 1,
    "crane_number": "CR-A-001",
    "form_name": "Standard Crane Inspection Form",
    "shed_name": "Shed A",
    "google_sheet": {
      "sheet_name": "CRA001_Standard_Crane_Inspection_Form",
      "sheet_id": 12345678,
      "created": true,
      "message": "Sheet created successfully"
    },
    "created_at": "2024-01-20T10:00:00Z"
  }
}
```

### 4.2 Bulk Assign Form

**POST** `/crane-forms/bulk-assign`

Assign one form to multiple cranes (Admin only).

**Request Body:**
```json
{
  "form_id": 1,
  "crane_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Assigned form to 2 crane(s)",
  "data": {
    "successful": [
      {
        "crane_id": 1,
        "crane_number": "CR-A-001",
        "form_name": "Standard Crane Inspection Form",
        "sheet_name": "CRA001_Standard_Crane_Inspection_Form",
        "success": true
      }
    ],
    "failed": [
      {
        "crane_id": 3,
        "crane_number": "CR-C-001",
        "error": "Already assigned"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1
    }
  }
}
```

### 4.3 Get All Assignments

**GET** `/crane-forms`

Get all crane-form assignments.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "crane_id": 1,
      "form_id": 1,
      "sheet_name": "CRA001_Standard_Crane_Inspection_Form",
      "crane_number": "CR-A-001",
      "shed_name": "Shed A",
      "form_name": "Standard Crane Inspection Form",
      "created_by_name": "System Administrator",
      "created_at": "2024-01-20T10:00:00Z"
    }
  ],
  "count": 1
}
```

### 4.4 Get Forms by Crane

**GET** `/crane-forms/crane/:crane_id`

Get all forms assigned to a specific crane.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "assignment_id": 1,
      "form_id": 1,
      "form_name": "Standard Crane Inspection Form",
      "description": "Default form",
      "sheet_name": "CRA001_Standard_Crane_Inspection_Form",
      "created_at": "2024-01-20T10:00:00Z"
    }
  ],
  "count": 1
}
```

### 4.5 Get Cranes by Form

**GET** `/crane-forms/form/:form_id`

Get all cranes assigned to a specific form.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "assignment_id": 1,
      "crane_id": 1,
      "crane_number": "CR-A-001",
      "shed_name": "Shed A",
      "sheet_name": "CRA001_Standard_Crane_Inspection_Form",
      "created_at": "2024-01-20T10:00:00Z"
    }
  ],
  "count": 1
}
```

### 4.6 Remove Assignment

**DELETE** `/crane-forms/:id`

Remove form assignment from crane (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Form assignment removed successfully",
  "data": {
    "crane_number": "CR-A-001",
    "form_name": "Standard Crane Inspection Form",
    "sheet_name": "CRA001_Standard_Crane_Inspection_Form",
    "note": "Google Sheet was not deleted. Data is preserved."
  }
}
```

---

## 5. Inspection Endpoints

### 5.1 Submit Inspection

**POST** `/inspections`

Submit inspection (writes to specific Google Sheet).

**Request Body:**
```json
{
  "crane_id": 1,
  "form_id": 1,
  "inspection_date": "2024-01-20",
  "remarks": "All systems normal",
  "maintenance_start_time": "08:00",
  "maintenance_stop_time": "08:30",
  "sections": [
    {
      "section_id": 1,
      "section_name": "LT Gear Box – 1 (Cabin Side)",
      "items": [
        {
          "item_id": 1,
          "item_name": "Oil Level",
          "selected_value": "NORMAL"
        },
        {
          "item_id": 2,
          "item_name": "Oil Leakage",
          "selected_value": "NO"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inspection submitted successfully",
  "data": {
    "inspection_date": "2024-01-20",
    "crane_number": "CR-A-001",
    "shed_name": "Shed A",
    "form_name": "Standard Crane Inspection Form",
    "crane_status": "OK",
    "alert_count": 0,
    "next_maintenance_date": "2024-01-21",
    "recorded_by": "System Administrator",
    "google_sheet": {
      "sheet_name": "CRA001_Standard_Crane_Inspection_Form",
      "rows_written": 2
    }
  }
}
```

### 5.2 Get All Inspections

**GET** `/inspections`

Get inspections with filters.

**Query Parameters:**
- `crane_id` (optional)
- `form_id` (optional)
- `from_date` (optional)
- `to_date` (optional)
- `shed_id` (optional)

**Example:**
```
GET /inspections?crane_id=1&from_date=2024-01-01&to_date=2024-01-31
```

### 5.3 Get Inspection by Crane and Date

**GET** `/inspections/:crane_number/:date`

Get specific inspection.

**Example:**
```
GET /inspections/CR-A-001/2024-01-20
```

### 5.4 Export to Excel

**GET** `/inspections/:crane_number/:date/export/excel`

Download inspection as Excel file.

**Response:**
Binary file download with filename: `Inspection_CRA001_2024-01-20.xlsx`

### 5.5 Export to PDF

**GET** `/inspections/:crane_number/:date/export/pdf`

Download inspection as PDF file.

**Response:**
Binary file download with filename: `Inspection_CRA001_2024-01-20.pdf`

### 5.6 Get Inspections by Crane

**GET** `/inspections/crane/:crane_id`

Get all inspections for a specific crane.

---

## Error Responses

All endpoints may return error responses in this format:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error or bad request"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "User does not have permission"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Detailed error message"
}
```

---

## Example Workflow

### Complete Inspection Submission Workflow

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

# 2. Get forms assigned to crane
curl -X GET http://localhost:5000/api/crane-forms/crane/1 \
  -H "Authorization: Bearer $TOKEN"

# 3. Get form details
curl -X GET http://localhost:5000/api/forms/1 \
  -H "Authorization: Bearer $TOKEN"

# 4. Submit inspection
curl -X POST http://localhost:5000/api/inspections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @inspection-payload.json

# 5. Export to Excel
curl -O -J http://localhost:5000/api/inspections/CR-A-001/2024-01-20/export/excel \
  -H "Authorization: Bearer $TOKEN"
```

---

**API Version: 3.0.0**
**Architecture: Multi-Sheet Google Sheets Storage**
