"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export interface PatientProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  bloodGroup: string;
  allergies: string;
  healthCondition: string;
  lastVisit: string;
}

const EMPTY: PatientProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNo: "",
  bloodGroup: "",
  allergies: "",
  healthCondition: "",
  lastVisit: "",
};

export function useProfile(userId: string | null) {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientProfile>(EMPTY);
  const [draft, setDraft] = useState<PatientProfile>(EMPTY);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    api
      .get(`/patients/${userId}`)
      .then((res) => {
        const d = res.data as PatientProfile & { lastVisit?: string };
        const normalized: PatientProfile = {
          firstName: d.firstName ?? "",
          lastName: d.lastName ?? "",
          email: d.email ?? "",
          phoneNo: d.phoneNo ?? "",
          bloodGroup: d.bloodGroup ?? "",
          allergies: d.allergies ?? "",
          healthCondition: d.healthCondition ?? "",
          lastVisit: d.lastVisit
            ? new Date(d.lastVisit).toLocaleDateString()
            : "",
        };
        setPatient(normalized);
        setDraft(normalized);
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [userId]);

  return { patient, setPatient, draft, setDraft, loading };
}
