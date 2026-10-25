"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, HeartPulse, Loader2, Phone, ShieldPlus, User } from "lucide-react";
import toast from "react-hot-toast";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { SectionCard } from "@/components/common/Dashboard";
import { useDetailCrumb } from "@/contexts/PractitionerBreadcrumbContext";
import { api, apiErrorMessage } from "@/lib/api";
import { addPatientSchema, type AddPatientValues } from "@/schemas/patient.schema";

const fieldCls =
  "w-full h-11 px-3.5 text-sm bg-bg-page border border-border rounded-md text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition aria-[invalid=true]:border-danger";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;

/** Label + control + error, wired for screen readers. */
function Field({
  id,
  label,
  required,
  hint,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
        {required ? <span className="text-danger-strong" aria-hidden> *</span> : <span className="text-text-secondary font-normal"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs text-danger-strong">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AddPatientPage() {
  const router = useRouter();
  useDetailCrumb("Add patient");
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddPatientValues>({ resolver: zodResolver(addPatientSchema), mode: "onBlur" });

  // aria wiring for a field
  const a = (name: keyof AddPatientValues, hint = false) => ({
    id: name,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-err` : hint ? `${name}-hint` : undefined,
  });

  const onSubmit = async (data: AddPatientValues) => {
    setServerError("");
    // Optional fields left blank are omitted, not sent as "".
    const payload = Object.fromEntries(
      Object.entries({ ...data, email: data.email.toLowerCase() }).filter(([, v]) => v !== "" && v !== undefined),
    );
    try {
      const { data: created } = await api.post("/patients", payload);
      toast.success(`${created.firstName} ${created.lastName} added`);
      // The one-time portal password is generated server-side but not shown
      // until the patient portal launches (see PatientsPage history).
      router.push(`/patients/${created._id}`);
    } catch (err) {
      setServerError(apiErrorMessage(err, "Couldn't add the patient. Check the details and try again."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Page>
      <PageHeader
        back={{ href: "/patients", label: "Patients" }}
        title="Add patient"
        subtitle="Fields marked * are required. You can add or change the rest later from the patient's profile."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 pb-24">
        {serverError && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger-strong">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Personal details" subtitle="Who the patient is" padded>
            <div className="flex items-center gap-2 mb-4 text-xs text-text-secondary">
              <User size={14} aria-hidden /> Used across appointments, documents and records
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="firstName" label="First name" required error={errors.firstName?.message}>
                <input {...register("firstName")} {...a("firstName")} autoComplete="off" className={fieldCls} autoFocus />
              </Field>
              <Field id="lastName" label="Last name" required error={errors.lastName?.message}>
                <input {...register("lastName")} {...a("lastName")} autoComplete="off" className={fieldCls} />
              </Field>
              <Field id="dateOfBirth" label="Date of birth" required error={errors.dateOfBirth?.message}>
                <input {...register("dateOfBirth")} {...a("dateOfBirth")} type="date" max={new Date().toISOString().slice(0, 10)} className={fieldCls} />
              </Field>
              <Field id="gender" label="Gender" required error={errors.gender?.message}>
                <select {...register("gender")} {...a("gender")} defaultValue="" className={fieldCls}>
                  <option value="" disabled>Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Contact" subtitle="How the practice reaches the patient" padded>
            <div className="flex items-center gap-2 mb-4 text-xs text-text-secondary">
              <Phone size={14} aria-hidden /> Email is also the patient&apos;s future portal sign-in
            </div>
            <div className="grid gap-4">
              <Field id="email" label="Email" required error={errors.email?.message}>
                <input {...register("email")} {...a("email")} type="email" autoComplete="off" placeholder="name@example.com" className={fieldCls} />
              </Field>
              <Field id="phoneNo" label="Mobile number" required hint="10 digits, without the country code" error={errors.phoneNo?.message}>
                <input {...register("phoneNo")} {...a("phoneNo", true)} type="tel" inputMode="numeric" placeholder="98765 43210" className={fieldCls} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Clinical information" subtitle="Shown in the patient's clinical summary" padded>
            <div className="flex items-center gap-2 mb-4 text-xs text-text-secondary">
              <HeartPulse size={14} aria-hidden /> Keep it brief — detailed history belongs in documents and notes
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="healthCondition" label="Health condition" className="sm:col-span-2" hint="e.g. Generalised Anxiety Disorder" error={errors.healthCondition?.message}>
                <input {...register("healthCondition")} {...a("healthCondition", true)} className={fieldCls} />
              </Field>
              <Field id="bloodGroup" label="Blood group" required error={errors.bloodGroup?.message}>
                <select {...register("bloodGroup")} {...a("bloodGroup")} defaultValue="" className={fieldCls}>
                  <option value="" disabled>Select…</option>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field id="allergies" label="Allergies" hint="Leave blank if none known" error={errors.allergies?.message}>
                <input {...register("allergies")} {...a("allergies", true)} className={fieldCls} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Emergency contact" subtitle="Who to call if the patient can't be reached" padded>
            <div className="flex items-center gap-2 mb-4 text-xs text-text-secondary">
              <ShieldPlus size={14} aria-hidden /> Optional, but recommended
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="emergencyContactName" label="Name" error={errors.emergencyContactName?.message}>
                <input {...register("emergencyContactName")} {...a("emergencyContactName")} className={fieldCls} />
              </Field>
              <Field id="emergencyContactRelation" label="Relationship" hint="e.g. Spouse, Parent" error={errors.emergencyContactRelation?.message}>
                <input {...register("emergencyContactRelation")} {...a("emergencyContactRelation", true)} className={fieldCls} />
              </Field>
              <Field id="emergencyContactPhone" label="Phone" className="sm:col-span-2" error={errors.emergencyContactPhone?.message}>
                <input {...register("emergencyContactPhone")} {...a("emergencyContactPhone")} type="tel" className={fieldCls} />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* Sticky actions: always reachable on long forms and small screens. */}
        <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 z-20 border-t border-border bg-bg-card px-4 md:px-6 py-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/patients")}
            disabled={isSubmitting}
            className="h-11 px-4 rounded-md border border-border text-sm text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 inline-flex items-center gap-2 px-5 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {isSubmitting ? "Adding…" : "Add patient"}
          </button>
        </div>
      </form>
    </Page>
  );
}
