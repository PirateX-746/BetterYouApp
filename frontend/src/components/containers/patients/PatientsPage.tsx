"use client";

import { useEffect, useMemo, useState } from "react";
import ViewButton from "./ViewButton";
import EditButton from "./EditButton";
import DeleteButton from "./DeleteButton";
import AddPatientModal from "./AddPatientModal";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { api } from "@/lib/api";
import { Patient, PatientView } from "@/types/patient";


/* ========================================
  UTILS
======================================== */

function getDisplayName(p: Patient) {
  const raw =
    p.name ||
    `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ||
    "Unknown";

  return raw
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}


function formatDate(date?: string) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/* ========================================
  COMPONENT
======================================== */

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  /* Fetch patients */
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get("/patients");

        setPatients(
          Array.isArray(res.data) ? res.data : res.data.patients ?? []
        );
      } catch (err: any) {
        console.error("API Error:", err.response?.status);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients: PatientView[] = useMemo(() => {
    return patients
      .map((p) => ({ ...p, displayName: getDisplayName(p) }))
      .filter((p) =>
        p.displayName.toLowerCase().includes(search.toLowerCase()),
      );
  }, [patients, search]);

  if (loading) {
    return <p className="text-sm text-text-secondary">Loading patients…</p>;
  }

  function calculateAge(dateOfBirth?: string): string {
    if (!dateOfBirth) return "—";

    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return `${age} years`;
  }



  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeInLeft max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Patients</h1>
          <p className="text-text-secondary mt-1 text-sm">Manage your patient records</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">

          <input
            type="text"
            className="input-style sm:w-64"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />


          <button className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition shadow-sm" onClick={() => setOpen(true)}>
            + Add Patient
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="relative">
        <div className="text-xs text-text-secondary mb-2 md:hidden text-center italic">
          ← Scroll to see more →
        </div>

        {/* Table */}
        <div className="bg-bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-bg-light text-text-secondary text-xs uppercase tracking-wider border-b border-border">
              <tr>
                <th className="p-4 font-medium">Patient Name</th>
                <th className="p-4 font-medium">Age</th>
                <th className="p-4 font-medium">Gender</th>
                <th className="p-4 font-medium">Phone</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Last Visit</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filteredPatients.length === 0 ? (

                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center text-text-secondary space-y-2">
                      <User className="h-12 w-12 text-border-light" />
                      <div className="text-lg font-medium text-text-primary">
                        No Patients Found
                      </div>
                      <div className="text-sm">
                        Start by adding your first patient
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p._id} className="hover:bg-bg-hover transition-colors">
                    {/* Patient Name + Avatar */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.avatar ? (
                          <img
                            src={p.avatar}
                            alt={p.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-border"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <User size={18} strokeWidth={2} />
                          </div>
                        )}

                        <span className="font-medium text-text-primary">{p.displayName}</span>
                      </div>
                    </td>


                    <td className="p-4 text-text-secondary text-sm">
                      {calculateAge(p.dateOfBirth)}
                    </td>

                    <td className="p-4 text-sm">
                      {p.gender ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${p.gender.toLowerCase() === "male"
                            ? "bg-blue-light text-blue-dark"
                            : "bg-purple-light text-purple"
                            }`}
                        >
                          {p.gender.charAt(0).toUpperCase() +
                            p.gender.slice(1)}
                        </span>
                      ) : (
                        <span className="text-text-disabled">—</span>
                      )}
                    </td>

                    <td className="p-4 text-text-secondary text-sm">{p.phoneNo ?? "—"}</td>

                    <td className="p-4 text-text-secondary text-sm">{p.email ?? "—"}</td>

                    <td className="p-4 text-text-secondary text-sm">
                      {formatDate(p.lastVisit)}
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success-light text-success">
                        Active
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <ViewButton
                          onClick={() =>
                            router.push(`/patients/${p._id}`)
                          }
                        />
                        <EditButton onClick={() => { }} />
                        <DeleteButton onClick={() => { }} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPatientModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(p) => setPatients((prev) => [p, ...prev])}
      />
    </div >
  );

}
