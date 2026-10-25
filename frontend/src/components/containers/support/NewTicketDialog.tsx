"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/common/Modal";
import { apiErrorMessage } from "@/lib/api";
import {
  BODY_MAX,
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  SUBJECT_MAX,
  supportApi,
  type SupportTicket,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/support";
import { AttachmentPicker } from "./AttachmentPicker";

const fieldCls =
  "w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition";

type Errors = Partial<Record<"subject" | "category" | "body", string>>;

export function NewTicketDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const ids = { subject: useId(), category: useId(), priority: useId(), body: useId() };
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubject(""); setCategory(""); setPriority("normal"); setBody(""); setFiles([]); setTouched({});
  }, [open]);

  const errors: Errors = {};
  if (subject.trim().length < 3) errors.subject = "Add a short subject (at least 3 characters)";
  if (!category) errors.category = "Choose a category";
  if (!body.trim()) errors.body = "Describe the problem or question";
  const show = (k: keyof Errors) => touched[k] && errors[k];

  const submit = async () => {
    setTouched({ subject: true, category: true, body: true });
    if (Object.keys(errors).length || !category) return;
    setSaving(true);
    try {
      const ticket = await supportApi.create(
        { subject: subject.trim(), category, priority, body: body.trim() },
        files,
      );
      toast.success(`Ticket ${ticket.ticketNo} sent to support`);
      onCreated(ticket);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't send your ticket. Your message is still here — try again."));
    } finally {
      setSaving(false);
    }
  };

  const errText = (k: keyof Errors, id: string) =>
    show(k) ? (
      <p id={`${id}-err`} role="alert" className="text-xs text-danger-strong">
        {errors[k]}
      </p>
    ) : null;

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title="Raise a support ticket"
      subtitle="Our team replies within one business day — sooner for urgent issues."
      maxWidth="sm:max-w-xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 px-4 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-ticket-form"
            disabled={saving}
            className="h-11 inline-flex items-center gap-2 px-5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden />}
            Send ticket
          </button>
        </div>
      }
    >
      <form
        id="new-ticket-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor={ids.subject} className="text-sm font-medium text-text-primary">Subject</label>
          <input
            id={ids.subject}
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
            placeholder="e.g. Calendar won't let me book Friday afternoons"
            aria-invalid={!!show("subject")}
            aria-describedby={show("subject") ? `${ids.subject}-err` : undefined}
            className={fieldCls}
            autoFocus
          />
          {errText("subject", ids.subject)}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor={ids.category} className="text-sm font-medium text-text-primary">Category</label>
            <select
              id={ids.category}
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              onBlur={() => setTouched((t) => ({ ...t, category: true }))}
              aria-invalid={!!show("category")}
              aria-describedby={show("category") ? `${ids.category}-err` : undefined}
              className={fieldCls}
            >
              <option value="" disabled>Choose…</option>
              {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            {errText("category", ids.category)}
          </div>
          <div className="space-y-1.5">
            <label htmlFor={ids.priority} className="text-sm font-medium text-text-primary">Priority</label>
            <select
              id={ids.priority}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className={fieldCls}
            >
              {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                  {p === "urgent" ? " — I can't use the system" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={ids.body} className="text-sm font-medium text-text-primary">What&apos;s happening?</label>
          <textarea
            id={ids.body}
            value={body}
            maxLength={BODY_MAX}
            rows={6}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, body: true }))}
            placeholder="What were you trying to do, what happened instead, and when did it start?"
            aria-invalid={!!show("body")}
            aria-describedby={`${ids.body}-count${show("body") ? ` ${ids.body}-err` : ""}`}
            className={`${fieldCls} resize-y min-h-[8rem]`}
          />
          <div className="flex justify-between gap-2">
            {errText("body", ids.body) ?? <span />}
            <span id={`${ids.body}-count`} className="text-xs text-text-secondary tabular-nums">
              {body.length}/{BODY_MAX}
            </span>
          </div>
        </div>

        <AttachmentPicker files={files} onChange={setFiles} disabled={saving} />
      </form>
    </Modal>
  );
}
