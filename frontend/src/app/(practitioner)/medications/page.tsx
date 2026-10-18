"use client";

import { Page, PageHeader } from "@/components/common/PageLayout";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Pill, X, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import toast from "react-hot-toast";

interface Medication {
  _id: string;
  name: string;
  category?: string;
  description?: string;
  createdAt: string;
}

const EMPTY_FORM = { name: "", category: "", description: "" };

function medicationColumns(
  onEdit: (m: Medication) => void,
  onDelete: (m: Medication) => void,
): DataTableColumn<Medication>[] {
  return [
    {
      key: "name",
      header: "Name",
      width: "30%",
      render: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Pill size={14} />
          </div>
          <p className="text-sm font-medium text-text-primary">{m.name}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "20%",
      className: "text-sm text-text-secondary",
      render: (m) => m.category || <span className="text-text-disabled">—</span>,
    },
    {
      key: "description",
      header: "Description",
      width: "35%",
      className: "text-sm text-text-secondary truncate max-w-xs",
      render: (m) => m.description || <span className="text-text-disabled">—</span>,
    },
    {
      key: "actions",
      header: "",
      width: "15%",
      align: "right",
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(m)}
            className="text-text-secondary hover:text-primary transition p-1.5"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(m)}
            className="text-text-secondary hover:text-danger transition p-1.5"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];
}

export default function MedicationsPage() {
  const practitionerId = useLocalStorage("userId");

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/medications/${deleteTarget._id}`);
      setMedications((prev) => prev.filter((m) => m._id !== deleteTarget._id));
      toast.success("Medication removed");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to remove medication");
    } finally {
      setDeleting(false);
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
    <Page fill>
      <PageHeader
        title="Medications"
        subtitle="Your medication library — allocate these to patients from their profile"
        actions={
          <Button
            onClick={() => {
              setShowForm((v) => !v);
              if (showForm) resetForm();
            }}
          >
            {showForm ? <X size={15} className="mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
            {showForm ? "Cancel" : "Add Medication"}
          </Button>
        }
      />

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
        <DataTable
          fill
          columns={medicationColumns(startEdit, setDeleteTarget)}
          data={medications}
          getRowId={(m) => m._id}
          footer={
            <p className="text-xs text-text-disabled">
              {medications.length} medication{medications.length !== 1 ? "s" : ""} in your library
            </p>
          }
        />
      )}

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remove medication"
        description={`Remove "${deleteTarget?.name ?? ""}" from your medication library? This cannot be undone.`}
        confirmLabel="Remove"
        danger
        loading={deleting}
      />
    </Page>
  );
}
