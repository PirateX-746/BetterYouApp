"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Platform console API client.
 *
 * Replaces the mock data the console was built against. Everything here is
 * counts and metadata only — the backend deliberately exposes no patient
 * names, notes or diagnoses to a platform operator, so there is nothing
 * clinical to render.
 */

/* ----------------------------- types ------------------------------ */

export type PracticeStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED";

/** Mirrors PlanKey on the backend. Stored lowercase, rendered uppercase. */
export type PlanKey = "FREE" | "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";

/** Mirrors SubscriptionStatus. A practice status and a billing status differ. */
export type SubscriptionStatus =
  "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";

export interface Practice {
  id: string;
  name: string;
  subdomain: string;
  status: PracticeStatus;
  email: string | null;
  phone: string | null;
  timezone: string;
  logo: string | null;
  practitioners: number;
  patients: number;
  appointments: number;
  createdAt: string;
  updatedAt: string;
  /**
   * Billing summary, flattened onto the practice by the list and detail
   * endpoints. Null when the practice has no subscription record yet;
   * absent entirely from the status/update responses, which reshape the
   * practice without joining the subscription.
   */
  plan: PlanKey | null;
  subscriptionStatus: SubscriptionStatus | null;
  monthlyPrice: number;
  renewsAt: string | null;
  trialEndsAt: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "ACTIVE" | "DISABLED";
  joinedAt: string;
}

export interface PracticeDetail extends Practice {
  team: TeamMember[];
}

export interface PlatformMetrics {
  practicesTotal: number;
  practicesActive: number;
  practicesTrial: number;
  practicesSuspended: number;
  practitionersTotal: number;
  patientsTotal: number;
  appointmentsTotal: number;
  signupsByMonth: { month: string; count: number }[];
}

export interface PlatformPractitioner {
  id: string;
  name: string;
  email: string;
  role: string;
  practiceName: string | null;
  practiceId: string | null;
  practiceSubdomain: string | null;
  patients: number;
  status: "ACTIVE" | "DISABLED";
  joinedAt: string;
}

export interface AuditEntry {
  _id: string;
  practiceId: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

/* --------------------------- normalising --------------------------- */

/** The API stores statuses lowercase; the UI renders them as chips. */
function upper<T extends string>(v: string | null | undefined, fallback: T): T {
  return v ? (v.toUpperCase() as T) : fallback;
}

function normalisePractice(p: Practice): Practice {
  return {
    ...p,
    status: upper<PracticeStatus>(p.status, "TRIAL"),
    plan: p.plan ? upper<PlanKey>(p.plan, "FREE") : null,
    subscriptionStatus: p.subscriptionStatus
      ? upper<SubscriptionStatus>(p.subscriptionStatus, "TRIALING")
      : null,
    monthlyPrice: p.monthlyPrice ?? 0,
  };
}

/* ----------------------------- calls ------------------------------- */

export async function fetchMetrics(): Promise<PlatformMetrics> {
  const { data } = await api.get<PlatformMetrics>("/admin/metrics");
  return data;
}

export async function fetchPractices(): Promise<Practice[]> {
  const { data } = await api.get<Practice[]>("/admin/practices");
  return data.map(normalisePractice);
}

export async function fetchPractice(id: string): Promise<PracticeDetail> {
  const { data } = await api.get<PracticeDetail>(`/admin/practices/${id}`);
  return { ...normalisePractice(data), team: data.team ?? [] };
}

export async function fetchPlatformPractitioners(): Promise<
  PlatformPractitioner[]
> {
  const { data } = await api.get<PlatformPractitioner[]>(
    "/admin/practitioners",
  );
  return data;
}

export async function fetchAuditLogs(limit = 100): Promise<AuditEntry[]> {
  const { data } = await api.get<AuditEntry[]>("/admin/audit-logs", {
    params: { limit },
  });
  return data;
}

export interface CreatePracticeInput {
  name: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  timezone?: string;
}

export async function createPractice(input: CreatePracticeInput) {
  const { data } = await api.post<Practice>("/admin/practices", input);
  return normalisePractice(data);
}

export async function suspendPractice(id: string) {
  const { data } = await api.post<Practice>(`/admin/practices/${id}/suspend`);
  return normalisePractice(data);
}

export async function reactivatePractice(id: string) {
  const { data } = await api.post<Practice>(
    `/admin/practices/${id}/reactivate`,
  );
  return normalisePractice(data);
}

export async function archivePractice(id: string) {
  const { data } = await api.delete<{ id: string; archived: boolean }>(
    `/admin/practices/${id}`,
  );
  return data;
}

/** Mirrors UpdatePracticeDto. `subdomain` is immutable once created. */
export interface UpdatePracticeInput {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  logo?: string;
}

export async function updatePractice(id: string, input: UpdatePracticeInput) {
  const { data } = await api.patch<Practice>(`/admin/practices/${id}`, input);
  return normalisePractice(data);
}

/**
 * Sets any of the four practice statuses. The suspend/reactivate shortcuts
 * above cover the two common transitions; this also reaches TRIAL and
 * CANCELLED, which they cannot express.
 */
export async function setPracticeStatus(id: string, status: PracticeStatus) {
  const { data } = await api.patch<Practice>(`/admin/practices/${id}/status`, {
    status: status.toLowerCase(),
  });
  return normalisePractice(data);
}

/* ---------------------------- invitations -------------------------- */

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface Invitation {
  _id: string;
  practiceId: string;
  email: string;
  name: string;
  role: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

/**
 * The response to issuing an invitation. `token` is returned exactly once —
 * the backend stores only its hash, so it cannot be recovered later. If the
 * operator loses it before delivering the link, reissue the invitation.
 */
export interface IssuedInvitation {
  email: string;
  token: string;
  expiresAt: string;
}

export async function fetchInvitations(
  practiceId: string,
): Promise<Invitation[]> {
  const { data } = await api.get<Invitation[]>(
    `/admin/practices/${practiceId}/invitations`,
  );
  return data.map((i) => ({
    ...i,
    status: upper<InvitationStatus>(i.status, "PENDING"),
  }));
}

export async function invitePractitioner(
  practiceId: string,
  input: { email: string; name: string; role: string },
): Promise<IssuedInvitation> {
  const { data } = await api.post<IssuedInvitation>(
    `/admin/practices/${practiceId}/invitations`,
    input,
  );
  return data;
}

/** Revokes a pending invitation; its link stops working immediately. */
export async function revokeInvitation(practiceId: string, inviteId: string) {
  await api.post(
    `/admin/practices/${practiceId}/invitations/${inviteId}/revoke`,
  );
}

/**
 * Disables or re-enables a practice member. A disabled account can't sign
 * in, and its existing session is rejected on the next request.
 */
export async function setPractitionerStatus(
  id: string,
  status: "ACTIVE" | "DISABLED",
) {
  const { data } = await api.patch<{
    id: string;
    status: "ACTIVE" | "DISABLED";
  }>(`/admin/practitioners/${id}/status`, { status });
  return data;
}

/**
 * Builds the link handed to the invitee. No email is sent — the platform has
 * no mail provider — so the console shows this once for out-of-band delivery.
 * Any origin works: the accept route is @Public, so TenantGuard never checks
 * the host against the invite's practice.
 */
export function invitationLink(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/acceptInvite?token=${encodeURIComponent(token)}`;
}

/** Roles an operator may invite, mirroring InvitePractitionerDto. */
export const INVITABLE_ROLES = [
  { value: "practice_admin", label: "Practice admin" },
  { value: "practitioner", label: "Practitioner" },
  { value: "staff", label: "Staff" },
] as const;

export async function platformLogin(email: string, password: string) {
  const { data } = await api.post<{
    id: string;
    role: string;
    name: string;
    mustChangePassword: boolean;
  }>("/auth/platform/login", { email, password });
  return data;
}

/** Emails a temporary password; the answer is the same for unknown emails. */
export async function platformForgotPassword(email: string) {
  const { data } = await api.post<{ message: string }>(
    "/auth/platform/forgot-password",
    { email },
  );
  return data;
}

export async function platformLogout() {
  await api.post("/auth/logout");
}

/* ------------------------------ hook ------------------------------- */

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Minimal fetch-on-mount hook so each page doesn't re-implement it. */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    run()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { response?: { data?: { message?: string } } };
        setError(
          e?.response?.data?.message ??
            (err instanceof Error ? err.message : null) ??
            "Something went wrong",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [run, nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}

/* --------------------------- formatting ---------------------------- */

export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });
}

/* --------------------------- subscriptions ------------------------- */

/** One row of the platform plan catalogue, seeded by the backend. */
export interface Plan {
  key: PlanKey;
  name: string;
  monthlyPrice: number;
  /** null means unlimited. */
  maxPractitioners: number | null;
  maxPatients: number | null;
  sortOrder: number;
}

export interface SubscriptionRow {
  id: string;
  practiceId: string;
  practiceName: string | null;
  plan: PlanKey;
  status: SubscriptionStatus;
  monthlyPrice: number;
  startedAt: string;
  renewsAt: string | null;
  trialEndsAt: string | null;
}

export interface SubscriptionOverview {
  /** Monthly recurring revenue, counting only actively billing subscriptions. */
  mrr: number;
  plans: Plan[];
  subscriptions: SubscriptionRow[];
}

export async function fetchSubscriptionOverview(): Promise<SubscriptionOverview> {
  const { data } = await api.get<SubscriptionOverview>("/admin/subscriptions");
  return {
    mrr: data.mrr ?? 0,
    plans: (data.plans ?? [])
      .map((pl) => ({ ...pl, key: upper<PlanKey>(pl.key, "FREE") }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    subscriptions: (data.subscriptions ?? []).map((sub) => ({
      ...sub,
      plan: upper<PlanKey>(sub.plan, "FREE"),
      status: upper<SubscriptionStatus>(sub.status, "TRIALING"),
    })),
  };
}

/**
 * The plan catalogue alone. It only exists on the overview endpoint, so this
 * pays for the subscription list too — acceptable at platform scale, and it
 * keeps the catalogue a single source of truth instead of a hardcoded copy.
 */
export async function fetchPlans(): Promise<Plan[]> {
  const { plans } = await fetchSubscriptionOverview();
  return plans;
}

/**
 * Moves a practice onto a different plan. The backend re-prices the
 * subscription from the plan catalogue and resets the renewal date, so the
 * returned record — not the requested plan — is the source of truth.
 */
export async function changePlan(
  practiceId: string,
  plan: PlanKey,
): Promise<SubscriptionRow> {
  const { data } = await api.patch<SubscriptionRow & { _id?: string }>(
    `/admin/practices/${practiceId}/plan`,
    { plan: plan.toLowerCase() },
  );
  return {
    ...data,
    id: data.id ?? String(data._id ?? ""),
    plan: upper<PlanKey>(data.plan, "FREE"),
    status: upper<SubscriptionStatus>(data.status, "TRIALING"),
  };
}
