import { api } from "./api";

/**
 * Sums one side's unread count across a user's conversations. Resolves to
 * null when the request fails, so callers keep whatever count they had.
 */
export async function fetchUnreadTotal(
  userId: string,
  field: "unreadForPatient" | "unreadForPractitioner",
): Promise<number | null> {
  try {
    const res = await api.get(`/chat/conversations/${userId}`);
    if (!Array.isArray(res.data)) return null;
    return res.data.reduce(
      (acc: number, c: Record<string, unknown>) => acc + ((c[field] as number) || 0),
      0,
    );
  } catch {
    return null;
  }
}
