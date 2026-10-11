# HRM System - Feature Implementation Guide

## Overview
This HRM (Human Resource Management) system is a comprehensive web and mobile application supporting three distinct interfaces with role-based access control.

## System Architecture

### Backend Stack
- **Framework**: Spring Boot 3.x
- **Database**: PostgreSQL
- **Security**: Spring Security + JWT Authentication
- **ORM**: JPA/Hibernate
- **Password Encryption**: BCrypt

### Frontend Stack
- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context/Redux (to be implemented)
- **Routing**: React Router

---

## Database Entities Created

### Core Entities
1. **Company** - Multi-tenant company management
2. **Department** - Department organization within companies
3. **Employee** - User accounts with role-based permissions
4. **Attendance** - Clock-in/out tracking (manual and GPS)
5. **LeaveType** - Configurable leave categories
6. **LeaveBalance** - Employee leave entitlements
7. **LeaveApplication** - Leave requests and approvals
8. **Salary** - Employee compensation structure
9. **Payslip** - Monthly payment records
10. **Notification** - System notifications
11. **AuditLog** - System-wide audit trail
12. **SystemConfiguration** - Global settings

### Entity Relationships
- Company → Departments (1:N)
- Company → Employees (1:N)
- Department → Employees (1:N)
- Employee → Attendance (1:N)
- Employee → LeaveApplications (1:N)
- Employee → LeaveBalances (1:N)
- Employee → Salary (1:1)
- Employee → Payslips (1:N)

---

## Role-Based Access Control (RBAC)

### Roles
1. **ADMIN** - System administrator
2. **HR_MANAGER** - Company HR manager
3. **EMPLOYEE** - Regular employee

### Security Implementation
- JWT-based authentication
- Password encryption with BCrypt
- Role-based endpoint protection
- Token expiration: 24 hours

### Protected Endpoints
```
/api/auth/**          - Public (login)
/api/admin/**         - ADMIN only
/api/hr/**            - ADMIN + HR_MANAGER
/api/employee/**      - ADMIN + HR_MANAGER + EMPLOYEE
```

---

## Features by Interface

## 1. ADMIN INTERFACE

### Company Management
**Endpoints to Create:**
- `GET /api/admin/companies` - List all companies
- `GET /api/admin/companies/pending` - Pending registrations
- `PUT /api/admin/companies/{id}/approve` - Approve company
- `PUT /api/admin/companies/{id}/reject` - Reject company
- `PUT /api/admin/companies/{id}/suspend` - Suspend company
- `DELETE /api/admin/companies/{id}` - Delete company

**Service Methods:**
- getAllCompanies()
- getPendingCompanies()
- approveCompany(id, approvalData)
- rejectCompany(id, reason)
- suspendCompany(id, reason)

### System Configuration
**Endpoints to Create:**
- `GET /api/admin/config` - Get all configurations
- `PUT /api/admin/config/{key}` - Update configuration
- `POST /api/admin/config` - Create configuration

**Configuration Keys:**
- system.default_leave_days
- system.max_employees_per_company
- system.attendance_grace_period
- system.payroll_processing_day

### Leave Type Management (System-wide)
**Endpoints to Create:**
- `GET /api/admin/leave-types` - Get system leave types
- `POST /api/admin/leave-types` - Create leave type
- `PUT /api/admin/leave-types/{id}` - Update leave type
- `DELETE /api/admin/leave-types/{id}` - Delete leave type

### Monitoring & Analytics
**Endpoints to Create:**
- `GET /api/admin/stats/overview` - System statistics
- `GET /api/admin/stats/companies` - Company-wise stats
- `GET /api/admin/stats/users` - User activity stats
- `GET /api/admin/stats/performance` - System performance

**Statistics to Track:**
- Total companies (active/pending/suspended)
- Total employees across all companies
- Active users last 30 days
- Database size and performance

### Audit & Compliance
**Endpoints to Create:**
- `GET /api/admin/audit-logs` - All audit logs
- `GET /api/admin/audit-logs/company/{id}` - Company-specific logs
- `GET /api/admin/audit-logs/date-range` - Logs by date
- `GET /api/admin/audit-logs/action/{action}` - Logs by action

**Audit Events:**
- COMPANY_APPROVED
- COMPANY_REJECTED
- COMPANY_SUSPENDED
- USER_LOGIN
- DATA_EXPORT
- CONFIG_CHANGE

---

## 2. HR MANAGER INTERFACE

### Department Management
**Endpoints to Create:**
- `GET /api/hr/departments` - List all departments
- `POST /api/hr/departments` - Create department
- `PUT /api/hr/departments/{id}` - Update department
- `DELETE /api/hr/departments/{id}` - Delete department
- `PUT /api/hr/departments/{id}/manager` - Assign manager

### Employee Management
**Endpoints to Create:**
- `GET /api/hr/employees` - List all employees
- `GET /api/hr/employees/{id}` - Get employee details
- `POST /api/hr/employees` - Register new employee
- `PUT /api/hr/employees/{id}` - Update employee
- `PUT /api/hr/employees/{id}/deactivate` - Deactivate employee
- `PUT /api/hr/employees/{id}/terminate` - Terminate employee
- `GET /api/hr/employees/department/{id}` - Employees by department

### Attendance Management
**Endpoints to Create:**
- `GET /api/hr/attendance/daily` - Daily attendance
- `GET /api/hr/attendance/monthly` - Monthly attendance
- `GET /api/hr/attendance/employee/{id}` - Employee attendance
- `GET /api/hr/attendance/department/{id}` - Department attendance
- `GET /api/hr/attendance/adjustments` - Pending adjustments
- `PUT /api/hr/attendance/adjustments/{id}/approve` - Approve adjustment
- `PUT /api/hr/attendance/adjustments/{id}/reject` - Reject adjustment
- `GET /api/hr/attendance/reports` - Attendance reports

**Reports:**
- Daily attendance summary
- Monthly attendance report
- Late arrivals report
- Early departures report
- Absent employees report
- Department-wise attendance

### Leave Management
**Endpoints to Create:**
- `GET /api/hr/leaves/pending` - Pending leave requests
- `GET /api/hr/leaves/all` - All leave requests
- `GET /api/hr/leaves/upcoming` - Upcoming leaves
- `PUT /api/hr/leaves/{id}/approve` - Approve leave
- `PUT /api/hr/leaves/{id}/reject` - Reject leave
- `GET /api/hr/leaves/employee/{id}` - Employee leaves
- `GET /api/hr/leaves/balances` - All leave balances
- `GET /api/hr/leaves/statistics` - Leave statistics
- `POST /api/hr/leave-types` - Create company leave type

**Leave Statistics:**
- Approved vs rejected leaves
- Leave type distribution
- Department-wise leave usage
- Seasonal leave patterns

### Payroll Management
**Endpoints to Create:**
- `GET /api/hr/salaries` - All employee salaries
- `POST /api/hr/salaries` - Create salary
- `PUT /api/hr/salaries/{id}` - Update salary
- `GET /api/hr/salaries/employee/{id}` - Employee salary
- `POST /api/hr/payroll/generate` - Generate payslips
- `GET /api/hr/payroll/month/{month}/year/{year}` - Monthly payroll
- `GET /api/hr/payroll/export` - Export payroll
- `GET /api/hr/payroll/summary` - Payroll summary

**Payroll Processing:**
- Automatic payslip generation
- Attendance-based deductions
- Allowances calculation
- Tax and deductions
- Bulk payslip generation
- PDF/Excel export

### Reporting & Analytics
**Endpoints to Create:**
- `GET /api/hr/reports/workforce` - Workforce analytics
- `GET /api/hr/reports/attendance-summary` - Attendance summary
- `GET /api/hr/reports/leave-summary` - Leave summary
- `GET /api/hr/reports/payroll-summary` - Payroll summary
- `GET /api/hr/reports/department-performance` - Department metrics
- `GET /api/hr/dashboard/stats` - Dashboard statistics

### Notifications
**Endpoints to Create:**
- `POST /api/hr/notifications/announce` - Company-wide announcement
- `POST /api/hr/notifications/send` - Send notification
- `GET /api/hr/notifications/sent` - Sent notifications

---

## 3. EMPLOYEE INTERFACE

### Attendance
**Endpoints to Create:**
- `POST /api/employee/attendance/clock-in` - Clock in
- `POST /api/employee/attendance/clock-out` - Clock out
- `POST /api/employee/attendance/clock-in-gps` - GPS clock in
- `POST /api/employee/attendance/clock-out-gps` - GPS clock out
- `GET /api/employee/attendance/today` - Today's attendance
- `GET /api/employee/attendance/history` - Attendance history
- `GET /api/employee/attendance/monthly` - Monthly attendance
- `POST /api/employee/attendance/adjustment-request` - Request adjustment

**GPS Attendance:**
- Capture latitude/longitude
- Validate location (within office radius)
- Store location data
- Prevent duplicate clock-ins

### Leave Management
**Endpoints to Create:**
- `POST /api/employee/leaves/apply` - Apply for leave
- `GET /api/employee/leaves/my-leaves` - My leave applications
- `GET /api/employee/leaves/pending` - Pending leaves
- `GET /api/employee/leaves/approved` - Approved leaves
- `GET /api/employee/leaves/rejected` - Rejected leaves
- `DELETE /api/employee/leaves/{id}/cancel` - Cancel pending leave
- `GET /api/employee/leaves/balance` - Leave balance
- `GET /api/employee/leaves/history` - Leave history
- `GET /api/employee/leave-types` - Available leave types

**Leave Validation:**
- Check overlapping leaves
- Validate leave balance
- Calculate working days
- Automatic balance deduction

### Payroll
**Endpoints to Create:**
- `GET /api/employee/salary` - Current salary details
- `GET /api/employee/payslips` - All payslips
- `GET /api/employee/payslips/latest` - Latest payslip
- `GET /api/employee/payslips/{id}` - Specific payslip
- `GET /api/employee/payslips/{id}/download` - Download PDF
- `GET /api/employee/salary/history` - Salary history

**Payslip Information:**
- Basic salary
- Allowances breakdown
- Deductions breakdown
- Gross salary
- Net salary
- Payment date
- Working days vs present days

### Profile Management
**Endpoints to Create:**
- `GET /api/employee/profile` - View profile
- `PUT /api/employee/profile/contact` - Update contact (pending approval)
- `PUT /api/employee/profile/password` - Change password
- `GET /api/employee/profile/department` - Department info
- `GET /api/employee/profile/manager` - Manager info

### Notifications
**Endpoints to Create:**
- `GET /api/employee/notifications` - All notifications
- `GET /api/employee/notifications/unread` - Unread notifications
- `PUT /api/employee/notifications/{id}/read` - Mark as read
- `PUT /api/employee/notifications/read-all` - Mark all as read
- `DELETE /api/employee/notifications/{id}` - Delete notification
- `GET /api/employee/notifications/count` - Unread count

**Notification Types:**
- Leave approved/rejected
- Payslip available
- Company announcements
- Attendance reminders
- Policy updates

### Dashboard
**Endpoints to Create:**
- `GET /api/employee/dashboard/stats` - Dashboard statistics
- `GET /api/employee/dashboard/recent-activity` - Recent activities
- `GET /api/employee/dashboard/upcoming-leaves` - Upcoming leaves
- `GET /api/employee/dashboard/quick-actions` - Quick action items

**Dashboard Widgets:**
- Attendance summary (current month)
- Leave balance at a glance
- Recent notifications (last 5)
- Quick clock-in/out button
- Pending leave requests
- Latest payslip info

---

## Implementation Status

### ✅ Completed
1. **Database Entities**: All 12 entities created with relationships
2. **Repositories**: All JPA repositories with custom queries
3. **Security Configuration**: JWT + Spring Security + RBAC
4. **DTOs**: 14 data transfer objects
5. **Authentication**: Login endpoint and JWT generation

### 🔄 In Progress
1. **Service Layer**: Need to create services for all features
2. **Controller Layer**: Need to create controllers for all endpoints
3. **Exception Handling**: Global exception handler
4. **Validation**: Input validation and business rules

### ⏳ To Do
1. **Service Implementations** (60+ services)
2. **Controller Implementations** (80+ endpoints)
3. **Frontend Components** (React pages and components)
4. **Mobile Integration** (React Native or similar)
5. **Testing** (Unit and integration tests)
6. **Documentation** (API docs with Swagger)

---

## Next Steps

### Backend Development
1. Create service classes for each domain:
   - CompanyService
   - DepartmentService
   - EmployeeService
   - AttendanceService
   - LeaveService
   - PayrollService
   - NotificationService
   - AuditService

2. Create controller classes:
   - AdminController
   - HRManagerController
   - EmployeeController

3. Implement business logic:
   - Leave balance calculation
   - Payroll computation
   - Attendance validation
   - GPS location validation

4. Add global exception handling
5. Add input validation
6. Add audit logging interceptor
7. Add API documentation (Swagger)

### Frontend Development
1. Update existing login page for role-based routing
2. Create dashboard layouts for each role
3. Create feature-specific components
4. Implement state management
5. Add API integration
6. Add form validation
7. Create mobile-responsive design

### Database
1. Run the application to auto-generate tables
2. Create database indexes for performance
3. Add sample data for testing
4. Set up database backup strategy

---

## API Testing with Postman

### Example Requests

**Login:**
```http
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "type": "Bearer",
    "email": "admin@company.com",
    "fullName": "John Doe",
    "role": "ADMIN",
    "companyId": 1,
    "employeeId": 1
  }
}
```

**Protected Request:**
```http
GET http://localhost:5001/api/employee/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

---

## Running the Application

### Backend
```bash
cd hrm_backend/hrm
./gradlew bootRun
```

### Frontend
```bash
cd hrm_frontend
pnpm install
pnpm dev
```

### Database Setup
1. Create PostgreSQL database: `hrm_db`
2. Update credentials in `application.properties`
3. Tables will be auto-created on first run

---

## Technology Decisions

### Why JWT?
- Stateless authentication
- Scalable across multiple servers
- Mobile-friendly
- Industry standard

### Why Spring Security?
- Comprehensive security framework
- Role-based access control
- CSRF protection
- Session management

### Why PostgreSQL?
- ACID compliance
- Strong data integrity
- Complex queries support
- JSON support for flexible data

### Why Multi-tenant Architecture?
- Single codebase for all companies
- Centralized management
- Easy scaling
- Cost-effective

---

## Security Best Practices

1. **Password Policy**:
   - Minimum 8 characters
   - BCrypt encryption
   - Never store plain text

2. **JWT Tokens**:
   - 24-hour expiration
   - Secure secret key (256-bit minimum)
   - HTTPS only in production

3. **API Security**:
   - CORS configuration
   - Rate limiting (to be implemented)
   - Input sanitization
   - SQL injection prevention (JPA)

4. **Data Privacy**:
   - Salary data encrypted
   - Audit all sensitive operations
   - Role-based data access
   - GDPR compliance considerations

---

## File Structure Created

```
hrm_backend/hrm/src/main/java/com/airella/hrm/
├── Config/
│   ├── CustomUserDetailsService.java
│   ├── JwtAuthenticationFilter.java
│   ├── JwtUtil.java
│   ├── ModelMapperConfig.java
│   └── SecurityConfig.java
├── Controller/
│   ├── AuthController.java
│   └── UserController.java (legacy)
├── DTO/
│   ├── ApiResponse.java
│   ├── AuthRequest.java
│   ├── AuthResponse.java
│   ├── AttendanceDTO.java
│   ├── CompanyDTO.java
│   ├── DashboardStatsDTO.java
│   ├── DepartmentDTO.java
│   ├── EmployeeDTO.java
│   ├── LeaveApplicationDTO.java
│   ├── LeaveBalanceDTO.java
│   ├── LeaveTypeDTO.java
│   ├── NotificationDTO.java
│   ├── PayslipDTO.java
│   └── SalaryDTO.java
├── Model/
│   ├── Attendance.java
│   ├── AuditLog.java
│   ├── Company.java
│   ├── Department.java
│   ├── Employee.java
│   ├── LeaveApplication.java
│   ├── LeaveBalance.java
│   ├── LeaveType.java
│   ├── Notification.java
│   ├── Payslip.java
│   ├── Salary.java
│   ├── SystemConfiguration.java
│   └── User.java (legacy)
├── Repo/
│   ├── AttendanceRepo.java
│   ├── AuditLogRepo.java
│   ├── CompanyRepo.java
│   ├── DepartmentRepo.java
│   ├── EmployeeRepo.java
│   ├── LeaveApplicationRepo.java
│   ├── LeaveBalanceRepo.java
│   ├── LeaveTypeRepo.java
│   ├── NotificationRepo.java
│   ├── PayslipRepo.java
│   ├── SalaryRepo.java
│   ├── SystemConfigurationRepo.java
│   └── UserRepo.java (legacy)
└── Service/
    ├── AuthService.java
    └── UserService.java (legacy)
```

---

## Contact & Support

For questions or issues during implementation, refer to:
- Spring Boot Documentation
- Spring Security Reference
- JWT.io for token debugging
- PostgreSQL Documentation

---

**Last Updated**: January 20, 2026
**Version**: 1.0.0
**Author**: GitHub Copilot
