"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Modal } from "@/components/common/Modal";
import { Field, inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import PhoneInput from "@/components/common/PhoneInput";
import { api, apiErrorMessage } from "@/lib/api";
import { addPatientSchema } from "@/schemas/patient.schema";

/** The required fields of Add patient, plus email; the rest can be filled in on the profile. */
const quickSchema = addPatientSchema.pick({
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  phoneNo: true,
  email: true,
});
type QuickValues = z.infer<typeof quickSchema>;

export type CreatedPatient = { _id: string; firstName: string; lastName?: string };

/**
 * Add a patient without leaving the current flow (e.g. while booking an
 * appointment). Stacks over the calling modal; Escape closes only this one.
 */
export default function QuickAddPatientDialog({
  open,
  initialName = "",
  onClose,
  onCreated,
}: {
  open: boolean;
  /** Search text to prefill: "Jane Doe" → first "Jane", last "Doe". */
  initialName?: string;
  onClose: () => void;
  onCreated: (patient: CreatedPatient) => void;
}) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickValues>({ resolver: zodResolver(quickSchema), mode: "onBlur" });

  useEffect(() => {
    if (!open) return;
    const [first = "", ...rest] = initialName.trim().split(/\s+/);
    reset({
      firstName: first,
      lastName: rest.join(" "),
      dateOfBirth: "",
      gender: undefined,
      phoneNo: "",
      email: "",
    });
  }, [open, initialName, reset]);

  const onSubmit = async (data: QuickValues) => {
    setServerError("");
    const payload = Object.fromEntries(
      Object.entries({ ...data, email: data.email?.toLowerCase() }).filter(([, v]) => v !== "" && v !== undefined),
    );
    try {
      const { data: created } = await api.post("/patients", payload);
      toast.success(`${`${created.firstName} ${created.lastName ?? ""}`.trim()} added`);
      onCreated(created);
    } catch (err) {
      setServerError(apiErrorMessage(err, "Couldn't add the patient. Check the details and try again."));
    }
  };

  const err = (name: keyof QuickValues) => ({
    id: `qa-${name}`,
    "aria-invalid": !!errors[name],
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        if (isSubmitting) return;
        setServerError("");
        onClose();
      }}
      title="Add new patient"
      subtitle="The rest of their details can be added later from the profile."
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            variant="secondary"
            onClick={() => {
              setServerError("");
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add patient"}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
      >
        {serverError && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger-strong">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="qa-firstName" required error={errors.firstName?.message}>
            <input {...register("firstName")} {...err("firstName")} autoComplete="off" maxLength={60} className={inputClass} autoFocus />
          </Field>
          <Field label="Last name" htmlFor="qa-lastName" required error={errors.lastName?.message}>
            <input {...register("lastName")} {...err("lastName")} autoComplete="off" maxLength={60} className={inputClass} />
          </Field>
          <Field label="Date of birth" htmlFor="qa-dateOfBirth" required error={errors.dateOfBirth?.message}>
            <input {...register("dateOfBirth")} {...err("dateOfBirth")} type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass} />
          </Field>
          <Field label="Gender" htmlFor="qa-gender" required error={errors.gender?.message}>
            <select {...register("gender")} {...err("gender")} defaultValue="" className={inputClass}>
              <option value="" disabled>Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
        <Field label="Phone number" htmlFor="qa-phoneNo" required hint="Pick the country, then the number" error={errors.phoneNo?.message}>
          <Controller
            control={control}
            name="phoneNo"
            render={({ field }) => (
              <PhoneInput
                // Remount per opening so it re-reads the reset value.
                key={open ? "open" : "closed"}
                id="qa-phoneNo"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.phoneNo}
              />
            )}
          />
        </Field>
        <Field label="Email" htmlFor="qa-email" hint="Optional — for appointment confirmations and reminders" error={errors.email?.message}>
          <input {...register("email")} {...err("email")} type="email" autoComplete="off" maxLength={254} placeholder="name@example.com" className={inputClass} />
        </Field>
        {/* Enter in a field submits. */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
