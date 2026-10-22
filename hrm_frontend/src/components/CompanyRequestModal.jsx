import React, { useState } from "react";
import { Building2, X, CheckCircle2, AlertCircle, Loader2, User, Mail, Phone, MapPin, Globe, Briefcase, Users, FileText } from "lucide-react";

import { ADMIN_URL } from "../services/api";

const API_BASE = `${ADMIN_URL}/public/companies`;

const CompanyRequestModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    companyName: "",
    registrationNumber: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    industry: "IT Services",
    employeeCount: 50,
    contactPersonName: "",
    contactPersonRole: "HR Manager",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          employeeCount: parseInt(formData.employeeCount, 10) || 1,
        }),
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || response.statusText };
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || `Server returned ${response.status}: ${response.statusText}`);
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-fade-in">
      {/* Modal Container with Max Height & Flex Column for All Devices */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-gray-100 transform transition-all">
        
        {/* Sticky Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 px-6 sm:px-8 py-5 text-white shrink-0 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl shrink-0">
              <Building2 size={24} className="text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Request for Your Company</h2>
              <p className="text-emerald-100 text-[11px] sm:text-xs mt-0.5">
                Register your organization to start using our multi-tenant HRM platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        {submitted ? (
          <div className="flex-1 overflow-y-auto p-8 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-800">Application Submitted!</h3>
              <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
                Thank you for applying! Our system administrator will review your application for{" "}
                <span className="font-semibold text-emerald-600">{formData.companyName}</span>.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left text-xs text-emerald-800 space-y-2">
              <p className="font-semibold flex items-center gap-2 text-emerald-900">
                <span>📩</span> What happens next?
              </p>
              <ul className="list-disc pl-5 space-y-1 text-emerald-700">
                <li>Upon admin approval, an **HR Manager Account** will be provisioned automatically.</li>
                <li>Your HR login credentials & portal link will be sent to <span className="font-bold underline">{formData.email}</span>.</li>
              </ul>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all"
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            
            {/* Scrollable Content Fields */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-3">
                  <AlertCircle size={18} className="shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Company Details */}
              <div>
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-600" /> Company Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="companyName"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="e.g. Acme Tech Solutions"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Registration / Tax Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="registrationNumber"
                        required
                        value={formData.registrationNumber}
                        onChange={handleChange}
                        placeholder="e.g. BRN-998877"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Official Business Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="contact@acme.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Contact Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 234 567 8900"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">
                      Office Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="address"
                        required
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="123 Corporate Blvd, Suite 400, New York, NY"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Industry / Sector</label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none"
                      >
                        <option value="IT Services & Software">IT Services & Software</option>
                        <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                        <option value="Finance & Banking">Finance & Banking</option>
                        <option value="Retail & E-commerce">Retail & E-commerce</option>
                        <option value="Manufacturing & Logistics">Manufacturing & Logistics</option>
                        <option value="Education & Training">Education & Training</option>
                        <option value="Marketing & Media">Marketing & Media</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Estimated Employees</label>
                    <div className="relative">
                      <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        name="employeeCount"
                        min="1"
                        value={formData.employeeCount}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Company Website (Optional)</label>
                    <div className="relative">
                      <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="https://acme.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Person */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User size={16} className="text-indigo-600" /> Contact Representative
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contactPersonName"
                      required
                      value={formData.contactPersonName}
                      onChange={handleChange}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Designation / Role</label>
                    <input
                      type="text"
                      name="contactPersonRole"
                      value={formData.contactPersonRole}
                      onChange={handleChange}
                      placeholder="e.g. HR Director / CEO"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Notes / Additional Information</label>
                    <textarea
                      name="notes"
                      rows="2"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Tell us any specific requirements or message for the admin..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    ></textarea>
                  </div>
                </div>
              </div>

            </div>

            {/* Sticky Action Footer */}
            <div className="shrink-0 p-4 sm:px-8 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Building2 size={16} />
                    Submit Company Request
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default CompanyRequestModal;
