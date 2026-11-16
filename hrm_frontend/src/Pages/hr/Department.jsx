import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
  X,
  Trash2,
  Edit3,
  Eye,
  Users,
  BriefcaseBusiness,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  MoreVertical,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  Layers3,
} from "lucide-react";

import { PageLayout } from "../../components/PageLayout";
import NotificationPopup from "../../components/NotificationPopup.jsx";
import { hrApi, userHrApi } from "../../services/api";

// Removes the status prefix added by the API helper.
const cleanError = (error) =>
  String(error?.message || "").replace(/^\d{3}:\s*/, "").trim();

const Department = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingDepartment, setEditingDepartment] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [deleteDepartment, setDeleteDepartment] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    shortCode: "",
    description: "",
    jobRoles: [{ jobTitle: "" }],
  });

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        if (
          parsedUser.role !== "HR_MANAGER" &&
          parsedUser.role !== "ADMIN"
        ) {
          navigate("/unauthorized");
          return;
        }

        setUser(parsedUser);
      } catch (error) {
        console.error("Invalid user data:", error);
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // ---------------------------------------------------------
  // FETCH DEPARTMENTS
  // ---------------------------------------------------------

  const fetchDepartments = async () => {
    setLoading(true);

    try {
      const response = await hrApi.getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await userHrApi.getEmployees();
      const list = response?.data || response || [];

      setEmployees(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchDepartments();
    fetchEmployees();
  }, [user]);

  // ---------------------------------------------------------
  // LIVE EMPLOYEE COUNTS PER DEPARTMENT
  // ---------------------------------------------------------

  const employeeCountByDept = useMemo(() => {
    const map = {};

    employees.forEach((emp) => {
      const deptName = (
        emp.departmentName ||
        emp.department ||
        ""
      )
        .trim()
        .toLowerCase();

      if (!deptName) return;

      map[deptName] = (map[deptName] || 0) + 1;
    });

    return map;
  }, [employees]);

  const getEmployeeCount = (department) => {
    const key = (department?.name || "").trim().toLowerCase();
    return employeeCountByDept[key] || 0;
  };

  // ---------------------------------------------------------
  // FORM HELPERS
  // ---------------------------------------------------------

  const resetForm = () => {
    setFormData({
      name: "",
      shortCode: "",
      description: "",
      jobRoles: [{ jobTitle: "" }],
    });

    setEditingDepartment(null);
    setFormError("");
  };

  const openCreateForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    resetForm();
    setShowAddForm(false);
  };

  const handleDepartmentChange = (field, value) => {
    setFormError("");

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ---------------------------------------------------------
  // JOB ROLE FUNCTIONS
  // ---------------------------------------------------------

  const addJobRole = () => {
    setFormData((prev) => ({
      ...prev,
      jobRoles: [...prev.jobRoles, { jobTitle: "" }],
    }));
  };

  const removeJobRole = (index) => {
    if (formData.jobRoles.length === 1) return;

    setFormData((prev) => ({
      ...prev,
      jobRoles: prev.jobRoles.filter((_, i) => i !== index),
    }));
  };

  const updateJobRole = (index, field, value) => {
    setFormError("");

    setFormData((prev) => ({
      ...prev,
      jobRoles: prev.jobRoles.map((role, i) =>
        i === index ? { ...role, [field]: value } : role
      ),
    }));
  };

  // ---------------------------------------------------------
  // CREATE / UPDATE DEPARTMENT
  // ---------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Department name is required.");
      return;
    }

    if (!formData.shortCode.trim()) {
      setFormError("Short code is required.");
      return;
    }

    const jobRolesToSave = [];
    const seenTitles = new Set();

    for (let i = 0; i < formData.jobRoles.length; i++) {
      const role = formData.jobRoles[i];
      const title = (role.jobTitle || "").trim();

      if (!title) continue;

      const key = title.toLowerCase();

      if (seenTitles.has(key)) {
        setFormError(
          `Job title "${title}" is listed more than once for this department.`
        );
        return;
      }

      seenTitles.add(key);
      jobRolesToSave.push({ jobTitle: title });
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        shortCode: formData.shortCode.trim().toUpperCase(),
        description: formData.description.trim() || null,
        jobRoles: jobRolesToSave,
      };

      let savedDepartment = null;

      if (editingDepartment) {
        const response = await hrApi.updateDepartment(
          editingDepartment.id,
          payload
        );

        savedDepartment = response?.data || null;
      } else {
        const response = await hrApi.createDepartment(payload);
        savedDepartment = response?.data || null;
      }

      await fetchDepartments();

      const storedCount = savedDepartment?.jobRoles?.length;

      if (
        savedDepartment &&
        storedCount !== undefined &&
        storedCount !== jobRolesToSave.length
      ) {
        alert(
          `Department saved, but only ${storedCount} of ${jobRolesToSave.length} job role(s) were stored. ` +
            "Please open the department and check its job roles."
        );
      }

      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to save department:", error);

      setFormError(
        cleanError(error) ||
          "Failed to save department to database. Please check your backend connection."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // EDIT DEPARTMENT
  // ---------------------------------------------------------

  const handleEdit = (department) => {
    setOpenMenu(null);
    setEditingDepartment(department);

    setFormData({
      name: department.name || "",
      shortCode: department.shortCode || department.code || "",
      description: department.description || "",
      jobRoles:
        department.jobRoles?.length > 0
          ? department.jobRoles.map((role) => ({
              jobTitle: role.jobTitle || role.title || "",
            }))
          : [{ jobTitle: "" }],
    });

    setShowAddForm(true);
  };

  // ---------------------------------------------------------
  // DELETE DEPARTMENT
  // ---------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteDepartment) return;

    try {
      await hrApi.deleteDepartment(deleteDepartment.id);

      setDepartments((prev) =>
        prev.filter(
          (department) => department.id !== deleteDepartment.id
        )
      );

      await fetchDepartments();
      setDeleteDepartment(null);
    } catch (error) {
      console.error("Failed to delete department:", error);

      alert(cleanError(error) || "Failed to delete department.");

      setDeleteDepartment(null);
      fetchDepartments();
    }
  };

  // ---------------------------------------------------------
  // SEARCH AND FILTER
  // ---------------------------------------------------------

  const filteredDepartments = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return departments.filter((department) => {
      if (
        selectedDeptFilter !== "ALL" &&
        department.name !== selectedDeptFilter
      ) {
        return false;
      }

      if (!search) return true;

      const name = department.name?.toLowerCase() || "";

      const code = (
        department.shortCode ||
        department.code ||
        ""
      ).toLowerCase();

      const description = department.description?.toLowerCase() || "";

      return (
        name.includes(search) ||
        code.includes(search) ||
        description.includes(search)
      );
    });
  }, [departments, searchTerm, selectedDeptFilter]);

  // ---------------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------------

  const ROWS_PER_PAGE = 6;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDepartments.length / ROWS_PER_PAGE)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDeptFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;

    return filteredDepartments.slice(
      start,
      start + ROWS_PER_PAGE
    );
  }, [filteredDepartments, currentPage]);

  // ---------------------------------------------------------
  // SUMMARY DATA
  // ---------------------------------------------------------

  const totalDepartments = departments.length;
  const totalEmployees = employees.length;

  const totalJobRoles = departments.reduce(
    (total, department) => {
      const count =
        department.jobRoleCount ??
        department.jobRoles?.length ??
        0;

      return total + count;
    },
    0
  );

  if (!user) return null;

  return (
    <PageLayout
      role="hr"
      activePage="Departments"
      title="Departments"
      subtitle="Manage your organization's departments and job roles"
      actions={
        <button
          onClick={openCreateForm}
          className="
            inline-flex items-center justify-center gap-2
            px-5 py-2.5
            rounded-xl
            bg-primary-700 hover:bg-primary-800
            text-white text-sm font-semibold
            shadow-md shadow-primary-700/20
            hover:shadow-lg hover:shadow-primary-700/25
            transition-all duration-200
          "
        >
          <Plus size={17} strokeWidth={2.5} />
          Add Department
        </button>
      }
    >
      <div className="space-y-7">

        {/* =====================================================
            SUMMARY CARDS - UNCHANGED
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <SummaryCard
            icon={<Building2 size={21} />}
            title="Total Departments"
            value={totalDepartments}
            description="Active in organization"
          />

          <SummaryCard
            icon={<BriefcaseBusiness size={21} />}
            title="Total Job Roles"
            value={totalJobRoles}
            description="Defined across departments"
          />

          <SummaryCard
            icon={<Users size={21} />}
            title="Total Employees"
            value={totalEmployees}
            description="Assigned to departments"
          />

        </div>

        {/* =====================================================
            DEPARTMENT DIRECTORY INTRO
        ====================================================== */}

        <div className="
          relative overflow-hidden
          rounded-2xl
          border border-primary-200
          bg-gradient-to-r
          from-primary-100
          via-primary-50
          to-white
          shadow-sm
        ">
          <div className="
            absolute inset-y-0 left-0
            w-1.5
            bg-primary-700
          " />

          <div className="
            absolute -right-12 -top-16
            h-48 w-48
            rounded-full
            bg-primary-200/50
          " />

          <div className="
            absolute right-24 -bottom-20
            h-36 w-36
            rounded-full
            bg-primary-100/70
          " />

          <div className="
            relative
            flex flex-col
            gap-4
            px-5 py-5 sm:px-6
            sm:flex-row sm:items-center sm:justify-between
          ">
            <div className="flex items-center gap-4">
              <div className="
                h-14 w-14
                flex-shrink-0
                rounded-2xl
                bg-primary-700
                text-white
                shadow-lg shadow-primary-700/20
                flex items-center justify-center
              ">
                <Layers3 size={25} />
              </div>

              <div>
                <p className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-primary-700
                ">
                  Organization Structure
                </p>

                <h2 className="text-base font-bold text-primary-950 mt-1">
                  Department Directory
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  View and organize your company's departments, teams, and roles.
                </p>
              </div>
            </div>

            <div className="
              inline-flex items-center gap-2
              w-fit
              px-4 py-2.5
              rounded-xl
              bg-white/80
              border border-primary-200
              shadow-sm
              text-xs font-semibold text-primary-800
            ">
              <span className="
                h-2.5 w-2.5 rounded-full
                bg-primary-600
                ring-4 ring-primary-100
              " />
              {departments.length} departments registered
            </div>
          </div>
        </div>

        {/* =====================================================
            SEARCH / FILTER BAR
        ====================================================== */}

        <div className="
          rounded-2xl
          border border-primary-100
          bg-gradient-to-br from-primary-50/70 via-white to-primary-50/40
          shadow-sm
          overflow-hidden
        ">
          <div className="
            px-5 py-4 sm:px-6
            border-b border-primary-100
            bg-primary-100/50
            flex items-center justify-between gap-3
          ">
            <div className="flex items-center gap-3">
              <div className="
                h-10 w-10
                rounded-xl
                bg-white
                border border-primary-200
                text-primary-700
                shadow-sm
                flex items-center justify-center
              ">
                <Search size={18} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-primary-950">
                  Find a department
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Search or filter your department records
                </p>
              </div>
            </div>

            <div className="
              hidden sm:flex
              h-10 w-10
              rounded-xl
              bg-white
              border border-primary-200
              items-center justify-center
              text-primary-700
              shadow-sm
            ">
              <Filter size={17} />
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="
              flex flex-col
              lg:flex-row
              gap-4
              lg:items-center
              lg:justify-between
            ">
              <div className="relative flex-1 max-w-2xl">
                <Search
                  size={18}
                  className="
                    absolute left-4
                    top-1/2
                    -translate-y-1/2
                    text-primary-600
                  "
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by department name, code or description..."
                  className="
                    w-full
                    pl-11 pr-11
                    py-3
                    rounded-xl
                    border border-primary-200
                    bg-white
                    text-sm text-slate-800
                    placeholder:text-slate-400
                    shadow-sm
                    focus:outline-none
                    focus:border-primary-500
                    focus:ring-4
                    focus:ring-primary-100
                    transition-all duration-200
                  "
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="
                      absolute right-3.5
                      top-1/2
                      -translate-y-1/2
                      h-7 w-7
                      rounded-lg
                      flex items-center justify-center
                      text-slate-400
                      hover:text-primary-700
                      hover:bg-primary-50
                      transition-colors
                    "
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="
                flex flex-col
                sm:flex-row
                sm:items-center
                gap-3
              ">
                <div className="relative flex items-center gap-2">
                  <Filter
                    size={16}
                    className="flex-shrink-0 text-primary-700"
                  />

                  <select
                    value={selectedDeptFilter}
                    onChange={(e) =>
                      setSelectedDeptFilter(e.target.value)
                    }
                    className="
                      w-full sm:w-auto
                      min-w-[180px]
                      px-3.5 py-3
                      rounded-xl
                      border border-primary-200
                      bg-white
                      text-xs font-semibold
                      text-slate-700
                      shadow-sm
                      focus:outline-none
                      focus:border-primary-500
                      focus:ring-4
                      focus:ring-primary-100
                      transition-all
                    "
                  >
                    <option value="ALL">All Departments</option>

                    {departments.map((department) => (
                      <option
                        key={department.id}
                        value={department.name}
                      >
                        {department.name}{" "}
                        {department.shortCode
                          ? `(${department.shortCode})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="
                  px-4 py-2.5
                  rounded-xl
                  bg-primary-700
                  border border-primary-700
                  text-xs
                  whitespace-nowrap
                  shadow-sm
                ">
                  <span className="text-primary-100">Results: </span>
                  <span className="font-bold text-white">
                    {filteredDepartments.length}
                  </span>
                  <span className="text-primary-100"> / {departments.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            DEPARTMENT TABLE
        ====================================================== */}

        <div className="
          bg-white
          rounded-2xl
          border border-primary-100
          shadow-sm
          overflow-hidden
        ">

          {/* Table Heading */}
          <div className="
            px-5 sm:px-6
            py-4
            bg-gradient-to-r from-primary-50 via-white to-primary-50/70
            border-b border-primary-100
            flex flex-col sm:flex-row
            sm:items-center sm:justify-between
            gap-2
          ">
            <div className="flex items-center gap-3">
              <div className="
                h-10 w-10
                rounded-xl
                bg-primary-700
                text-white
                shadow-sm
                flex items-center justify-center
              ">
                <Building2 size={18} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-primary-950">
                  All Departments
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Department information and workforce overview
                </p>
              </div>
            </div>

            <span className="
              inline-flex items-center gap-2
              w-fit
              px-3 py-2
              rounded-lg
              bg-white
              border border-primary-100
              text-xs font-semibold text-primary-800
            ">
              <Building2 size={14} />
              {filteredDepartments.length} records
            </span>
          </div>

          {/* Table Header */}
          <div className="
            hidden md:grid
            grid-cols-[2.2fr_1fr_1fr_1fr_140px]
            gap-4
            items-center
            px-6 py-4
            bg-primary-100/70
            border-b border-primary-200
          ">
            <TableHeader>Department</TableHeader>
            <TableHeader>Department Code</TableHeader>
            <TableHeader>Job Roles</TableHeader>
            <TableHeader>Employees</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="
              py-24
              flex flex-col
              items-center justify-center
              text-center
              bg-gradient-to-b from-primary-50/50 to-white
            ">
              <div className="
                h-16 w-16
                rounded-2xl
                bg-primary-100
                border border-primary-200
                text-primary-700
                shadow-sm
                flex items-center justify-center
                mb-4
              ">
                <Loader2 size={27} className="animate-spin" />
              </div>

              <p className="text-sm font-bold text-primary-900">
                Loading departments...
              </p>

              <p className="text-xs text-slate-500 mt-1.5">
                Please wait while we retrieve your records
              </p>
            </div>
          ) : filteredDepartments.length === 0 ? (

            /* Empty State */
            <div className="
              py-24 px-6
              flex flex-col
              items-center justify-center
              text-center
              bg-gradient-to-b from-primary-50/40 to-white
            ">
              <div className="
                h-20 w-20
                rounded-3xl
                bg-primary-100
                border border-primary-200
                text-primary-700
                shadow-sm
                flex items-center justify-center
                mb-5
              ">
                {searchTerm ? (
                  <Search size={29} />
                ) : (
                  <Building2 size={29} />
                )}
              </div>

              <h3 className="text-base font-bold text-primary-950">
                {searchTerm || selectedDeptFilter !== "ALL"
                  ? "No departments found"
                  : "No departments yet"}
              </h3>

              <p className="
                text-sm text-slate-500
                mt-2 max-w-sm leading-relaxed
              ">
                {searchTerm || selectedDeptFilter !== "ALL"
                  ? "Try changing your search term or selected filter to find a department."
                  : "Create your first department to start organizing your company."}
              </p>

              {!searchTerm && selectedDeptFilter === "ALL" && (
                <button
                  onClick={openCreateForm}
                  className="
                    mt-6
                    inline-flex items-center gap-2
                    px-5 py-2.5
                    rounded-xl
                    bg-primary-700
                    hover:bg-primary-800
                    text-white
                    text-sm font-semibold
                    shadow-md shadow-primary-700/20
                    transition-all
                  "
                >
                  <Plus size={16} />
                  Add Department
                </button>
              )}
            </div>

          ) : (

            /* Department Rows */
            <div className="divide-y divide-primary-100">

              {paginatedDepartments.map((department) => {
                const code =
                  department.shortCode ||
                  department.code ||
                  `DPT-${department.id}`;

                const roleCount =
                  department.jobRoleCount ??
                  department.jobRoles?.length ??
                  0;

                const employeeCount = getEmployeeCount(department);

                return (
                  <div
                    key={department.id}
                    className={`
                      group relative
                      px-4 sm:px-6
                      py-5
                      bg-white
                      hover:bg-gradient-to-r
                      hover:from-primary-50
                      hover:via-white
                      hover:to-primary-50/70
                      transition-all duration-200
                      ${openMenu === department.id ? "z-30" : "z-10"}
                    `}
                  >

                    {/* Desktop Row */}
                    <div className="
                      hidden md:grid
                      grid-cols-[2.2fr_1fr_1fr_1fr_140px]
                      gap-4
                      items-center
                    ">

                      {/* Department */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="
                          h-12 w-12
                          flex-shrink-0
                          rounded-xl
                          bg-gradient-to-br from-primary-100 to-primary-50
                          border border-primary-200
                          text-primary-800
                          shadow-sm
                          flex items-center justify-center
                          transition-all duration-200
                          group-hover:scale-105
                          group-hover:bg-primary-200
                        ">
                          <Building2 size={21} />
                        </div>

                        <div className="min-w-0">
                          <button
                            onClick={() =>
                              setSelectedDepartment(department)
                            }
                            className="
                              text-sm font-bold
                              text-slate-800
                              hover:text-primary-700
                              truncate
                              text-left
                              transition-colors
                            "
                          >
                            {department.name}
                          </button>

                          <p className="
                            text-xs text-slate-500
                            mt-1
                            truncate
                            max-w-md
                          ">
                            {department.description || "No description added"}
                          </p>
                        </div>
                      </div>

                      {/* Department Code */}
                      <div>
                        <span className="
                          inline-flex items-center
                          px-3 py-2
                          rounded-lg
                          bg-primary-50
                          border border-primary-200
                          text-primary-800
                          text-xs
                          font-bold
                          tracking-wide
                        ">
                          {code}
                        </span>
                      </div>

                      {/* Job Roles */}
                      <div className="flex items-center gap-3">
                        <div className="
                          h-10 w-10
                          rounded-xl
                          bg-primary-100
                          border border-primary-200
                          text-primary-800
                          flex items-center justify-center
                        ">
                          <BriefcaseBusiness size={16} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-primary-900">
                            {roleCount}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {roleCount === 1 ? "Role" : "Roles"}
                          </p>
                        </div>
                      </div>

                      {/* Employees */}
                      <div className="flex items-center gap-3">
                        <div className="
                          h-10 w-10
                          rounded-xl
                          bg-slate-100
                          border border-slate-200
                          text-slate-600
                          flex items-center justify-center
                        ">
                          <Users size={16} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {employeeCount}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {employeeCount === 1 ? "Employee" : "Employees"}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="
                        flex items-center
                        justify-end gap-1.5
                      ">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDepartment(department)
                          }
                          title="View Details"
                          aria-label="View Details"
                          className="
                            h-9 w-9
                            rounded-lg
                            border border-primary-100
                            bg-primary-50
                            flex items-center justify-center
                            text-primary-700
                            hover:text-white
                            hover:bg-primary-700
                            hover:border-primary-700
                            transition-all
                          "
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(department)}
                          title="Edit Department"
                          aria-label="Edit Department"
                          className="
                            h-9 w-9
                            rounded-lg
                            border border-primary-100
                            bg-primary-50
                            flex items-center justify-center
                            text-primary-700
                            hover:text-white
                            hover:bg-primary-700
                            hover:border-primary-700
                            transition-all
                          "
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteDepartment(department)}
                          title="Delete Department"
                          aria-label="Delete Department"
                          className="
                            h-9 w-9
                            rounded-lg
                            border border-red-100
                            bg-red-50
                            flex items-center justify-center
                            text-red-500
                            hover:text-white
                            hover:bg-red-600
                            hover:border-red-600
                            transition-all
                          "
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Row */}
                    <div className="md:hidden">
                      <div className="
                        flex items-start
                        justify-between gap-3
                      ">
                        <div className="
                          flex items-center
                          gap-3 min-w-0
                        ">
                          <div className="
                            h-12 w-12
                            flex-shrink-0
                            rounded-xl
                            bg-gradient-to-br from-primary-100 to-primary-50
                            border border-primary-200
                            text-primary-800
                            flex items-center justify-center
                          ">
                            <Building2 size={20} />
                          </div>

                          <div className="min-w-0">
                            <button
                              onClick={() =>
                                setSelectedDepartment(department)
                              }
                              className="
                                font-bold
                                text-slate-800
                                text-sm
                                truncate
                                text-left
                              "
                            >
                              {department.name}
                            </button>

                            <p className="
                              inline-flex items-center
                              mt-1 px-2 py-0.5
                              rounded-md
                              bg-primary-50
                              border border-primary-100
                              text-xs font-semibold text-primary-800
                            ">
                              {code}
                            </p>
                          </div>
                        </div>

                        {/* Mobile Side Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenu(
                                openMenu === department.id
                                  ? null
                                  : department.id
                              )
                            }
                            className={`
                              h-9 w-9
                              flex-shrink-0
                              rounded-lg
                              flex items-center justify-center
                              transition-colors
                              ${
                                openMenu === department.id
                                  ? "text-primary-800 bg-primary-100"
                                  : "text-slate-500 hover:bg-primary-50"
                              }
                            `}
                            aria-label="Department actions"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openMenu === department.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenu(null)}
                              />

                              <DepartmentMenu
                                mobile
                                onView={() => {
                                  setSelectedDepartment(department);
                                  setOpenMenu(null);
                                }}
                                onEdit={() => {
                                  handleEdit(department);
                                  setOpenMenu(null);
                                }}
                                onDelete={() => {
                                  setDeleteDepartment(department);
                                  setOpenMenu(null);
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {department.description && (
                        <p className="
                          text-xs text-slate-600
                          mt-3 ml-15
                          leading-relaxed
                        ">
                          {department.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="
                          bg-gradient-to-br from-primary-100 to-primary-50
                          border border-primary-200
                          rounded-xl p-3.5
                        ">
                          <div className="
                            flex items-center gap-2
                            text-primary-800
                          ">
                            <BriefcaseBusiness size={14} />
                            <p className="text-xs font-semibold">
                              Job Roles
                            </p>
                          </div>

                          <p className="
                            text-xl font-bold
                            text-primary-950 mt-2
                          ">
                            {roleCount}
                          </p>
                        </div>

                        <div className="
                          bg-gradient-to-br from-slate-100 to-slate-50
                          border border-slate-200
                          rounded-xl p-3.5
                        ">
                          <div className="
                            flex items-center gap-2
                            text-slate-600
                          ">
                            <Users size={14} />
                            <p className="text-xs font-semibold">
                              Employees
                            </p>
                          </div>

                          <p className="
                            text-xl font-bold
                            text-slate-800 mt-2
                          ">
                            {employeeCount}
                          </p>
                        </div>
                      </div>

                      {/* Mobile Action Buttons */}
                      <div className="
                        flex items-center gap-2
                        mt-4 pt-3
                        border-t border-primary-100
                      ">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDepartment(department)
                          }
                          className="
                            flex-1 py-2.5 px-2
                            rounded-xl
                            bg-primary-50
                            hover:bg-primary-700
                            text-primary-800
                            hover:text-white
                            border border-primary-200
                            hover:border-primary-700
                            text-xs font-semibold
                            flex items-center justify-center gap-1.5
                            transition-colors
                          "
                        >
                          <Eye size={14} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(department)}
                          className="
                            flex-1 py-2.5 px-2
                            rounded-xl
                            bg-primary-50
                            hover:bg-primary-700
                            text-primary-800
                            hover:text-white
                            border border-primary-200
                            hover:border-primary-700
                            text-xs font-semibold
                            flex items-center justify-center gap-1.5
                            transition-colors
                          "
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteDepartment(department)}
                          className="
                            flex-1 py-2.5 px-2
                            rounded-xl
                            bg-red-50
                            hover:bg-red-600
                            text-red-600
                            hover:text-white
                            border border-red-100
                            hover:border-red-600
                            text-xs font-semibold
                            flex items-center justify-center gap-1.5
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
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredDepartments.length > 0 && (
            <DeptPaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredDepartments.length}
              pageSize={ROWS_PER_PAGE}
            />
          )}
        </div>
      </div>

      {/* =====================================================
          ADD / EDIT DEPARTMENT MODAL
      ====================================================== */}

      {showAddForm && (
        <div className="
          fixed inset-0 z-50
          bg-slate-950/60
          backdrop-blur-sm
          flex items-center justify-center
          p-4
        ">
          <div className="
            bg-white
            w-full max-w-3xl
            max-h-[92vh]
            overflow-hidden
            rounded-2xl
            border border-primary-200
            shadow-2xl
            flex flex-col
          ">
            {/* Modal Header */}
            <div className="
              relative overflow-hidden
              px-6 py-5
              bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700
              flex items-center justify-between
            ">
              <div className="
                absolute -right-10 -top-16
                h-40 w-40
                rounded-full
                bg-white/10
              " />

              <div className="relative flex items-center gap-3">
                <div className="
                  h-11 w-11
                  rounded-xl
                  bg-white/15
                  border border-white/20
                  flex items-center justify-center
                  text-white
                  shadow-sm
                ">
                  <Building2 size={21} />
                </div>

                <div>
                  <p className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.16em]
                    text-primary-200
                  ">
                    Department Management
                  </p>

                  <h2 className="text-lg font-bold text-white mt-0.5">
                    {editingDepartment
                      ? "Edit Department"
                      : "Add Department"}
                  </h2>

                  <p className="text-xs text-primary-100 mt-1">
                    {editingDepartment
                      ? "Update this department's details and job roles"
                      : "Set up a new department for your organization"}
                  </p>
                </div>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                className="
                  relative
                  h-9 w-9
                  rounded-lg
                  flex items-center justify-center
                  text-white/80
                  bg-white/10
                  hover:bg-white/20
                  hover:text-white
                  disabled:opacity-50
                  transition-colors
                "
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col min-h-0"
            >
              <div className="
                overflow-y-auto
                p-6
                space-y-8
                bg-gradient-to-b from-primary-50/40 to-white
              ">
                {/* Department Information */}
                <section className="
                  rounded-2xl
                  border border-primary-100
                  bg-white
                  p-5
                  shadow-sm
                ">
                  <SectionTitle
                    number="01"
                    title="Department Information"
                    description="Basic information about the department"
                  />

                  <div className="
                    grid grid-cols-1
                    md:grid-cols-2
                    gap-5 mt-5
                  ">
                    <div className="md:col-span-2">
                      <label className="
                        block text-sm
                        font-semibold text-slate-700 mb-2
                      ">
                        Department Name
                        <span className="text-red-500 ml-1">*</span>
                      </label>

                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          handleDepartmentChange("name", e.target.value)
                        }
                        placeholder="e.g. Software Engineering"
                        required
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="
                        block text-sm
                        font-semibold text-slate-700 mb-2
                      ">
                        Department Code
                        <span className="text-red-500 ml-1">*</span>
                      </label>

                      <input
                        type="text"
                        value={formData.shortCode}
                        onChange={(e) =>
                          handleDepartmentChange("shortCode", e.target.value)
                        }
                        placeholder="e.g. SE"
                        required
                        maxLength={10}
                        className={`${inputClass} uppercase`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="
                        block text-sm
                        font-semibold text-slate-700 mb-2
                      ">
                        Description
                        <span className="
                          text-slate-400
                          font-normal
                          ml-2
                        ">
                          Optional
                        </span>
                      </label>

                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          handleDepartmentChange(
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Briefly describe the purpose of this department..."
                        rows={3}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>
                </section>

                {/* Job Roles */}
                <section className="
                  rounded-2xl
                  border border-primary-100
                  bg-white
                  p-5
                  shadow-sm
                ">
                  <div className="
                    flex flex-col sm:flex-row
                    sm:items-end
                    sm:justify-between
                    gap-3
                  ">
                    <SectionTitle
                      number="02"
                      title="Job Roles"
                      description="Add the job titles belonging to this department"
                    />

                    <span className="
                      inline-flex
                      items-center
                      w-fit
                      px-3 py-1.5
                      rounded-lg
                      bg-primary-100
                      border border-primary-200
                      text-primary-800
                      text-xs
                      font-bold
                    ">
                      {formData.jobRoles.length}{" "}
                      {formData.jobRoles.length === 1 ? "Role" : "Roles"}
                    </span>
                  </div>

                  <div className="space-y-4 mt-5">
                    {formData.jobRoles.map((role, index) => (
                      <div
                        key={index}
                        className="
                          rounded-2xl
                          border border-primary-200
                          bg-gradient-to-r from-primary-50/80 to-white
                          p-5
                        "
                      >
                        <div className="
                          flex items-center
                          justify-between
                          mb-4
                        ">
                          <div className="flex items-center gap-2.5">
                            <div className="
                              h-9 w-9
                              rounded-xl
                              bg-primary-700
                              text-white
                              shadow-sm
                              flex items-center justify-center
                            ">
                              <BriefcaseBusiness size={16} />
                            </div>

                            <span className="
                              text-sm
                              font-bold
                              text-primary-950
                            ">
                              Job Role {index + 1}
                            </span>
                          </div>

                          {formData.jobRoles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeJobRole(index)}
                              className="
                                inline-flex
                                items-center gap-1.5
                                text-xs
                                font-semibold
                                text-red-600
                                bg-red-50
                                border border-red-100
                                hover:bg-red-600
                                hover:text-white
                                px-3 py-2
                                rounded-lg
                                transition-colors
                              "
                            >
                              <Trash2 size={13} />
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="
                          grid grid-cols-1
                          md:grid-cols-2
                          gap-4
                        ">
                          <div>
                            <label className="
                              block text-sm
                              font-semibold text-slate-700 mb-2
                            ">
                              Job Title
                              <span className="text-red-500 ml-1">*</span>
                            </label>

                            <input
                              type="text"
                              value={role.jobTitle}
                              onChange={(e) =>
                                updateJobRole(
                                  index,
                                  "jobTitle",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. Software Engineer"
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Role */}
                  <button
                    type="button"
                    onClick={addJobRole}
                    className="
                      mt-4
                      w-full
                      border-2 border-dashed
                      border-primary-300
                      bg-primary-50/50
                      hover:border-primary-500
                      hover:bg-primary-100
                      text-primary-800
                      py-3.5
                      rounded-xl
                      text-sm
                      font-semibold
                      flex items-center
                      justify-center gap-2
                      transition-all
                    "
                  >
                    <Plus size={17} />
                    Add Another Job Role
                  </button>
                </section>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="
                    mx-6 mb-3
                    px-4 py-3
                    rounded-xl
                    bg-red-50
                    border border-red-200
                    text-red-700
                    text-sm font-medium
                    flex items-start gap-2
                  "
                >
                  <AlertCircle
                    size={16}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span>{formError}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="
                px-6 py-4
                border-t border-primary-100
                bg-primary-50/70
                flex flex-col-reverse
                sm:flex-row
                sm:justify-end
                gap-3
              ">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="
                    px-5 py-2.5
                    rounded-xl
                    border border-slate-200
                    bg-white
                    text-slate-700
                    text-sm font-semibold
                    hover:bg-slate-100
                    disabled:opacity-50
                    transition-colors
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="
                    px-5 py-2.5
                    rounded-xl
                    bg-primary-700
                    hover:bg-primary-800
                    text-white
                    text-sm font-semibold
                    shadow-md shadow-primary-700/20
                    disabled:opacity-60
                    disabled:cursor-not-allowed
                    flex items-center
                    justify-center gap-2
                    transition-colors
                  "
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {editingDepartment
                        ? "Update Department"
                        : "Save Department"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          DEPARTMENT DETAILS MODAL
      ====================================================== */}

      {selectedDepartment && (
        <DepartmentDetailsModal
          department={selectedDepartment}
          employeeCount={getEmployeeCount(selectedDepartment)}
          onClose={() => setSelectedDepartment(null)}
          onEdit={() => {
            setSelectedDepartment(null);
            handleEdit(selectedDepartment);
          }}
        />
      )}

      {/* =====================================================
          DELETE CONFIRMATION
      ====================================================== */}

      {deleteDepartment && (
        <div className="
          fixed inset-0 z-[60]
          bg-slate-950/60
          backdrop-blur-sm
          flex items-center justify-center
          p-4
        ">
          <div className="
            bg-white
            w-full max-w-md
            rounded-2xl
            border border-red-100
            shadow-2xl
            overflow-hidden
          ">
            <div className="
              h-2
              bg-gradient-to-r from-red-500 via-red-600 to-red-700
            " />

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="
                  h-12 w-12
                  flex-shrink-0
                  rounded-xl
                  bg-red-50
                  border border-red-100
                  text-red-600
                  flex items-center justify-center
                ">
                  <AlertCircle size={22} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Department?
                  </h3>

                  <p className="
                    text-sm text-slate-500
                    mt-1.5 leading-relaxed
                  ">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-slate-800">
                      {deleteDepartment.name}
                    </span>
                    ? This also removes its{" "}
                    {deleteDepartment.jobRoleCount ??
                      deleteDepartment.jobRoles?.length ??
                      0}{" "}
                    job role(s) and cannot be undone.
                  </p>

                  {getEmployeeCount(deleteDepartment) > 0 && (
                    <p className="
                      mt-3
                      text-sm text-red-700
                      bg-red-50
                      border border-red-200
                      rounded-xl
                      px-3 py-2.5
                    ">
                      {getEmployeeCount(deleteDepartment)} employee(s) are still
                      assigned to this department. Reassign or remove them first,
                      then delete the department.
                    </p>
                  )}
                </div>
              </div>

              <div className="
                flex flex-col-reverse
                sm:flex-row
                sm:justify-end
                gap-3
                mt-6
              ">
                <button
                  onClick={() => setDeleteDepartment(null)}
                  className="
                    px-5 py-2.5
                    rounded-xl
                    border border-slate-200
                    bg-white
                    hover:bg-slate-50
                    text-slate-700
                    text-sm font-semibold
                    transition-colors
                  "
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  disabled={getEmployeeCount(deleteDepartment) > 0}
                  className="
                    px-5 py-2.5
                    rounded-xl
                    bg-red-600
                    hover:bg-red-700
                    text-white
                    text-sm font-semibold
                    flex items-center
                    justify-center gap-2
                    shadow-sm
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  <Trash2 size={15} />
                  Delete Department
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NotificationPopup
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </PageLayout>
  );
};

// Shared input styling for the department form.
const inputClass = `
  w-full
  rounded-xl
  border border-primary-200
  bg-white
  px-3.5 py-3
  text-sm text-slate-800
  placeholder:text-slate-400
  shadow-sm
  focus:outline-none
  focus:border-primary-500
  focus:ring-4
  focus:ring-primary-100
  transition-all duration-200
`;

// =============================================================
// SUMMARY CARD - UNCHANGED
// =============================================================

const SummaryCard = ({
  icon,
  title,
  value,
  description,
}) => {
  return (
    <div className="
      relative
      overflow-hidden
      rounded-2xl
      border border-primary-100
      bg-gradient-to-br
      from-primary-50
      via-white
      to-primary-50/70
      p-5
      shadow-sm
      transition-all duration-200
      hover:-translate-y-1
      hover:shadow-md
    ">
      {/* Decorative background shape */}
      <div className="
        absolute -right-7 -top-7
        h-28 w-28
        rounded-full
        bg-primary-100/70
      " />

      <div className="relative flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="
            text-xs
            font-bold
            uppercase
            tracking-wider
            text-slate-600
          ">
            {title}
          </p>

          <p className="
            mt-3
            text-3xl
            font-bold
            tracking-tight
            text-primary-900
          ">
            {value}
          </p>

          <p className="
            mt-2
            text-xs
            font-medium
            text-slate-500
          ">
            {description}
          </p>

        </div>

        <div className="
          h-12 w-12
          flex-shrink-0
          rounded-xl
          bg-primary-700
          text-white
          shadow-md
          shadow-primary-700/20
          flex items-center justify-center
        ">
          {icon}
        </div>

      </div>

      <div className="
        relative
        mt-5
        h-1.5
        w-full
        overflow-hidden
        rounded-full
        bg-primary-100
      ">
        <div className="
          h-full
          w-1/3
          rounded-full
          bg-primary-600
        " />
      </div>
    </div>
  );
};

// =============================================================
// TABLE HEADER
// =============================================================

const TableHeader = ({ children, className = "" }) => {
  return (
    <div className={`
      text-[11px]
      font-bold
      uppercase
      tracking-wider
      text-primary-800
      ${className}
    `}>
      {children}
    </div>
  );
};

// =============================================================
// SECTION TITLE
// =============================================================

const SectionTitle = ({
  number,
  title,
  description,
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="
        h-9 w-9
        flex-shrink-0
        rounded-xl
        bg-primary-700
        text-white
        flex items-center justify-center
        text-xs
        font-bold
        shadow-sm shadow-primary-700/20
      ">
        {number}
      </div>

      <div>
        <h3 className="
          text-sm
          font-bold
          text-primary-950
        ">
          {title}
        </h3>

        {description && (
          <p className="
            text-xs
            text-slate-500
            mt-1
          ">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

// =============================================================
// DEPARTMENT MENU
// =============================================================

const DepartmentMenu = ({
  onView,
  onEdit,
  onDelete,
  mobile = false,
  openUpwards = false,
}) => {
  return (
    <div className={`
      ${
        mobile
          ? "absolute right-0 top-11 w-48"
          : `absolute right-0 ${
              openUpwards ? "bottom-10" : "top-10"
            } w-48`
      }
      z-50
      bg-white
      rounded-xl
      border border-primary-100
      shadow-xl
      py-1
    `}>
      <button
        type="button"
        onClick={onView}
        className="
          w-full
          px-4 py-2.5
          flex items-center gap-2.5
          text-sm
          text-slate-700
          hover:bg-primary-50
          hover:text-primary-800
          text-left
          transition-colors
        "
      >
        <Eye size={15} />
        View Department
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="
          w-full
          px-4 py-2.5
          flex items-center gap-2.5
          text-sm
          text-slate-700
          hover:bg-primary-50
          hover:text-primary-800
          text-left
          transition-colors
        "
      >
        <Edit3 size={15} />
        Edit Department
      </button>

      <div className="border-t border-primary-100 my-1" />

      <button
        type="button"
        onClick={onDelete}
        className="
          w-full
          px-4 py-2.5
          flex items-center gap-2.5
          text-sm
          text-red-600
          hover:bg-red-50
          text-left
          transition-colors
        "
      >
        <Trash2 size={15} />
        Delete Department
      </button>
    </div>
  );
};

// =============================================================
// DEPARTMENT DETAILS MODAL
// =============================================================

const DepartmentDetailsModal = ({
  department,
  employeeCount: employeeCountProp,
  onClose,
  onEdit,
}) => {
  const jobRoles = department.jobRoles || [];

  const roleCount =
    department.jobRoleCount ??
    jobRoles.length ??
    0;

  const employeeCount =
    employeeCountProp ??
    department.employeeCount ??
    0;

  return (
    <div className="
      fixed inset-0 z-50
      bg-slate-950/60
      backdrop-blur-sm
      flex items-center justify-center
      p-4
    ">
      <div className="
        bg-white
        w-full max-w-3xl
        max-h-[90vh]
        rounded-2xl
        border border-primary-200
        shadow-2xl
        overflow-hidden
        flex flex-col
      ">
        {/* Header */}
        <div className="
          relative overflow-hidden
          p-6
          bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700
          text-white
        ">
          <div className="
            absolute -right-10 -top-16
            h-44 w-44
            rounded-full
            bg-white/10
          " />

          <div className="
            relative
            flex items-start
            justify-between
          ">
            <div className="flex items-center gap-4">
              <div className="
                h-14 w-14
                rounded-2xl
                bg-white/15
                border border-white/20
                shadow-sm
                flex items-center justify-center
              ">
                <Building2 size={27} />
              </div>

              <div>
                <p className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-primary-200
                ">
                  Department Details
                </p>

                <h2 className="text-xl font-bold mt-1">
                  {department.name}
                </h2>

                <p className="
                  text-primary-100
                  text-sm
                  mt-1
                ">
                  {department.shortCode ||
                    department.code ||
                    `DPT-${department.id}`}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="
                h-9 w-9
                rounded-lg
                bg-white/10
                hover:bg-white/20
                flex items-center justify-center
                transition-colors
              "
              aria-label="Close details"
            >
              <X size={18} />
            </button>
          </div>

          {department.description && (
            <p className="
              relative
              text-sm
              text-primary-100
              mt-5
              max-w-2xl
              leading-relaxed
            ">
              {department.description}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="
          overflow-y-auto
          p-6
          space-y-6
          bg-gradient-to-b from-primary-50/50 to-white
        ">
          {/* Statistics */}
          <div className="
            grid grid-cols-2
            md:grid-cols-3
            gap-3
          ">
            <DetailStat
              icon={<BriefcaseBusiness size={17} />}
              label="Job Roles"
              value={roleCount}
            />

            <DetailStat
              icon={<Users size={17} />}
              label="Employees"
              value={employeeCount}
            />

            <DetailStat
              icon={<DollarSign size={17} />}
              label="Department Code"
              value={
                department.shortCode ||
                department.code ||
                "—"
              }
            />
          </div>

          {/* Job Roles */}
          <div className="
            rounded-2xl
            border border-primary-100
            bg-white
            p-5
            shadow-sm
          ">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="
                  text-base
                  font-bold
                  text-primary-950
                ">
                  Job Roles
                </h3>

                <p className="
                  text-xs
                  text-slate-500
                  mt-1
                ">
                  Roles defined under this department
                </p>
              </div>

              <span className="
                px-3 py-1.5
                rounded-lg
                bg-primary-100
                border border-primary-200
                text-primary-800
                text-xs font-bold
              ">
                {roleCount} {roleCount === 1 ? "Role" : "Roles"}
              </span>
            </div>

            {jobRoles.length > 0 ? (
              <div className="
                border border-primary-100
                rounded-xl
                overflow-hidden
              ">
                {jobRoles.map((role, index) => (
                  <div
                    key={role.id || index}
                    className="
                      flex items-center
                      justify-between
                      gap-4
                      px-4 py-4
                      border-b
                      last:border-b-0
                      border-primary-100
                      bg-white
                      hover:bg-primary-50
                      transition-colors
                    "
                  >
                    <div className="flex items-center gap-3">
                      <div className="
                        h-10 w-10
                        rounded-xl
                        bg-primary-100
                        border border-primary-200
                        text-primary-800
                        flex items-center justify-center
                      ">
                        <BriefcaseBusiness size={17} />
                      </div>

                      <div>
                        <p className="
                          text-sm
                          font-semibold
                          text-slate-800
                        ">
                          {role.jobTitle || role.title}
                        </p>

                        <p className="
                          text-xs
                          text-slate-500
                          mt-1
                        ">
                          Job Role {index + 1}
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight
                      size={16}
                      className="text-primary-500"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="
                py-10
                rounded-xl
                bg-primary-50
                border border-primary-100
                text-center
              ">
                <BriefcaseBusiness
                  size={25}
                  className="mx-auto text-primary-500 mb-2"
                />

                <p className="
                  text-sm
                  font-semibold
                  text-slate-600
                ">
                  No job roles defined
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="
          px-6 py-4
          border-t border-primary-100
          bg-primary-50/70
          flex justify-end gap-3
        ">
          <button
            onClick={onClose}
            className="
              px-5 py-2.5
              rounded-xl
              border border-slate-200
              bg-white
              text-slate-700
              text-sm font-semibold
              hover:bg-slate-100
              transition-colors
            "
          >
            Close
          </button>

          <button
            onClick={onEdit}
            className="
              px-5 py-2.5
              rounded-xl
              bg-primary-700
              hover:bg-primary-800
              text-white
              text-sm font-semibold
              flex items-center
              gap-2
              shadow-sm
              transition-colors
            "
          >
            <Edit3 size={15} />
            Edit Department
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================
// DETAIL STAT
// =============================================================

const DetailStat = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="
      bg-gradient-to-br from-primary-100 to-primary-50
      border border-primary-200
      rounded-xl
      p-4
    ">
      <div className="
        flex items-center
        gap-2
        text-primary-800
      ">
        {icon}

        <span className="
          text-xs
          font-semibold
        ">
          {label}
        </span>
      </div>

      <p className="
        mt-2
        text-lg
        font-bold
        text-primary-950
      ">
        {value}
      </p>
    </div>
  );
};

// =============================================================
// PAGINATION BAR
// =============================================================

const DeptPaginationBar = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}) => {
  const start =
    totalItems === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const end = Math.min(currentPage * pageSize, totalItems);

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
    <div className="
      flex flex-col sm:flex-row
      items-center
      justify-between
      gap-3
      px-4 sm:px-6
      py-4
      border-t border-primary-100
      bg-gradient-to-r from-primary-50/70 via-white to-primary-50/70
    ">
      <p className="text-xs text-slate-500 font-medium">
        Showing{" "}
        <strong className="text-primary-900">
          {start}-{end}
        </strong>{" "}
        of{" "}
        <strong className="text-primary-900">
          {totalItems}
        </strong>{" "}
        departments
      </p>

      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            onPageChange(Math.max(1, currentPage - 1))
          }
          disabled={currentPage === 1}
          className="
            h-9 w-9
            rounded-lg
            flex items-center justify-center
            text-primary-700
            border border-primary-200
            bg-white
            hover:bg-primary-100
            hover:border-primary-300
            disabled:opacity-40
            disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((page, index) =>
          page === "..." ? (
            <span
              key={`dots-${index}`}
              className="
                px-1.5
                text-xs
                text-slate-400
                select-none
              "
            >
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`
                h-9 min-w-[2.25rem] px-2
                rounded-lg
                text-xs font-bold
                transition-all
                ${
                  page === currentPage
                    ? "bg-primary-700 hover:bg-primary-800 text-white shadow-md shadow-primary-700/20"
                    : "bg-white text-primary-800 border border-primary-200 hover:bg-primary-100 hover:border-primary-300"
                }
              `}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() =>
            onPageChange(Math.min(totalPages, currentPage + 1))
          }
          disabled={currentPage === totalPages}
          className="
            h-9 w-9
            rounded-lg
            flex items-center justify-center
            text-primary-700
            border border-primary-200
            bg-white
            hover:bg-primary-100
            hover:border-primary-300
            disabled:opacity-40
            disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Department;