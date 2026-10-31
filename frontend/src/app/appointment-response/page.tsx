"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, CalendarX, CircleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Card, CardBody, InfoList, InfoRow } from "@/components/common/Card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";

/**
 * Where the one-click Confirm / Cancel links in appointment emails land. No
 * sign-in: the signed token in the URL is the credential. Opening the page
 * only shows the appointment — it acts when the patient taps the button, so
 * mail scanners that open links can't confirm or cancel anything.
 */

type Action = "confirm" | "cancel";
type Blocked = "already_confirmed" | "cancelled" | "closed" | "cancel_cutoff";

interface Preview {
  action: Action;
  status: string;
  start: string;
  end: string;
  practitionerName: string | null;
  practice: { name: string; phone: string | null; email: string | null; timezone: string };
  cancelCutoffHours: number;
  blockedReason: Blocked | null;
}

type State =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; preview: Preview }
  | { kind: "done"; preview: Preview; action: Action };

function formatWhen(p: Preview) {
  const tz = p.practice.timezone;
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date(p.start));
  const time = (d: string, zone = false) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit", ...(zone && { timeZoneName: "short" }),
    }).format(new Date(d));
  return { date, time: `${time(p.start)} – ${time(p.end, true)}` };
}

function contactLine(p: Preview) {
  const ways = [p.practice.phone, p.practice.email].filter(Boolean);
  return ways.length
    ? `contact ${p.practice.name} at ${ways.join(" or ")}`
    : `contact ${p.practice.name}`;
}

function errorMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } } };
  return e.response?.data?.message ?? fallback;
}

function AppointmentResponse() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", message: "This link is incomplete. Please use the link from your email." });
      return;
    }
    api
      .get<Preview>(`/appointments/link/${encodeURIComponent(token)}`)
      .then((res) => setState({ kind: "ready", preview: res.data }))
      .catch((err) =>
        setState({ kind: "invalid", message: errorMessage(err, "This link has expired or is invalid") }),
      );
  }, [token]);

  const respond = async (preview: Preview) => {
    if (!token) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.post(`/appointments/link/${encodeURIComponent(token)}`);
      setState({ kind: "done", preview, action: preview.action });
    } catch (err) {
      setActionError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-page flex flex-col items-center justify-center px-4 py-10">
      <BrandLogo size="md" className="mb-8" />
      <Card className="w-full max-w-md">
        <CardBody className="pt-5">
          {state.kind === "loading" && <LoadingState />}
          {state.kind === "invalid" && <Invalid message={state.message} />}
          {state.kind === "ready" && (
            <Ready
              preview={state.preview}
              submitting={submitting}
              error={actionError}
              onRespond={() => void respond(state.preview)}
            />
          )}
          {state.kind === "done" && <Done preview={state.preview} action={state.action} />}
        </CardBody>
      </Card>
    </main>
  );
}

function Details({ preview }: { preview: Preview }) {
  const { date, time } = formatWhen(preview);
  return (
    <InfoList className="my-5">
      <InfoRow label="When">
        {date}
        <br />
        {time}
      </InfoRow>
      {preview.practitionerName && <InfoRow label="With">{preview.practitionerName}</InfoRow>}
      <InfoRow label="Where">{preview.practice.name}</InfoRow>
    </InfoList>
  );
}

function Heading({ icon, title, tone }: { icon: React.ReactNode; title: string; tone: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`size-10 rounded-xl grid place-items-center shrink-0 ${tone}`}>{icon}</span>
      <h1 className="text-title-3 font-semibold text-text-primary">{title}</h1>
    </div>
  );
}

function Ready({
  preview,
  submitting,
  error,
  onRespond,
}: {
  preview: Preview;
  submitting: boolean;
  error: string | null;
  onRespond: () => void;
}) {
  const blocked = preview.blockedReason;
  if (blocked) {
    const copy: Record<Blocked, { title: string; body: string }> = {
      already_confirmed: {
        title: "Already confirmed",
        body: "This appointment is already confirmed — there's nothing else to do. See you then!",
      },
      cancelled: {
        title: "This appointment is cancelled",
        body: `To book a new time, please ${contactLine(preview)}.`,
      },
      closed: {
        title: "This appointment can't be changed",
        body: `For help, please ${contactLine(preview)}.`,
      },
      cancel_cutoff: {
        title: "Too late to cancel online",
        body: `Appointments can be cancelled online up to ${preview.cancelCutoffHours} hours before they start. Please ${contactLine(preview)}.`,
      },
    };
    const ok = blocked === "already_confirmed";
    return (
      <>
        <Heading
          icon={ok ? <CalendarCheck size={20} aria-hidden /> : <CircleAlert size={20} aria-hidden />}
          title={copy[blocked].title}
          tone={ok ? "bg-success-light text-success-strong" : "bg-warning-light text-warning-strong"}
        />
        <Details preview={preview} />
        <p className="text-body text-text-secondary">{copy[blocked].body}</p>
      </>
    );
  }

  const confirming = preview.action === "confirm";
  return (
    <>
      <Heading
        icon={confirming ? <CalendarCheck size={20} aria-hidden /> : <CalendarX size={20} aria-hidden />}
        title={confirming ? "Confirm your appointment" : "Cancel your appointment?"}
        tone={confirming ? "bg-primary/10 text-primary" : "bg-danger-light text-danger-strong"}
      />
      <Details preview={preview} />
      {!confirming && (
        <p className="text-body text-text-secondary mb-5">
          The time will be released for someone else. You can book again any time.
        </p>
      )}
      {error && (
        <p role="alert" className="text-footnote text-danger-strong mb-3">
          {error}
        </p>
      )}
      <Button
        className="w-full"
        variant={confirming ? "primary" : "destructive"}
        loading={submitting}
        onClick={onRespond}
      >
        {confirming ? "Confirm appointment" : "Cancel appointment"}
      </Button>
    </>
  );
}

function Done({ preview, action }: { preview: Preview; action: Action }) {
  const confirmed = action === "confirm";
  return (
    <>
      <Heading
        icon={confirmed ? <CalendarCheck size={20} aria-hidden /> : <CalendarX size={20} aria-hidden />}
        title={confirmed ? "You're confirmed" : "Appointment cancelled"}
        tone={confirmed ? "bg-success-light text-success-strong" : "bg-bg-subtle text-text-secondary"}
      />
      <Details preview={preview} />
      <p className="text-body text-text-secondary">
        {confirmed
          ? "Thanks — we'll see you then. You can close this page."
          : "We've emailed you a confirmation. To book a new time, please " + contactLine(preview) + "."}
      </p>
    </>
  );
}

function Invalid({ message }: { message: string }) {
  return (
    <>
      <Heading
        icon={<CircleAlert size={20} aria-hidden />}
        title="Link not valid"
        tone="bg-warning-light text-warning-strong"
      />
      <p className="text-body text-text-secondary mt-4">{message}</p>
      <p className="text-body text-text-secondary mt-2">
        Links stop working once the appointment starts or its time changes. Please use the most recent email from
        your practice, or contact them directly.
      </p>
    </>
  );
}

export default function AppointmentResponsePage() {
  return (
    <Suspense fallback={null}>
      <AppointmentResponse />
    </Suspense>
  );
}
