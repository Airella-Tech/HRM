# Clock-In Error: "Failed to clock in: User not found" — Complete Fix Guide

## Problem Summary

When you click **Clock In**, you get this error:
```
Status: 400
Error: "Failed to clock in: User not found"
```

**Why?** Your user exists in one database but not the other.

---

## Root Cause Analysis

The HRM system has **3 separate backend services** with **separate databases**:

| Backend | Database | Port | Purpose |
|---------|----------|------|---------|
| **User_Backend** | `hrm_db_user` | 5002 | ✓ Login/Registration (YOUR USER IS HERE) |
| **Employee_Backend** | `hrm_db_employee` | 5003 | ✗ Attendance/Clock-in (MISSING YOUR USER) |
| **HR_Backend** | `hrm_db_hr` | 5004 | HR Management data |

### What Happens When You Log In
1. ✓ Frontend sends credentials to User_Backend (port 5002)
2. ✓ User_Backend finds you in `hrm_db_user.employee` table
3. ✓ Creates JWT token with your email
4. ✓ You get logged in successfully

### What Happens When You Try to Clock In
1. ✓ Frontend sends clock-in request to Employee_Backend (port 5003) with token
2. ✗ Employee_Backend calls: `authService.getCurrentEmployee()`
3. ✗ This tries: `employeeRepo.findByEmailIgnoreCase(your_email)`
4. ✗ Your email is NOT in `hrm_db_employee.employee` table
5. ✗ Throws: `RuntimeException("User not found")`

---

## Solution: Sync Employee Data

You need to **copy your employee record** from `hrm_db_user` to `hrm_db_employee`.

### Method 1: Automated PowerShell Script (Recommended)

Run this script from PowerShell in the project folder:

```powershell
cd d:\Projects\HRM
.\FIX_CLOCKIN_SYNC.ps1
```

**What it does:**
- ✓ Checks PostgreSQL connection
- ✓ Exports employee data from `hrm_db_user`
- ✓ Imports to `hrm_db_employee`
- ✓ Verifies sync was successful

### Method 2: Manual SQL (pgAdmin UI)

1. **Open pgAdmin 4** → Connect to PostgreSQL
2. **Select `hrm_db_employee` database**
3. **Open Query Tool** (top toolbar)
4. **Copy the entire contents** of: `SYNC_EMPLOYEE_DATA.sql`
5. **Paste into Query Tool**
6. **Run (F5 or ▶ button)**
7. **Wait for completion** (should show employee records)

### Method 3: Command Line (psql)

If you have psql installed:

```powershell
# Set password
$env:PGPASSWORD = "Rush@2001780"

# Export from hrm_db_user
pg_dump -h localhost -U postgres -d hrm_db_user -t company -t department -t employee --data-only > export.sql

# Import to hrm_db_employee
psql -h localhost -U postgres -d hrm_db_employee -f export.sql
```

---

## Verification Steps

### After running the fix:

**1. Check pgAdmin:**
```sql
-- Connect to hrm_db_employee
SELECT email, full_name, role FROM employee ORDER BY id;
```
You should see your email listed.

**2. Check the logs:**
When Employee_Backend starts, you should see:
```
[API] POST http://localhost:5003/api/employee/attendance/clock-in
  Token: ✓ Present (...)
```

**3. Test clock-in:**
- Go to employee dashboard
- Click "Clock In"
- Should succeed with ✓ message

---

## If Clock-In Still Fails After Sync

Check these:

1. **Restart Employee_Backend Service**
   - The Java application may be caching the employee table
   - Kill the `java` process and restart it
   - Or restart the IDE/terminal running the backend

2. **Verify Employee Record**
   ```sql
   -- In hrm_db_employee database
   SELECT * FROM employee WHERE email = 'your-email@company.com';
   ```
   Should return exactly 1 row with your data.

3. **Check JWT Token**
   - Open browser DevTools (F12)
   - Console tab
   - Run: `localStorage.getItem('token')`
   - Copy the token to [JWT.io](https://jwt.io)
   - Verify the `email` claim matches an employee email

---

## Files Provided

| File | Purpose |
|------|---------|
| `FIX_CLOCKIN_SYNC.ps1` | Automated PowerShell sync script |
| `SYNC_EMPLOYEE_DATA.sql` | Manual SQL sync script for pgAdmin |
| `CLOCKIN_FIX_GUIDE.md` | This documentation |

---

## Technical Details (For Developers)

**Root Code Locations:**

1. **AuthService.java** (Employee_Backend)
   ```java
   public Employee getCurrentEmployee() {
       String email = authentication.getName();  // From JWT
       return employeeRepo.findByEmailIgnoreCase(normalizedEmail)
           .orElseThrow(() -> new RuntimeException("User not found"));
   }
   ```

2. **EmployeeController.java** (Employee_Backend)
   ```java
   @PostMapping("/attendance/clock-in")
   public ResponseEntity<ApiResponse<AttendanceDTO>> clockIn() {
       var employee = authService.getCurrentEmployee();  // ← THROWS HERE if not found
       AttendanceDTO attendance = attendanceService.clockIn(employee.getId(), null);
       return ResponseEntity.ok(ApiResponse.success(attendance, "Clocked in successfully"));
   }
   ```

---

## Questions?

- ✓ Does your email appear in both databases? → Should be yes after sync
- ✓ Does Employee_Backend service restart? → May need cache clear
- ✓ Are the ports correct (5002, 5003)? → Check application.properties
curl -X GET http://localhost:5003/api/sync/health
# Expected response:
# {
#   "success": true,
#   "data": "OK",
#   "message": "Sync service is healthy"
# }
```

#### Test Clock-in
1. Register a new user
2. Log in with the new user
3. Click "Clock In" button
4. **Expected**: ✓ Clocked in successfully

#### Check Console Logs

Look for sync confirmation in **User_Backend** console:
```
[SYNC] Employee synced to Employee_Backend: user@example.com
[SYNC Controller] Syncing employee from User_Backend: user@example.com
[SYNC Controller] Employee synced successfully: user@example.com (ID: 123)
```

---

## Testing Checklist

- [ ] All three backends are running without errors
- [ ] Sync health endpoint returns OK
- [ ] New user can register successfully
- [ ] New user can log in with correct credentials
- [ ] Clock-in button works without errors
- [ ] Clock-in record appears in attendance table
- [ ] Console logs show sync messages
- [ ] Existing users can still clock in (if they were manually synced before)

---

## Troubleshooting

### Issue: Still getting "User not found"

**Cause**: Old backends still running with cached bytecode

**Solution**:
1. Stop all backends completely
2. Wait 5 seconds
3. Start fresh with new JAR files

```powershell
# Clean kill (PowerShell)
Get-Process java | Stop-Process -Force
Start-Sleep -Seconds 5
# Then restart services
```

### Issue: "Cannot connect to Employee_Backend"

**Cause**: Firewall or port not listening

**Solution**:
```powershell
# Check if ports are open
Test-NetConnection localhost -Port 5003

# Check if service is running
Get-Process java | Select-Object Name, Id, ProcessName
```

### Issue: Sync endpoint returns 404

**Cause**: Old code still deployed

**Solution**:
1. Verify JAR file timestamp (should be recent)
2. Check console output for "SyncController" messages
3. Restart service

### Issue: Employee synced but still can't clock in

**Cause**: Employee record in wrong database or malformed

**Solution**:
```sql
-- Check if employee exists in hrm_db_employee
SELECT * FROM public.employees WHERE email = 'user@example.com';

-- Check if employee exists in hrm_db_user  
SELECT * FROM public.employees WHERE email = 'user@example.com';

-- If missing, manually sync by re-registering user
```

---

## Files Modified

1. **Created**: `Employee_Backend/src/main/java/com/airella/hrm/Controller/SyncController.java`
2. **Created**: `HR_Backend/src/main/java/com/airella/hrm/Controller/SyncController.java`
3. **Modified**: `User_Backend/src/main/java/com/airella/hrm/Service/AuthService.java`
4. **Modified**: `Employee_Backend/src/main/java/com/airella/hrm/Controller/EmployeeController.java`

---

## Success Indicators

After deployment, users should be able to:
1. ✓ Register successfully
2. ✓ Log in without issues
3. ✓ Click "Clock In" and see success message
4. ✓ View attendance records
5. ✓ Clock out successfully

---

## References

- Microservices Architecture Pattern
- Spring Security @PreAuthorize behavior
- Inter-service communication best practices
- Database synchronization strategies

