import React, { useState } from "react";
import heroImg from "../assets/hrm-hero-illustration.png";
import { 
  Eye, EyeOff, Mail, Lock, User, Check, X, Building, 
  IdCard, Calendar, MapPin, ChevronLeft, ChevronRight, Shield,
  Briefcase, Users
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";


const CreateAccount = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    
    // Professional Information
    employeeId: "",
    jobTitle: "",
    department: "",
    employmentType: "",
    workLocation: "",
    hireDate: "",
    reportingManager: "",
    userRole: "", // New role field
    
    // Account Security
    password: "",
    confirmPassword: "",
    
    // Agreements
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToDataProcessing: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step configurations
  const steps = [
    { id: 1, title: "Personal Info", icon: User },
    { id: 2, title: "Professional", icon: Building },
    { id: 3, title: "Security", icon: Lock },
    { id: 4, title: "Agreements", icon: IdCard }
  ];

  // Departments and job titles for demo
  const departments = [
    "Human Resources",
    "Engineering",
    "Marketing",
    "Sales",
    "Finance",
    "Operations",
    "Customer Support"
  ];

  const employmentTypes = [
    "Full-time",
    "Part-time",
    "Contract",
    "Internship",
    "Temporary"
  ];

  // New: User roles with descriptions and permissions
  const userRoles = [
    {
      value: "employee",
      label: "Employee",
      description: "Standard employee access with self-service features",
      icon: Users,
      permissions: [
        "View personal profile",
        "Submit leave requests",
        "Access personal documents",
        "View team calendar"
      ]
    },
    {
      value: "hr",
      label: "HR Manager",
      description: "Human Resources management access",
      icon: Briefcase,
      permissions: [
        "Manage employee records",
        "Approve leave requests",
        "Generate HR reports",
        "Manage recruitment"
      ]
    },
    {
      value: "admin",
      label: "System Administrator",
      description: "Full system administration access",
      icon: Shield,
      permissions: [
        "Manage all user accounts",
        "System configuration",
        "Access all modules",
        "Database management"
      ]
    }
  ];

  const passwordRequirements = [
    { id: 1, text: "At least 8 characters", met: false },
    { id: 2, text: "One uppercase letter", met: false },
    { id: 3, text: "One lowercase letter", met: false },
    { id: 4, text: "One number", met: false },
    { id: 5, text: "One special character", met: false }
  ];

  // Validation functions for each step
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
        if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
        if (!formData.email) {
          newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "Email is invalid";
        }
        if (!formData.phone) newErrors.phone = "Phone number is required";
        if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
        break;

      case 2:
        if (!formData.employeeId) newErrors.employeeId = "Employee ID is required";
        if (!formData.jobTitle) newErrors.jobTitle = "Job title is required";
        if (!formData.department) newErrors.department = "Department is required";
        if (!formData.employmentType) newErrors.employmentType = "Employment type is required";
        if (!formData.workLocation) newErrors.workLocation = "Work location is required";
        if (!formData.userRole) newErrors.userRole = "User role is required"; // New validation
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
        if (!formData.agreeToTerms) newErrors.agreeToTerms = "You must agree to the terms and conditions";
        if (!formData.agreeToPrivacy) newErrors.agreeToPrivacy = "You must agree to the privacy policy";
        if (!formData.agreeToDataProcessing) newErrors.agreeToDataProcessing = "You must agree to data processing";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (validateStep(currentStep)) {
    setIsSubmitting(true);
    try {
      const userPayload = {
        fullName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        nic: formData.phone, // or replace this with your NIC field
        dob: formData.dateOfBirth,
        address: formData.workLocation,
        gender: "Not Specified", // optional
        department: formData.department,
        role: formData.userRole,
        employeeId: formData.employeeId
      };

      const response = await axios.post(
        "http://localhost:5001/api/hrm/adduser",
        userPayload
      );

      console.log("✅ User created successfully:", response.data);
      alert("Account created successfully!");
      setFormData({ ...formData, password: "", confirmPassword: "" });
    } catch (error) {
      console.error("❌ Error creating user:", error);
      alert("Error creating user. Please check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  }
};


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Handle role selection with additional logic
  const handleRoleChange = (roleValue) => {
    setFormData(prev => ({
      ...prev,
      userRole: roleValue
    }));

    // Auto-fill job title based on role for convenience
    const selectedRole = userRoles.find(role => role.value === roleValue);
    if (selectedRole && !formData.jobTitle) {
      setFormData(prev => ({
        ...prev,
        jobTitle: selectedRole.label
      }));
    }

    // Clear role error if any
    if (errors.userRole) {
      setErrors(prev => ({
        ...prev,
        userRole: ""
      }));
    }
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
    "bg-blue-500",
    "bg-green-500",
    "bg-emerald-600"
  ];

  // Get selected role details for display
  const selectedRole = userRoles.find(role => role.value === formData.userRole);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@company.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <X className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Date of Birth *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                      errors.dateOfBirth ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.dateOfBirth}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* User Role Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                User Role *
              </label>
              <div className="grid gap-3">
                {userRoles.map((role) => {
                  const RoleIcon = role.icon;
                  const isSelected = formData.userRole === role.value;
                  
                  return (
                    <div
                      key={role.value}
                      onClick={() => handleRoleChange(role.value)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                        }`}>
                          <RoleIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800">{role.label}</h3>
                            {isSelected && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">Permissions include:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {role.permissions.map((permission, index) => (
                                <li key={index} className="flex items-center gap-1">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                  {permission}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {errors.userRole && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <X className="w-4 h-4" />
                  {errors.userRole}
                </p>
              )}
            </div>

            {/* Selected Role Summary */}
            {selectedRole && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-green-100 rounded-lg">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-green-800">Role Selected: {selectedRole.label}</h3>
                </div>
                <p className="text-green-700 text-sm">
                  You will have access to {selectedRole.permissions.length} key permissions including {selectedRole.permissions[0].toLowerCase()} and more.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Employee ID *
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  placeholder="EMP-001"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.employeeId ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>
              {errors.employeeId && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <X className="w-4 h-4" />
                  {errors.employeeId}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="Software Engineer"
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.jobTitle ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.jobTitle && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.jobTitle}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Department *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.department ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.department}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Employment Type *
                </label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.employmentType ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Type</option>
                  {employmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.employmentType && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.employmentType}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Work Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="workLocation"
                    value={formData.workLocation}
                    onChange={handleChange}
                    placeholder="New York Office"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                      errors.workLocation ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.workLocation && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.workLocation}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Hire Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Password strength</span>
                    <span className={`font-medium ${
                      passwordStrength <= 2 ? "text-red-500" :
                      passwordStrength <= 3 ? "text-yellow-500" :
                      "text-green-500"
                    }`}>
                      {strengthLabels[passwordStrength]}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        strengthColors[passwordStrength]
                      }`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <X className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 ${
                    errors.confirmPassword ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <X className="w-4 h-4" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Almost There!</h3>
              <p className="text-blue-700 text-sm">
                Please review and accept the following agreements to complete your account setup.
              </p>
            </div>

            {/* Role Confirmation */}
            {selectedRole && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Role Assignment</h4>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {React.createElement(selectedRole.icon, { className: "w-5 h-5 text-blue-600" })}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedRole.label}</p>
                    <p className="text-xs text-gray-600">{selectedRole.description}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{" "}
                  <span className="text-blue-600 hover:underline font-medium">
                    Terms and Conditions
                  </span>{" "}
                  governing the use of Global HRM platform
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <X className="w-4 h-4" />
                  {errors.agreeToTerms}
                </p>
              )}

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{" "}
                  <span className="text-blue-600 hover:underline font-medium">
                    Privacy Policy
                  </span>{" "}
                  and understand how my personal data will be processed
                </span>
              </label>
              {errors.agreeToPrivacy && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <X className="w-4 h-4" />
                  {errors.agreeToPrivacy}
                </p>
              )}

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToDataProcessing"
                  checked={formData.agreeToDataProcessing}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
                />
                <span className="text-sm text-gray-700">
                  I consent to the processing of my personal data for HR management purposes
                  in accordance with applicable data protection laws
                </span>
              </label>
              {errors.agreeToDataProcessing && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <X className="w-4 h-4" />
                  {errors.agreeToDataProcessing}
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
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Background"
          className="w-full h-full object-cover transform scale-105"
        />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
        
        {/* Animated floating elements */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-blue-400 rounded-full opacity-20 animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-indigo-400 rounded-full opacity-30 animate-float animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-purple-400 rounded-full opacity-25 animate-float animation-delay-2000"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-[90%] max-w-2xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
            Create Your HRM Account
          </h2>
          <p className="text-gray-600 text-sm">
            Step {currentStep} of {steps.length} - {steps.find(s => s.id === currentStep)?.title}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-8">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted 
                      ? "bg-green-500 text-white" 
                      : isCurrent
                      ? "bg-blue-600 text-white shadow-lg transform scale-110"
                      : "bg-gray-200 text-gray-500"
                  }`}>
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    isCurrent ? "text-blue-600" : "text-gray-500"
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 transition-all duration-300 ${
                    currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                currentStep === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transform hover:-translate-y-0.5"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600 mt-6 pt-6 border-t border-gray-200">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium cursor-pointer">
            Sign In
          </Link>
        </p>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  );
};

export default CreateAccount;