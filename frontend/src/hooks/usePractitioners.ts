"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface Practitioner {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string;
}

/**
 * Shared hook for fetching practitioners.
 * Used by AppointmentsPage and MessagesPage — no more duplication.
 */
export function usePractitioners() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/practitioners");
      setPractitioners(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Failed to load practitioners");
      setPractitioners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return { practitioners, loading, error, refetch: fetch };
}
