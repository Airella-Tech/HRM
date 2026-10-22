import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Check,
  X,
  Building2,
  IdCard,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Shield,
  Briefcase,
  Users,
  Phone,
  Loader2,
  Trash2,
  Lock as LockIcon,
} from "lucide-react";
import { authApi, userHrApi, hrApi } from "../../services/api";

// Employee ID prefix is fixed by role — only the number is editable.
const ROLE_EMPLOYEE_ID_PREFIX = { employee: "EMP", hr: "HR", admin: "SA" };
const ROLE_TO_BACKEND = { employee: "EMPLOYEE", hr: "HR_MANAGER", admin: "ADMIN" };

const STEPS = [
  { id: 1, title: "Personal", icon: User },
  { id: 2, title: "Professional", icon: Building2 },
  { id: 3, title: "Security", icon: Lock },
  { id: 4, title: "Review", icon: IdCard },
];

// HR is only ever allowed to create Employee or HR Manager accounts —
// System Administrator creation is reserved for admins elsewhere.
const USER_ROLES = [
  {
    value: "employee",
    label: "Employee",
    description: "Standard employee access with self-service features",
    icon: Users,
    disabled: false,
    permissions: [
      "View personal profile",
      "Submit leave requests",
      "Access personal documents",
      "View team calendar",
    ],
  },
  {
    value: "hr",
    label: "HR Manager",
    description: "Human Resources management access",
    icon: Briefcase,
    disabled: false,
    permissions: [
      "Manage employee records",
      "Approve leave requests",
      "Generate HR reports",
      "Manage recruitment",
    ],
  },
  {
    value: "admin",
    label: "System Administrator",
    description: "Full system administration access",
    icon: Shield,
    disabled: true,
    disabledReason: "Not available when adding employees from HR",
    permissions: [
      "Manage all user accounts",
      "System configuration",
      "Access all modules",
      "Database management",
    ],
  },
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",

  userRole: "employee",
  employeeId: "",
  departmentId: "",
  departmentName: "",
  jobTitle: "",
  employmentType: "",
  workLocation: "",
  hireDate: "", // intentionally blank — HR must pick the date (shows mm/dd/yyyy)

  password: "",
  confirmPassword: "",
};

// Gender options — stored in hrm_db_user.employees.gender as MALE / FEMALE / OTHER
const GENDER_OPTIONS = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
];

const BACKEND_TO_ROLE = { EMPLOYEE: "employee", HR_MANAGER: "hr", ADMIN: "admin" };
const toDateInput = (v) => (v ? String(v).slice(0, 10) : "");

// ---------------------------------------------------------------
// DRAFT PERSISTENCE (Add Employee only, never for Edit Employee)
//
// So HR doesn't lose what they've typed if they close the popup, switch
// tabs, or close the browser tab before hitting Submit, the in-progress
// "Add New Employee" form is mirrored to localStorage as they type and
// restored the next time the popup is opened for a new employee. It is
// cleared once the employee is actually created.
//
// Passwords are intentionally never written to localStorage (a browser
// storage isn't a safe place to keep them) — HR just re-enters the
// password if the tab was closed; every other field is restored.
// ---------------------------------------------------------------
const ADD_EMPLOYEE_DRAFT_KEY = "hr_add_employee_draft_v1";

const loadEmployeeDraft = () => {
  try {
    const raw = localStorage.getItem(ADD_EMPLOYEE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.formData ? parsed : null;
  } catch {
    return null;
  }
};

const saveEmployeeDraft = (formData, currentStep) => {
  try {
    const { password: _password, confirmPassword: _confirmPassword, ...rest } = formData;
    const hasContent = Object.values(rest).some((v) => String(v || "").trim() !== "");
    if (!hasContent) {
      localStorage.removeItem(ADD_EMPLOYEE_DRAFT_KEY);
      return;
    }
    localStorage.setItem(ADD_EMPLOYEE_DRAFT_KEY, JSON.stringify({ formData: rest, currentStep }));
  } catch {
    // Storage can fail (private browsing, full quota) — losing the draft convenience
    // is fine, it must never block HR from filling in the form.
  }
};

const clearEmployeeDraft = () => {
  try {
    localStorage.removeItem(ADD_EMPLOYEE_DRAFT_KEY);
  } catch {
    // ignore
  }
};

// Builds the wizard's form state from an existing employee record (edit mode).
const buildFormFromEmployee = (emp, departments) => {
  const [firstName = "", ...rest] = String(emp.fullName || "").trim().split(/\s+/);

  const deptText = String(emp.departmentName || emp.department || "").toLowerCase();
  const matchedDept =
    departments.find((d) => emp.departmentId && String(d.id) === String(emp.departmentId)) ||
    departments.find(
      (d) => deptText && (d.name.toLowerCase() === deptText || String(d.id) === String(emp.department))
    ) ||
    null;

  const id = String(emp.employeeId || "");
  const roleFromId = id.startsWith("HR-") ? "hr" : id.startsWith("SA-") ? "admin" : "employee";
  const userRole = BACKEND_TO_ROLE[String(emp.role || "").toUpperCase()] || roleFromId;

  return {
    ...EMPTY_FORM,
    firstName,
    lastName: rest.join(" "),
    email: emp.email || "",
    phone: emp.phone || emp.phoneNumber || "",
    dateOfBirth: toDateInput(emp.dob || emp.birthday),
    gender: String(emp.gender || "").toUpperCase(),
    userRole,
    employeeId: id,
    departmentId: matchedDept ? matchedDept.id : "",
    departmentName: matchedDept ? matchedDept.name : emp.departmentName || emp.department || "",
    jobTitle: emp.designation || "",
    employmentType: emp.employmentType || "",
    // "address" doubles as the stored work location (see submit payload below),
    // so fall back to it directly rather than checking against a fixed list.
    workLocation: emp.workLocation || emp.address || "",
    hireDate: toDateInput(emp.joiningDate),
  };
};

const AddEmployeeModal = ({ open, onClose, departments = [], onSuccess, employee = null }) => {
  const isEdit = Boolean(employee);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [employeeIdNumber, setEmployeeIdNumber] = useState("");
  const [employeeIdLoading, setEmployeeIdLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Whether the form currently on screen was restored from a saved draft (Add mode only)
  const [draftRestored, setDraftRestored] = useState(false);
  // Guards against the restored draft being immediately re-saved (and briefly overwritten
  // with stale/blank data) on the very render that first applies it — see the persistence
  // effect below.
  const skipNextDraftSaveRef = useRef(false);
  // Employment types HR has defined (hrm_db_hr.employment_types)
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [employmentTypesError, setEmploymentTypesError] = useState("");

  useEffect(() => {
    if (!open) return;
    hrApi.getEmploymentTypes()
      .then((res) => {
        setEmploymentTypes((res.data || []).map((t) => t.name));
        setEmploymentTypesError("");
      })
      .catch(() => setEmploymentTypesError("Could not load employment types"));
  }, [open]);

  // Keep an edited employee's saved type selectable even if it isn't in HR's list
  const employmentTypeOptions = useMemo(() => {
    const current = formData.employmentType;
    return current && !employmentTypes.some((t) => t.toLowerCase() === current.toLowerCase())
      ? [...employmentTypes, current]
      : employmentTypes;
  }, [employmentTypes, formData.employmentType]);

  // Work locations HR has defined (hrm_db_hr.work_locations)
  const [workLocations, setWorkLocations] = useState([]);
  const [workLocationsError, setWorkLocationsError] = useState("");

  useEffect(() => {
    if (!open) return;
    hrApi.getWorkLocations()
      .then((res) => {
        setWorkLocations((res.data || []).map((t) => t.name));
        setWorkLocationsError("");
      })
      .catch(() => setWorkLocationsError("Could not load work locations"));
  }, [open]);

  // Keep an edited employee's saved location selectable even if it isn't in HR's list
  const workLocationOptions = useMemo(() => {
    const current = formData.workLocation;
    return current && !workLocations.some((t) => t.toLowerCase() === current.toLowerCase())
      ? [...workLocations, current]
      : workLocations;
  }, [workLocations, formData.workLocation]);

  // Reset the wizard every time it's opened fresh
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      if (employee) {
        // Edit mode: show the same wizard, pre-filled with the saved data. Edit never
        // touches the Add Employee draft.
        const prefilled = buildFormFromEmployee(employee, departments);
        setFormData(prefilled);
        setEmployeeIdNumber(prefilled.employeeId.split("-").slice(1).join("-"));
        setDraftRestored(false);
      } else {
        // Add mode: continue a previously unfinished form instead of blanking it out.
        skipNextDraftSaveRef.current = true;
        const draft = loadEmployeeDraft();
        if (draft) {
          const restored = { ...EMPTY_FORM, ...draft.formData };
          setFormData(restored);
          setEmployeeIdNumber(restored.employeeId ? restored.employeeId.split("-").slice(1).join("-") : "");
          setCurrentStep(Math.min(Math.max(Number(draft.currentStep) || 1, 1), STEPS.length));
          setDraftRestored(true);
        } else {
          setFormData(EMPTY_FORM);
          setEmployeeIdNumber("");
          setDraftRestored(false);
        }
      }
      setErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee]);

  // Mirror the in-progress "Add Employee" form to localStorage as HR types, so it survives
  // closing the popup, switching tabs, or closing the browser tab before submitting.
  useEffect(() => {
    if (!open || isEdit) return;
    if (skipNextDraftSaveRef.current) {
      // This pass is the one right after restoring/resetting the form on open — its closure
      // still holds the previous render's formData, so skip it to avoid clobbering the
      // draft we just loaded (or wiping a real draft with a stale empty one).
      skipNextDraftSaveRef.current = false;
      return;
    }
    saveEmployeeDraft(formData, currentStep);
  }, [formData, currentStep, open, isEdit]);

  const discardDraft = () => {
    clearEmployeeDraft();
    setFormData(EMPTY_FORM);
    setEmployeeIdNumber("");
    setCurrentStep(1);
    setDraftRestored(false);
  };

  // If the department list finishes loading after the edit form opened,
  // match the employee's saved department name to a real department.
  useEffect(() => {
    if (!open || !employee || formData.departmentId || !formData.departmentName) return;
    const match = departments.find(
      (d) => d.name.toLowerCase() === String(formData.departmentName).toLowerCase()
    );
    if (match) {
      setFormData((prev) => ({ ...prev, departmentId: match.id, departmentName: match.name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments]);

  // ---------------------------------------------------------
  // DEPARTMENT -> JOB TITLE (dependent dropdown)
  // ---------------------------------------------------------
  const currentDeptObj = useMemo(() => {
    if (!formData.departmentId) return null;
    return departments.find((d) => String(d.id) === String(formData.departmentId));
  }, [departments, formData.departmentId]);

  const availableJobRoles = useMemo(() => {
    if (!currentDeptObj || !currentDeptObj.jobRoles) return [];
    return currentDeptObj.jobRoles
      .map((role) => (typeof role === "string" ? role : role.jobTitle || role.title || ""))
      .filter(Boolean);
  }, [currentDeptObj]);

  const jobTitleOptions = useMemo(
    () =>
      formData.jobTitle && !availableJobRoles.includes(formData.jobTitle)
        ? [...availableJobRoles, formData.jobTitle]
        : availableJobRoles,
    [availableJobRoles, formData.jobTitle]
  );

  // Only active departments can be picked; when editing, keep the employee's
  // current department in the list even if it has since been deactivated.
  const departmentOptions = useMemo(
    () =>
      departments.filter(
        (d) => d.active !== false || String(d.id) === String(formData.departmentId)
      ),
    [departments, formData.departmentId]
  );

  const handleDepartmentSelect = (deptId) => {
    const selectedDept = departments.find((d) => String(d.id) === String(deptId));

    if (!selectedDept) {
      setFormData((prev) => ({
        ...prev,
        departmentId: "",
        departmentName: "",
        jobTitle: "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      departmentId: selectedDept.id,
      departmentName: selectedDept.name,
      jobTitle: "",
    }));

    if (errors.departmentId) {
      setErrors((prev) => ({ ...prev, departmentId: "" }));
    }
  };

  const handleJobTitleSelect = (title) => {
    setFormData((prev) => ({ ...prev, jobTitle: title }));
    if (errors.jobTitle) {
      setErrors((prev) => ({ ...prev, jobTitle: "" }));
    }
  };

  // ---------------------------------------------------------
  // ROLE SELECTION
  // ---------------------------------------------------------
  const handleRoleChange = async (roleValue) => {
    const role = USER_ROLES.find((r) => r.value === roleValue);
    if (!role || role.disabled || isEdit) return;

    setFormData((prev) => ({ ...prev, userRole: roleValue }));
    if (errors.userRole) setErrors((prev) => ({ ...prev, userRole: "" }));

    const prefix = ROLE_EMPLOYEE_ID_PREFIX[roleValue] || "EMP";
    setEmployeeIdLoading(true);
    try {
      const backendRole = ROLE_TO_BACKEND[roleValue] || "EMPLOYEE";
      const resp = await authApi.nextEmployeeId(backendRole);
      const formattedNumber = resp?.data?.formattedNumber || "001";
      setEmployeeIdNumber(formattedNumber);
      setFormData((prev) => ({ ...prev, employeeId: `${prefix}-${formattedNumber}` }));
    } catch (err) {
      console.error("Failed to fetch next Employee ID:", err);
      setEmployeeIdNumber("001");
      setFormData((prev) => ({ ...prev, employeeId: `${prefix}-001` }));
    } finally {
      setEmployeeIdLoading(false);
    }
  };

  const handleEmployeeNumberChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);
    const prefix = ROLE_EMPLOYEE_ID_PREFIX[formData.userRole] || "EMP";
    setEmployeeIdNumber(digitsOnly);
    setFormData((prev) => ({
      ...prev,
      employeeId: digitsOnly ? `${prefix}-${digitsOnly}` : "",
    }));
    if (errors.employeeId) setErrors((prev) => ({ ...prev, employeeId: "" }));
  };

  const handleEmployeeNumberBlur = () => {
    if (!employeeIdNumber) return;
    const padded = employeeIdNumber.padStart(3, "0");
    const prefix = ROLE_EMPLOYEE_ID_PREFIX[formData.userRole] || "EMP";
    setEmployeeIdNumber(padded);
    setFormData((prev) => ({ ...prev, employeeId: `${prefix}-${padded}` }));
  };

  // ---------------------------------------------------------
  // GENERIC FIELD CHANGE
  // ---------------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ---------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!formData.email) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email is invalid";
      }
      if (!formData.phone) newErrors.phone = "Phone number is required";
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
    }

    if (step === 2) {
      if (!formData.userRole) newErrors.userRole = "User role is required";
      if (!formData.employeeId) newErrors.employeeId = "Employee ID is required";
      if (!formData.departmentId) newErrors.departmentId = "Department is required";
      if (!formData.jobTitle) newErrors.jobTitle = "Job title is required";
      if (!formData.employmentType) newErrors.employmentType = "Employment type is required";
      if (!formData.workLocation) newErrors.workLocation = "Work location is required";
      if (!formData.hireDate) newErrors.hireDate = "Hire date is required";
    }

    if (step === 3) {
      // When editing, the password is optional — blank keeps the current one.
      if (!formData.password) {
        if (!isEdit) newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  // ---------------------------------------------------------
  // SUBMIT — creates the account via the same auth/register
  // endpoint used everywhere else, so it lands in the user
  // database's `employees` table.
  // ---------------------------------------------------------
  // The <form> itself never saves. Enter / implicit submits are swallowed here
  // (and only advance the wizard); saving only happens from the Review step's
  // Submit button, which calls handleSubmit directly.
  const handleFormSubmit = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async () => {
    // Only the Review step (last step) is allowed to save.
    if (currentStep !== STEPS.length || isSubmitting) return;

    // Re-check every earlier step so nothing incomplete reaches the database.
    for (const step of [1, 2, 3]) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const normalizedRole = ROLE_TO_BACKEND[formData.userRole?.toLowerCase()] || "EMPLOYEE";

      const userPayload = {
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        employeeId: formData.employeeId,
        nic: formData.phone,
        dob: formData.dateOfBirth,
        address: formData.workLocation,
        phone: formData.phone,
        gender: formData.gender,
        department: formData.departmentName,
        role: normalizedRole,
        designation: formData.jobTitle,
        joiningDate: formData.hireDate,
        employmentType: formData.employmentType,
      };

      if (isEdit) {
        // departmentId from the HR department list is a different ID space than
        // the user DB, so (like before) it is not sent — the name is.
        const updatePayload = {
          employeeId: formData.employeeId,
          fullName: userPayload.fullName,
          email: userPayload.email,
          dob: formData.dateOfBirth || null,
          phone: formData.phone,
          departmentId: null,
          departmentName: formData.departmentName,
          designation: formData.jobTitle,
          joiningDate: formData.hireDate,
          employmentType: formData.employmentType,
          workLocation: formData.workLocation,
          address: formData.workLocation,
          status: employee.status || "ACTIVE",
          gender: formData.gender || null,
          // only send a password if HR typed a new one
          ...(formData.password ? { password: formData.password } : {}),
        };
        await userHrApi.updateEmployee(employee.id, updatePayload);
      } else {
        await authApi.register(userPayload);
      }

      if (onSuccess) await onSuccess();
      if (!isEdit) clearEmployeeDraft();
      setFormData(EMPTY_FORM);
      setCurrentStep(1);
      setDraftRestored(false);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        (isEdit ? "Error updating employee." : "Error creating employee.");
      console.error("Failed to create employee:", error);

      const msgLower = (message || "").toLowerCase();
      if (msgLower.includes("email already exists")) {
        setErrors((prev) => ({ ...prev, email: "An employee with this email already exists." }));
        setCurrentStep(1);
      } else if (msgLower.includes("employee id already exists")) {
        setErrors((prev) => ({ ...prev, employeeId: "This Employee ID is already in use." }));
        setCurrentStep(2);
      }

      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose?.();
  };

  const getPasswordStrength = (password) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];

  const selectedRole = USER_ROLES.find((r) => r.value === formData.userRole);

  if (!open) return null;

  return (
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
          max-w-2xl
          max-h-[92vh]
          overflow-hidden
          rounded-2xl
          shadow-2xl
          flex flex-col
        "
      >
        {/* Header */}
        <div
          className="
            px-6 py-5
            bg-gradient-to-r from-teal-500 to-emerald-600
            flex items-center
            justify-between
          "
        >
          <div>
            <h2 className="text-lg font-bold text-white">{isEdit ? "Edit Employee" : "Add New Employee"}</h2>
            <p className="text-xs text-white/80 mt-0.5">
              Step {currentStep} of {STEPS.length} — {STEPS.find((s) => s.id === currentStep)?.title}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="
              h-9 w-9
              rounded-lg
              flex items-center
              justify-center
              text-white/80
              hover:bg-white/15
              hover:text-white
              transition-colors
            "
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 pt-5 pb-1">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                          ? "bg-teal-500 text-white shadow-md scale-110"
                          : "bg-slate-200 text-slate-500"
                        }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span
                      className={`text-[11px] mt-1.5 font-semibold ${isCurrent ? "text-teal-600" : "text-slate-400"
                        }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${currentStep > step.id ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleFormSubmit} className="flex flex-col min-h-0">
          <div className="green-scrollbar overflow-y-auto p-6 space-y-5">
            {draftRestored && !isEdit && (
              <div className="flex items-center justify-between gap-3 bg-teal-50 border border-teal-100 text-teal-700 text-xs rounded-xl px-4 py-3">
                <span>Continuing your unfinished form — nothing you typed was lost.</span>
                <button
                  type="button"
                  onClick={discardDraft}
                  className="font-semibold underline decoration-teal-300 hover:decoration-teal-500 flex-shrink-0"
                >
                  Discard &amp; start fresh
                </button>
              </div>
            )}
            {/* ============ STEP 1 — PERSONAL ============ */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.firstName ? "border-red-500" : "border-slate-300"
                        }`}
                    />
                    {errors.firstName && <FieldError msg={errors.firstName} />}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.lastName ? "border-red-500" : "border-slate-300"
                        }`}
                    />
                    {errors.lastName && <FieldError msg={errors.lastName} />}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john.doe@company.com"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.email ? "border-red-500" : "border-slate-300"
                        }`}
                    />
                  </div>
                  {errors.email && <FieldError msg={errors.email} />}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.phone ? "border-red-500" : "border-slate-300"
                          }`}
                      />
                    </div>
                    {errors.phone && <FieldError msg={errors.phone} />}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Date of Birth *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.dateOfBirth ? "border-red-500" : "border-slate-300"
                          }`}
                      />
                    </div>
                    {errors.dateOfBirth && <FieldError msg={errors.dateOfBirth} />}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Gender *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 appearance-none ${errors.gender ? "border-red-500" : "border-slate-300"
                        }`}
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.gender && <FieldError msg={errors.gender} />}
                </div>
              </div>
            )}

            {/* ============ STEP 2 — PROFESSIONAL ============ */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Role selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700">User Role *</label>
                  <div className="grid gap-2.5">
                    {USER_ROLES.map((role) => {
                      const RoleIcon = role.icon;
                      const isSelected = formData.userRole === role.value;
                      const isDisabled = role.disabled || (isEdit && !isSelected);

                      return (
                        <div
                          key={role.value}
                          onClick={() => !isDisabled && handleRoleChange(role.value)}
                          title={isDisabled ? role.disabledReason : undefined}
                          className={`p-3.5 border-2 rounded-xl transition-all duration-200 ${isDisabled
                            ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                            : isSelected
                              ? "border-teal-500 bg-teal-50 shadow-sm cursor-pointer"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${isDisabled
                                ? "bg-slate-200 text-slate-400"
                                : isSelected
                                  ? "bg-teal-100 text-teal-600"
                                  : "bg-slate-100 text-slate-600"
                                }`}
                            >
                              {isDisabled ? <LockIcon className="w-4.5 h-4.5" /> : <RoleIcon className="w-4.5 h-4.5" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold text-sm ${isDisabled ? "text-slate-500" : "text-slate-800"}`}>
                                  {role.label}
                                </h3>
                                {isSelected && !isDisabled && <Check className="w-4 h-4 text-teal-600" />}
                                {isDisabled && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                                    Disabled for HR
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {isEdit && (
                    <p className="text-xs text-slate-500">
                      Role and Employee ID can't be changed while editing.
                    </p>
                  )}
                  {errors.userRole && <FieldError msg={errors.userRole} />}
                </div>

                {/* Employee ID */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Employee ID *</label>
                  <div
                    className={`flex items-stretch rounded-xl border transition-all duration-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 ${errors.employeeId ? "border-red-500" : "border-slate-300"
                      }`}
                  >
                    <div className="flex items-center gap-2 px-3.5 bg-slate-100 border-r border-slate-300 text-slate-700 font-semibold text-sm select-none">
                      <IdCard className="w-4 h-4 text-slate-400" />
                      {ROLE_EMPLOYEE_ID_PREFIX[formData.userRole]}-
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={employeeIdNumber}
                      onChange={handleEmployeeNumberChange}
                      onBlur={handleEmployeeNumberBlur}
                      disabled={employeeIdLoading || isEdit}
                      placeholder="001"
                      className="flex-1 min-w-0 px-3.5 py-2.5 outline-none bg-transparent disabled:opacity-60 text-sm"
                    />
                    {employeeIdLoading && (
                      <span className="flex items-center pr-3.5 text-xs text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      </span>
                    )}
                  </div>
                  {errors.employeeId && <FieldError msg={errors.employeeId} />}
                </div>

                {/* Department -> Job Title (dependent dropdowns) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Department *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                      <select
                        value={formData.departmentId}
                        onChange={(e) => handleDepartmentSelect(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 appearance-none ${errors.departmentId ? "border-red-500" : "border-slate-300"
                          }`}
                      >
                        <option value="">Select Department</option>
                        {departmentOptions.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {departmentOptions.length === 0 && (
                      <p className="text-xs text-slate-400">No departments added yet — add one in Departments first.</p>
                    )}
                    {errors.departmentId && <FieldError msg={errors.departmentId} />}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Job Title *</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                      <select
                        value={formData.jobTitle}
                        onChange={(e) => handleJobTitleSelect(e.target.value)}
                        disabled={!formData.departmentId}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 appearance-none disabled:opacity-60 disabled:cursor-not-allowed ${errors.jobTitle ? "border-red-500" : "border-slate-300"
                          }`}
                      >
                        <option value="">
                          {formData.departmentId ? "Select Job Title" : "Select a department first"}
                        </option>
                        {jobTitleOptions.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>
                    {formData.departmentId && availableJobRoles.length === 0 && (
                      <p className="text-xs text-slate-400">This department has no job roles yet — add them in Departments first.</p>
                    )}
                    {errors.jobTitle && <FieldError msg={errors.jobTitle} />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Employment Type *</label>
                    <select
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.employmentType ? "border-red-500" : "border-slate-300"
                        }`}
                    >
                      <option value="">Select Type</option>
                      {employmentTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.employmentType && <FieldError msg={errors.employmentType} />}
                    {employmentTypesError && <FieldError msg={employmentTypesError} />}
                    {!employmentTypesError && employmentTypes.length === 0 && (
                      <p className="text-xs text-amber-600">
                        No employment types yet. Add them in Leave Management → Add Employment Type.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Work Location *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                      <select
                        name="workLocation"
                        value={formData.workLocation}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 appearance-none ${errors.workLocation ? "border-red-500" : "border-slate-300"
                          }`}
                      >
                        <option value="">Select work location</option>
                        {workLocationOptions.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.workLocation && <FieldError msg={errors.workLocation} />}
                    {workLocationsError && <FieldError msg={workLocationsError} />}
                    {!workLocationsError && workLocations.length === 0 && (
                      <p className="text-xs text-amber-600">
                        No work locations yet. Add them from the Employees page → Add Work Location.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Hire Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.hireDate ? "border-red-500" : "border-slate-300"
                        }`}
                    />
                  </div>
                  {errors.hireDate && <FieldError msg={errors.hireDate} />}
                </div>
              </div>
            )}

            {/* ============ STEP 3 — SECURITY ============ */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    {isEdit ? "New Password (optional)" : "Password *"}
                  </label>
                  {isEdit && (
                    <p className="text-xs text-slate-500 -mt-1">Leave blank to keep the current password.</p>
                  )}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-12 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.password ? "border-red-500" : "border-slate-300"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>

                  {formData.password && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Password strength</span>
                        <span
                          className={`font-medium ${passwordStrength <= 2
                            ? "text-red-500"
                            : passwordStrength <= 3
                              ? "text-yellow-600"
                              : "text-emerald-600"
                            }`}
                        >
                          {strengthLabels[passwordStrength]}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${strengthColors[passwordStrength]}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {errors.password && <FieldError msg={errors.password} />}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    {isEdit ? "Confirm New Password" : "Confirm Password *"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-12 py-2.5 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 ${errors.confirmPassword ? "border-red-500" : "border-slate-300"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <FieldError msg={errors.confirmPassword} />}
                </div>
              </div>
            )}

            {/* ============ STEP 4 — REVIEW ============ */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <h3 className="font-semibold text-teal-800 mb-1 text-sm">Almost there!</h3>
                  <p className="text-teal-700 text-xs">
                    {isEdit
                      ? "Review the changes below, then press Update to save them."
                      : "Review the details below, then press Submit to create this employee's account."}
                  </p>
                </div>

                {selectedRole && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-800 mb-2 text-sm">Role Assignment</h4>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        {React.createElement(selectedRole.icon, { className: "w-4.5 h-4.5 text-teal-600" })}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{selectedRole.label}</p>
                        <p className="text-xs text-slate-500">{selectedRole.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <ReviewItem label="Full Name" value={`${formData.firstName} ${formData.lastName}`.trim()} />
                  <ReviewItem label="Email" value={formData.email} />
                  <ReviewItem label="Phone" value={formData.phone} />
                  <ReviewItem label="Employee ID" value={formData.employeeId} />
                  <ReviewItem label="Department" value={formData.departmentName} />
                  <ReviewItem label="Job Title" value={formData.jobTitle} />
                  <ReviewItem label="Employment Type" value={formData.employmentType} />
                  <ReviewItem label="Work Location" value={formData.workLocation} />
                  <ReviewItem label="Date of Birth" value={formatDate(formData.dateOfBirth)} />
                  <ReviewItem label="Gender" value={GENDER_OPTIONS.find((g) => g.value === formData.gender)?.label} />
                  <ReviewItem label="Hire Date" value={formatDate(formData.hireDate)} />
                </div>
              </div>
            )}
          </div>

          {/* Footer navigation */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentStep === 1
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < STEPS.length ? (
              <button
                key="next-btn"
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-br from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                key="submit-btn"
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all shadow-sm ${isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600"
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEdit ? "Updating…" : "Creating…"}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {isEdit ? "Update Employee" : "Submit"}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const FieldError = ({ msg }) => (
  <p className="text-red-500 text-xs flex items-center gap-1">
    <X className="w-3.5 h-3.5" />
    {msg}
  </p>
);

const ReviewItem = ({ label, value }) => (
  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
    <p className="text-[11px] text-slate-400">{label}</p>
    <p className="text-sm font-semibold text-slate-800 truncate">{value || "—"}</p>
  </div>
);

export default AddEmployeeModal;