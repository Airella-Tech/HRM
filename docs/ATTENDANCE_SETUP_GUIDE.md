# Attendance System Setup & Implementation Guide

## Overview
The attendance system has been fully implemented with clock in/clock out functionality. Employees can clock in when they arrive and clock out when they leave. The system automatically calculates working hours and tracks attendance status.

## Database Table Structure

The `attendance` table in `hrm_db_employee` database has the following structure:

```sql
CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    date DATE NOT NULL,
    clock_in_time TIME,
    clock_out_time TIME,
    attendance_type VARCHAR(50),
    clock_in_location VARCHAR(255),
    clock_out_location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PRESENT',
    remarks TEXT,
    is_adjustment_requested BOOLEAN DEFAULT FALSE,
    adjustment_reason TEXT,
    adjustment_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employee(id),
    UNIQUE(employee_id, date)
);
```

### Table Columns Explanation:
- **id**: Unique identifier for each attendance record
- **employee_id**: Reference to the employee
- **date**: Attendance date (unique per employee per day)
- **clock_in_time**: Time when employee clocked in
- **clock_out_time**: Time when employee clocked out
- **attendance_type**: MANUAL or GPS
- **status**: PRESENT, ABSENT, LATE, or HALF_DAY
- **is_adjustment_requested**: Flag for requesting attendance adjustments
- **created_at**: Record creation timestamp

---

## Backend Implementation

### 1. Attendance Model (`com.airella.hrm.Model.Attendance`)
- Already implemented with all required fields
- Enum types: AttendanceType, AttendanceStatus, AdjustmentStatus
- Mapped to PostgreSQL using JPA/Hibernate

### 2. AttendanceService (`com.airella.hrm.Service.AttendanceService`)
Features:
- `clockIn()` - Record clock in time
- `clockOut()` - Record clock out time  
- `clockInGPS()` - GPS-based clock in
- `clockOutGPS()` - GPS-based clock out
- `getTodayAttendance()` - Fetch today's attendance
- `getEmployeeAttendance()` - Fetch attendance for date range
- `getDailyAttendance()` - Fetch company-wide attendance for a date
- `requestAdjustment()` - Request attendance adjustment

### 3. EmployeeController Endpoints (`com.airella.hrm.Controller.EmployeeController`)

**Running on**: `http://localhost:5003`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/employee/attendance/clock-in` | Clock in without location |
| POST | `/api/employee/attendance/clock-out` | Clock out without location |
| POST | `/api/employee/attendance/clock-in-gps?latitude=X&longitude=Y` | Clock in with GPS |
| POST | `/api/employee/attendance/clock-out-gps?latitude=X&longitude=Y` | Clock out with GPS |
| GET | `/api/employee/attendance/today` | Get today's attendance |
| GET | `/api/employee/attendance/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Get attendance history |
| POST | `/api/employee/attendance/adjustment-request?attendanceId=X&reason=TEXT` | Request adjustment |

---

## Frontend Implementation

### 1. API Service (`src/services/api.js`)
Added `employeeApi` object with methods:
```javascript
employeeApi.clockIn()
employeeApi.clockOut()
employeeApi.getTodayAttendance()
employeeApi.getAttendanceHistory(startDate, endDate)
employeeApi.requestAttendanceAdjustment(attendanceId, reason)
```

**Employee Backend URL**: `http://localhost:5003/api`

### 2. Employee Dashboard (`src/Pages/employee/dashboard.jsx`)
Features:
- Displays today's attendance card with clock in/out times
- Shows working hours calculated automatically
- Clock In/Out buttons that:
  - Are disabled based on attendance status
  - Show loading state while processing
  - Display success/error messages
  - Refresh attendance data after action

### 3. Attendance Page (`src/Pages/employee/Attendance.jsx`)
Features:
- Today's attendance display with clock in/out buttons
- Monthly attendance statistics:
  - Total days worked
  - Present days count
  - Absent days count
  - Leave days count
  - Late days count
  - Total working hours
- Attendance history table with:
  - Date and day of week
  - Clock in and clock out times
  - Working hours calculation
  - Status badge (Present, Absent, Late, On Leave)
- Data automatically fetches from backend

---

## How to Use

### For Employees:

1. **Clock In** (Morning):
   - Go to Dashboard or Attendance page
   - Click "Clock In" button
   - System records the current time
   - Status changes to "Active"

2. **Clock Out** (Evening):
   - Click "Clock Out" button
   - System records the time and calculates working hours
   - Status shows "Completed"

3. **View Attendance History**:
   - Go to Attendance page
   - View monthly statistics
   - See detailed attendance table with all records

4. **Request Adjustment**:
   - If there's a discrepancy, click adjustment button
   - Provide reason for adjustment
   - HR manager will review and approve/reject

---

## Database Creation Script

If the table doesn't exist, run this SQL in pgAdmin:

```sql
-- Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIME,
    clock_out_time TIME,
    attendance_type VARCHAR(50),
    clock_in_location VARCHAR(255),
    clock_out_location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PRESENT',
    remarks TEXT,
    is_adjustment_requested BOOLEAN DEFAULT FALSE,
    adjustment_reason TEXT,
    adjustment_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- Create Index for performance
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);
```

---

## Testing the System

### 1. Start the Backend:
```bash
cd d:\Projects\HRM\hrm_backend\Employee_Backend
./gradlew.bat bootRun
# Runs on http://localhost:5003
```

### 2. Start the Frontend:
```bash
cd d:\Projects\HRM\hrm_frontend
npm run dev
# Runs on http://localhost:5173
```

### 3. Login and Test:
- Go to `http://localhost:5173/employee/dashboard`
- Click "Clock In" button
- Check database - attendance record should be created
- Click "Clock Out" button
- Verify working hours are calculated
- Go to Attendance page to see history

---

## API Response Format

### Success Response:
```json
{
  "data": {
    "id": 1,
    "employeeId": 123,
    "employeeName": "John Doe",
    "date": "2026-05-02",
    "clockInTime": "09:00:00",
    "clockOutTime": "18:00:00",
    "status": "PRESENT",
    "attendanceType": "MANUAL"
  },
  "message": "Clocked in successfully"
}
```

### Error Response:
```json
{
  "error": "Already clocked in today",
  "timestamp": "2026-05-02T09:05:00"
}
```

---

## Features Summary

✅ **Clock In/Out Functionality**
- Simple one-click clock in/out
- Automatic time recording
- GPS location tracking option

✅ **Attendance Dashboard**
- Real-time attendance display
- Working hours calculation
- Monthly statistics

✅ **Attendance History**
- View all attendance records
- Filter by date range
- Status tracking (Present, Absent, Late, Leave)

✅ **Adjustment System**
- Request attendance adjustments
- Reason documentation
- HR approval workflow

✅ **Data Persistence**
- All records saved in PostgreSQL
- Audit logging
- Unique constraint per employee per day

---

## Troubleshooting

### Clock In/Out Not Working:
1. Check if Employee_Backend is running on port 5003
2. Verify database connection in `application.properties`
3. Check browser console for API errors
4. Ensure JWT token is valid

### No Attendance Records Showing:
1. Verify `attendance` table exists in database
2. Check if employee is properly linked
3. Clear browser cache
4. Refresh the page

### Database Error:
1. Check PostgreSQL is running
2. Verify credentials in `application.properties`
3. Run the SQL script to create table if needed
4. Check database name is `hrm_db_employee`

---

## Next Steps

- Configure GPS tracking for remote teams
- Add facial recognition for attendance
- Implement attendance reports for HR
- Add email notifications
- Create mobile app for clock in/out
