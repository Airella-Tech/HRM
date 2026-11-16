import React, { useState, useEffect } from "react";
import logo from "../assets/logo.jpg";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Check,
  X,
  Building,
  IdCard,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Shield,
  Briefcase,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, hrApi } from "../services/api";

const ROLE_EMPLOYEE_ID_PREFIX = { employee: "EMP", hr: "HR", admin: "SA" };
const ROLE_TO_BACKEND = { employee: "EMPLOYEE", hr: "HR_MANAGER", admin: "ADMIN" };

const CreateAccount = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [employeeIdNumber, setEmployeeIdNumber] = useState("");
  const [employeeIdLoading, setEmployeeIdLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",

    employeeId: "",
    jobTitle: "",
    department: "",
    employmentType: "",
    workLocation: "",
    hireDate: "",
    reportingManager: "",
    userRole: "",

    password: "",
    confirmPassword: "",

    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToDataProcessing: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { id: 1, title: "Personal", icon: User },
    { id: 2, title: "Professional", icon: Building },
    { id: 3, title: "Security", icon: Lock },
    { id: 4, title: "Agreements", icon: IdCard },
  ];

  const departments = [
    "Human Resources",
    "Engineering",
    "Marketing",
    "Sales",
    "Finance",
    "Operations",
    "Customer Support",
  ];

  const [employmentTypes, setEmploymentTypes] = useState([]);
  useEffect(() => {
    hrApi
      .getEmploymentTypes()
      .then((res) => setEmploymentTypes((res.data || []).map((t) => t.name)))
      .catch(() => {});
  }, []);

  const [workLocations, setWorkLocations] = useState([]);
  useEffect(() => {
    hrApi
      .getWorkLocations()
      .then((res) => setWorkLocations((res.data || []).map((t) => t.name)))
      .catch(() => {});
  }, []);

  const userRoles = [
    {
      value: "employee",
      label: "Employee",
      description: "Standard self-service workspace for attendance, leave, and payslips",
      icon: Users,
    },
    {
      value: "hr",
      label: "HR Manager",
      description: "Department management, workforce records, leave approvals, payroll, and recruitment",
      icon: Briefcase,
    },
    {
      value: "admin",
      label: "Administrator",
      description: "System configuration, company settings, and company-wide access",
      icon: Shield,
    },
  ];

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
        if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
        if (!formData.email) {
          newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "Please enter a valid email address";
        }
        if (!formData.phone) newErrors.phone = "Phone number is required";
        if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
        break;

      case 2:
        if (!formData.userRole) newErrors.userRole = "User role is required";
        if (!formData.userRole) newErrors.userRole = "Please select a user role";
        if (!formData.employeeId) newErrors.employeeId = "Employee ID is required";
        if (!formData.jobTitle) newErrors.jobTitle = "Job title is required";
        if (!formData.department) newErrors.department = "Department is required";
        if (!formData.employmentType) newErrors.employmentType = "Employment type is required";
        if (!formData.workLocation) newErrors.workLocation = "Work location is required";
        break;

      case 3:
        if (!formData.password) {
          newErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
        break;

      case 4:
        if (!formData.agreeToTerms) newErrors.agreeToTerms = "You must agree to terms and conditions";
        if (!formData.agreeToPrivacy) newErrors.agreeToPrivacy = "You must agree to privacy policy";
        if (!formData.agreeToDataProcessing)
          newErrors.agreeToDataProcessing = "You must agree to data processing";
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateStep(currentStep)) {
      setIsSubmitting(true);
      try {
        const normalizedRole = ROLE_TO_BACKEND[formData.userRole?.toLowerCase()] || "EMPLOYEE";

        const userPayload = {
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          password: formData.password,
          employeeId: formData.employeeId,
          nic: formData.phone,
          dob: formData.dateOfBirth,
          address: formData.workLocation,
          phone: formData.phone,
          gender: "OTHER",
          department: formData.department,
          role: normalizedRole,
          designation: formData.jobTitle,
          joiningDate: formData.hireDate,
        };

        await authApi.register(userPayload);
        alert("Account created successfully!");
        navigate("/hr/dashboard");
        setFormData({ ...formData, password: "", confirmPassword: "" });
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Error creating user.";
        console.error("Error creating user:", error);
        alert(message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRoleChange = async (roleValue) => {
    const prefix = ROLE_EMPLOYEE_ID_PREFIX[roleValue] || "EMP";

    setFormData((prev) => ({
      ...prev,
      userRole: roleValue,
    }));

    const selectedRole = userRoles.find((role) => role.value === roleValue);
    if (selectedRole && !formData.jobTitle) {
      setFormData((prev) => ({
        ...prev,
        jobTitle: selectedRole.label,
      }));
    }

    if (errors.userRole) {
      setErrors((prev) => ({ ...prev, userRole: "" }));
    }

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
    setEmployeeIdNumber(digitsOnly);
    const prefix = ROLE_EMPLOYEE_ID_PREFIX[formData.userRole] || "EMP";
    setFormData((prev) => ({ ...prev, employeeId: digitsOnly ? `${prefix}-${digitsOnly}` : "" }));
  };

  const selectedRole = userRoles.find((role) => role.value === formData.userRole);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                {errors.firstName && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <X size={12} /> {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                {errors.lastName && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <X size={12} /> {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                  <X size={12} /> {errors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+94 77 123 4567"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
                {errors.phone && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <X size={12} /> {errors.phone}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <X size={12} /> {errors.dateOfBirth}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Select Platform Role <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {userRoles.map((role) => {
                  const RoleIcon = role.icon;
                  const isSelected = formData.userRole === role.value;
                  return (
                    <div
                      key={role.value}
                      onClick={() => handleRoleChange(role.value)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20"
                          : "bg-slate-50 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            isSelected ? "bg-sky-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                          }`}
                        >
                          <RoleIcon size={16} />
                        </div>
                        <p className="font-bold text-sm text-slate-900">{role.label}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{role.description}</p>
                    </div>
                  );
                })}
              </div>
              {errors.userRole && (
                <p className="text-rose-600 text-xs mt-1.5 flex items-center gap-1">
                  <X size={12} /> {errors.userRole}
                </p>
              )}
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee ID <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-300 font-mono text-sm font-bold text-slate-700">
                  {ROLE_EMPLOYEE_ID_PREFIX[formData.userRole] || "EMP"}-
                </span>
                <input
                  type="text"
                  value={employeeIdNumber}
                  onChange={handleEmployeeNumberChange}
                  placeholder="001"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                {employeeIdLoading && <Loader2 size={16} className="animate-spin text-sky-600" />}
              </div>
              {errors.employeeId && (
                <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                  <X size={12} /> {errors.employeeId}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                {errors.jobTitle && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <X size={12} /> {errors.jobTitle}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <X size={12} /> {errors.department}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employment Type <span className="text-rose-500">*</span>
                </label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                >
                  <option value="">Select employment type</option>
                  {(employmentTypes.length > 0
                    ? employmentTypes
                    : ["Full-time", "Part-time", "Contract", "Internship"]
                  ).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.employmentType && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <X size={12} /> {errors.employmentType}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Location <span className="text-rose-500">*</span>
                </label>
                <select
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                >
                  <option value="">Select work location</option>
                  {(workLocations.length > 0
                    ? workLocations
                    : ["Headquarters (Colombo)", "Branch Office", "Remote / Hybrid"]
                  ).map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                {errors.workLocation && (
                  <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <X size={12} /> {errors.workLocation}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hire / Joining Date
                </label>
                <input
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reporting Manager
                </label>
                <input
                  type="text"
                  name="reportingManager"
                  value={formData.reportingManager}
                  onChange={handleChange}
                  placeholder="Manager's name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                  <X size={12} /> {errors.password}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                  <X size={12} /> {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">Password requirements:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                <li>At least 8 characters in length</li>
                <li>At least one uppercase and one lowercase letter</li>
                <li>At least one numeric digit and special character</li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-sky-900 mb-1">Almost Done!</h4>
              <p className="text-xs text-sky-700 leading-relaxed">
                Please review and accept our platform usage policies to finalize account setup.
              </p>
            </div>

            {selectedRole && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                  {React.createElement(selectedRole.icon, { size: 18 })}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Assigned Platform Role</p>
                  <p className="text-sm font-bold text-slate-900">{selectedRole.label}</p>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 leading-normal">
                  I agree to the <span className="text-sky-600 font-semibold hover:underline">Terms & Conditions</span> governing the HRM System platform.
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="text-rose-600 text-xs pl-7 flex items-center gap-1">
                  <X size={12} /> {errors.agreeToTerms}
                </p>
              )}

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 leading-normal">
                  I agree to the <span className="text-sky-600 font-semibold hover:underline">Privacy Policy</span> regarding data storage and confidentiality.
                </span>
              </label>
              {errors.agreeToPrivacy && (
                <p className="text-rose-600 text-xs pl-7 flex items-center gap-1">
                  <X size={12} /> {errors.agreeToPrivacy}
                </p>
              )}

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="agreeToDataProcessing"
                  checked={formData.agreeToDataProcessing}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 leading-normal">
                  I consent to the processing of my employee data for workforce operations and payroll in accordance with data regulations.
                </span>
              </label>
              {errors.agreeToDataProcessing && (
                <p className="text-rose-600 text-xs pl-7 flex items-center gap-1">
                  <X size={12} /> {errors.agreeToDataProcessing}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 text-slate-900 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-slate-200 shadow-sm mx-auto mb-3">
            <img src={logo} alt="HRM System" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Your HRM Account
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Step {currentStep} of {steps.length} — {steps.find((s) => s.id === currentStep)?.title}
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center justify-between mb-8 px-2 sm:px-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-slate-900 text-white ring-4 ring-slate-900/10 shadow-sm"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <Check size={16} /> : <StepIcon size={16} />}
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 font-semibold ${
                      isCurrent ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 sm:mx-3 transition-colors ${
                      currentStep > step.id ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                currentStep === 1
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.99]"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-sm shadow-sky-600/20 disabled:opacity-50 transition-all active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </form>

          {/* Link to Login */}
          <p className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-sky-600 hover:text-sky-700 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    );
  };

  export default CreateAccount;