import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Building2,
  DoorOpen,
  X,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";

const emptyForm = {
  name: "",
  building: "",
  roomNumber: "",
  capacity: 1,
  description: "",
  status: "Active",
};

const extractList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data?.content)) return response.data.content;
  return [];
};

function PhysicalLocations() {
  const navigate = useNavigate();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadLocations = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await recruitmentApi.getPhysicalLocations();
      setLocations(extractList(response));
    } catch (err) {
      setError(err?.message || "Failed to load physical locations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return locations;

    return locations.filter((location) =>
      [
        location.name,
        location.building,
        location.roomNumber,
        location.description,
        location.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [locations, search]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEditModal = (location) => {
    setEditingId(location.id);
    setForm({
      name: location.name || "",
      building: location.building || "",
      roomNumber: location.roomNumber || "",
      capacity: location.capacity ?? 1,
      description: location.description || "",
      status: location.status || "Active",
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const locationData = {
      name: form.name.trim(),
      building: form.building.trim(),
      roomNumber: form.roomNumber.trim(),
      capacity: Number(form.capacity),
      description: form.description.trim(),
      status: form.status,
    };

    if (!locationData.name || !locationData.building) {
      window.alert("Please enter the location name and building.");
      return;
    }

    if (!Number.isInteger(locationData.capacity) || locationData.capacity < 1) {
      window.alert("Capacity must be a whole number greater than zero.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId !== null) {
        await recruitmentApi.updatePhysicalLocation(editingId, locationData);
      } else {
        await recruitmentApi.createPhysicalLocation(locationData);
      }

      setShowModal(false);
      setForm({ ...emptyForm });
      setEditingId(null);
      await loadLocations(true);
    } catch (err) {
      setError(err?.message || "Failed to save the physical location.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this location?")) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      // The backend performs a soft delete by changing the status to Inactive.
      await recruitmentApi.deletePhysicalLocation(id);
      await loadLocations(true);
    } catch (err) {
      setError(err?.message || "Failed to deactivate the physical location.");
    } finally {
      setDeletingId(null);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const activeCount = locations.filter(
    (location) => location.status === "Active"
  ).length;

  return (
    <PageLayout role="recruiter" activePage="Interviews">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Physical Interview Locations
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage rooms and physical locations used for interviews.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/recruitment/shortlisted-candidates")}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              <Plus size={17} />
              Add Physical Location
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 rounded p-1 hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Locations
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {locations.length}
                </p>
              </div>
              <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
                <MapPin size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Locations
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {activeCount}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <DoorOpen size={23} />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search locations..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            type="button"
            onClick={() => loadLocations(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Locations list */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
            <RefreshCw className="mx-auto animate-spin text-primary-600" size={30} />
            <p className="mt-3 text-sm text-slate-500">
              Loading physical locations...
            </p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <MapPin className="mx-auto text-slate-400" size={38} />
            <h3 className="mt-3 font-semibold text-slate-700">
              {search ? "No matching locations" : "No physical locations added"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try another search term."
                : "Add an interview room to get started."}
            </p>
            {!search && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                <Plus size={16} />
                Add Physical Location
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredLocations.map((location) => (
              <div
                key={location.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
                      <Building2 size={22} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-800">
                        {location.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {location.roomNumber || "Room not specified"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      location.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {location.status}
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <span>{location.building || "Building not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <span>Capacity: {location.capacity} people</span>
                  </div>
                  {location.description && (
                    <p className="border-t border-slate-100 pt-3 text-slate-500">
                      {location.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => openEditModal(location)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(location.id)}
                    disabled={deletingId === location.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === location.id ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editingId ? "Edit Physical Location" : "Add Physical Location"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the interview room details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Location Name *
                </label>
                <input
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="e.g. Main Interview Room"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Building *
                  </label>
                  <input
                    required
                    maxLength={200}
                    value={form.building}
                    onChange={(event) => updateField("building", event.target.value)}
                    placeholder="e.g. Main Building"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Room Number
                  </label>
                  <input
                    maxLength={50}
                    value={form.roomNumber}
                    onChange={(event) => updateField("roomNumber", event.target.value)}
                    placeholder="e.g. Room 204"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Capacity *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.capacity}
                    onChange={(event) => updateField("capacity", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) => updateField("status", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Optional details about this location..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Add Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default PhysicalLocations;
