"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, FileText, X } from "lucide-react";
import { api } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

/* ── Types ── */
interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Prescription {
  _id: string;
  patientId: Patient;
  diagnosis: string;
  medications: Medication[];
  notes?: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const EMPTY_MED: Medication = { name: "", dosage: "", frequency: "", duration: "" };

/* ── Page ── */
export default function PrescriptionsPage() {
  const practitionerId = useLocalStorage("userId");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  /* form state */
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState<Medication[]>([{ ...EMPTY_MED }]);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchPrescriptions = useCallback(async () => {
    if (!practitionerId) return;
    try {
      const res = await api.get("/prescriptions", { params: { practitionerId } });
      setPrescriptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load prescriptions");
    }
  }, [practitionerId]);

  useEffect(() => {
    if (!practitionerId) { setLoading(false); return; }
    Promise.all([
      fetchPrescriptions(),
      api.get("/patients").then((r) => setPatients(Array.isArray(r.data) ? r.data : [])),
    ]).finally(() => setLoading(false));
  }, [practitionerId, fetchPrescriptions]);

  /* ── Scroll form into view on open ── */
  useEffect(() => {
    if (showForm) setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [showForm]);

  const resetForm = () => {
    setPatientId(""); setDiagnosis(""); setNotes(""); setMeds([{ ...EMPTY_MED }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practitionerId) return;
    if (!patientId) { toast.error("Select a patient"); return; }
    if (!diagnosis.trim()) { toast.error("Diagnosis is required"); return; }
    if (meds.some((m) => !m.name.trim())) { toast.error("Each medication needs a name"); return; }
    setSaving(true);
    try {
      await api.post("/prescriptions", { patientId, practitionerId, diagnosis, medications: meds, notes: notes || undefined });
      await fetchPrescriptions();
      resetForm();
      setShowForm(false);
      toast.success("Prescription created");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to create prescription");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await api.patch(`/prescriptions/${id}`, { status });
      setPrescriptions((prev) => prev.map((p) => (p._id === id ? { ...p, ...res.data } : p)));
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prescription?")) return;
    try {
      await api.delete(`/prescriptions/${id}`);
      setPrescriptions((prev) => prev.filter((p) => p._id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const updateMed = (i: number, field: keyof Medication, value: string) => {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  };

  const filtered = prescriptions.filter((p) => {
    const name = `${p.patientId?.firstName} ${p.patientId?.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || p.diagnosis.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Prescriptions</h1>
          <p className="text-sm text-text-secondary mt-0.5">Create and manage patient prescriptions</p>
        </div>
        <Button onClick={() => { setShowForm((v) => !v); if (showForm) resetForm(); }}>
          {showForm ? <X size={15} className="mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
          {showForm ? "Cancel" : "New Prescription"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div ref={formRef} className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">New Prescription</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient select */}
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-bg-page text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Diagnosis */}
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Generalised Anxiety Disorder" />
            </div>

            {/* Medications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Medications</Label>
                <button type="button" onClick={() => setMeds((p) => [...p, { ...EMPTY_MED }])} className="text-xs text-primary hover:underline">
                  + Add medication
                </button>
              </div>
              {meds.map((med, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-bg-page border border-border rounded-xl p-3 relative">
                  <Input value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)} placeholder="Drug name" />
                  <Input value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} placeholder="Dosage (e.g. 10mg)" />
                  <Input value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} placeholder="Frequency (e.g. 2x daily)" />
                  <div className="flex gap-2">
                    <Input value={med.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} placeholder="Duration (e.g. 30 days)" />
                    {meds.length > 1 && (
                      <button type="button" onClick={() => setMeds((p) => p.filter((_, idx) => idx !== i))} className="text-danger hover:text-danger/80 shrink-0">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional instructions…"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-bg-page text-text-primary focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}
                {saving ? "Creating…" : "Create Prescription"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <Input placeholder="Search by patient or diagnosis…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
          <FileText size={36} className="text-text-disabled mx-auto mb-3" />
          <p className="font-medium text-text-primary">No prescriptions yet</p>
          <p className="text-sm text-text-secondary mt-1">Create your first prescription above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rx) => (
            <div key={rx._id} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              {/* Row */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {rx.patientId?.firstName?.[0]}{rx.patientId?.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {rx.patientId?.firstName} {rx.patientId?.lastName}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{rx.diagnosis}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[rx.status]}`}>
                    {rx.status}
                  </span>
                  <span className="text-xs text-text-secondary hidden sm:block">
                    {new Date(rx.createdAt).toLocaleDateString()}
                  </span>
                  <select
                    value={rx.status}
                    onChange={(e) => handleStatusChange(rx._id, e.target.value)}
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-bg-page text-text-secondary focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button onClick={() => setExpanded((v) => (v === rx._id ? null : rx._id))} className="text-text-secondary hover:text-text-primary transition p-1">
                    {expanded === rx._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => handleDelete(rx._id)} className="text-text-secondary hover:text-danger transition p-1">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {expanded === rx._id && (
                <div className="border-t border-border px-4 py-4 space-y-3 bg-bg-page">
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Medications</p>
                    <div className="space-y-2">
                      {rx.medications.map((m, i) => (
                        <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div><span className="text-text-secondary text-xs">Drug</span><p className="font-medium text-text-primary">{m.name}</p></div>
                          <div><span className="text-text-secondary text-xs">Dosage</span><p className="font-medium text-text-primary">{m.dosage}</p></div>
                          <div><span className="text-text-secondary text-xs">Frequency</span><p className="font-medium text-text-primary">{m.frequency}</p></div>
                          <div><span className="text-text-secondary text-xs">Duration</span><p className="font-medium text-text-primary">{m.duration}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {rx.notes && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm text-text-primary">{rx.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
