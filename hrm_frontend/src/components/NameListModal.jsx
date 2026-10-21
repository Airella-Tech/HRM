/**
 * NameListModal — popup version of NameListPage: same "add a list of names in one
 * go" form (leave types, employment types, ...), but shown as a centered popup
 * with a blurred backdrop and a close button, matching AddEmployeeModal's style,
 * instead of navigating to a separate page.
 *
 * Props:
 *   open                 : whether the modal is shown
 *   onClose()            : called when the backdrop, close button, or Escape is used
 *   title, subtitle      : modal header text
 *   heading, hint        : card header text (inside the form)
 *   placeholder          : row input placeholder
 *   addLabel             : text of the "+ Add another ..." button
 *   saveLabel            : text of the save button
 *   existingLabel        : heading of the "already added" list
 *   emptyLabel           : shown when nothing has been added yet
 *   icon                 : lucide icon component for the card header
 *   load()               : resolves to the API response listing existing items ({ data: [{ id, name, createdByName }] })
 *   save(names)          : resolves to the API response after saving
 *   onUpdate(id, name)   : optional — resolves after renaming an existing item. When given,
 *                          each existing item gets an edit control.
 *   onDelete(id)         : optional — resolves after removing an existing item. When given,
 *                          each existing item gets a delete control.
 */
import React, { useState, useEffect, useRef } from "react";
import { Plus, X, Save, Pencil, Trash2, Check, Loader2 } from "lucide-react";

// Server errors come back as "400: <reason>"; show just the reason
const errorText = (error, fallback) => (error?.message || fallback).replace(/^\d{3}:\s*/, "");

const newRow = () => ({ key: `${Date.now()}-${Math.random()}`, name: "" });

export const NameListModal = ({
  open, onClose, title, subtitle, heading, hint, placeholder, addLabel, saveLabel,
  existingLabel, emptyLabel, icon: Icon, load, save, onUpdate, onDelete,
}) => {
  const [rows, setRows] = useState([newRow()]);
  const [existing, setExisting] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputRefs = useRef({});
  const focusKey = useRef(null);

  // Editing / deleting an already-added item (only wired up when onUpdate / onDelete are given)
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [rowBusyId, setRowBusyId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  const editable = Boolean(onUpdate || onDelete);

  const loadExisting = async () => {
    try {
      const res = await load();
      setExisting(res.data || []);
    } catch (e) {
      setError(errorText(e, "Failed to load existing items"));
    }
  };

  // Reset and (re)load every time the popup is opened
  useEffect(() => {
    if (!open) return;
    setRows([newRow()]);
    setError("");
    setMessage("");
    setEditingId(null);
    setEditValue("");
    setConfirmDeleteId(null);
    setRowErrors({});
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus the row that was just added
  useEffect(() => {
    if (focusKey.current && inputRefs.current[focusKey.current]) {
      inputRefs.current[focusKey.current].focus();
      focusKey.current = null;
    }
  }, [rows]);

  const addRow = () => {
    const row = newRow();
    focusKey.current = row.key;
    setRows(prev => [...prev, row]);
  };

  const updateRow = (key, name) => setRows(prev => prev.map(r => (r.key === key ? { ...r, name } : r)));
  const removeRow = (key) => setRows(prev => (prev.length > 1 ? prev.filter(r => r.key !== key) : prev));

  const handleSave = async (e) => {
    e.preventDefault();
    const names = rows.map(r => r.name.trim()).filter(Boolean);
    if (names.length === 0) {
      setError(`${placeholder.split(",")[0]} is required`);
      return;
    }
    try {
      setSaving(true);
      setError("");
      const res = await save(names);
      setMessage(`✓ ${res.message || "Saved"}`);
      setTimeout(() => setMessage(""), 3000);
      setRows([newRow()]);
      loadExisting();
    } catch (e2) {
      setError(errorText(e2, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setConfirmDeleteId(null);
    setRowErrors(prev => ({ ...prev, [item.id]: "" }));
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (item) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setRowErrors(prev => ({ ...prev, [item.id]: "Name is required" }));
      return;
    }
    if (trimmed === item.name) {
      cancelEdit();
      return;
    }
    try {
      setRowBusyId(item.id);
      setRowErrors(prev => ({ ...prev, [item.id]: "" }));
      await onUpdate(item.id, trimmed);
      setEditingId(null);
      setEditValue("");
      loadExisting();
    } catch (e) {
      setRowErrors(prev => ({ ...prev, [item.id]: errorText(e, "Failed to update") }));
    } finally {
      setRowBusyId(null);
    }
  };

  const runDelete = async (item) => {
    try {
      setRowBusyId(item.id);
      setRowErrors(prev => ({ ...prev, [item.id]: "" }));
      await onDelete(item.id);
      setConfirmDeleteId(null);
      loadExisting();
    } catch (e) {
      setRowErrors(prev => ({ ...prev, [item.id]: errorText(e, "Failed to delete") }));
      setConfirmDeleteId(null);
    } finally {
      setRowBusyId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-500 to-emerald-600 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">{Icon && <Icon size={18} />} {title}</h2>
            {subtitle && <p className="text-xs text-white/80 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {message && <div className="p-3 rounded-lg text-white bg-green-500 text-sm">{message}</div>}

          <form onSubmit={handleSave} className="space-y-3">
            {heading && <h3 className="text-sm font-semibold text-gray-700">{heading}</h3>}
            {hint && <p className="text-xs text-gray-500">{hint}</p>}

            {rows.map((row, i) => (
              <div key={row.key} className="flex items-center gap-3">
                <span className="w-7 text-sm font-semibold text-gray-400 text-right">{i + 1}.</span>
                <input
                  ref={el => { inputRefs.current[row.key] = el; }}
                  value={row.name}
                  onChange={e => updateRow(row.key, e.target.value)}
                  onKeyDown={e => {
                    // Enter on the last row adds another row instead of submitting
                    if (e.key === "Enter" && i === rows.length - 1 && row.name.trim()) {
                      e.preventDefault();
                      addRow();
                    }
                  }}
                  placeholder={placeholder}
                  maxLength={100}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                />
                <button type="button" onClick={() => removeRow(row.key)} disabled={rows.length === 1}
                  title="Remove row"
                  className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}

            <button type="button" onClick={addRow}
              className="w-full mt-2 border-2 border-dashed border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-600 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <Plus size={16} strokeWidth={2.5} /> {addLabel}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 bg-gradient-to-br from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-all">
                <Save size={16} /> {saving ? "Saving..." : saveLabel}
              </button>
            </div>
          </form>

          {/* Already added, so HR can see what exists before adding more */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{existingLabel} ({existing.length})</h3>
            {existing.length === 0 ? (
              <p className="text-sm text-gray-400">{emptyLabel}</p>
            ) : !editable ? (
              <div className="flex flex-wrap gap-2">
                {existing.map(t => (
                  <span key={t.id} title={t.createdByName ? `Added by ${t.createdByName}` : undefined}
                    className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-xl text-xs font-semibold">
                    {t.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {existing.map(item => {
                  const busy = rowBusyId === item.id;
                  return (
                    <div key={item.id}
                      className="bg-white border border-teal-100 rounded-xl px-3 py-2.5">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") { e.preventDefault(); saveEdit(item); }
                              if (e.key === "Escape") cancelEdit();
                            }}
                            maxLength={100}
                            disabled={busy}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
                          />
                          <button type="button" onClick={() => saveEdit(item)} disabled={busy}
                            title="Save" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button type="button" onClick={cancelEdit} disabled={busy}
                            title="Cancel" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ) : confirmDeleteId === item.id ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-slate-700">Delete <strong>{item.name}</strong>?</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button type="button" onClick={() => runDelete(item)} disabled={busy}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                              {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)} disabled={busy}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold disabled:opacity-50 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span title={item.createdByName ? `Added by ${item.createdByName}` : undefined}
                            className="text-sm font-semibold text-teal-700">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {onUpdate && (
                              <button type="button" onClick={() => startEdit(item)}
                                title="Rename" className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                                <Pencil size={14} />
                              </button>
                            )}
                            {onDelete && (
                              <button type="button" onClick={() => setConfirmDeleteId(item.id)}
                                title="Delete" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {rowErrors[item.id] && (
                        <p className="text-red-600 text-xs mt-1.5">{rowErrors[item.id]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NameListModal;
