"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Stethoscope,
  Users,
  CalendarCheck,
  Globe,
  Mail,
  Phone,
  Clock,
  PauseCircle,
  PlayCircle,
  Archive,
  Loader2,
  UserPlus,
  Copy,
  CheckCheck,
  Pencil,
  CreditCard,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PageHeader,
  StatTile,
  StatusPill,
  Panel,
  TableShell,
  LoadingState,
  ErrorState,
  EmptyState,
  toneForPracticeStatus,
  toneForUserStatus,
  toneForInvitationStatus,
  toneForSubscription,
} from "@/components/containers/superadmin/console-ui";
import { ConfirmActionButton } from "@/components/containers/superadmin/ConfirmActionButton";
import {
  archivePractice,
  fetchPractice,
  formatDate,
  reactivatePractice,
  suspendPractice,
  useAsync,
  fetchInvitations,
  invitePractitioner,
  revokeInvitation,
  setPractitionerStatus,
  invitationLink,
  INVITABLE_ROLES,
  updatePractice,
  setPracticeStatus,
  changePlan,
  fetchPlans,
  formatINR,
  type IssuedInvitation,
  type Plan,
  type PlanKey,
  type PracticeStatus,
  type UpdatePracticeInput,
} from "@/lib/superadmin/api";

type Confirm = "suspend" | "reactivate" | "archive" | null;

/**
 * Nest's ValidationPipe returns `message` as a string[] of field errors, so
 * reading it straight into a toast would render "a,b". Join instead.
 */
function apiError(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  if (Array.isArray(m)) return m.join(". ");
  if (typeof m === "string") return m;
  return fallback;
}

export default function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    data: practice,
    loading,
    error,
    reload,
  } = useAsync(() => fetchPractice(id), [id]);

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [working, setWorking] = useState(false);

  const {
    data: invites,
    loading: invitesLoading,
    error: invitesError,
    reload: reloadInvites,
  } = useAsync(() => fetchInvitations(id), [id]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>(
    INVITABLE_ROLES[0].value,
  );
  const [inviting, setInviting] = useState(false);
  const [issued, setIssued] = useState<IssuedInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    timezone: "",
  });
  const [saving, setSaving] = useState(false);

  const [planOpen, setPlanOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [nextPlan, setNextPlan] = useState<PlanKey>("FREE");
  const [changingPlan, setChangingPlan] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<PracticeStatus>("ACTIVE");
  const [savingStatus, setSavingStatus] = useState(false);

  const canInvite =
    inviteName.trim().length >= 2 && /\S+@\S+\.\S+/.test(inviteEmail);

  function closeInvite() {
    setInviteOpen(false);
    setIssued(null);
    setCopied(false);
    setInviteName("");
    setInviteEmail("");
    setInviteRole(INVITABLE_ROLES[0].value);
  }

  async function handleInvite() {
    setInviting(true);
    try {
      // The raw token comes back exactly once; it is only ever held in this
      // component's state so the operator can copy it before the dialog closes.
      const res = await invitePractitioner(id, {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setIssued(res);
      reloadInvites();
    } catch (err: unknown) {
      toast.error(apiError(err, "Could not create invitation"));
    } finally {
      setInviting(false);
    }
  }

  async function copyInviteLink() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(invitationLink(issued.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select the link and copy it manually");
    }
  }

  const back = (
    <Link
      href="/admin/practices"
      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary mb-4"
    >
      <ChevronLeft size={15} />
      Back to practices
    </Link>
  );

  if (loading) {
    return (
      <>
        {back}
        <div className="bg-bg-card border border-border rounded-2xl">
          <LoadingState label="Loading practice…" />
        </div>
      </>
    );
  }

  if (error || !practice) {
    return (
      <>
        {back}
        <div className="bg-bg-card border border-border rounded-2xl">
          <ErrorState
            message={error ?? "Practice not found"}
            onRetry={reload}
          />
        </div>
      </>
    );
  }

  const suspended = practice.status === "SUSPENDED";

  // The handlers below are hoisted function declarations, so TypeScript will
  // not carry the null-guard above into them. Alias the narrowed value.
  const loaded = practice;

  const confirmCopy: Record<
    Exclude<Confirm, null>,
    { title: string; body: string; cta: string }
  > = {
    suspend: {
      title: `Suspend ${practice.name}?`,
      body: "Everyone at this practice loses access immediately. No clinical data is deleted, and the practice can be reactivated at any time.",
      cta: "Suspend practice",
    },
    reactivate: {
      title: `Reactivate ${practice.name}?`,
      body: "Access is restored for all users at this practice, with their data exactly as they left it.",
      cta: "Reactivate",
    },
    archive: {
      title: `Archive ${practice.name}?`,
      body: "This is a soft delete: the practice is hidden from the console and all access revoked, but records are retained and recoverable. Nothing is permanently destroyed.",
      cta: "Archive practice",
    },
  };

  async function runAction(action: Exclude<Confirm, null>) {
    setWorking(true);
    try {
      if (action === "suspend") {
        await suspendPractice(id);
        toast.success("Practice suspended");
        reload();
      } else if (action === "reactivate") {
        await reactivatePractice(id);
        toast.success("Practice reactivated");
        reload();
      } else {
        await archivePractice(id);
        toast.success("Practice archived");
        router.push("/admin/practices");
        return;
      }
      setConfirm(null);
    } catch (err: unknown) {
      toast.error(apiError(err, "Action failed"));
    } finally {
      setWorking(false);
    }
  }

  /* ------------------------- edit practice ------------------------- */

  function openEdit() {
    setForm({
      name: loaded.name,
      email: loaded.email ?? "",
      phone: loaded.phone ?? "",
      timezone: loaded.timezone ?? "",
    });
    setEditOpen(true);
  }

  /**
   * Sends only the fields that actually changed. The DTO validates every key
   * it receives, so echoing an untouched empty email back would fail @IsEmail
   * and reject the whole request.
   */
  const patch: UpdatePracticeInput = (() => {
    const next: UpdatePracticeInput = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const timezone = form.timezone.trim();
    if (name !== practice.name) next.name = name;
    // Clearing an address is not expressible here — "" fails @IsEmail — so an
    // emptied field is left as-is rather than silently dropped server-side.
    if (email && email !== (practice.email ?? "")) next.email = email;
    if (phone !== (practice.phone ?? "")) next.phone = phone;
    if (timezone !== (practice.timezone ?? "")) next.timezone = timezone;
    return next;
  })();

  const emailOk =
    form.email.trim() === "" || /\S+@\S+\.\S+/.test(form.email.trim());
  const canSave =
    form.name.trim().length >= 2 && emailOk && Object.keys(patch).length > 0;

  async function saveEdit() {
    setSaving(true);
    try {
      await updatePractice(id, patch);
      toast.success("Practice updated");
      setEditOpen(false);
      reload();
    } catch (err: unknown) {
      toast.error(apiError(err, "Could not save changes"));
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------- change plan -------------------------- */

  async function openPlan() {
    setNextPlan(loaded.plan ?? "FREE");
    setPlanOpen(true);
    if (plans) return;
    setPlansError(null);
    try {
      setPlans(await fetchPlans());
    } catch (err: unknown) {
      setPlansError(apiError(err, "Could not load the plan catalogue"));
    }
  }

  async function savePlan() {
    setChangingPlan(true);
    try {
      const sub = await changePlan(id, nextPlan);
      toast.success(`Moved to the ${sub.plan} plan`);
      setPlanOpen(false);
      reload();
    } catch (err: unknown) {
      toast.error(apiError(err, "Could not change the plan"));
    } finally {
      setChangingPlan(false);
    }
  }

  /* -------------------------- change status ------------------------- */

  const PRACTICE_STATUSES: { value: PracticeStatus; hint: string }[] = [
    { value: "ACTIVE", hint: "Full access, billing as normal." },
    { value: "TRIAL", hint: "Full access during an evaluation period." },
    { value: "SUSPENDED", hint: "Sign-in blocked; all records retained." },
    { value: "CANCELLED", hint: "Sign-in blocked; the practice has churned." },
  ];

  function openStatus() {
    setNextStatus(loaded.status);
    setStatusOpen(true);
  }

  async function saveStatus() {
    setSavingStatus(true);
    try {
      await setPracticeStatus(id, nextStatus);
      toast.success(`Status set to ${nextStatus}`);
      setStatusOpen(false);
      reload();
    } catch (err: unknown) {
      toast.error(apiError(err, "Could not change the status"));
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <>
      {back}

      <PageHeader
        title={practice.name}
        subtitle={`${practice.subdomain} · created ${formatDate(practice.createdAt)}`}
        actions={
          <>
            <Button variant="outline" onClick={openEdit}>
              <Pencil size={15} />
              Edit
            </Button>
            {suspended ? (
              <Button onClick={() => setConfirm("reactivate")}>
                <PlayCircle size={15} />
                Reactivate
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setConfirm("suspend")}>
                <PauseCircle size={15} />
                Suspend
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setConfirm("archive")}
              className="text-danger-strong hover:text-danger-strong"
            >
              <Archive size={15} />
              Archive
            </Button>
          </>
        }
      />

      <div className="bg-bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-purple-light text-purple flex items-center justify-center text-sm font-semibold shrink-0">
            {practice.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-semibold text-text-primary">
                {practice.name}
              </h2>
              <StatusPill
                label={practice.status}
                tone={toneForPracticeStatus(practice.status)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Globe size={12} /> {practice.subdomain}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={12} /> {practice.email ?? "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={12} /> {practice.phone ?? "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> {practice.timezone}
              </span>
            </div>
          </div>
        </div>
      </div>

      {suspended && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-warning bg-warning-light">
          <p className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">Suspended.</span>{" "}
            Users at this practice cannot sign in. Records are retained in full
            and access resumes the moment it is reactivated.
          </p>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-4">
        <StatTile
          label="Practitioners"
          value={practice.practitioners}
          icon={Stethoscope}
        />
        <StatTile
          label="Patients"
          value={practice.patients.toLocaleString("en-IN")}
          hint="Counts only — no records here"
          icon={Users}
        />
        <StatTile
          label="Appointments"
          value={practice.appointments.toLocaleString("en-IN")}
          hint="All time"
          icon={CalendarCheck}
        />
      </div>

      <div className="mb-4">
        <Panel
          title="Plan and status"
          padded
          action={
            <Button variant="outline" onClick={openPlan}>
              <CreditCard size={15} />
              Change plan
            </Button>
          }
        >
          <dl className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Plan
              </dt>
              <dd className="text-sm font-medium text-text-primary mt-1.5">
                {practice.plan ?? (
                  <span className="text-text-disabled">Not assigned</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Billing status
              </dt>
              <dd className="mt-1.5">
                {practice.subscriptionStatus ? (
                  <StatusPill
                    label={practice.subscriptionStatus.replace("_", " ")}
                    tone={toneForSubscription(practice.subscriptionStatus)}
                  />
                ) : (
                  <span className="text-sm text-text-disabled">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Monthly
              </dt>
              <dd className="text-sm font-medium text-text-primary mt-1.5 tabular-nums">
                {practice.monthlyPrice
                  ? formatINR(practice.monthlyPrice)
                  : "Free"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                {practice.subscriptionStatus === "TRIALING"
                  ? "Trial ends"
                  : "Renews"}
              </dt>
              <dd className="text-sm font-medium text-text-primary mt-1.5">
                {formatDate(
                  practice.subscriptionStatus === "TRIALING"
                    ? practice.trialEndsAt
                    : practice.renewsAt,
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 pt-4 border-t border-border flex items-end justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Practice status
              </p>
              <div className="mt-1.5">
                <StatusPill
                  label={practice.status}
                  tone={toneForPracticeStatus(practice.status)}
                />
              </div>
              <p className="text-xs text-text-disabled mt-2 max-w-md">
                Suspend and Reactivate above cover the two everyday moves. Use
                this to reach Trial or Cancelled, which they cannot express.
              </p>
            </div>
            <Button variant="outline" onClick={openStatus}>
              Change status
            </Button>
          </div>
        </Panel>
      </div>

      <Panel title={`Team · ${practice.team.length}`}>
        {practice.team.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No practitioners yet"
            hint="Staff appear here once they are linked to this practice."
          />
        ) : (
          <TableShell headers={["Name", "Role", "Joined", "Status", ""]}>
            {practice.team.map((u) => (
              <tr key={u.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {u.name}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {u.email}
                  </p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono text-text-secondary">
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                  {formatDate(u.joinedAt)}
                </td>
                <td className="px-5 py-3.5">
                  <StatusPill
                    label={u.status}
                    tone={toneForUserStatus(u.status)}
                  />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <ConfirmActionButton
                    {...(u.status === "DISABLED"
                      ? {
                          label: "Enable",
                          title: `Enable ${u.name || u.email}?`,
                          description:
                            "They can sign in again and pick up where they left off.",
                          confirmLabel: "Enable",
                          success: "Account enabled",
                        }
                      : {
                          label: "Disable",
                          title: `Disable ${u.name || u.email}?`,
                          description:
                            "They are signed out and can't sign in until re-enabled. None of their records are deleted.",
                          confirmLabel: "Disable",
                          success: "Account disabled",
                          danger: true,
                        })}
                    onConfirm={() =>
                      setPractitionerStatus(
                        u.id,
                        u.status === "DISABLED" ? "ACTIVE" : "DISABLED",
                      )
                    }
                    onDone={reload}
                  />
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <div className="mt-4">
        <Panel
          title={`Invitations · ${invites?.length ?? 0}`}
          action={
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus size={15} />
              Invite
            </Button>
          }
        >
          {invitesLoading ? (
            <LoadingState label="Loading invitations…" />
          ) : invitesError ? (
            <ErrorState message={invitesError} onRetry={reloadInvites} />
          ) : !invites || invites.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No invitations yet"
              hint="Invite this practice's admin to give them their first way in."
            />
          ) : (
            <TableShell
              headers={["Invitee", "Role", "Sent", "Expires", "Status", ""]}
            >
              {invites.map((inv) => (
                <tr
                  key={inv._id}
                  className="hover:bg-bg-hover transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {inv.name}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {inv.email}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono text-text-secondary">
                      {inv.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                    {formatDate(inv.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                    {formatDate(inv.expiresAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill
                      label={inv.status}
                      tone={toneForInvitationStatus(inv.status)}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {inv.status === "PENDING" && (
                      <ConfirmActionButton
                        label="Revoke"
                        title={`Revoke the invitation for ${inv.email}?`}
                        description="The link stops working immediately. You can send a new invitation later."
                        confirmLabel="Revoke"
                        success="Invitation revoked"
                        danger
                        onConfirm={() => revokeInvitation(id, inv._id)}
                        onDone={reloadInvites}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>
      </div>

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && !working && setConfirm(null)}
      >
        <DialogContent>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>{confirmCopy[confirm].title}</DialogTitle>
                <DialogDescription>
                  {confirmCopy[confirm].body}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirm(null)}
                  disabled={working}
                >
                  Cancel
                </Button>
                <Button onClick={() => runAction(confirm)} disabled={working}>
                  {working && <Loader2 size={14} className="animate-spin" />}
                  {confirmCopy[confirm].cta}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onOpenChange={(o) => !o && !inviting && closeInvite()}
      >
        <DialogContent>
          {issued ? (
            <>
              <DialogHeader>
                <DialogTitle>Invitation ready</DialogTitle>
                <DialogDescription>
                  No email is sent — the platform has no mail provider yet, so
                  deliver this link to {issued.email} yourself. It is shown once
                  and expires {formatDate(issued.expiresAt)}.
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                <div className="p-3 rounded-xl border border-border bg-bg-light">
                  <code className="block text-xs break-all text-text-primary">
                    {invitationLink(issued.token)}
                  </code>
                </div>
                <p className="text-xs text-text-disabled mt-2">
                  Anyone holding this link can create the account, so send it
                  over a channel you trust.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeInvite}>
                  Done
                </Button>
                <Button onClick={copyInviteLink}>
                  {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Invite to {practice.name}</DialogTitle>
                <DialogDescription>
                  They choose their own password when they accept, so no
                  password is set or shown here. The invitation expires after
                  seven days.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input
                    id="invite-name"
                    placeholder="Dr. John Smith"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="john@abcwellness.in"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-bg-card text-sm text-text-primary focus:outline-none focus:border-primary transition"
                  >
                    {INVITABLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-disabled">
                    A practice admin manages staff and billing. The first one to
                    accept becomes the practice owner.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={closeInvite}
                  disabled={inviting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!canInvite || inviting}
                >
                  {inviting && <Loader2 size={14} className="animate-spin" />}
                  Create invitation
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => !o && !saving && setEditOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {practice.name}</DialogTitle>
            <DialogDescription>
              The subdomain is fixed once a practice is created — changing it
              would break every existing link and sign-in, so it is not editable
              here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Practice name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Contact email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="admin@abcwellness.in"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {!emailOk && (
                <p className="text-xs text-danger-strong">
                  Enter a valid email address.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-timezone">Timezone</Label>
              <Input
                id="edit-timezone"
                placeholder="Asia/Kolkata"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!canSave || saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={planOpen}
        onOpenChange={(o) => !o && !changingPlan && setPlanOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change plan</DialogTitle>
            <DialogDescription>
              The new price comes from the plan catalogue and the renewal date
              resets to a month from today. Nothing is charged — no payment
              provider is connected yet.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {plansError ? (
              <ErrorState message={plansError} onRetry={openPlan} />
            ) : !plans ? (
              <LoadingState label="Loading plans…" />
            ) : (
              <div className="space-y-2">
                {plans.map((pl) => {
                  const current = practice.plan === pl.key;
                  return (
                    <label
                      key={pl.key}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        nextPlan === pl.key
                          ? "border-primary bg-bg-light"
                          : "border-border hover:bg-bg-hover"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        className="mt-1"
                        checked={nextPlan === pl.key}
                        onChange={() => setNextPlan(pl.key)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text-primary">
                            {pl.name}
                          </span>
                          {current && (
                            <StatusPill label="Current" tone="purple" />
                          )}
                        </span>
                        <span className="block text-xs text-text-secondary mt-0.5">
                          {pl.monthlyPrice
                            ? `${formatINR(pl.monthlyPrice)} / month`
                            : "Free"}
                          {" · "}
                          {pl.maxPractitioners ?? "Unlimited"} practitioners
                          {" · "}
                          {pl.maxPatients?.toLocaleString("en-IN") ??
                            "Unlimited"}{" "}
                          patients
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlanOpen(false)}
              disabled={changingPlan}
            >
              Cancel
            </Button>
            <Button
              onClick={savePlan}
              disabled={changingPlan || !plans || nextPlan === practice.plan}
            >
              {changingPlan && <Loader2 size={14} className="animate-spin" />}
              Change plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusOpen}
        onOpenChange={(o) => !o && !savingStatus && setStatusOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              Status controls sign-in only. No clinical data is deleted by any
              of these, and every transition is reversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {PRACTICE_STATUSES.map((st) => (
              <label
                key={st.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  nextStatus === st.value
                    ? "border-primary bg-bg-light"
                    : "border-border hover:bg-bg-hover"
                }`}
              >
                <input
                  type="radio"
                  name="practice-status"
                  className="mt-1"
                  checked={nextStatus === st.value}
                  onChange={() => setNextStatus(st.value)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    <StatusPill
                      label={st.value}
                      tone={toneForPracticeStatus(st.value)}
                    />
                    {practice.status === st.value && (
                      <span className="text-xs text-text-disabled">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-text-secondary mt-1">
                    {st.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusOpen(false)}
              disabled={savingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={saveStatus}
              disabled={savingStatus || nextStatus === practice.status}
            >
              {savingStatus && <Loader2 size={14} className="animate-spin" />}
              Set status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
