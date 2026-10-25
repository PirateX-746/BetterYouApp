"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Pill,
  X,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api";
import { escapeHtml } from "@/lib/escapeHtml";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { LoadingState } from "@/components/ui/loading-state";
import toast from "react-hot-toast";

interface MedicationOption {
  _id: string;
  name: string;
  category?: string;
}

interface PatientMedication {
  _id: string;
  medicationId: MedicationOption | null;
  dosage: string;
  frequency: string;
  startDate?: string;
  endDate?: string;
  diagnosis?: string;
  notes?: string;
  status: "active" | "discontinued" | "completed";
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success-light text-success-strong",
  discontinued: "bg-danger-light text-danger-strong",
  completed: "bg-primary-light text-primary",
};

const EMPTY_FORM = {
  medicationId: "",
  dosage: "",
  frequency: "",
  startDate: "",
  endDate: "",
  diagnosis: "",
  notes: "",
};

const EMPTY_NEW_MED = { name: "", category: "" };

export default function MedicationsTab() {
  const params = useParams();
  const patientId = params?.id as string;
  const practitionerId =
    typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  const [records, setRecords] = useState<PatientMedication[]>([]);
  const [catalog, setCatalog] = useState<MedicationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingNewMed, setAddingNewMed] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [newMed, setNewMed] = useState(EMPTY_NEW_MED);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    if (!patientId || !practitionerId) return;
    try {
      const [recordsRes, catalogRes] = await Promise.all([
        api.get<PatientMedication[]>("/patient-medications", { params: { patientId } }),
        api.get<MedicationOption[]>("/medications", { params: { practitionerId } }),
      ]);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setCatalog(Array.isArray(catalogRes.data) ? catalogRes.data : []);
    } catch {
      toast.error("Failed to load medications");
    }
  }, [patientId, practitionerId]);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    if (showForm) {
      setTimeout(
        () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    }
  }, [showForm]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setNewMed(EMPTY_NEW_MED);
    setAddingNewMed(false);
  };

  const handleCreateMedication = async () => {
    if (!newMed.name.trim()) {
      toast.error("Medication name is required");
      return null;
    }
    try {
      const res = await api.post("/medications", {
        practitionerId,
        name: newMed.name,
        category: newMed.category || undefined,
      });
      const created: MedicationOption = res.data;
      setCatalog((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created._id;
    } catch {
      toast.error("Failed to add medication to library");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practitionerId) return;

    let medicationId = form.medicationId;
    if (addingNewMed) {
      const createdId = await handleCreateMedication();
      if (!createdId) return;
      medicationId = createdId;
    }
    if (!medicationId) { toast.error("Select or add a medication"); return; }
    if (!form.dosage.trim()) { toast.error("Dosage is required"); return; }
    if (!form.frequency.trim()) { toast.error("Frequency is required"); return; }

    setSaving(true);
    try {
      await api.post("/patient-medications", {
        patientId,
        practitionerId,
        medicationId,
        dosage: form.dosage,
        frequency: form.frequency,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        diagnosis: form.diagnosis || undefined,
        notes: form.notes || undefined,
      });
      await fetchAll();
      resetForm();
      setShowForm(false);
      toast.success("Medication recorded");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to record medication");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await api.patch(`/patient-medications/${id}`, { status });
      setRecords((prev) => prev.map((r) => (r._id === id ? { ...r, ...res.data } : r)));
    } catch {
      toast.error("Failed to update");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/patient-medications/${deleteId}`);
      setRecords((prev) => prev.filter((r) => r._id !== deleteId));
      toast.success("Removed");
      setDeleteId(null);
    } catch {
      toast.error("Failed to remove");
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Medication Record</title><style>
        body{font-family:sans-serif;padding:40px;color:#1f1f1f}
        h1{font-size:20px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#9aa0a6;padding:6px 0;border-bottom:1px solid #e8eaed}
        td{font-size:14px;padding:8px 0;border-bottom:1px solid #f0f0f0}
      </style></head><body>
        <h1>Medication Record</h1>
        <table>
          <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Status</th></tr></thead>
          <tbody>${records.map(r=>`<tr><td>${escapeHtml(r.medicationId?.name ?? "—")}</td><td>${escapeHtml(r.dosage)}</td><td>${escapeHtml(r.frequency)}</td><td>${escapeHtml(r.status)}</td></tr>`).join("")}</tbody>
        </table>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) {
    return (
      <LoadingState />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {records.length} medication{records.length !== 1 ? "s" : ""} on record
        </p>
        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <button onClick={handlePrint} className="text-text-secondary hover:text-primary transition p-1.5" title="Print medication record">
              <Printer size={14} />
            </button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setShowForm((v) => !v);
              if (showForm) resetForm();
            }}
          >
            {showForm ? <X size={14} className="mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
            {showForm ? "Cancel" : "Add Medication"}
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div ref={formRef} className="border border-border rounded-2xl p-4 space-y-4 bg-bg-page">
          <p className="text-sm font-semibold text-text-primary">Record Medication</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Medication picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Medication</Label>
                <button
                  type="button"
                  onClick={() => setAddingNewMed((v) => !v)}
                  className="text-xs text-primary hover:underline"
                >
                  {addingNewMed ? "Choose from library instead" : "+ Add new to library"}
                </button>
              </div>

              {addingNewMed ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newMed.name}
                    onChange={(e) => setNewMed((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Medication name"
                  />
                  <Input
                    value={newMed.category}
                    onChange={(e) => setNewMed((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Category (optional)"
                  />
                </div>
              ) : (
                <select
                  value={form.medicationId}
                  onChange={(e) => setForm((f) => ({ ...f, medicationId: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-bg-page text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="">Select a medication…</option>
                  {catalog.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}{m.category ? ` · ${m.category}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Dosage</Label>
                <Input value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 50mg" />
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Input value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} placeholder="e.g. Once daily" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Start Date (optional)</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date (optional)</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Diagnosis (optional)</Label>
              <Input value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g. Generalised Anxiety Disorder" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Additional notes…"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-bg-page text-text-primary focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Pill size={32} className="text-text-disabled" />
          <p className="text-sm text-text-secondary">No medications on record yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r._id} className="border border-border rounded-2xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {r.medicationId?.name ?? "Unknown medication"}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {r.dosage} · {r.frequency}
                  </p>
                  {(r.diagnosis || r.notes) && (
                    <p className="text-xs text-text-secondary mt-1">
                      {[r.diagnosis, r.notes].filter(Boolean).join(" — ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusChange(r._id, e.target.value)}
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-bg-page text-text-secondary focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="discontinued">Discontinued</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={() => setDeleteId(r._id)} className="text-text-secondary hover:text-danger-strong transition p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Remove medication record"
        description="This medication record will be permanently removed from the patient's history. This cannot be undone."
        confirmLabel="Remove"
        danger
        loading={deleting}
      />
    </div>
  );
}
