import { api } from "@/lib/api";

/**
 * Public invitation endpoints.
 *
 * These deliberately live outside lib/superadmin: the invitee has no account
 * and no session yet, so nothing here is console-scoped. The token in the
 * link is the only credential, which is why both calls are throttled on the
 * backend and the token is matched against a stored hash.
 */

export interface InvitationLookup {
  email: string;
  name: string;
  role: string;
  practiceName: string | null;
  practiceSubdomain: string | null;
  expiresAt: string;
}

/** Lets the accept page show who and which practice the invite is for. */
export async function lookupInvitation(
  token: string,
): Promise<InvitationLookup> {
  const { data } = await api.get<InvitationLookup>("/invitations", {
    params: { token },
  });
  return data;
}

export async function acceptInvitation(token: string, password: string) {
  const { data } = await api.post<{ id: string; email: string }>(
    "/invitations/accept",
    { token, password },
  );
  return data;
}

/** `practice_admin` → `Practice admin`. Roles are stored lowercase. */
export function roleLabel(role: string): string {
  const words = role.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
