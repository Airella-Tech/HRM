# Login Error: "Invalid email or password: Bad credentials" - Troubleshooting Guide

## Problem
You're getting "Invalid email or password: Bad credentials" error when trying to login.

## Root Cause
This error occurs when:
1. The user doesn't exist in the database
2. The password in the database doesn't match (incorrect BCrypt hash)
3. The database connection is incorrect

## Solutions

### Step 1: Check if Backend is Running
Make sure your Java backend is running on `http://localhost:5002`

```powershell
# Test if backend is responding
Invoke-RestMethod -Uri 'http://localhost:5002/api/auth/check-user/admin@test.com' -Method GET
```

### Step 2: Verify Test Users Exist

#### Option A: Using the API (if backend is running)
```powershell
# Check if admin user exists
Invoke-RestMethod -Uri 'http://localhost:5002/api/auth/check-user/admin@test.com' -Method GET

# Check if HR user exists
Invoke-RestMethod -Uri 'http://localhost:5002/api/auth/check-user/hr@test.com' -Method GET

# Check if employee user exists
Invoke-RestMethod -Uri 'http://localhost:5002/api/auth/check-user/employee@test.com' -Method GET
```

#### Option B: Using Database (PostgreSQL)
Connect to your database and run:
```sql
SELECT id, email, full_name, role, status FROM employee 
WHERE email IN ('admin@test.com', 'hr@test.com', 'employee@test.com');
```

### Step 3: Insert Test Users (if they don't exist)

Run the SQL script: `verify_and_fix_users.sql`

Or run this directly in your PostgreSQL database:

```sql
-- Delete existing test users
DELETE FROM employee WHERE email IN ('admin@test.com', 'hr@test.com', 'employee@test.com');

-- Insert test users (password is 'test123')
INSERT INTO employee (email, password, full_name, employee_id, role, status, company_id, department_id, joining_date, created_at, updated_at)
VALUES 
('admin@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'Admin User', 'EMP001', 'ADMIN', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('hr@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'HR Manager', 'EMP002', 'HR_MANAGER', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('employee@test.com', '$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W', 'Test Employee', 'EMP003', 'EMPLOYEE', 'ACTIVE', 1, 1, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

### Step 4: Test Login Again

**Test Credentials:**
- **Admin:** `admin@test.com` / `test123`
- **HR Manager:** `hr@test.com` / `test123`
- **Employee:** `employee@test.com` / `test123`

#### Test via API:
```powershell
$body = @{ email = 'admin@test.com'; password = 'test123' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5002/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
```

### Step 5: Alternative - Register a New User

If you still have issues, register a new user through the registration endpoint:

```powershell
$registerBody = @{
    fullName = "Test Admin"
    email = "newadmin@test.com"
    password = "test123"
    role = "ADMIN"
    phone = "+1234567890"
    designation = "System Administrator"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:5002/api/auth/register' -Method POST -Body $registerBody -ContentType 'application/json'
```

Then login with:
- **Email:** `newadmin@test.com`
- **Password:** `test123`

## Common Issues

### 1. Backend Not Running
**Error:** Cannot connect to server
**Solution:** Start the backend server
```bash
cd hrm_backend/hrm
./gradlew bootRun
```

### 2. Wrong Database
**Error:** Users not found
**Solution:** Check `application.properties` and ensure the database connection is correct

### 3. Password Hash Mismatch
**Error:** Bad credentials
**Solution:** The password in the database must be BCrypt encoded. Use the provided SQL script which has the correct hash for "test123"

### 4. Company/Department Not Found
**Error:** Foreign key constraint violation
**Solution:** Make sure company and department exist first (included in the SQL script)

## Password Encoding

The test password "test123" is encoded as:
```
$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W
```

To generate new passwords, run the `PasswordUtil` class:
```bash
cd hrm_backend/hrm
./gradlew run --args="com.airella.hrm.Util.PasswordUtil"
```

## Quick Checklist

- [ ] Backend is running on port 5002
- [ ] Database connection is configured correctly
- [ ] Company table has at least one record
- [ ] Department table has at least one record  
- [ ] Employee table has test users with correct BCrypt passwords
- [ ] Users have status 'ACTIVE'
- [ ] Frontend is pointing to correct backend URL (http://localhost:5002)

## Still Having Issues?

Check the backend console logs for detailed error messages. The error will show exactly what's failing in the authentication process.
