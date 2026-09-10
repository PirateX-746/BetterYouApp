"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Pill, X, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import toast from "react-hot-toast";

interface Medication {
  _id: string;
  name: string;
  category?: string;
  description?: string;
  createdAt: string;
}

const EMPTY_FORM = { name: "", category: "", description: "" };

export default function MedicationsPage() {
  const practitionerId = useLocalStorage("userId");

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchMedications = useCallback(async () => {
    if (!practitionerId) return;
    try {
      const res = await api.get<Medication[]>("/medications", {
        params: { practitionerId, search: search || undefined },
      });
      setMedications(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load medications");
    }
  }, [practitionerId, search]);

  useEffect(() => {
    if (!practitionerId) {
      setLoading(false);
      return;
    }
    fetchMedications().finally(() => setLoading(false));
  }, [practitionerId, fetchMedications]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (m: Medication) => {
    setEditingId(m._id);
    setForm({ name: m.name, category: m.category ?? "", description: m.description ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practitionerId) return;
    if (!form.name.trim()) {
      toast.error("Medication name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        practitionerId,
        name: form.name,
        category: form.category || undefined,
        description: form.description || undefined,
      };
      if (editingId) {
        await api.patch(`/medications/${editingId}`, payload);
        toast.success("Medication updated");
      } else {
        await api.post("/medications", payload);
        toast.success("Medication added");
      }
      await fetchMedications();
      resetForm();
      setShowForm(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to save medication");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this medication from your library?")) return;
    try {
      await api.delete(`/medications/${id}`);
      setMedications((prev) => prev.filter((m) => m._id !== id));
      toast.success("Medication removed");
    } catch {
      toast.error("Failed to remove medication");
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Medications</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Your medication library — allocate these to patients from their profile
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v);
            if (showForm) resetForm();
          }}
        >
          {showForm ? <X size={15} className="mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
          {showForm ? "Cancel" : "Add Medication"}
        </Button>
      </div>

      {/* Create/edit form */}
      {showForm && (
        <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">
            {editingId ? "Edit Medication" : "Add Medication"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sertraline"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category (optional)</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. SSRI / Antidepressant"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Notes about this medication…"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-bg-page text-text-primary focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add Medication"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
        <input
          type="text"
          placeholder="Search medications…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 pl-9 pr-4 py-2 text-sm bg-bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary placeholder:text-text-disabled transition"
        />
      </div>

      {/* Table */}
      {medications.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl">
          <EmptyState
            icon={Pill}
            title="No medications yet"
            description="Add medications to your library so you can quickly record them against a patient's profile."
            action={{ label: "Add Medication", onClick: () => setShowForm(true) }}
          />
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Category", "Description", ""].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {medications.map((m) => (
                  <tr key={m._id} className="hover:bg-bg-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Pill size={14} />
                        </div>
                        <p className="text-sm font-medium text-text-primary">{m.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {m.category || <span className="text-text-disabled">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary max-w-xs truncate">
                      {m.description || <span className="text-text-disabled">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(m)}
                          className="text-text-secondary hover:text-primary transition p-1.5"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(m._id)}
                          className="text-text-secondary hover:text-danger transition p-1.5"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border">
            <p className="text-xs text-text-disabled">
              {medications.length} medication{medications.length !== 1 ? "s" : ""} in your library
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
