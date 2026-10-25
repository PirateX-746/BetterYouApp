"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/common/Modal";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Badge } from "@/components/common/Badge";
import { apiErrorMessage } from "@/lib/api";
import { supportAdminApi, type Faq } from "@/lib/support";

const fieldCls =
  "w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition";
const iconBtn =
  "w-11 h-11 flex items-center justify-center rounded-xl text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed";

/* ─── Editor ─── */

function FaqEditor({
  open,
  initial,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Faq | null;
  categories: string[];
  onClose: () => void;
  onSaved: (faq: Faq) => void;
}) {
  const ids = { q: useId(), a: useId(), c: useId(), list: useId() };
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState(true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuestion(initial?.question ?? "");
    setAnswer(initial?.answer ?? "");
    setCategory(initial?.category ?? "");
    setPublished(initial?.isPublished ?? true);
    setTouched(false);
  }, [open, initial]);

  const errors = {
    q: !question.trim() ? "Question is required" : null,
    a: !answer.trim() ? "Answer is required" : null,
    c: !category.trim() ? "Category is required" : null,
  };

  const submit = async () => {
    setTouched(true);
    if (errors.q || errors.a || errors.c) return;
    setSaving(true);
    const input = { question: question.trim(), answer: answer.trim(), category: category.trim(), isPublished: published };
    try {
      const saved = initial
        ? await supportAdminApi.updateFaq(initial._id, input)
        : await supportAdminApi.createFaq(input);
      toast.success(initial ? "FAQ updated" : "FAQ added");
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save the FAQ"));
    } finally {
      setSaving(false);
    }
  };

  const err = (k: keyof typeof errors, id: string) =>
    touched && errors[k] ? (
      <p id={`${id}-err`} role="alert" className="text-xs text-danger-strong">{errors[k]}</p>
    ) : null;

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={initial ? "Edit FAQ" : "New FAQ"}
      subtitle="Published FAQs appear on every practitioner's Help & Support page."
      maxWidth="sm:max-w-xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 px-4 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover cursor-pointer disabled:opacity-40">
            Cancel
          </button>
          <button type="submit" form="faq-form" disabled={saving} className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover cursor-pointer disabled:opacity-40">
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {initial ? "Save changes" : "Add FAQ"}
          </button>
        </div>
      }
    >
      <form
        id="faq-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor={ids.c} className="text-sm font-medium text-text-primary">Category</label>
          <input
            id={ids.c}
            list={ids.list}
            value={category}
            maxLength={40}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Appointments"
            aria-invalid={touched && !!errors.c}
            aria-describedby={touched && errors.c ? `${ids.c}-err` : undefined}
            className={fieldCls}
          />
          <datalist id={ids.list}>
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
          {err("c", ids.c)}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={ids.q} className="text-sm font-medium text-text-primary">Question</label>
          <input
            id={ids.q}
            value={question}
            maxLength={200}
            onChange={(e) => setQuestion(e.target.value)}
            aria-invalid={touched && !!errors.q}
            aria-describedby={touched && errors.q ? `${ids.q}-err` : undefined}
            className={fieldCls}
            autoFocus
          />
          {err("q", ids.q)}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={ids.a} className="text-sm font-medium text-text-primary">Answer</label>
          <textarea
            id={ids.a}
            value={answer}
            maxLength={5000}
            rows={7}
            onChange={(e) => setAnswer(e.target.value)}
            aria-invalid={touched && !!errors.a}
            aria-describedby={touched && errors.a ? `${ids.a}-err` : undefined}
            className={`${fieldCls} resize-y`}
          />
          {err("a", ids.a)}
        </div>
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer text-sm text-text-primary">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-5 h-5 accent-[var(--primary)] cursor-pointer"
          />
          Published — visible to practitioners
        </label>
      </form>
    </Modal>
  );
}

/* ─── Manager ─── */

export function FaqManager() {
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [error, setError] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setError(false);
    supportAdminApi.faqs().then(setFaqs).catch(() => setError(true));
  };
  useEffect(load, []);

  const groups = useMemo(() => {
    const m = new Map<string, Faq[]>();
    for (const f of faqs ?? []) m.set(f.category, [...(m.get(f.category) ?? []), f]);
    for (const list of m.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [faqs]);

  const upsert = (faq: Faq) =>
    setFaqs((prev) => {
      const list = prev ?? [];
      return list.some((f) => f._id === faq._id) ? list.map((f) => (f._id === faq._id ? faq : f)) : [...list, faq];
    });

  const togglePublished = async (faq: Faq) => {
    setBusyId(faq._id);
    try {
      upsert(await supportAdminApi.updateFaq(faq._id, { isPublished: !faq.isPublished }));
      toast.success(faq.isPublished ? "FAQ unpublished" : "FAQ published");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't update the FAQ"));
    } finally {
      setBusyId(null);
    }
  };

  /** Swap sortOrder with the neighbour in the same category. */
  const move = async (list: Faq[], index: number, dir: -1 | 1) => {
    const a = list[index];
    const b = list[index + dir];
    if (!a || !b) return;
    setBusyId(a._id);
    try {
      // Re-number the whole category so equal sortOrders can't stall a move.
      const reordered = [...list];
      [reordered[index], reordered[index + dir]] = [b, a];
      const changed = reordered
        .map((f, i) => ({ f, i }))
        .filter(({ f, i }) => f.sortOrder !== i);
      const saved = await Promise.all(changed.map(({ f, i }) => supportAdminApi.updateFaq(f._id, { sortOrder: i })));
      saved.forEach(upsert);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't reorder"));
      load();
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting._id);
    try {
      await supportAdminApi.deleteFaq(deleting._id);
      setFaqs((prev) => (prev ?? []).filter((f) => f._id !== deleting._id));
      toast.success("FAQ deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't delete the FAQ"));
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-6 text-center space-y-3">
        <p className="text-sm text-text-secondary">Couldn&apos;t load FAQs.</p>
        <button type="button" onClick={load} className="h-11 px-4 rounded-xl border border-border text-sm hover:bg-bg-hover cursor-pointer">Try again</button>
      </div>
    );
  }
  if (!faqs) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" aria-label="Loading" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {faqs.filter((f) => f.isPublished).length} published · {faqs.filter((f) => !f.isPublished).length} draft
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          className="h-11 inline-flex items-center gap-2 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover cursor-pointer"
        >
          <Plus size={16} aria-hidden /> Add FAQ
        </button>
      </div>

      {groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">
          No FAQs yet. Add the questions practitioners ask most.
        </div>
      )}

      {groups.map(([category, list]) => (
        <section key={category} aria-labelledby={`faqcat-${category}`} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <h3 id={`faqcat-${category}`} className="px-5 py-3 border-b border-border text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {category}
          </h3>
          <ul className="divide-y divide-border">
            {list.map((f, i) => (
              <li key={f._id} className="flex items-start gap-3 pl-5 pr-2 py-2">
                <div className="flex-1 min-w-0 py-2">
                  <p className={`text-sm font-medium ${f.isPublished ? "text-text-primary" : "text-text-secondary"}`}>
                    {f.question}
                    {!f.isPublished && <Badge className="ml-2 align-middle">Draft</Badge>}
                  </p>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{f.answer}</p>
                </div>
                <div className="flex items-center shrink-0">
                  <button type="button" className={iconBtn} disabled={i === 0 || !!busyId} onClick={() => void move(list, i, -1)} aria-label={`Move "${f.question}" up`}>
                    <ArrowUp size={16} aria-hidden />
                  </button>
                  <button type="button" className={iconBtn} disabled={i === list.length - 1 || !!busyId} onClick={() => void move(list, i, 1)} aria-label={`Move "${f.question}" down`}>
                    <ArrowDown size={16} aria-hidden />
                  </button>
                  <button type="button" className={iconBtn} disabled={busyId === f._id} onClick={() => void togglePublished(f)} aria-label={f.isPublished ? `Unpublish "${f.question}"` : `Publish "${f.question}"`}>
                    {f.isPublished ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => {
                      setEditing(f);
                      setEditorOpen(true);
                    }}
                    aria-label={`Edit "${f.question}"`}
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button type="button" className={`${iconBtn} hover:!text-danger-strong`} onClick={() => setDeleting(f)} aria-label={`Delete "${f.question}"`}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <FaqEditor
        open={editorOpen}
        initial={editing}
        categories={groups.map(([c]) => c)}
        onClose={() => setEditorOpen(false)}
        onSaved={upsert}
      />
      <ConfirmationDialog
        open={!!deleting}
        onClose={() => !busyId && setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete this FAQ?"
        description={deleting ? `"${deleting.question}" will disappear from every practitioner's help page. To hide it temporarily, unpublish it instead.` : undefined}
        confirmLabel="Delete"
        danger
        loading={!!busyId}
      />
    </div>
  );
}
