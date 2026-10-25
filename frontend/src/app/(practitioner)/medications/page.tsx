"use client";

import { Page, PageHeader } from "@/components/common/PageLayout";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Pill, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { Field, inputClass, textareaClass } from "@/components/common/Field";
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
      width: "28%",
      sortValue: (m) => m.name,
      render: (m) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-8 rounded-lg bg-primary/10 text-primary-strong grid place-items-center shrink-0" aria-hidden>
            <Pill size={15} />
          </span>
          <span className="text-body font-medium text-text-primary truncate">{m.name}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "22%",
      sortValue: (m) => m.category,
      render: (m) => (m.category ? <Badge tone="neutral">{m.category}</Badge> : <span className="text-text-light">—</span>),
    },
    {
      key: "description",
      header: "Description",
      className: "text-body text-text-secondary",
      render: (m) => (m.description ? <span className="line-clamp-1">{m.description}</span> : <span className="text-text-light">—</span>),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "6.5rem",
      align: "right",
      render: (m) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(m)} aria-label={`Edit ${m.name}`} title="Edit">
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(m)}
            aria-label={`Remove ${m.name}`}
            title="Remove"
            className="hover:text-danger-strong hover:bg-danger/10"
          >
            <Trash2 aria-hidden />
          </Button>
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
    setLoading(true);
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

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  return (
    <Page fill>
      {/* Same toolbar as Patients: search on the left, primary action on the right. */}
      <PageHeader
        title="Medications"
        toolbar={
          <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" aria-hidden />
              <input
                type="search"
                aria-label="Search medications"
                placeholder="Search medications…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
          </div>
        }
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus aria-hidden />
            Add medication
          </Button>
        }
      />

      {medications.length === 0 && !search ? (
        <div className="bg-bg-card border border-border/70 rounded-2xl shadow-xs">
          <EmptyState
            icon={Pill}
            title="No medications yet"
            description="Add medications to your library so you can quickly record them against a patient's profile."
            action={{ label: "Add medication", onClick: () => setShowForm(true) }}
          />
        </div>
      ) : (
        <DataTable
          fill
          columns={medicationColumns(startEdit, setDeleteTarget)}
          data={medications}
          getRowId={(m) => m._id}
          emptyState={`No medications match "${search}".`}
          footer={
            <p className="text-footnote text-text-secondary">
              {medications.length} medication{medications.length !== 1 ? "s" : ""} {search ? "found" : "in your library"}
            </p>
          }
        />
      )}

      <Modal
        open={showForm}
        onClose={() => !saving && closeForm()}
        title={editingId ? "Edit medication" : "Add medication"}
        subtitle="Library entries can be allocated to patients from their Care Plan."
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="medication-form" loading={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add medication"}
            </Button>
          </div>
        }
      >
        <form id="medication-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name" htmlFor="med-name" required>
              <input
                id="med-name"
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sertraline"
                autoFocus
              />
            </Field>
            <Field label="Category" htmlFor="med-category">
              <input
                id="med-category"
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. SSRI / Antidepressant"
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="med-desc">
            <textarea
              id="med-desc"
              rows={3}
              className={textareaClass}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Notes about this medication…"
            />
          </Field>
        </form>
      </Modal>

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
