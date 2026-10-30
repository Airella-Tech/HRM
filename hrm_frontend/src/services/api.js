/**
 * ============================================================
 *  HRM Frontend â€” Centralized API Service
 * ============================================================
 *
 *  All API URLs are loaded from environment variables.
 *  See .env.example for configuration.
 * ============================================================
 */

// â”€â”€â”€ Base URLs from environment variables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5005/api";
export const AUTH_URL =
  import.meta.env.VITE_AUTH_URL || "http://localhost:5004/api";
export const EMPLOYEE_URL =
  import.meta.env.VITE_EMPLOYEE_URL || "http://localhost:5006/api";
export const ADMIN_URL =
  import.meta.env.VITE_ADMIN_URL || "http://localhost:5007/api";
export const RECRUITMENT_URL =
  import.meta.env.VITE_RECRUITMENT_URL || "http://localhost:5008/api";

async function parseErrorMessage(res) {
  let errMsg = "";
  try {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const err = await res.json();
      errMsg =
        err.message ||
        err.error ||
        err.detail ||
        (typeof err === "string" ? err : "");
    } else {
      errMsg = await res.text();
    }
  } catch {
    // Ignore parse failure
  }

  errMsg = (errMsg || "").trim();

  if (!errMsg || errMsg === res.statusText) {
    if (res.status === 403)
      errMsg =
        "Forbidden - Access denied. You do not have permission for this action.";
    else if (res.status === 401)
      errMsg =
        "Unauthorized - Session expired or unauthenticated. Please log in again.";
    else if (res.status === 400)
      errMsg = "Bad request - Please check the submitted data.";
    else if (res.status === 404) errMsg = "Resource not found.";
    else if (res.status >= 500) errMsg = "Internal server error.";
    else errMsg = res.statusText || "An error occurred.";
  }

  return `${res.status}: ${errMsg}`;
}

// â”€â”€â”€ Shared fetch helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function request(method, url, body = null) {
  const token = localStorage.getItem("token");
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  try {
    const res = await fetch(url, opts);

    if (!res.ok) {
      const errText = await parseErrorMessage(res);
      throw new Error(errText);
    }

    return await res.json();
  } catch (error) {
    if (error.message && error.message.startsWith("Failed to fetch")) {
      throw new Error(
        "Unable to connect to server. Please check if the backend is running.",
      );
    }
    throw error;
  }
}

// Error text from a failed response, in the same "<status>: <message>" form as request()
async function responseError(res) {
  const errText = await parseErrorMessage(res);
  return new Error(errText);
}

async function authorizedFetch(url, opts = {}) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw await responseError(res);
    return res;
  } catch (error) {
    if (error.message && error.message.startsWith("Failed to fetch")) {
      throw new Error(
        "Unable to connect to server. Please check if the backend is running.",
      );
    }
    throw error;
  }
}

// Multipart upload (e.g. a PDF); the browser sets the multipart Content-Type itself
async function requestForm(method, url, formData) {
  const res = await authorizedFetch(url, { method, body: formData });
  return res.json();
}

// File download (e.g. a PDF) as a Blob
async function requestBlob(url) {
  const res = await authorizedFetch(url, { method: "GET" });
  return res.blob();
}

// â”€â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const authApi = {
  /** Login â€” returns { token, email, fullName, role, companyId, id } */
  login: async (email, password) => {
    return request("POST", `${AUTH_URL}/auth/login`, { email, password });
  },

  /** Register â€” creates a new employee account */
  register: async (payload) => {
    return request("POST", `${AUTH_URL}/auth/register`, payload);
  },

  /** Check if user exists */
  checkUser: async (email) => {
    return request(
      "GET",
      `${AUTH_URL}/auth/check-user/${encodeURIComponent(email)}`,
    );
  },

  /** Get the next available Employee ID (prefix + number) for a role */
  nextEmployeeId: async (role) => {
    return request(
      "GET",
      `${AUTH_URL}/auth/next-employee-id/${encodeURIComponent(role)}`,
    );
  },

  /** Get current user info */
  me: async () => {
    return request("GET", `${EMPLOYEE_URL}/auth/me`);
  },

  /** Forgot password â€” requests a reset link */
  forgotPassword: async (email) => {
    return request("POST", `${AUTH_URL}/auth/forgot-password`, { email });
  },

  /** Reset password â€” sets a new password using token */
  resetPassword: async (token, password) => {
    return request("POST", `${AUTH_URL}/auth/reset-password`, {
      token,
      password,
    });
  },

  /** Change password â€” updates current temporary password to a new password */
  changePassword: async (oldPassword, newPassword) => {
    return request("POST", `${AUTH_URL}/auth/change-password`, {
      oldPassword,
      newPassword,
    });
  },

  /** Validate session */
  validateSession: async (userId) => {
    return request("GET", `${AUTH_URL}/auth/session?userId=${userId}`);
  },

  /** Logout */
  logout: async (userId) => {
    return request("POST", `${AUTH_URL}/auth/logout?userId=${userId}`);
  },
};

// â”€â”€â”€ EMPLOYEE DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const employeeApi = {
  // Profile
  getProfile: () => request("GET", `${EMPLOYEE_URL}/employee/profile`),
  updateProfile: (data) =>
    request("PUT", `${EMPLOYEE_URL}/employee/profile`, data),

  // Attendance
  clockIn: () =>
    request("POST", `${EMPLOYEE_URL}/employee/attendance/clock-in`),
  clockOut: () =>
    request("POST", `${EMPLOYEE_URL}/employee/attendance/clock-out`),
  clockInGPS: (latitude, longitude) =>
    request(
      "POST",
      `${EMPLOYEE_URL}/employee/attendance/clock-in-gps?latitude=${latitude}&longitude=${longitude}`,
    ),
  clockOutGPS: (latitude, longitude) =>
    request(
      "POST",
      `${EMPLOYEE_URL}/employee/attendance/clock-out-gps?latitude=${latitude}&longitude=${longitude}`,
    ),
  getTodayAttendance: () =>
    request("GET", `${EMPLOYEE_URL}/employee/attendance/today`),
  getAttendanceHistory: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(
      "GET",
      `${EMPLOYEE_URL}/employee/attendance/history?${params.toString()}`,
    );
  },
  requestAttendanceAdjustment: (attendanceId, reason) =>
    request(
      "POST",
      `${EMPLOYEE_URL}/employee/attendance/adjustment-request?attendanceId=${attendanceId}&reason=${encodeURIComponent(reason)}`,
    ),

  // Leave
  getLeaveTypes: () => request("GET", `${EMPLOYEE_URL}/employee/leave/types`),
  applyLeave: (data) =>
    request("POST", `${EMPLOYEE_URL}/employee/leave/apply`, data),
  getLeaves: () => request("GET", `${EMPLOYEE_URL}/employee/leave`),
  cancelLeave: (leaveId) =>
    request("POST", `${EMPLOYEE_URL}/employee/leave/${leaveId}/cancel`),
  getLeaveBalance: () =>
    request("GET", `${EMPLOYEE_URL}/employee/leave/balance`),

  // Payslips
  getPayslips: () => request("GET", `${EMPLOYEE_URL}/employee/payslips`),
  getPayslipDetails: (id) =>
    request("GET", `${EMPLOYEE_URL}/employee/payslips/${id}`),
  // Current salary from HR (job role basic payment + individual allowances / deductions)
  getPaySheet: () => request("GET", `${EMPLOYEE_URL}/employee/pay-sheet`),

  // Allowance requests (hrm_db_employee.allowance_requests); formData: name, amount, description, document (PDF)
  getAllowanceRequests: () =>
    request("GET", `${EMPLOYEE_URL}/employee/allowance-requests`),
  requestAllowance: (formData) =>
    requestForm(
      "POST",
      `${EMPLOYEE_URL}/employee/allowance-requests`,
      formData,
    ),
  getAllowanceDocument: (id) =>
    requestBlob(`${EMPLOYEE_URL}/employee/allowance-requests/${id}/document`),

  // Notifications
  getNotifications: () =>
    request("GET", `${EMPLOYEE_URL}/employee/notifications`),
  markNotificationAsRead: (id) =>
    request("PUT", `${EMPLOYEE_URL}/employee/notifications/${id}/read`),
  markAllNotificationsAsRead: () =>
    request("PUT", `${EMPLOYEE_URL}/employee/notifications/read-all`),
  deleteNotification: (id) =>
    request("DELETE", `${EMPLOYEE_URL}/employee/notifications/${id}`),
};

// â”€â”€â”€ HR DATA (via User_Backend â€” hrm_db_user is the source of truth) â”€â”€
// These hit User_Backend's own /api/hr/employees endpoints, which read/write
// the same `employees` table that registration writes to, instead of the
// synced copy in hrm_db_hr.
// Logged-in person's own profile (hrm_db_user.employees) â€” read-only, any role
export const userSelfApi = {
  getMyProfile: () => request("GET", `${AUTH_URL}/employee/my-profile`),
};

export const userHrApi = {
  // HR manager's own profile (hrm_db_user.employees) â€” read-only
  getMyProfile: () => request("GET", `${AUTH_URL}/hr/profile`),
  getEmployees: () => request("GET", `${AUTH_URL}/hr/employees`),
  getEmployee: (id) => request("GET", `${AUTH_URL}/hr/employees/${id}`),
  updateEmployee: (id, data) =>
    request("PUT", `${AUTH_URL}/hr/employees/${id}`, data),
  deactivateEmployee: (id) =>
    request("PUT", `${AUTH_URL}/hr/employees/${id}/deactivate`),
  deleteEmployee: (id) => request("DELETE", `${AUTH_URL}/hr/employees/${id}`),
};

// â”€â”€â”€ HR DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const hrApi = {
  // Employees
  getEmployees: () => request("GET", `${BASE_URL}/hr/employees`),
  getEmployee: (id) => request("GET", `${BASE_URL}/hr/employees/${id}`),
  createEmployee: (data) => request("POST", `${BASE_URL}/hr/employees`, data),
  updateEmployee: (id, data) =>
    request("PUT", `${BASE_URL}/hr/employees/${id}`, data),
  deactivateEmployee: (id) =>
    request("POST", `${BASE_URL}/hr/employees/${id}/deactivate`),
  deleteEmployee: (id) =>
    request("DELETE", `${BASE_URL}/hr/employees/${id}`).catch(() =>
      request("POST", `${BASE_URL}/hr/employees/${id}/deactivate`),
    ),

  // Attendance â€” served by Employee_Backend (hrm_db_employee is the source of
  // truth for clock-in/out records; HR_Backend's own attendance table is never
  // written to, so daily/range attendance must be read from EMPLOYEE_URL).
  getDailyAttendance: (date) =>
    request(
      "GET",
      `${EMPLOYEE_URL}/hr/attendance/daily${date ? "?date=" + date : ""}`,
    ),
  getAttendanceRange: (startDate, endDate) =>
    request(
      "GET",
      `${EMPLOYEE_URL}/hr/attendance/range?startDate=${startDate}&endDate=${endDate}`,
    ),
  getPendingAdjustments: () =>
    request("GET", `${EMPLOYEE_URL}/hr/attendance/adjustments`),
  approveAdjustment: (id) =>
    request("POST", `${EMPLOYEE_URL}/hr/attendance/adjustments/${id}/approve`),
  rejectAdjustment: (id) =>
    request("POST", `${EMPLOYEE_URL}/hr/attendance/adjustments/${id}/reject`),

  // Leave requests â€” employees apply in Employee_Backend (hrm_db_employee), so HR reviews them there
  getLeaveRequests: () => request("GET", `${EMPLOYEE_URL}/hr/leave`),
  getPendingLeaves: () => request("GET", `${EMPLOYEE_URL}/hr/leave/pending`),
  approveLeave: (leaveId) =>
    request("POST", `${EMPLOYEE_URL}/hr/leave/${leaveId}/approve`),
  rejectLeave: (leaveId, reason) =>
    request(
      "POST",
      `${EMPLOYEE_URL}/hr/leave/${leaveId}/reject?reason=${encodeURIComponent(reason)}`,
    ),
  getOnLeaveCount: (date) =>
    request(
      "GET",
      `${EMPLOYEE_URL}/hr/leave/on-leave-count${date ? "?date=" + date : ""}`,
    ),

  // Leave configuration â€” leave types and per-job-role entitlements (hrm_db_hr)
  getLeaveTypes: () => request("GET", `${BASE_URL}/hr/leave-types`),
  createLeaveTypes: (names) =>
    request("POST", `${BASE_URL}/hr/leave-types`, { names }),
  updateLeaveType: (id, name) =>
    request("PUT", `${BASE_URL}/hr/leave-types/${id}`, { name }),
  deleteLeaveType: (id) =>
    request("DELETE", `${BASE_URL}/hr/leave-types/${id}`),
  getEmploymentTypes: () => request("GET", `${BASE_URL}/hr/employment-types`),
  createEmploymentTypes: (names) =>
    request("POST", `${BASE_URL}/hr/employment-types`, { names }),
  updateEmploymentType: (id, name) =>
    request("PUT", `${BASE_URL}/hr/employment-types/${id}`, { name }),
  deleteEmploymentType: (id) =>
    request("DELETE", `${BASE_URL}/hr/employment-types/${id}`),
  getLeaveAllocations: (departmentId) =>
    request(
      "GET",
      `${BASE_URL}/hr/leave-allocations${departmentId ? `?departmentId=${departmentId}` : ""}`,
    ),
  saveLeaveAllocations: (jobRoleId, allocations) =>
    request("POST", `${BASE_URL}/hr/leave-allocations`, {
      jobRoleId,
      allocations,
    }),
  deleteLeaveAllocation: (id) =>
    request("DELETE", `${BASE_URL}/hr/leave-allocations/${id}`),

  // Work locations (hrm_db_hr.work_locations)
  getWorkLocations: () => request("GET", `${BASE_URL}/hr/work-locations`),
  createWorkLocations: (names) =>
    request("POST", `${BASE_URL}/hr/work-locations`, { names }),
  updateWorkLocation: (id, name) =>
    request("PUT", `${BASE_URL}/hr/work-locations/${id}`, { name }),
  deleteWorkLocation: (id) =>
    request("DELETE", `${BASE_URL}/hr/work-locations/${id}`),

  // Departments â€” saved in hrm_db_hr via the HR_Backend (this service owns
  // department + job role data). Only an HR Manager or Admin (guarded by
  // hrsrc's own role checks) can add, update, deactivate a department, or
  // assign a department manager.
  getDepartments: () => request("GET", `${BASE_URL}/hr/departments`),
  createDepartment: (data) =>
    request("POST", `${BASE_URL}/hr/departments`, data),
  updateDepartment: (id, data) =>
    request("PUT", `${BASE_URL}/hr/departments/${id}`, data),
  deleteDepartment: (id) =>
    request("DELETE", `${BASE_URL}/hr/departments/${id}`),
  deactivateDepartment: (id) =>
    request("PUT", `${BASE_URL}/hr/departments/${id}/deactivate`),
  assignDeptManager: (id, managerId) =>
    request(
      "PUT",
      `${BASE_URL}/hr/departments/${id}/manager?managerId=${managerId}`,
    ),

  // Payroll / Salaries
  getSalaries: () => request("GET", `${BASE_URL}/hr/salaries`),
  getEmployeeSalary: (id) =>
    request("GET", `${BASE_URL}/hr/salaries/employee/${id}`),
  saveSalary: (data) => request("POST", `${BASE_URL}/hr/salaries`, data),
  generatePayroll: (month, year) =>
    request(
      "POST",
      `${BASE_URL}/hr/payroll/generate?month=${month}&year=${year}`,
    ),
  // Send one employee's payslip for the month (creates / refreshes it and notifies the employee)
  sendPayslip: (email, month, year) =>
    request("POST", `${BASE_URL}/hr/payroll/send`, { email, month, year }),

  // Job role salaries (hrm_db_hr.basic_payments)
  getBasicPayments: (departmentId) =>
    request(
      "GET",
      `${BASE_URL}/hr/basic-payments${departmentId ? `?departmentId=${departmentId}` : ""}`,
    ),
  saveBasicPayments: (jobRoleId, payments) =>
    request("POST", `${BASE_URL}/hr/basic-payments`, { jobRoleId, payments }),
  deleteBasicPayment: (id) =>
    request("DELETE", `${BASE_URL}/hr/basic-payments/${id}`),
  // Individual allowances / deductions (hrm_db_hr.additional_payments)
  getAdditionalPayments: (employeeEmail) =>
    request(
      "GET",
      `${BASE_URL}/hr/additional-payments${employeeEmail ? `?employeeEmail=${encodeURIComponent(employeeEmail)}` : ""}`,
    ),
  saveAdditionalPayments: (data) =>
    request("POST", `${BASE_URL}/hr/additional-payments`, data),
  // Pay sheets for the given employees: [{ email, employeeCode, fullName, departmentName, designation, employmentType }]
  getPaySheets: (employees) =>
    request("POST", `${BASE_URL}/hr/payroll/sheet`, employees),
  // Employees' allowance requests (stored by Employee_Backend), reviewed by HR
  getAllowanceRequests: () =>
    request("GET", `${BASE_URL}/hr/allowance-requests`),
  getAllowanceDocument: (id) =>
    requestBlob(`${BASE_URL}/hr/allowance-requests/${id}/document`),
  approveAllowanceRequest: (id, comment) =>
    request("POST", `${BASE_URL}/hr/allowance-requests/${id}/approve`, {
      comment,
    }),
  addAllowanceToPay: (id) =>
    request("POST", `${BASE_URL}/hr/allowance-requests/${id}/add-to-pay`),
  rejectAllowanceRequest: (id, comment) =>
    request("POST", `${BASE_URL}/hr/allowance-requests/${id}/reject`, {
      comment,
    }),

  // Reports & Analytics
  getHRDashboardStats: () => request("GET", `${BASE_URL}/hr/dashboard/stats`),
  getWorkforceReport: () => request("GET", `${BASE_URL}/hr/reports/workforce`),
  getAttendanceReport: () =>
    request("GET", `${BASE_URL}/hr/reports/attendance-summary`),
  getLeaveReport: () => request("GET", `${BASE_URL}/hr/reports/leave-summary`),
  getPayrollReport: () =>
    request("GET", `${BASE_URL}/hr/reports/payroll-summary`),
};

// â”€â”€â”€ ADMIN DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const adminApi = {
  // Dashboard
  getDashboardStats: () => request("GET", `${ADMIN_URL}/admin/stats`),
  getCompanyStats: (companyId) =>
    request("GET", `${ADMIN_URL}/admin/stats/company/${companyId}`),

  // Companies
  getCompanies: () => request("GET", `${ADMIN_URL}/admin/companies`),
  getCompany: (id) => request("GET", `${ADMIN_URL}/admin/companies/${id}`),
  createCompany: (data) =>
    request("POST", `${ADMIN_URL}/admin/companies`, data),
  updateCompany: (id, data) =>
    request("PUT", `${ADMIN_URL}/admin/companies/${id}`, data),
  approveCompany: (id) =>
    request("POST", `${ADMIN_URL}/admin/companies/${id}/approve`),
  rejectCompany: (id, reason) =>
    request(
      "POST",
      `${ADMIN_URL}/admin/companies/${id}/reject?reason=${encodeURIComponent(reason)}`,
    ),
  suspendCompany: (id, reason) =>
    request(
      "POST",
      `${ADMIN_URL}/admin/companies/${id}/suspend?reason=${encodeURIComponent(reason)}`,
    ),

  // Users
  getSystemUsers: () => request("GET", `${ADMIN_URL}/admin/users`),
  getUsersByCompany: (companyId) =>
    request("GET", `${ADMIN_URL}/admin/users/company/${companyId}`),
  getAdminUsers: () => request("GET", `${ADMIN_URL}/admin/users/admins`),
  updateUserRole: (id, role) =>
    request(
      "PUT",
      `${ADMIN_URL}/admin/users/${id}/role?role=${encodeURIComponent(role)}`,
    ),
  updateUserStatus: (id, status) =>
    request(
      "PUT",
      `${ADMIN_URL}/admin/users/${id}/status?status=${encodeURIComponent(status)}`,
    ),
  resetUserPassword: (id, password) =>
    request("POST", `${ADMIN_URL}/admin/users/${id}/reset-password`, {
      password,
    }),

  // Audit Logs
  getAuditLogs: (companyId) =>
    request(
      "GET",
      `${ADMIN_URL}/admin/audit-logs${companyId ? "?companyId=" + companyId : ""}`,
    ),
  getAuditLogsByRange: (startDate, endDate) =>
    request(
      "GET",
      `${ADMIN_URL}/admin/audit-logs/range?startDate=${startDate}&endDate=${endDate}`,
    ),

  // System Configuration
  getConfigurations: () => request("GET", `${ADMIN_URL}/admin/config`),
  getConfiguration: (key) => request("GET", `${ADMIN_URL}/admin/config/${key}`),
  updateConfiguration: (key, value) =>
    request("PUT", `${ADMIN_URL}/admin/config/${key}`, { value }),

  // Auth (admin-specific login)
  login: (email, password) =>
    request("POST", `${ADMIN_URL}/auth/login`, { email, password }),
};

// â”€â”€â”€ RECRUITMENT ROLES & PERMISSIONS DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const recruitmentApi = {
  // Roles
  getRoles: (search, customOnly = false) => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (customOnly) query.set("customOnly", "true");
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request("GET", `${RECRUITMENT_URL}/recruitment/roles${qs}`);
  },
  getDefaultRoleTemplates: () =>
    request("GET", `${RECRUITMENT_URL}/recruitment/roles/defaults`),
  getRoleById: (id) =>
    request("GET", `${RECRUITMENT_URL}/recruitment/roles/${id}`),
  createRole: (data) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/roles`, data),
  updateRole: (id, data) =>
    request("PUT", `${RECRUITMENT_URL}/recruitment/roles/${id}`, data),
  deleteRole: (id) =>
    request("DELETE", `${RECRUITMENT_URL}/recruitment/roles/${id}`),

  // Permissions
  getAllPermissions: () =>
    request("GET", `${RECRUITMENT_URL}/recruitment/roles/permissions`),
  getPermissionsByCategory: () =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/roles/permissions/by-category`,
    ),

  // User role assignments
  getCompanyUsersWithRoles: () =>
    request("GET", `${RECRUITMENT_URL}/recruitment/roles/users`),
  getUserRoleAssignments: (userId) =>
    request("GET", `${RECRUITMENT_URL}/recruitment/roles/users/${userId}`),
  assignRoleToUser: (userId, roleIds) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/roles/users/assign`, {
      userId,
      roleIds,
    }),
  removeRoleFromUser: (userId, roleId) =>
    request(
      "DELETE",
      `${RECRUITMENT_URL}/recruitment/roles/users/${userId}/roles/${roleId}`,
    ),
  updateUserRoles: (userId, roleIds) =>
    request(
      "PUT",
      `${RECRUITMENT_URL}/recruitment/roles/users/${userId}`,
      roleIds,
    ),

  // Current user access
  getMyAccess: () =>
    request("GET", `${RECRUITMENT_URL}/recruitment/roles/my-access`),
  checkPermission: (permission) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/roles/check?permission=${encodeURIComponent(permission)}`,
    ),

  // â”€â”€ Vacancies (Member 1) â”€â”€
  getVacancies: (status) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/jobs${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  getVacancy: (id) =>
    request("GET", `${RECRUITMENT_URL}/recruitment/jobs/${id}`),
  createVacancy: (data) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/jobs`, data),
  updateVacancy: (id, data) =>
    request("PUT", `${RECRUITMENT_URL}/recruitment/jobs/${id}`, data),
  deleteVacancy: (id) =>
    request("DELETE", `${RECRUITMENT_URL}/recruitment/jobs/${id}`),
  submitVacancy: (id) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/jobs/${id}/submit`),
  approveVacancy: (id) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/jobs/${id}/approve`),
  rejectVacancy: (id, reason) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/jobs/${id}/reject`, {
      reason,
    }),
  publishVacancy: (id) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/jobs/${id}/publish`),
  closeVacancy: (id) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/jobs/${id}/close`),

  // â”€â”€ Applications & Candidate Management (Member 2) â”€â”€
  getApplications: (params) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request("GET", `${RECRUITMENT_URL}/recruitment/applications${qs}`);
  },
  getApplication: (id) => request("GET", `${RECRUITMENT_URL}/recruitment/applications/${id}`),
  screenApplication: (id, data) => request("PUT", `${RECRUITMENT_URL}/recruitment/applications/${id}/screen`, data),
  shortlistCandidate: (id, notes) => request("POST", `${RECRUITMENT_URL}/recruitment/applications/${id}/shortlist`, { notes }),
  rejectCandidate: (id, reason) => request("POST", `${RECRUITMENT_URL}/recruitment/applications/${id}/reject`, { reason }),
  autoShortlist: (threshold) => request("POST", `${RECRUITMENT_URL}/recruitment/applications/auto-shortlist`, { threshold }),
  getResumeDownloadUrl: (id) => `${RECRUITMENT_URL}/recruitment/applications/${id}/resume`,
  downloadResume: (id) => requestBlob(`${RECRUITMENT_URL}/recruitment/applications/${id}/resume?download=true`),

  // â”€â”€ Interviews, offers, reports  â”€â”€

// Get shortlisted candidates from the recruitment database
// Uses the existing applications endpoint with a status filter.
getShortlistedApplications: () =>
  request(
    "GET",
    `${RECRUITMENT_URL}/recruitment/applications?status=SHORTLISTED`,
  ),

  // ============================================================
  // INTERVIEWS
  // ============================================================

  // Get all interviews.
  // Optional filters: status, date (YYYY-MM-DD).
  getInterviews: (status, date) => {
    const params = new URLSearchParams();

    if (status) params.set("status", status);
    if (date) params.set("date", date);

    const query = params.toString();

    return request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/interviews${query ? `?${query}` : ""}`,
    );
  },

  // Get interviews by status.
  getInterviewsByStatus: (status) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/interviews?status=${encodeURIComponent(status)}`,
    ),

  // Get interviews scheduled on a specific date.
  getInterviewsByDate: (date) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/interviews?date=${encodeURIComponent(date)}`,
    ),

  // Get interviews by status and date.
  getFilteredInterviews: (status, date) => {
    const params = new URLSearchParams();

    if (status) params.set("status", status);
    if (date) params.set("date", date);

    return request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/interviews?${params.toString()}`,
    );
  },

  // Get one interview by ID.
  getInterview: (interviewId) =>
    request("GET", `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}`),

  // Schedule a new interview.
  createInterview: (data) =>
    request("POST", `${RECRUITMENT_URL}/recruitment/interviews`, data),

  // Update or reschedule an existing interview.
  updateInterview: (interviewId, data) =>
    request(
      "PUT",
      `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}`,
      data,
    ),



  // Update only the interview status.
  updateInterviewStatus: (interviewId, status) =>
    request(
      "PATCH",
      `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}/status`,
      { status },
    ),

  // Assign or replace interviewers without updating interview details.
  // employeeIds contains numeric user IDs.
  assignInterviewers: (interviewId, employeeIds) =>
    request(
      "PUT",
      `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}/assign-interviewers`,
      { employeeIds },
    ),

  // Get only interviews assigned to the logged-in interviewer.
  getMyAssignedInterviews: () =>
    request("GET", `${RECRUITMENT_URL}/recruitment/interviews/assigned-to-me`),

  // Delete an interview.
  deleteInterview: (interviewId) =>
    request(
      "DELETE",
      `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}`,
    ),

  // ============================================================
  // INTERVIEW EMAIL HISTORY
  // ============================================================
  getInterviewEmailLogs: () =>
    request("GET", `${RECRUITMENT_URL}/recruitment/interview-emails`),

  getInterviewEmailLog: (id) =>
    request("GET", `${RECRUITMENT_URL}/recruitment/interview-emails/${id}`),

  retryInterviewEmail: (id) =>
    request(
      "POST",
      `${RECRUITMENT_URL}/recruitment/interview-emails/${id}/retry`,
    ),

  // ============================================================
  // INTERVIEW EVALUATIONS
  // ============================================================

  // Save a new evaluation draft or update an existing draft.
  saveEvaluationDraft: (interviewId, data) =>
    request(
      "PUT",
      `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}/evaluations/draft`,
      data,
    ),

  // Submit an interview evaluation.
  submitInterviewEvaluation: (interviewId, data) =>
    request(
      "POST",
      `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}/evaluations/submit`,
      data,
    ),

  // Get the current user's evaluation for a specific interview.
  getMyInterviewEvaluation: (interviewId) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}/evaluations/mine`,
    ),

  // Get the current user's evaluations.
  // Optional status: DRAFT or SUBMITTED.
  getMyEvaluations: (status) => {
    const params = new URLSearchParams();

    if (status) params.set("status", status);

    const query = params.toString();

    return request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/evaluations/mine${query ? `?${query}` : ""}`,
    );
  },

  // Get all evaluations for a specific interview.
  getInterviewEvaluations: (interviewId) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/interviews/${interviewId}/evaluations`,
    ),
  // ============================================================
  // JOB OFFERS
  // ============================================================

  // Get candidates who successfully completed all four interview rounds.
  getEligibleCandidates: () =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/job-offers/eligible-candidates`,
    ),

  // Get all job offers.
  getJobOffers: () =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/job-offers`,
    ),

  // Get one job offer.
  getJobOffer: (id) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/recruitment/job-offers/${id}`,
    ),

  // Create a job offer.
  createJobOffer: (data) =>
    request(
      "POST",
      `${RECRUITMENT_URL}/recruitment/job-offers`,
      data,
    ),

  // Update a job offer.
  updateJobOffer: (id, data) =>
    request(
      "PUT",
      `${RECRUITMENT_URL}/recruitment/job-offers/${id}`,
      data,
    ),

  // Update job offer status.
  updateJobOfferStatus: (id, status) =>
    request(
      "PATCH",
      `${RECRUITMENT_URL}/recruitment/job-offers/${id}/status?status=${encodeURIComponent(status)}`,
    ),

  // Send job offer email.
  sendJobOfferEmail: (id) =>
    request(
      "POST",
      `${RECRUITMENT_URL}/recruitment/job-offers/${id}/send-email`,
    ),

  // Delete a draft job offer.
  deleteJobOffer: (id) =>
    request(
      "DELETE",
      `${RECRUITMENT_URL}/recruitment/job-offers/${id}`,
    ),

};

// â”€â”€â”€ PUBLIC CAREERS (no login) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const careersApi = {
  getJobs: (company) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/careers/jobs?company=${encodeURIComponent(company)}`,
    ),
  getJob: (id, company) =>
    request(
      "GET",
      `${RECRUITMENT_URL}/careers/jobs/${id}?company=${encodeURIComponent(company)}`,
    ),
  applyJob: (id, arg2, arg3) => {
    let company = "COMP-001";
    let body = arg2;
    if (typeof arg2 === "string" && typeof arg3 === "object") {
      company = arg2;
      body = arg3;
    } else if (typeof arg3 === "string") {
      company = arg3;
      body = arg2;
    }
    const c = company || "COMP-001";
    return request(
      "POST",
      `${RECRUITMENT_URL}/careers/jobs/${id}/apply?company=${encodeURIComponent(c)}`,
      body,
    );
  },
  trackApplication: (trackingCode, email) =>
    request("POST", `${RECRUITMENT_URL}/careers/applications/track`, {
      trackingCode,
      email,
    }),



};
