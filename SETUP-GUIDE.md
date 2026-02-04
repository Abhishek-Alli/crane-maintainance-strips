# Quick Setup Guide: User Management & Department-Based Access Control

## Prerequisites
- PostgreSQL database running
- Node.js and npm installed
- React development environment

## Step 1: Database Setup

### 1.1 Connect to PostgreSQL
```bash
psql -U postgres
```

### 1.2 Create Database
```sql
CREATE DATABASE crane_maintenance;
\c crane_maintenance
```

### 1.3 Run New Schema
```bash
psql -U postgres -d crane_maintenance -f database-schema-with-users.sql
```

**This creates:**
- departments table
- users table  
- Updates sheds, cranes, inspections with department_id
- Seed data with test users

### 1.4 Verify Installation
```sql
-- Check departments
SELECT * FROM departments;

-- Check users
SELECT id, username, role, department_id FROM users;

-- Check cranes by department
SELECT c.id, c.crane_number, s.name as shed, d.name as dept
FROM cranes c
JOIN sheds s ON c.shed_id = s.id
JOIN departments d ON c.department_id = d.id;
```

## Step 2: Backend Setup

### 2.1 Install Dependencies
```bash
cd backend
npm install
```

### 2.2 Environment Variables (.env)
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crane_maintenance
DB_USER=postgres
DB_PASSWORD=your_password
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 2.3 Start Backend Server
```bash
npm start
# or with nodemon for development
npm run dev
```

Expected output:
```
========================================
Crane Maintenance System API Server
========================================
Environment: development
Port: 5000
Database: crane_maintenance

Ready to accept connections!
========================================
```

### 2.4 Test Backend
```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "operator_a1",
    "password": "password123",
    "department_id": 1
  }'

# Should return:
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": 2,
      "username": "operator_a1",
      "role": "OPERATOR",
      "department_id": 1,
      "department_name": "Department A"
    }
  }
}
```

## Step 3: Frontend Setup

### 3.1 Install Dependencies
```bash
cd frontend
npm install
```

### 3.2 Environment Variables (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 3.3 Start Frontend Server
```bash
npm start
```

Expected output:
```
Compiled successfully!

You can now view crane-maintainance in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

## Step 4: Test the System

### 4.1 Login Page
1. Open http://localhost:3000
2. Verify **Login page appears** (NOT dashboard)
3. Verify **Department dropdown is populated**

### 4.2 Test Login - Operator
1. Department: Select "Department A"
2. Username: `operator_a1`
3. Password: `password123`
4. Click Sign In

**Expected:**
- ✅ Redirected to Dashboard
- ✅ Shows "Department A" at top
- ✅ Menu shows: Dashboard, New Inspection, Logout
- ✅ Dashboard displays ONLY cranes from Department A

### 4.3 Test Login - Admin
1. Department: Select "Department A"
2. Username: `admin_a`
3. Password: `password123`
4. Click Sign In

**Expected:**
- ✅ Redirected to Dashboard
- ✅ Menu shows: Dashboard, New Inspection, **Create User**, Logout
- ✅ Can access http://localhost:3000/create-user

### 4.4 Test Department Isolation
1. Login as `operator_a1` (Department A)
2. Note the cranes displayed
3. Logout (click Logout button)
4. Login as `operator_b1` (Department B)
5. Note DIFFERENT cranes displayed

### 4.5 Test Create User (Admin Only)
1. Login as `admin_a`
2. Click "Create User" in menu
3. Fill form:
   - Username: `test_user_001`
   - Password: `password123`
   - Role: `OPERATOR`
   - Department: `Department A`
   - Status: Check "Active"
4. Click "Create User"
5. Verify success message
6. Verify user appears in "Users" list
7. Logout and login with new credentials

### 4.6 Test Route Protection
1. **Without login:**
   - Try direct URL: http://localhost:3000/dashboard
   - Should redirect to http://localhost:3000/login

2. **Operator accessing admin routes:**
   - Login as operator
   - Try URL: http://localhost:3000/create-user
   - Should redirect to home

3. **Admin creating users:**
   - Login as admin
   - Should see Create User menu
   - Should be able to access /create-user

## Default Test Credentials

### Department A
- **Admin Account:**
  - Username: `admin_a`
  - Password: `password123`
  - Role: ADMIN
  
- **Operator Accounts:**
  - Username: `operator_a1`
  - Password: `password123`
  - Role: OPERATOR
  
  - Username: `operator_a2`
  - Password: `password123`
  - Role: OPERATOR

### Department B
- Username: `operator_b1`
- Password: `password123`
- Role: OPERATOR

### Department C
- Username: `operator_c1`
- Password: `password123`
- Role: OPERATOR

## Common Issues & Solutions

### Issue: "department_id must be provided" during login
**Solution:** Check that department dropdown is populated and select one before login

### Issue: Login redirects back to /login repeatedly
**Solution:**
```bash
# Check localStorage in browser DevTools:
# Application > Storage > Local Storage
# Should have: 'token' and 'user' keys

# If missing, clear and retry:
localStorage.clear()
```

### Issue: "Failed to load departments" on login page
**Solution:**
- Verify backend is running on http://localhost:5000
- Check CORS settings in backend/server.js
- Verify database connection in .env file

### Issue: Dashboard shows "No cranes"
**Solution:**
- Verify cranes exist in database for user's department
- Run SQL check:
  ```sql
  SELECT * FROM cranes 
  WHERE department_id = (
    SELECT department_id FROM users WHERE username = 'operator_a1'
  );
  ```

### Issue: "Create User" button not visible
**Solution:** Login with an ADMIN role user, not OPERATOR

### Issue: Database connection errors
**Solution:**
```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d crane_maintenance

# If fails, check:
# 1. PostgreSQL is running
# 2. .env has correct DB credentials
# 3. Database exists
```

## File Changes Summary

### New Files Created:
- `frontend/src/components/CreateUser.jsx` - Admin panel for user creation
- `frontend/src/context/AuthContext.js` - Auth state management
- `database-schema-with-users.sql` - Updated DB schema with users/departments
- `USER-MANAGEMENT-IMPLEMENTATION.md` - Detailed documentation

### Files Modified:
- `backend/controllers/authController.js` - Updated login with department validation
- `backend/controllers/userController.js` - User CRUD operations
- `backend/routes/userRoutes.js` - User management endpoints
- `backend/routes/configRoutes.js` - Added department filtering to APIs
- `frontend/src/components/Login.jsx` - Added department selection
- `frontend/src/components/Dashboard.jsx` - Added department-based filtering
- `frontend/src/App.js` - Protected routes + role-based navigation

## Next Steps

1. **Test thoroughly** with all user roles and departments
2. **Customize** test credentials as needed
3. **Deploy** to production with proper environment variables
4. **Monitor** login/access logs for security
5. **Consider** additional features like:
   - Password change functionality
   - User deactivation/soft delete
   - Audit logging
   - Email notifications

## Support

For more detailed information, see:
- `USER-MANAGEMENT-IMPLEMENTATION.md` - Complete technical documentation
- `API_REFERENCE.md` - API endpoint documentation
- Backend logs for troubleshooting errors

---

**Created:** January 2026
**Version:** 1.0
**Status:** Ready for Testing
