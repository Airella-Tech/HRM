import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  X,
  Trash2,
  Edit3,
  Eye,
  Building2,
  BriefcaseBusiness,
  Mail,
  Phone,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Filter,
  UserCheck,
  Sparkles,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  BadgeCheck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Layers3,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";
import { NameListModal } from "../../components/NameListModal";
import { hrApi, userHrApi } from "../../services/api";
import AddEmployeeModal from "./AddEmployeeModal";
import {
  groupSessionsByEmployee,
  toLocalDateString,
} from "../../utils/attendance";

const Employee = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presentToday, setPresentToday] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddEmployeeTypeModal, setShowAddEmployeeTypeModal] =
    useState(false);
  const [showAddWorkLocationModal, setShowAddWorkLocationModal] =
    useState(false);

  // ---------------------------------------------------------
  // PAGINATION — show a fixed number of rows per page, with
  // page navigation controls below the table.
  // ---------------------------------------------------------
  const ROWS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);

        if (parsed.role !== "HR_MANAGER" && parsed.role !== "ADMIN") {
          navigate("/unauthorized");
          return;
        }

        setUser(parsed);
      } catch (err) {
        console.error("Invalid user data:", err);
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // ---------------------------------------------------------
  // FETCH DATA
  // ---------------------------------------------------------
  const fetchEmployees = async () => {
    try {
      const res = await userHrApi.getEmployees();
      const list = res?.data || res || [];

      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await hrApi.getDepartments();
      const list = res?.data || res || [];

      setDepartments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  // ---------------------------------------------------------
  // TODAY'S ATTENDANCE — drives the "Active Employees" summary
  // card with a live present-today count from the HR attendance
  // table (same source the Attendance page uses).
  // ---------------------------------------------------------
  const fetchTodayAttendance = async () => {
    try {
      const today = toLocalDateString(new Date());
      const res = await hrApi.getDailyAttendance(today);
      const sessions = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];

      const perEmployee = groupSessionsByEmployee(sessions);
      const present = perEmployee.filter(
        (row) => row.status === "PRESENT",
      ).length;

      setPresentToday(present);
    } catch (err) {
      console.error("Failed to load today's attendance:", err);
      setPresentToday(0);
    }
  };

  useEffect(() => {
    if (!user) return;

    const loadAll = async () => {
      setLoading(true);

      await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchTodayAttendance(),
      ]);

      setLoading(false);
    };

    loadAll();
  }, [user]);

  // ---------------------------------------------------------
  // OPEN CREATE FORM — opens the Add Employee popup right on this
  // page (instead of navigating to a separate page), so new accounts
  // still land in hrm_db_user via the same auth/register endpoint.
  // ---------------------------------------------------------
  const openCreateForm = () => {
    fetchDepartments(); // pick up departments / job roles added since this page loaded
    setEditingEmployee(null);
    setShowAddEmployeeModal(true);
  };

  // ---------------------------------------------------------
  // EDIT EMPLOYEE — opens the same wizard as "Add Employee",
  // pre-filled with this employee's saved data.
  // ---------------------------------------------------------
  const handleEdit = (employee) => {
    fetchDepartments();
    setEditingEmployee(employee);
    setShowAddEmployeeModal(true);
  };

  // ---------------------------------------------------------
  // DELETE EMPLOYEE (permanent, HR / Admin only — enforced by the backend)
  // ---------------------------------------------------------
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await userHrApi.deleteEmployee(deleteTarget.id);

      await fetchEmployees();

      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete employee:", error);

      alert(error.message || "Failed to delete employee.");
    }
  };

  // ---------------------------------------------------------
  // FILTERING
  // ---------------------------------------------------------
  const filteredEmployees = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return employees.filter((emp) => {
      if (selectedDeptFilter !== "ALL") {
        const empDept = (
          emp.departmentName ||
          emp.department ||
          ""
        ).toLowerCase();

        if (empDept !== selectedDeptFilter.toLowerCase()) {
          return false;
        }
      }

      if (!search) return true;

      const name = (emp.fullName || "").toLowerCase();

      const id = (emp.employeeId || "").toLowerCase();

      const email = (emp.email || "").toLowerCase();

      const role = (emp.designation || "").toLowerCase();

      const phone = (emp.phone || "").toLowerCase();

      const dept = (emp.departmentName || emp.department || "").toLowerCase();

      return (
        name.includes(search) ||
        id.includes(search) ||
        email.includes(search) ||
        role.includes(search) ||
        phone.includes(search) ||
        dept.includes(search)
      );
    });
  }, [employees, searchTerm, selectedDeptFilter]);

  // ---------------------------------------------------------
  // SORTING
  // ---------------------------------------------------------
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedEmployees = useMemo(() => {
    if (!sortKey) return filteredEmployees;

    const pick = (emp) => {
      switch (sortKey) {
        case "employeeId":
          return emp.employeeId || "";
        case "department":
          return emp.departmentName || emp.department || "";
        case "designation":
          return emp.designation || "";
        case "dob":
          return emp.dob || "";
        case "phone":
          return emp.phone || "";
        default:
          return emp.fullName || "";
      }
    };

    const sorted = [...filteredEmployees].sort((a, b) =>
      pick(a).toString().localeCompare(pick(b).toString(), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [filteredEmployees, sortKey, sortDir]);

  // ---------------------------------------------------------
  // PAGINATION — slice the sorted/filtered list into pages of
  // ROWS_PER_PAGE rows, and reset to page 1 whenever the
  // underlying list (search, filter, sort) changes.
  // ---------------------------------------------------------
  const totalPages = Math.max(
    1,
    Math.ceil(sortedEmployees.length / ROWS_PER_PAGE),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDeptFilter, sortKey, sortDir]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedEmployees.slice(start, start + ROWS_PER_PAGE);
  }, [sortedEmployees, currentPage]);

  // ---------------------------------------------------------
  // SUMMARY COUNTS
  // ---------------------------------------------------------
  const totalEmployees = employees.length;

  const totalDeptsRepresented = departments.length;

  if (!user) return null;

  return (
    <PageLayout
      role="hr"
      activePage="Employees"
      title="Employees"
      subtitle="Manage your organization's workforce, departments, and job roles"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddEmployeeTypeModal(true)}
            className="
              inline-flex items-center gap-2
             bg-primary-600
             hover:bg-primary-700
              text-white px-4 py-2.5
              rounded-xl text-sm font-semibold
              shadow-sm shadow-primary-600/20
              transition-all duration-200
            "
          >
            <Plus size={17} strokeWidth={2.5} />
            Add Employee Type
          </button>

          <button
            onClick={() => setShowAddWorkLocationModal(true)}
            className="
              inline-flex items-center gap-2
              bg-primary-600
              hover:bg-primary-700
              text-white px-4 py-2.5
              rounded-xl text-sm font-semibold
              shadow-sm shadow-primary-600/20
              transition-all duration-200
            "
          >
            <Plus size={17} strokeWidth={2.5} />
            Add Work Location
          </button>

          <button
            onClick={openCreateForm}
            className="
              inline-flex items-center gap-2
              bg-primary-600
              hover:bg-primary-700
              text-white px-4 py-2.5
              rounded-xl text-sm font-semibold
              shadow-sm shadow-primary-600/20
              transition-all duration-200
            "
          >
            <Plus size={17} strokeWidth={2.5} />
            Add Employee
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* EMPLOYEE DIRECTORY INTRO */}
        <div
          className="
  relative overflow-hidden
  rounded-2xl
  border border-primary-200
  bg-gradient-to-r from-primary-100 via-primary-50 to-white
  p-6 sm:p-7
"
        >
          <div
            className="
    absolute -right-10 -top-12
    h-40 w-40 rounded-full
    bg-primary-200/40
  "
          />

          <div
            className="
    absolute right-24 -bottom-16
    h-36 w-36 rounded-full
    bg-primary-100/70
  "
          />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className="
        h-14 w-14 shrink-0
        rounded-2xl
        bg-primary-600
        text-white
        flex items-center justify-center
        shadow-lg shadow-primary-600/20
      "
              >
                <Users size={27} />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Employee Directory
                  </h2>

                  <span
                    className="
            inline-flex items-center gap-1
            rounded-full
            bg-primary-100
            border border-primary-200
            px-2.5 py-1
            text-[10px] font-bold uppercase tracking-wider
            text-primary-700
          "
                  >
                    <BadgeCheck size={12} />
                    HR Management
                  </span>
                </div>

                <p className="mt-1.5 text-sm text-slate-600 max-w-xl">
                  Manage employee records, employment details, departments, and
                  work assignments from one central directory.
                </p>
              </div>
            </div>

            <div
              className="
      relative flex items-center gap-2
      rounded-xl border border-primary-200
      bg-white/80 px-4 py-3
      text-sm font-semibold text-primary-700
      shadow-sm
    "
            >
              <UserCheck size={18} />
              <span>{totalEmployees} Registered Employees</span>
            </div>
          </div>
        </div>

        {/* =====================================================
            SUMMARY METRICS
        ====================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/*TOTAL EMPLOYEES */}
          <SummaryCard
            icon={<Users size={20} />}
            title="Total Employees"
            value={totalEmployees}
            description="Registered in organization"
            className="bg-primary-600"
          />

          {/* ACTIVE EMPLOYEES (present today, from attendance) */}
          <SummaryCard
            icon={<UserCheck size={20} />}
            title="Active Employees"
            value={presentToday}
            description="Present today · click to view attendance"
            onClick={() => navigate("/hr/attendance")}
            className="bg-primary-500"
          />

          {/*DEPARTMENTS */}
          <SummaryCard
            icon={<Building2 size={20} />}
            title="Departments"
            value={totalDeptsRepresented}
            description="Active database departments · click to view"
            onClick={() => navigate("/hr/departments")}
            className="bg-primary-700"
          />
        </div>

        {/* =====================================================
            SEARCH & FILTER CONTROLS
        ====================================================== */}
        <div
          className="
           overflow-hidden
           bg-white
           rounded-2xl
           border border-slate-200
           shadow-sm
"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Find Employees</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Search and filter your employee directory
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between p-4 sm:p-5">
            {/* Search Input */}

            <div className="relative flex-1 max-w-lg">
              <Search
                size={18}
                className="
                  absolute left-3.5 top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID (e.g. SE003), email, or role..."
                className="
                  w-full
                  pl-10 pr-10
                  py-2.5
                  bg-slate-50
                  border border-slate-200
                  rounded-xl
                  text-sm text-slate-800
                  placeholder:text-slate-400
                  focus:outline-none
                  focus:bg-white
                focus:border-primary-500
focus:ring-4
focus:ring-primary-500/10
                  transition-all
                "
              />

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="
                    absolute right-3 top-1/2
                    -translate-y-1/2
                    text-slate-400
                    hover:text-slate-600
                  "
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-slate-400" />

                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="
                    px-3 py-2
                    bg-slate-50
                    border border-slate-200
                    rounded-xl
                    text-xs font-semibold
                    text-slate-700
                    focus:outline-none
                    focus:bg-white
                    focus:border-primary-500
focus:ring-4
focus:ring-primary-500/10
                  "
                >
                  <option value="ALL">All Departments</option>

                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.shortCode ? `(${d.shortCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <span
                className="
                text-xs text-slate-500
                font-medium
              "
              >
                Showing{" "}
                <strong className="text-slate-800">
                  {sortedEmployees.length}
                </strong>{" "}
                of {employees.length}
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================
            EMPLOYEE TABLE
        ====================================================== */}
        <div
          className="
          bg-white
          rounded-2xl
          border border-slate-200
          shadow-sm
        "
        >
          {/* Desktop Table Header */}
          <div
            className="
            hidden lg:grid
            grid-cols-[2fr_1fr_1.2fr_1.2fr_1.1fr_1fr_110px]
            gap-4
            px-6 py-3.5
           bg-primary-50
          border-b border-primary-100
           rounded-t-2xl
          text-primary-800
          "
          >
            <TableHeader
              onClick={() => toggleSort("fullName")}
              sortDir={sortKey === "fullName" ? sortDir : null}
            >
              Employee
            </TableHeader>

            <TableHeader
              onClick={() => toggleSort("employeeId")}
              sortDir={sortKey === "employeeId" ? sortDir : null}
            >
              ID
            </TableHeader>

            <TableHeader
              onClick={() => toggleSort("department")}
              sortDir={sortKey === "department" ? sortDir : null}
            >
              Department
            </TableHeader>

            <TableHeader
              onClick={() => toggleSort("designation")}
              sortDir={sortKey === "designation" ? sortDir : null}
            >
              Job Role
            </TableHeader>

            <TableHeader
              onClick={() => toggleSort("dob")}
              sortDir={sortKey === "dob" ? sortDir : null}
            >
              Birthday
            </TableHeader>

            <TableHeader
              onClick={() => toggleSort("phone")}
              sortDir={sortKey === "phone" ? sortDir : null}
            >
              Phone
            </TableHeader>

            <TableHeader className="text-right">Actions</TableHeader>
          </div>

          {/* Content States */}
          {loading ? (
            <div
              className="
              py-20
              flex flex-col
              items-center
              justify-center
              text-center
            "
            >
              <div
                className="
                h-11 w-11
                rounded-xl
                bg-primary-50
                text-primary-600
                flex items-center
                justify-center
                mb-4
              "
              >
                <Loader2 size={22} className="animate-spin" />
              </div>

              <p
                className="
                text-sm
                font-medium
                text-slate-700
              "
              >
                Loading employee directory...
              </p>

              <p
                className="
                text-xs
                text-slate-400
                mt-1
              "
              >
                Fetching latest records from database
              </p>
            </div>
          ) : sortedEmployees.length === 0 ? (
            <div
              className="
              py-16 px-6
              flex flex-col
              items-center
              justify-center
              text-center
            "
            >
              <div
                className="
                h-16 w-16
                rounded-2xl
                bg-primary-50
                text-primary-600
                flex items-center
                justify-center
                mb-4
              "
              >
                {searchTerm ? <Search size={28} /> : <Users size={28} />}
              </div>

              <h3
                className="
                text-base
                font-bold
                text-slate-800
              "
              >
                {searchTerm ? "No employees found" : "No employees added yet"}
              </h3>

              <p
                className="
                text-sm
                text-slate-500
                mt-1
                max-w-sm
              "
              >
                {searchTerm
                  ? "Try clearing your search query or choosing another department."
                  : "Start onboarding by adding your first employee to the database."}
              </p>

              {!searchTerm && (
                <button
                  onClick={openCreateForm}
                  className="
                    mt-5
                    inline-flex
                    items-center
                    gap-2
                    bg-primary-600
                    hover:bg-primary-700
                    text-white
                    px-4 py-2.5
                    rounded-xl
                    text-sm
                    font-semibold
                    transition-colors
                  "
                >
                  <Plus size={16} />
                  Add Employee
                </button>
              )}
            </div>
          ) : (
            <div
              className="
              divide-y
              divide-slate-100
            "
            >
              {paginatedEmployees.map((emp) => {
                const empId = emp.employeeId || `EMP-${emp.id}`;

                const deptName = emp.departmentName || emp.department || "—";

                const roleTitle = emp.designation || emp.role || "—";

                return (
                  <div
                    key={emp.id}
                    className="
                      group
                      px-4 sm:px-6
                      py-4
                      hover:bg-primary-50/50
                      transition-colors
                    "
                  >
                    {/* Desktop View */}
                    <div
                      className="
                      hidden lg:grid
                      grid-cols-[2fr_1fr_1.2fr_1.2fr_1.1fr_1fr_110px]
                      gap-4
                      items-center
                    "
                    >
                      {/* Employee */}
                      <div
                        className="
                        flex items-center
                        gap-3 min-w-0
                      "
                      >
                        <div
                          className="
                          h-10 w-10
                          flex-shrink-0
                          rounded-xl
                          bg-primary-600
                          text-white
                          font-bold
                          text-sm
                          flex items-center
                          justify-center
                          shadow-sm
                        "
                        >
                          {emp.fullName
                            ? emp.fullName.charAt(0).toUpperCase()
                            : "E"}
                        </div>

                        <div className="min-w-0">
                          <button
                            onClick={() => setViewingEmployee(emp)}
                            className="
                              text-sm
                              font-semibold
                              text-slate-800
                              hover:text-primary-600
                              truncate
                              text-left
                              block
                              transition-colors
                            "
                          >
                            {emp.fullName}
                          </button>

                          <p
                            className="
                            text-xs
                            text-slate-400
                            truncate
                            mt-0.5
                          "
                          >
                            {emp.email}
                          </p>
                        </div>
                      </div>

                      {/* ID */}
                      <div>
                        <span
                          className="
                          inline-flex
                          items-center
                          px-2.5 py-1
                          rounded-lg
                          bg-slate-100
                          text-slate-700
                          font-mono
                          text-xs
                          font-bold
                          border
                          border-slate-200
                        "
                        >
                          {empId}
                        </span>
                      </div>

                      {/* Department */}
                      <div
                        className="
                        flex items-center
                        gap-1.5
                        min-w-0
                      "
                      >
                        <Building2
                          size={14}
                          className="
                            text-primary-600
                            flex-shrink-0
                          "
                        />

                        <span
                          className="
                          text-sm
                          text-slate-700
                          font-medium
                          truncate
                        "
                        >
                          {deptName}
                        </span>
                      </div>

                      {/* Job Role */}
                      <div
                        className="
                        flex items-center
                        gap-1.5
                        min-w-0
                      "
                      >
                        <BriefcaseBusiness
                          size={14}
                          className="
                            text-slate-400
                            flex-shrink-0
                          "
                        />

                        <span
                          className="
                          text-sm
                          text-slate-700
                          font-semibold
                          truncate
                        "
                        >
                          {roleTitle}
                        </span>
                      </div>

                      {/* Birthday */}
                      <div
                        className="
                        flex items-center
                        gap-1.5
                        text-xs
                        text-slate-600
                      "
                      >
                        <Calendar
                          size={13}
                          className="
                            text-slate-400
                            flex-shrink-0
                          "
                        />

                        <span>{emp.dob || emp.birthday || "—"}</span>
                      </div>

                      {/* Phone */}
                      <div
                        className="
                        flex items-center
                        gap-1.5
                        text-xs
                        text-slate-600
                      "
                      >
                        <Phone
                          size={13}
                          className="
                            text-slate-400
                            flex-shrink-0
                          "
                        />

                        <span className="truncate">
                          {emp.phone || emp.phoneNumber || "—"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div
                        className="
                        flex items-center
                        justify-end
                        gap-1
                      "
                      >
                        <button
                          type="button"
                          onClick={() => setViewingEmployee(emp)}
                          title="View Employee Details"
                          className="
                            h-8 w-8
                            rounded-lg
                            flex items-center
                            justify-center
                            text-slate-400
                            hover:text-primary-600
                            hover:bg-primary-50
                            transition-colors
                          "
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(emp)}
                          title="Edit Employee"
                          className="
                            h-8 w-8
                            rounded-lg
                            flex items-center
                            justify-center
                            text-slate-400
                           hover:text-primary-600
                           hover:bg-primary-50
                            transition-colors
                          "
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(emp)}
                          title="Delete Employee"
                          className="
                            h-8 w-8
                            rounded-lg
                            flex items-center
                            justify-center
                            text-slate-400
                            hover:text-red-600
                            hover:bg-red-50
                            transition-colors
                          "
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div
                      className="
                      lg:hidden
                      space-y-3
                    "
                    >
                      <div
                        className="
                        flex items-start
                        justify-between
                        gap-3
                      "
                      >
                        <div
                          className="
                          flex items-center
                          gap-3
                          min-w-0
                        "
                        >
                          <div
                            className="
                            h-11 w-11
                            flex-shrink-0
                            rounded-xl
                            bg-gradient-to-br
                          from-primary-600
                          to-primary-700
                            text-white
                            font-bold
                            text-sm
                            flex items-center
                            justify-center
                          "
                          >
                            {emp.fullName
                              ? emp.fullName.charAt(0).toUpperCase()
                              : "E"}
                          </div>

                          <div className="min-w-0">
                            <button
                              onClick={() => setViewingEmployee(emp)}
                              className="
                                font-semibold
                                text-slate-800
                                text-sm
                                truncate
                                text-left
                                block
                              "
                            >
                              {emp.fullName}
                            </button>

                            <p
                              className="
                              text-xs
                              text-slate-400
                              truncate
                              mt-0.5
                            "
                            >
                              {emp.email}
                            </p>
                          </div>
                        </div>

                        <span
                          className="
                          px-2.5 py-1
                          rounded-lg
                          bg-slate-100
                          text-slate-700
                          font-mono
                          text-xs
                          font-bold
                          border
                          border-slate-200
                        "
                        >
                          {empId}
                        </span>
                      </div>

                      <div
                        className="
                        grid grid-cols-2
                        gap-2
                        text-xs
                        pt-2
                      "
                      >
                        <div
                          className="
                          bg-slate-50
                          p-2.5
                          rounded-xl
                        "
                        >
                          <span
                            className="
                            text-slate-400
                            block
                            text-[11px]
                          "
                          >
                            Department
                          </span>

                          <span
                            className="
                            font-semibold
                            text-slate-700
                            truncate
                            block
                            mt-0.5
                          "
                          >
                            {deptName}
                          </span>
                        </div>

                        <div
                          className="
                          bg-slate-50
                          p-2.5
                          rounded-xl
                        "
                        >
                          <span
                            className="
                            text-slate-400
                            block
                            text-[11px]
                          "
                          >
                            Job Role
                          </span>

                          <span
                            className="
                            font-semibold
                            text-slate-700
                            truncate
                            block
                            mt-0.5
                          "
                          >
                            {roleTitle}
                          </span>
                        </div>

                        <div
                          className="
                          bg-slate-50
                          p-2.5
                          rounded-xl
                        "
                        >
                          <span
                            className="
                            text-slate-400
                            block
                            text-[11px]
                          "
                          >
                            Birthday
                          </span>

                          <span
                            className="
                            font-medium
                            text-slate-600
                            block
                            mt-0.5
                          "
                          >
                            {emp.dob || emp.birthday || "—"}
                          </span>
                        </div>

                        <div
                          className="
                          bg-slate-50
                          p-2.5
                          rounded-xl
                        "
                        >
                          <span
                            className="
                            text-slate-400
                            block
                            text-[11px]
                          "
                          >
                            Phone
                          </span>

                          <span
                            className="
                            font-medium
                            text-slate-600
                            truncate
                            block
                            mt-0.5
                          "
                          >
                            {emp.phone || emp.phoneNumber || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div
                        className="
                        flex items-center
                        gap-2
                        pt-2
                        border-t
                        border-slate-100
                      "
                      >
                        <button
                          type="button"
                          onClick={() => setViewingEmployee(emp)}
                          className="
                            flex-1
                            py-2 px-2.5
                            rounded-xl
                            bg-slate-50
                            hover:bg-primary-50
                            text-slate-600
                            hover:text-primary-600
                            border
                            border-slate-200
                            text-xs
                            font-semibold
                            flex items-center
                            justify-center
                            gap-1.5
                            transition-colors
                          "
                        >
                          <Eye size={14} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(emp)}
                          className="
                            flex-1
                            py-2 px-2.5
                            rounded-xl
                            bg-slate-50
                            hover:bg-primary-50
                            text-slate-600
                            hover:text-primary-600
                            border
                            border-slate-200
                            text-xs
                            font-semibold
                            flex items-center
                            justify-center
                            gap-1.5
                            transition-colors
                          "
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(emp)}
                          className="
                            flex-1
                            py-2 px-2.5
                            rounded-xl
                            bg-slate-50
                            hover:bg-red-50
                            text-slate-600
                            hover:text-red-600
                            border
                            border-slate-200
                            text-xs
                            font-semibold
                            flex items-center
                            justify-center
                            gap-1.5
                            transition-colors
                          "
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Filler rows keep the table height constant across pages,
                  so the pagination bar stays in a fixed position. */}
              {paginatedEmployees.length > 0 &&
                paginatedEmployees.length < ROWS_PER_PAGE &&
                Array.from({
                  length: ROWS_PER_PAGE - paginatedEmployees.length,
                }).map((_, idx) => (
                  <div
                    key={`filler-${idx}`}
                    aria-hidden="true"
                    className="hidden lg:block px-4 sm:px-6 py-4 h-[73px]"
                  />
                ))}
            </div>
          )}

          {/* =====================================================
              PAGINATION CONTROLS
          ====================================================== */}
          {!loading && sortedEmployees.length > 0 && (
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={sortedEmployees.length}
              pageSize={ROWS_PER_PAGE}
            />
          )}
        </div>
      </div>

      {/* =====================================================
          VIEW DETAILS MODAL
      ====================================================== */}
      {viewingEmployee && (
        <div
          className="
          fixed inset-0
          z-[100]
          bg-slate-900/40
          backdrop-blur-sm
          flex items-center
          justify-center
          p-4
        "
        >
          <div
            className="
            bg-white
            w-full
            max-w-lg
            rounded-2xl
            shadow-2xl
            overflow-hidden
            flex flex-col
          "
          >
            {/* Modal Header */}
            <div
              className="
              p-6
              bg-gradient-to-br
            from-primary-600
            to-primary-700
              text-white
              relative
            "
            >
              <button
                onClick={() => setViewingEmployee(null)}
                className="
                  absolute
                  top-4 right-4
                  h-8 w-8
                  rounded-lg
                  bg-white/10
                  hover:bg-white/20
                  flex items-center
                  justify-center
                  transition-colors
                "
              >
                <X size={17} />
              </button>

              <div
                className="
                flex items-center
                gap-4
              "
              >
                <div
                  className="
                  h-16 w-16
                  rounded-2xl
                  bg-white/15
                  border border-white/20
                  text-white
                  font-bold
                  text-2xl
                  flex items-center
                  justify-center
                  shadow-inner
                "
                >
                  {viewingEmployee.fullName
                    ? viewingEmployee.fullName.charAt(0).toUpperCase()
                    : "E"}
                </div>

                <div>
                  <h2
                    className="
                    text-xl
                    font-bold
                  "
                  >
                    {viewingEmployee.fullName}
                  </h2>

                  <p
                    className="
                    text-primary-100
                    text-sm
                    mt-0.5
                  "
                  >
                    {viewingEmployee.designation ||
                      viewingEmployee.role ||
                      "Employee"}
                  </p>

                  <span
                    className="
                    inline-block
                    mt-2
                    font-mono
                    text-xs
                    font-bold
                    px-2.5 py-0.5
                    bg-white/20
                    rounded-md
                  "
                  >
                    {viewingEmployee.employeeId || `EMP-${viewingEmployee.id}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div
              className="
              p-6
              space-y-4
              text-sm
            "
            >
              <div
                className="
                grid
                grid-cols-2
                gap-3
              "
              >
                <DetailItem
                  icon={<Mail size={15} />}
                  label="Email Address"
                  value={viewingEmployee.email}
                />

                <DetailItem
                  icon={<Phone size={15} />}
                  label="Phone Number"
                  value={
                    viewingEmployee.phone || viewingEmployee.phoneNumber || "—"
                  }
                />

                <DetailItem
                  icon={<Calendar size={15} />}
                  label="Birthday"
                  value={viewingEmployee.dob || viewingEmployee.birthday || "—"}
                />

                <DetailItem
                  icon={<Building2 size={15} />}
                  label="Department"
                  value={
                    viewingEmployee.departmentName ||
                    viewingEmployee.department ||
                    "—"
                  }
                />

                <DetailItem
                  icon={<BriefcaseBusiness size={15} />}
                  label="Job Role"
                  value={
                    viewingEmployee.designation || viewingEmployee.role || "—"
                  }
                />

                <DetailItem
                  icon={<UserCheck size={15} />}
                  label="Status"
                  value={viewingEmployee.status || "ACTIVE"}
                />
              </div>

              {viewingEmployee.joiningDate && (
                <div
                  className="
                  bg-slate-50
                  p-3
                  rounded-xl
                  border
                  border-slate-100
                  text-xs
                  text-slate-500
                "
                >
                  Joined on:{" "}
                  <strong
                    className="
                    text-slate-700
                  "
                  >
                    {viewingEmployee.joiningDate}
                  </strong>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="
              px-6 py-4
              border-t
              border-slate-200
              bg-slate-50
              flex items-center
              justify-end
              gap-3
            "
            >
              <button
                onClick={() => {
                  const emp = viewingEmployee;
                  setViewingEmployee(null);
                  setDeleteTarget(emp);
                }}
                className="
                  mr-auto
                  px-4 py-2
                  rounded-xl
                  bg-white
                  border border-red-200
                  text-red-600
                  text-sm
                  font-semibold
                  hover:bg-red-50
                  flex items-center
                  gap-1.5
                  transition-colors
                "
              >
                <Trash2 size={14} />
                Delete Employee
              </button>

              <button
                onClick={() => setViewingEmployee(null)}
                className="
                  px-4 py-2
                  rounded-xl
                  bg-white
                  border border-slate-200
                  text-slate-700
                  text-sm
                  font-semibold
                  hover:bg-slate-100
                "
              >
                Close
              </button>

              <button
                onClick={() => {
                  const emp = viewingEmployee;

                  setViewingEmployee(null);

                  handleEdit(emp);
                }}
                className="
                    px-4 py-2
                    rounded-xl
                   bg-primary-600
                   hover:bg-primary-700
                   text-white
                    text-sm
                    font-semibold
                    flex items-center
                    gap-1.5
                    transition-colors
                    "
              >
                <Edit3 size={14} />
                Edit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD EMPLOYEE TYPE POPUP
      ====================================================== */}
      <NameListModal
        open={showAddEmployeeTypeModal}
        onClose={() => setShowAddEmployeeTypeModal(false)}
        title="Add Employee Type"
        subtitle="Define the employment arrangements used in your company"
        heading="Employment Types"
        hint="Add as many as you need, e.g. Full-Time, Part-Time, Internship"
        placeholder="Employment type, e.g. Full-Time"
        addLabel="Add another employment type"
        saveLabel="Save Employment Types"
        existingLabel="Existing employment types"
        emptyLabel="No employment types added yet"
        icon={BadgeCheck}
        load={hrApi.getEmploymentTypes}
        save={hrApi.createEmploymentTypes}
        onUpdate={hrApi.updateEmploymentType}
        onDelete={hrApi.deleteEmploymentType}
      />

      {/* =====================================================
          ADD WORK LOCATION POPUP
      ====================================================== */}
      <NameListModal
        open={showAddWorkLocationModal}
        onClose={() => setShowAddWorkLocationModal(false)}
        title="Add Work Location"
        subtitle="Define the work locations used in your company"
        heading="Work Locations"
        hint="Add as many as you need, e.g. Head Office, Branch Office, Remote"
        placeholder="Work location, e.g. Head Office"
        addLabel="Add another work location"
        saveLabel="Save Work Locations"
        existingLabel="Existing work locations"
        emptyLabel="No work locations added yet"
        icon={MapPin}
        load={hrApi.getWorkLocations}
        save={hrApi.createWorkLocations}
        onUpdate={hrApi.updateWorkLocation}
        onDelete={hrApi.deleteWorkLocation}
      />

      {/* =====================================================
          ADD EMPLOYEE POPUP WIZARD
      ====================================================== */}
      <AddEmployeeModal
        open={showAddEmployeeModal}
        employee={editingEmployee}
        onClose={() => {
          setShowAddEmployeeModal(false);
          setEditingEmployee(null);
        }}
        departments={departments}
        onDelete={(emp) => {
          setShowAddEmployeeModal(false);
          setEditingEmployee(null);
          setDeleteTarget(emp);
        }}
        onSuccess={async () => {
          await fetchEmployees();
          setShowAddEmployeeModal(false);
          setEditingEmployee(null);
        }}
      />

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ====================================================== */}
      {deleteTarget && (
        <div
          className="
          fixed inset-0
          z-[100]
          bg-slate-900/40
          backdrop-blur-sm
          flex items-center
          justify-center
          p-4
        "
        >
          <div
            className="
            bg-white
            w-full
            max-w-md
            rounded-2xl
            shadow-2xl
            p-6
          "
          >
            <div
              className="
              flex items-start
              gap-4
            "
            >
              <div
                className="
                h-11 w-11
                flex-shrink-0
                rounded-xl
                bg-red-50
                text-red-600
                flex items-center
                justify-center
              "
              >
                <AlertCircle size={22} />
              </div>

              <div>
                <h3
                  className="
                  text-base
                  font-bold
                  text-slate-900
                "
                >
                  Delete Employee?
                </h3>

                <p
                  className="
                  text-sm
                  text-slate-500
                  mt-1
                  leading-relaxed
                "
                >
                  Are you sure you want to permanently delete{" "}
                  <strong
                    className="
                    text-slate-800
                  "
                  >
                    {deleteTarget.fullName}
                  </strong>{" "}
                  ({deleteTarget.employeeId})? Their account and related records
                  (leave, payslips, salary) will be removed. This cannot be
                  undone.
                </p>
              </div>
            </div>

            <div
              className="
              flex
              justify-end
              gap-3
              mt-6
            "
            >
              <button
                onClick={() => setDeleteTarget(null)}
                className="
                  px-4 py-2.5
                  rounded-xl
                  bg-slate-100
                  hover:bg-slate-200
                  text-slate-700
                  text-sm
                  font-semibold
                  transition-colors
                "
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="
                  px-4 py-2.5
                  rounded-xl
                  bg-red-600
                  hover:bg-red-700
                  text-white
                  text-sm
                  font-semibold
                  flex items-center
                  gap-2
                  transition-colors
                "
              >
                <Trash2 size={15} />
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

// ─────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────

const TableHeader = ({ children, className = "", onClick, sortDir }) => (
  <div
    onClick={onClick}
    className={`
      text-[11px]
      font-bold
      uppercase
      tracking-wider
      text-primary-800
${onClick ? "flex items-center gap-1 cursor-pointer select-none hover:text-primary-600" : ""}
      ${className}
    `}
  >
    {children}
    {onClick &&
      (sortDir ? (
        sortDir === "asc" ? (
          <ChevronUp size={12} />
        ) : (
          <ChevronDown size={12} />
        )
      ) : (
        <ArrowUpDown size={11} className="opacity-60" />
      ))}
  </div>
);


const SummaryCard = ({
  icon,
  title,
  value,
  description,
  className = "",
  onClick,
}) => (
  <div
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    className={`
      relative overflow-hidden
      rounded-2xl
      p-5
      text-white
      shadow-sm
      hover:shadow-lg
      transition-all duration-300
      min-h-[140px]
      ${onClick ? "cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300" : ""}
      ${className}
    `}
  >
    {/* Decorative background circles */}
    <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -right-2 -bottom-10 w-28 h-28 rounded-full bg-white/10" />

    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
          {title}
        </p>

        <p className="mt-3 text-3xl font-bold text-white">
          {value}
        </p>

        {description && (
          <p className="mt-2 text-xs text-white/80">
            {description}
          </p>
        )}
      </div>

      <div className="h-11 w-11 rounded-xl bg-white/20 text-white flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
    </div>
  </div>
);


const DetailItem = ({ icon, label, value }) => (
  <div
    className="
    bg-slate-50
    p-3
    rounded-xl
    border
    border-slate-100
  "
  >
    <div
      className="
      flex items-center
      gap-1.5
      text-slate-400
      text-xs
    "
    >
      {icon}

      <span>{label}</span>
    </div>

    <p
      className="
      mt-1
      font-semibold
      text-slate-800
      text-sm
      truncate
    "
    >
      {value}
    </p>
  </div>
);

// ─────────────────────────────────────────────
// PAGINATION BAR — page numbers + prev/next
// ─────────────────────────────────────────────
const PaginationBar = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}) => {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build a compact page list: first, last, current, and neighbors,
  // with "…" gaps for anything skipped.
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= currentPage - 1 && p <= currentPage + 1)
    ) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div
      className="
      flex flex-col
      items-center
      gap-2
      px-4 sm:px-6
      py-4
      border-t border-slate-100
    "
    >
      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="
            h-8 w-8
            rounded-lg
            flex items-center justify-center
            text-slate-500
            border border-slate-200
            hover:bg-slate-50
            disabled:opacity-40
            disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-1.5 text-xs text-slate-400 select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`
                h-8 min-w-[2rem] px-2
                rounded-lg
                text-xs font-semibold
                transition-colors
                ${
                  p === currentPage
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-slate-600 border border-slate-200 hover:bg-slate-50"
                }
              `}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="
            h-8 w-8
            rounded-lg
            flex items-center justify-center
            text-slate-500
            border border-slate-200
            hover:bg-slate-50
            disabled:opacity-40
            disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <p className="text-xs text-slate-500 font-medium">
        Showing{" "}
        <strong className="text-slate-800">
          {start}-{end}
        </strong>{" "}
        of <strong className="text-slate-800">{totalItems}</strong> employees
      </p>
    </div>
  );
};

export default Employee;
