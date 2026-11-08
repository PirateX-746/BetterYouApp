"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { SectionCard } from "@/components/common/Dashboard";
import { Field, inputClass, textareaClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { useDetailCrumb } from "@/contexts/PractitionerBreadcrumbContext";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { api, apiErrorMessage } from "@/lib/api";
import { patientRecordHref } from "@/lib/deepLinks";
import type { DocField, DocFormDef, DocSection } from "@/lib/documentForms";

type Values = { date: string; content: Record<string, Record<string, string>> };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Content without blank fields or empty sections, in the definition's order. */
function clean(def: DocFormDef, content: Values["content"]) {
  const out: Record<string, Record<string, string>> = {};
  for (const section of def.sections) {
    const values = content?.[section.key] ?? {};
    const kept: Record<string, string> = {};
    for (const f of section.fields) {
      if (f.showIf && !f.showIf.in.includes(values[f.showIf.field] ?? "")) continue;
      const v = (values[f.key] ?? "").toString().trim();
      if (v) kept[f.key] = v;
    }
    if (Object.keys(kept).length) out[section.key] = kept;
  }
  return out;
}

/**
 * One form engine for every structured clinical document type: the fields
 * come from DOCUMENT_FORMS, the saved content renders in DocumentSheet.
 */
export default function StructuredDocumentForm({
  patientId,
  type,
  def,
}: {
  patientId: string;
  type: string;
  def: DocFormDef;
}) {
  const router = useRouter();
  const [collapsed] = useSidebarCollapsed();
  const [patientName, setPatientName] = useState<string>("");
  const [serverError, setServerError] = useState("");
  // Set on the first real edit. RHF's isDirty is true from the start here:
  // selects that open on "Not assessed" differ from the empty defaults.
  const [edited, setEdited] = useState(false);
  useDetailCrumb(patientName ? `${patientName} · ${def.title}` : def.title);

  useEffect(() => {
    api
      .get(`/patients/${patientId}`)
      .then((r) => setPatientName(`${r.data?.firstName ?? ""} ${r.data?.lastName ?? ""}`.trim()))
      .catch(() => {});
  }, [patientId]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: { date: today(), content: {} }, shouldUnregister: true });

  // Where the document was started from: the patient's EMR Notes → Documents.
  const back = patientRecordHref(patientId, "emr", "documents");

  const onSubmit = async (data: Values) => {
    setServerError("");
    try {
      const { data: created } = await api.post("/documents", {
        type,
        date: new Date(`${data.date}T12:00:00`).toISOString(),
        patient: patientId,
        content: clean(def, data.content),
      });
      toast.success(`${def.title} saved`);
      // Replace, so Back from the record doesn't reopen the filled-in form.
      router.replace(`${back}&doc=${created._id}`);
    } catch (err) {
      setServerError(apiErrorMessage(err, "Couldn't save the document. Please try again."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onInvalid = () => {
    toast.error("Some required fields are empty");
    // Bring the first problem into view.
    setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0);
  };

  const cancel = () => {
    if (edited && !window.confirm("Discard this document? What you've entered will be lost.")) return;
    router.replace(back);
  };

  return (
    <Page>
      <PageHeader
        back={{ href: back, label: patientName || "Patient" }}
        title={def.title}
        subtitle={def.subtitle}
      />

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} onChange={() => setEdited(true)} noValidate className="space-y-5 pb-24 max-w-4xl">
        {serverError && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger-strong">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}

        <SectionCard title="Document" subtitle={patientName ? `For ${patientName}` : undefined} padded>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={def.dateLabel} htmlFor="doc-date" required error={errors.date?.message}>
              <input
                id="doc-date"
                type="date"
                max={today()}
                aria-invalid={!!errors.date}
                className={inputClass}
                {...register("date", { required: "Pick a date" })}
              />
            </Field>
          </div>
        </SectionCard>

        {def.sections.map((section) => (
          <SectionBlock key={section.key} section={section} register={register} control={control} errors={errors} />
        ))}

        <p className="text-caption text-text-secondary">
          Fields marked <span className="text-danger-strong">*</span> are required. Leave anything else blank if it doesn&apos;t apply.
        </p>

        {/* Sticky actions: always reachable on long forms and small screens. */}
        <div
          className={`fixed bottom-16 lg:bottom-0 left-0 ${collapsed ? "lg:left-[72px]" : "lg:left-64"} right-0 z-20 border-t border-border bg-bg-card px-4 md:px-6 py-3 flex items-center justify-end gap-3`}
        >
          <Button type="button" variant="secondary" onClick={cancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? "Saving…" : `Save ${def.title}`}
          </Button>
        </div>
      </form>
    </Page>
  );
}

function SectionBlock({
  section,
  register,
  control,
  errors,
}: {
  section: DocSection;
  register: UseFormRegister<Values>;
  control: ReturnType<typeof useForm<Values>>["control"];
  errors: FieldErrors<Values>;
}) {
  const values = (useWatch({ control, name: `content.${section.key}` as const }) ?? {}) as Record<string, string>;
  const sectionErrors = (errors.content?.[section.key] ?? {}) as Record<string, { message?: string } | undefined>;

  return (
    <SectionCard title={section.title} subtitle={section.description} padded>
      <div className="grid gap-4 sm:grid-cols-2">
        {section.fields.map((f) => {
          if (f.showIf && !f.showIf.in.includes(values[f.showIf.field] ?? "")) return null;
          return (
            <DocInput
              key={f.key}
              field={f}
              id={`${section.key}-${f.key}`}
              error={sectionErrors[f.key]?.message}
              reg={register(`content.${section.key}.${f.key}` as const, {
                required: f.required ? `${f.label} is required` : false,
              })}
            />
          );
        })}
      </div>
    </SectionCard>
  );
}

function DocInput({
  field: f,
  id,
  error,
  reg,
}: {
  field: DocField;
  id: string;
  error?: string;
  reg: ReturnType<UseFormRegister<Values>>;
}) {
  const wide = f.wide || f.kind === "textarea";
  const common = { id, "aria-invalid": !!error, ...reg };
  return (
    <Field label={f.label} htmlFor={id} required={f.required} hint={f.hint} error={error} className={wide ? "sm:col-span-2" : ""}>
      {f.kind === "textarea" ? (
        <textarea {...common} rows={f.rows ?? 3} placeholder={f.placeholder} className={textareaClass} />
      ) : f.kind === "select" ? (
        <select {...common} defaultValue="" className={inputClass}>
          <option value="">{f.required ? "Select…" : "Not assessed"}</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={f.kind === "number" ? "number" : f.kind === "date" ? "date" : "text"}
          inputMode={f.kind === "number" ? "numeric" : undefined}
          min={f.kind === "number" ? 0 : undefined}
          placeholder={f.placeholder}
          className={inputClass}
        />
      )}
    </Field>
  );
}
