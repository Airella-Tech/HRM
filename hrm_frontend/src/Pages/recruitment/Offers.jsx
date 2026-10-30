
import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import {
  Search,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  Send,
  Ban,
  X,
  CalendarDays,
  BriefcaseBusiness,
  DollarSign,
  UserRound,
  Filter,
  RefreshCw,
  AlertCircle,
  Mail,
  Trash2,
  Users,
} from "lucide-react";

// ============================================================
// CONSTANTS
// ============================================================

const emptyForm = {
  applicationId: "",
  candidateName: "",
  email: "",
  jobTitle: "",
  department: "Engineering",
  employmentType: "Full-time",
  salary: "",
  startDate: "",
  expiryDate: "",
  notes: "",
};

const statusStyles = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  Withdrawn: "bg-gray-200 text-gray-600",
};

// ============================================================
// HELPERS
// ============================================================

function unwrapData(result) {
  if (result == null || typeof result === "string") return null;

  if (Object.prototype.hasOwnProperty.call(result, "data")) {
    return result.data;
  }

  if (Object.prototype.hasOwnProperty.call(result, "result")) {
    return result.result;
  }

  return result;
}

function extractList(result, possibleKeys = []) {
  const data = unwrapData(result);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;

  for (const key of possibleKeys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

const toUiStatus = (status) => {
  const normalized = String(status || "DRAFT").toUpperCase();

  const statusMap = {
    DRAFT: "Draft",
    SENT: "Sent",
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
  };

  return statusMap[normalized] || normalized;
};

const toApiStatus = (status) => String(status).toUpperCase();

const formatDate = (date) => {
  if (!date) return "—";

  const dateOnly = String(date).slice(0, 10);

  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatSalary = (salary) =>
  `LKR ${Number(salary || 0).toLocaleString("en-LK")}`;

const getCreatedDate = (offer) =>
  offer.createdDate || offer.createdAt?.slice(0, 10) || "";

const normalizeOffer = (offer) => ({
  ...offer,
  id: offer.id,
  applicationId: offer.applicationId ?? null,
  candidateName: offer.candidateName || "",
  email: offer.email || offer.candidateEmail || "",
  jobTitle: offer.jobTitle || "",
  department: offer.department || "",
  employmentType: offer.employmentType || "",
  salary: Number(offer.salary || 0),
  startDate: offer.startDate || "",
  expiryDate: offer.expiryDate || "",
  status: toUiStatus(offer.status),
  createdDate: getCreatedDate(offer),
  notes: offer.notes || "",
});

const normalizeEligibleCandidate = (candidate) => ({
  applicationId: candidate.applicationId,
  vacancyId: candidate.vacancyId ?? null,
  candidateName: candidate.candidateName || "",
  email: candidate.candidateEmail || candidate.email || "",
  jobTitle: candidate.vacancyTitle || candidate.jobTitle || "",
  completedRounds: candidate.completedRounds || [],
});

function getInitials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ============================================================
// REUSABLE COMPONENTS
// ============================================================

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] || statusStyles.Draft
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color, description }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">{value}</h3>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function JobOffers() {
  const [offers, setOffers] = useState([]);
  const [eligibleCandidates, setEligibleCandidates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [apiError, setApiError] = useState("");
  const [eligibleError, setEligibleError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [modal, setModal] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  // ----------------------------------------------------------
  // LOAD JOB OFFERS
  // ----------------------------------------------------------

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setApiError("");

    try {
      const result = await recruitmentApi.getJobOffers();
      const list = extractList(result, ["offers", "jobOffers"]);

      setOffers(list.map(normalizeOffer));
    } catch (error) {
      setApiError(error.message || "Unable to load job offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ----------------------------------------------------------
  // LOAD ELIGIBLE CANDIDATES
  // ----------------------------------------------------------

  const loadEligibleCandidates = useCallback(async () => {
    setEligibleLoading(true);
    setEligibleError("");

    try {
      const result = await recruitmentApi.getEligibleCandidates();
      const list = extractList(result, ["candidates", "eligibleCandidates"]);

      setEligibleCandidates(list.map(normalizeEligibleCandidate));
    } catch (error) {
      setEligibleError(
        error.message || "Unable to load eligible candidates."
      );
    } finally {
      setEligibleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
    loadEligibleCandidates();
  }, [loadOffers, loadEligibleCandidates]);

  // ----------------------------------------------------------
  // STATISTICS
  // ----------------------------------------------------------

  const stats = useMemo(
    () => ({
      total: offers.length,
      drafts: offers.filter((offer) => offer.status === "Draft").length,
      pending: offers.filter((offer) =>
        ["Pending", "Sent"].includes(offer.status)
      ).length,
      accepted: offers.filter((offer) => offer.status === "Accepted").length,
      rejected: offers.filter((offer) => offer.status === "Rejected").length,
    }),
    [offers]
  );

  // ----------------------------------------------------------
  // FILTER OFFERS
  // ----------------------------------------------------------

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return offers.filter((offer) => {
      const matchesSearch = [
        offer.candidateName,
        offer.email,
        offer.jobTitle,
        offer.department,
      ].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All" || offer.status === statusFilter;

      const matchesType =
        typeFilter === "All" || offer.employmentType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [offers, search, statusFilter, typeFilter]);

  // ----------------------------------------------------------
  // OPEN CREATE MODAL
  // ----------------------------------------------------------

  const openCreate = () => {
    setForm({ ...emptyForm });
    setFormError("");
    setApiError("");
    setSuccessMessage("");

    loadEligibleCandidates();
    setModal("create");
  };

  // ----------------------------------------------------------
  // SELECT ELIGIBLE CANDIDATE
  // ----------------------------------------------------------

  const handleCandidateSelection = (applicationId) => {
    const candidate = eligibleCandidates.find(
      (item) => String(item.applicationId) === String(applicationId)
    );

    if (!candidate) {
      setForm((current) => ({
        ...current,
        applicationId: "",
        candidateName: "",
        email: "",
        jobTitle: "",
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      applicationId: candidate.applicationId,
      candidateName: candidate.candidateName,
      email: candidate.email,
      jobTitle: candidate.jobTitle,
    }));
  };

  // ----------------------------------------------------------
  // OPEN EDIT MODAL
  // ----------------------------------------------------------

  const openEdit = (offer) => {
    if (offer.status !== "Draft") {
      setApiError("Only draft offers can be edited.");
      return;
    }

    setForm({
      ...emptyForm,
      ...offer,
      applicationId: offer.applicationId ?? "",
      salary: String(offer.salary),
    });

    setFormError("");
    setApiError("");
    setModal("edit");
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // ----------------------------------------------------------
  // CREATE / UPDATE JOB OFFER
  // ----------------------------------------------------------

  const saveOffer = async (event) => {
    event.preventDefault();

    setFormError("");
    setApiError("");
    setSuccessMessage("");

    if (
      !form.candidateName.trim() ||
      !form.email.trim() ||
      !form.jobTitle.trim() ||
      !form.salary ||
      !form.startDate ||
      !form.expiryDate
    ) {
      setFormError("Please complete all required fields.");
      return;
    }

    if (modal === "create" && !form.applicationId) {
      setFormError("Please select an eligible candidate.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (!Number.isFinite(Number(form.salary)) || Number(form.salary) <= 0) {
      setFormError("Salary must be greater than zero.");
      return;
    }

    // Offer expiry must be before the proposed start date.
    if (form.expiryDate >= form.startDate) {
      setFormError(
        "The offer expiry date must be before the proposed start date."
      );
      return;
    }

    // IMPORTANT: Backend JobOfferRequestDTO expects "email",
    // not "candidateEmail".
    const payload = {
      applicationId: form.applicationId
        ? Number(form.applicationId)
        : null,
      candidateName: form.candidateName.trim(),
      email: form.email.trim(),
      jobTitle: form.jobTitle.trim(),
      department: form.department,
      employmentType: form.employmentType,
      salary: Number(form.salary),
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      notes: form.notes || "",
    };

    setSaving(true);

    try {
      if (modal === "edit") {
        if (!form.id) {
          throw new Error("This offer does not have a valid ID.");
        }

        await recruitmentApi.updateJobOffer(form.id, payload);
        setSuccessMessage("Job offer updated successfully.");
      } else {
        await recruitmentApi.createJobOffer(payload);
        setSuccessMessage("Job offer created successfully as a draft.");
      }

      setModal(null);
      setForm({ ...emptyForm });

      await loadOffers();
      await loadEligibleCandidates();
    } catch (error) {
      setFormError(error.message || "Unable to save the job offer.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // CHANGE OFFER STATUS
  // ----------------------------------------------------------

  const changeStatus = async (offer, status) => {
    setApiError("");
    setSuccessMessage("");

    if (!offer?.id) {
      setApiError("This offer does not have a valid ID.");
      return;
    }

    const allowedStatuses = {
      Draft: ["Sent"],
      Sent: ["Pending", "Accepted", "Rejected", "Withdrawn"],
      Pending: ["Accepted", "Rejected", "Withdrawn"],
      Accepted: [],
      Rejected: [],
      Withdrawn: [],
    };

    if (!(allowedStatuses[offer.status] || []).includes(status)) {
      setApiError(`Cannot change an offer from ${offer.status} to ${status}.`);
      return;
    }

    setActionId(offer.id);

    try {
      await recruitmentApi.updateJobOfferStatus(
        offer.id,
        toApiStatus(status)
      );

      await loadOffers();

      setSelectedOffer((current) =>
        current?.id === offer.id
          ? { ...current, status }
          : current
      );

      setSuccessMessage(`Offer marked as ${status.toLowerCase()}.`);
    } catch (error) {
      setApiError(error.message || "Unable to update the offer status.");
    } finally {
      setActionId(null);
    }
  };

  // ----------------------------------------------------------
  // DELETE DRAFT OFFER
  // ----------------------------------------------------------

  const deleteOffer = async (offer) => {
    if (!offer?.id) {
      setApiError("This offer does not have a valid ID.");
      return;
    }

    if (offer.status !== "Draft") {
      setApiError("Only draft offers can be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the draft offer for ${offer.candidateName}?`
    );

    if (!confirmed) return;

    setApiError("");
    setSuccessMessage("");
    setActionId(offer.id);

    try {
      await recruitmentApi.deleteJobOffer(offer.id);

      setOffers((current) =>
        current.filter((item) => item.id !== offer.id)
      );

      if (selectedOffer?.id === offer.id) {
        setModal(null);
        setSelectedOffer(null);
      }

      setSuccessMessage("Draft job offer deleted successfully.");
      await loadEligibleCandidates();
    } catch (error) {
      setApiError(error.message || "Unable to delete the job offer.");
    } finally {
      setActionId(null);
    }
  };

  // ----------------------------------------------------------
  // VIEW OFFER DETAILS
  // ----------------------------------------------------------

  const openDetails = (offer) => {
    setSelectedOffer(offer);
    setEmailError("");
    setEmailSuccess("");
    setModal("view");
  };

  // ----------------------------------------------------------
  // SEND JOB OFFER EMAIL
  // ----------------------------------------------------------

  const sendOfferEmail = async () => {
    if (!selectedOffer?.id) {
      setEmailError("Please select a valid job offer.");
      return;
    }

    if (!selectedOffer.email) {
      setEmailError("The candidate's email address is missing.");
      return;
    }

    if (selectedOffer.status !== "Draft") {
      setEmailError("Only draft offers can be sent using this action.");
      return;
    }

    setEmailSending(true);
    setEmailError("");
    setEmailSuccess("");
    setApiError("");

    try {
      await recruitmentApi.sendJobOfferEmail(selectedOffer.id);

      await loadOffers();

      setSelectedOffer((current) =>
        current ? { ...current, status: "Sent" } : current
      );

      setEmailSuccess(
        `Offer email sent successfully to ${selectedOffer.email}.`
      );

      setSuccessMessage(
        `Offer email sent to ${selectedOffer.email}.`
      );
    } catch (error) {
      setEmailError(
        error.message || "Failed to send the offer email."
      );
    } finally {
      setEmailSending(false);
    }
  };

  // ----------------------------------------------------------
  // CLOSE MODALS
  // ----------------------------------------------------------

  const closeModal = () => {
    if (saving || emailSending) return;

    setModal(null);
    setSelectedOffer(null);
    setFormError("");
    setEmailError("");
    setEmailSuccess("");
  };

  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <PageLayout role="recruiter" activePage="Job Offers">
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        {/* PAGE HEADER */}
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Job Offers
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create offers, email candidates, and manage hiring decisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                loadOffers();
                loadEligibleCandidates();
              }}
              disabled={loading || eligibleLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading || eligibleLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus size={18} />
              Create Job Offer
            </button>
          </div>
        </div>

        {/* API ERROR */}
        {apiError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">Request failed</p>
              <p className="mt-1">{apiError}</p>
            </div>

            <button
              type="button"
              onClick={() => setApiError("")}
              className="rounded p-1 hover:bg-rose-100"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss message"
              className="rounded p-1 hover:bg-emerald-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ELIGIBLE CANDIDATES SUMMARY */}
        <div className="mb-7 rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                <Users size={22} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Eligible Candidates
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Candidates who successfully completed all four interview
                  rounds and are ready for an offer.
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold text-indigo-700">
                {eligibleLoading ? "..." : eligibleCandidates.length}
              </p>
              <p className="text-xs text-gray-500">Ready for job offers</p>
            </div>
          </div>

          {eligibleError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-white p-3 text-sm text-rose-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{eligibleError}</span>
            </div>
          )}

          {!eligibleLoading &&
            !eligibleError &&
            eligibleCandidates.length === 0 && (
              <p className="mt-4 rounded-lg bg-white p-3 text-sm text-gray-500">
                No eligible candidates are currently available. Candidates
                will appear here after passing all four interview rounds.
              </p>
            )}

          {eligibleCandidates.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {eligibleCandidates.slice(0, 5).map((candidate) => (
                <div
                  key={candidate.applicationId}
                  className="rounded-lg border border-indigo-100 bg-white px-3 py-2"
                >
                  <p className="text-sm font-semibold text-gray-800">
                    {candidate.candidateName}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {candidate.jobTitle}
                  </p>
                </div>
              ))}

              {eligibleCandidates.length > 5 && (
                <div className="flex items-center rounded-lg bg-white px-3 py-2 text-xs font-medium text-indigo-700">
                  +{eligibleCandidates.length - 5} more candidates
                </div>
              )}
            </div>
          )}
        </div>

        {/* STATISTICS */}
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Offers"
            value={stats.total}
            icon={FileText}
            color="bg-indigo-50 text-indigo-600"
            description="All offer records"
          />

          <StatCard
            title="Drafts"
            value={stats.drafts}
            icon={Pencil}
            color="bg-slate-100 text-slate-600"
            description="Not yet sent"
          />

          <StatCard
            title="Awaiting Response"
            value={stats.pending}
            icon={Clock}
            color="bg-amber-50 text-amber-600"
            description="Sent or pending"
          />

          <StatCard
            title="Accepted"
            value={stats.accepted}
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-600"
            description="Accepted offers"
          />

          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="bg-rose-50 text-rose-600"
            description="Declined offers"
          />
        </div>

        {/* OFFERS TABLE */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Job Offer Records
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredOffers.length} offer
                  {filteredOffers.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search candidates..."
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-60"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-indigo-500 sm:w-40"
                  >
                    <option value="All">All statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="All">All employment types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Candidate</th>
                  <th className="px-5 py-4 font-semibold">Job Position</th>
                  <th className="px-5 py-4 font-semibold">Salary / Month</th>
                  <th className="px-5 py-4 font-semibold">Start Date</th>
                  <th className="px-5 py-4 font-semibold">Offer Expiry</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <RefreshCw
                        size={28}
                        className="mx-auto mb-3 animate-spin text-indigo-500"
                      />

                      <p className="font-medium text-gray-700">
                        Loading job offers...
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOffers.map((offer) => (
                    <tr
                      key={offer.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                            {getInitials(offer.candidateName)}
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {offer.candidateName}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {offer.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">
                          {offer.jobTitle}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {offer.department} · {offer.employmentType}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-800">
                        {formatSalary(offer.salary)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {formatDate(offer.startDate)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {formatDate(offer.expiryDate)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={offer.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View offer details"
                            onClick={() => openDetails(offer)}
                            className="rounded-md p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            title="Edit draft offer"
                            onClick={() => openEdit(offer)}
                            disabled={
                              offer.status !== "Draft" ||
                              actionId === offer.id
                            }
                            className="rounded-md p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Pencil size={17} />
                          </button>

                          {offer.status === "Draft" && (
                            <>
                              <button
                                type="button"
                                title="Send offer email"
                                onClick={() => openDetails(offer)}
                                disabled={actionId === offer.id}
                                className="rounded-md p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                              >
                                <Mail size={17} />
                              </button>

                              <button
                                type="button"
                                title="Delete draft offer"
                                onClick={() => deleteOffer(offer)}
                                disabled={actionId === offer.id}
                                className="rounded-md p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              >
                                <Trash2 size={17} />
                              </button>
                            </>
                          )}

                          {["Sent", "Pending"].includes(offer.status) && (
                            <button
                              type="button"
                              title="Withdraw offer"
                              disabled={actionId === offer.id}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Withdraw the offer for ${offer.candidateName}?`
                                  )
                                ) {
                                  changeStatus(offer, "Withdrawn");
                                }
                              }}
                              className="rounded-md p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                              <Ban size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {!loading && filteredOffers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <FileText
                        size={36}
                        className="mx-auto mb-3 text-gray-300"
                      />

                      <p className="font-medium text-gray-700">
                        No job offers found
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {apiError
                          ? "Check the error message above and try refreshing."
                          : "Create an offer or change your search and filters."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 px-5 py-4 text-xs text-gray-500">
            Showing {filteredOffers.length} of {offers.length} offers
          </div>
        </div>

        {/* CREATE / EDIT MODAL */}
        {(modal === "create" || modal === "edit") && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4"
            onClick={closeModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-form-title"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
                <div>
                  <h2
                    id="offer-form-title"
                    className="text-lg font-bold text-gray-900"
                  >
                    {modal === "create"
                      ? "Create Job Offer"
                      : "Edit Job Offer"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {modal === "create"
                      ? "Select an eligible candidate and create an offer."
                      : "Only draft offers can be edited."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={saveOffer} className="space-y-5 p-6">
                {modal === "create" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Select Eligible Candidate *
                    </label>

                    <select
                      required
                      value={form.applicationId}
                      onChange={(event) =>
                        handleCandidateSelection(event.target.value)
                      }
                      disabled={eligibleLoading}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="">
                        {eligibleLoading
                          ? "Loading eligible candidates..."
                          : "Select a candidate"}
                      </option>

                      {eligibleCandidates.map((candidate) => (
                        <option
                          key={candidate.applicationId}
                          value={candidate.applicationId}
                        >
                          {candidate.candidateName} — {candidate.jobTitle}
                        </option>
                      ))}
                    </select>

                    {eligibleError && (
                      <p className="mt-2 text-xs text-rose-600">
                        {eligibleError}
                      </p>
                    )}

                    {!eligibleLoading &&
                      !eligibleError &&
                      eligibleCandidates.length === 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          There are no eligible candidates available.
                        </p>
                      )}

                    <p className="mt-1.5 text-xs text-gray-500">
                      Only candidates who passed all four interview rounds
                      are listed here.
                    </p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Candidate Name *
                    </label>

                    <input
                      required
                      maxLength={150}
                      value={form.candidateName}
                      readOnly={modal === "create"}
                      onChange={(event) =>
                        updateForm("candidateName", event.target.value)
                      }
                      placeholder="Candidate full name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 read-only:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>

                    <input
                      required
                      type="email"
                      maxLength={180}
                      value={form.email}
                      readOnly={modal === "create"}
                      onChange={(event) =>
                        updateForm("email", event.target.value)
                      }
                      placeholder="candidate@example.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 read-only:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Job Position *
                    </label>

                    <input
                      required
                      maxLength={150}
                      value={form.jobTitle}
                      readOnly={modal === "create"}
                      onChange={(event) =>
                        updateForm("jobTitle", event.target.value)
                      }
                      placeholder="e.g. Software Engineer"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 read-only:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Department *
                    </label>

                    <select
                      value={form.department}
                      onChange={(event) =>
                        updateForm("department", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    >
                      <option>Engineering</option>
                      <option>Human Resources</option>
                      <option>Finance</option>
                      <option>Design</option>
                      <option>Quality Assurance</option>
                      <option>Marketing</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Employment Type *
                    </label>

                    <select
                      value={form.employmentType}
                      onChange={(event) =>
                        updateForm("employmentType", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Monthly Salary (LKR) *
                    </label>

                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.salary}
                      onChange={(event) =>
                        updateForm("salary", event.target.value)
                      }
                      placeholder="150000"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Proposed Start Date *
                    </label>

                    <input
                      required
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        updateForm("startDate", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Offer Expiry Date *
                    </label>

                    <input
                      required
                      type="date"
                      value={form.expiryDate}
                      onChange={(event) =>
                        updateForm("expiryDate", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Notes
                    </label>

                    <textarea
                      rows={3}
                      maxLength={5000}
                      value={form.notes}
                      onChange={(event) =>
                        updateForm("notes", event.target.value)
                      }
                      placeholder="Additional offer details..."
                      className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {formError && (
                  <p
                    role="alert"
                    className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
                  >
                    {formError}
                  </p>
                )}

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      (modal === "create" &&
                        (!form.applicationId || eligibleLoading))
                    }
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : modal === "create"
                        ? "Create Offer"
                        : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW OFFER / SEND EMAIL MODAL */}
        {modal === "view" && selectedOffer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4"
            onClick={closeModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-detail-title"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
                <div>
                  <h2
                    id="offer-detail-title"
                    className="text-lg font-bold text-gray-900"
                  >
                    Job Offer Details
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Offer ID: OFF-{String(selectedOffer.id).padStart(3, "0")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={emailSending}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                  aria-label="Close offer details"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                    {getInitials(selectedOffer.candidateName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedOffer.candidateName}
                    </h3>

                    <p className="break-all text-sm text-gray-500">
                      {selectedOffer.email}
                    </p>
                  </div>

                  <StatusBadge status={selectedOffer.status} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: BriefcaseBusiness,
                      label: "Position",
                      value: selectedOffer.jobTitle,
                    },
                    {
                      icon: UserRound,
                      label: "Department",
                      value: selectedOffer.department,
                    },
                    {
                      icon: DollarSign,
                      label: "Monthly Salary",
                      value: formatSalary(selectedOffer.salary),
                    },
                    {
                      icon: FileText,
                      label: "Employment Type",
                      value: selectedOffer.employmentType,
                    },
                    {
                      icon: CalendarDays,
                      label: "Start Date",
                      value: formatDate(selectedOffer.startDate),
                    },
                    {
                      icon: Clock,
                      label: "Offer Expiry",
                      value: formatDate(selectedOffer.expiryDate),
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <Icon size={16} />
                        <span className="text-xs">{label}</span>
                      </div>

                      <p className="break-words text-sm font-semibold text-gray-900">
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-gray-800">
                    Notes
                  </p>

                  <p className="whitespace-pre-wrap text-sm text-gray-600">
                    {selectedOffer.notes || "No additional notes."}
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                      <Mail size={20} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Send Offer Email
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        Send the job offer to the candidate's registered email
                        address.
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Recipient
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-gray-900">
                      {selectedOffer.email || "No email address available"}
                    </p>
                  </div>

                  {selectedOffer.status === "Draft" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        The backend will generate the offer email using the
                        saved job offer details. The offer status will be
                        updated after the email endpoint succeeds.
                      </p>

                      {emailError && (
                        <div
                          role="alert"
                          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                        >
                          <AlertCircle
                            size={17}
                            className="mt-0.5 shrink-0"
                          />
                          <p>{emailError}</p>
                        </div>
                      )}

                      {emailSuccess && (
                        <p
                          role="status"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                        >
                          {emailSuccess}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={sendOfferEmail}
                        disabled={emailSending || !selectedOffer.email}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {emailSending ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}

                        {emailSending
                          ? "Sending Email..."
                          : "Send Offer Email"}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-emerald-600"
                        />

                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            Offer status: {selectedOffer.status}
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            The email action is available only while an offer
                            is in Draft status.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {["Sent", "Pending"].includes(selectedOffer.status) && (
                  <div className="flex flex-wrap gap-3 border-t pt-4">
                    <button
                      type="button"
                      disabled={actionId === selectedOffer.id}
                      onClick={() =>
                        changeStatus(selectedOffer, "Accepted")
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Mark Accepted
                    </button>

                    <button
                      type="button"
                      disabled={actionId === selectedOffer.id}
                      onClick={() =>
                        changeStatus(selectedOffer, "Rejected")
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Mark Rejected
                    </button>

                    <button
                      type="button"
                      disabled={actionId === selectedOffer.id}
                      onClick={() =>
                        changeStatus(selectedOffer, "Withdrawn")
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Ban size={16} />
                      Withdraw
                    </button>
                  </div>
                )}

                {selectedOffer.status === "Draft" && (
                  <div className="flex justify-end border-t pt-4">
                    <button
                      type="button"
                      disabled={actionId === selectedOffer.id}
                      onClick={() => deleteOffer(selectedOffer)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Delete Draft
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  Created on {formatDate(selectedOffer.createdDate)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
