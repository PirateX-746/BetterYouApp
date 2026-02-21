"use client";

import {
    useState,
    useMemo,
    useEffect,
    useRef,
} from "react";

import { useRouter } from "next/navigation";

import {
    CheckCircle,
    Clock,
    User,
    FileText,
    Plus,
} from "lucide-react";

import { DOCUMENT_TYPES } from "@/lib/documentTypes";

/* ========================================
   TYPES
======================================== */

type Document = {
    _id: string;
    type: string;
    date: string;
    doctor?: {
        firstName?: string;
        lastName?: string;
    };
    status?: "draft" | "finalized" | "signed";
    pdfUrl?: string;
    content?: Record<string, any>;
};

type Props = {
    patientId: string;
};

/* ========================================
   HELPERS
======================================== */

const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getSectionStyle = (type: string) => {
    switch (type) {
        case "Initial Evaluation":
            return {
                border: "var(--primary)",
                bg: "var(--primary-light)",
                text: "var(--primary)",
            };
        case "Risk Assessment":
            return {
                border: "var(--rose)",
                bg: "var(--rose-light)",
                text: "var(--rose)",
            };
        default:
            return {
                border: "var(--border)",
                bg: "var(--bg-light)",
                text: "var(--text-primary)",
            };
    }
};

type Patient = {
    firstName?: string;
    lastName?: string;
    dob?: string;
    gender?: string;
    phone?: string;
    mrn?: string;
};

/* ========================================
   COMPONENT
======================================== */

export default function MedicalDocuments({ patientId }: Props) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const modalRef = useRef<HTMLDivElement | null>(null);


    useEffect(() => {
        async function fetchPatient() {
            try {
                const res = await fetch(
                    `/api/patients/${patientId}`
                );
                if (!res.ok) throw new Error("Failed to fetch patient");
                const data = await res.json();
                setPatient(data);
            } catch (error) {
                console.error(error);
            }
        }

        fetchPatient();
    }, [patientId]);

    /* ========================================
       FETCH DOCUMENTS
    ======================================== */

    useEffect(() => {
        async function fetchDocuments() {
            try {
                const res = await fetch(
                    `/api/documents/patient/${patientId}`
                );
                if (!res.ok) throw new Error("Failed to fetch documents");
                const data = await res.json();
                setDocuments(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchDocuments();
    }, [patientId]);

    const openDocument = async (id: string) => {
        try {
            const res = await fetch(
                `/api/documents/${id}`
            );
            if (!res.ok) throw new Error("Failed to fetch document");
            const data = await res.json();
            setSelectedDoc(data);
        } catch (error) {
            console.error(error);
        }
    };

    /* ========================================
       ESC CLOSE + SCROLL LOCK
    ======================================== */

    useEffect(() => {
        if (!selectedDoc && !showTypeModal) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedDoc(null);
                setShowTypeModal(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "auto";
        };
    }, [selectedDoc, showTypeModal]);

    /* ========================================
       GROUP DOCUMENTS
    ======================================== */

    const groupedDocuments = useMemo(() => {
        const grouped: Record<string, Document[]> = {};

        documents.forEach((doc) => {
            const typeLabel =
                DOCUMENT_TYPES.find((d) => d.value === doc.type)?.label ||
                doc.type;

            if (!grouped[typeLabel]) grouped[typeLabel] = [];
            grouped[typeLabel].push(doc);
        });

        return grouped;
    }, [documents]);

    if (loading) {
        return <div className="p-6 text-sm">Loading documents...</div>;
    }


    const handleCustomPrint = () => {
        const content = document.getElementById("printable-document");
        if (!content || !patient) return;

        const printWindow = window.open("", "_blank", "width=auto,height=auto");
        if (!printWindow) return;

        printWindow.document.write(`
    <html>
      <head>
        <title>Medical Document</title>
        <style>
          @page {
            size: A4;
            margin: 18mm 18mm 22mm 18mm;
          }

          body {
            font-family: Helvetica, Arial, sans-serif;
            color: #111;
            margin: 0;
          }

          /* ================= HEADER ================= */

          .letterhead { margin-bottom: 14px; }

          .letterhead-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .clinic-name {
            font-size: 18px;
            font-weight: 700;
            color: #5b8def;
            margin: 0;
          }

          .clinic-tagline {
            font-size: 11px;
            margin-top: 2px;
            opacity: 0.7;
          }

          .clinic-contact {
            font-size: 11px;
            text-align: right;
            line-height: 1.4;
          }

          .letterhead-divider {
            height: 1.5px;
            background: #5b8def;
            margin-top: 8px;
          }

          /* ================= PATIENT BLOCK ================= */

          .patient-block {
            margin: 12px 0 14px 0;
            padding: 8px 10px;
            font-size: 11px;
          }

          .patient-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 20px;
          }

          .patient-label {
            font-weight: 600;
            opacity: 0.8;
          }

          /* ================= META ================= */

          .document-meta { margin-bottom: 12px; }

          .document-meta strong {
            font-size: 14px;
          }

          .meta-sub {
            font-size: 11px;
            margin-top: 2px;
            opacity: 0.75;
          }

          /* ================= CONTENT ================= */

          .document-content {
            font-size: 13px;
            line-height: 1.55;
          }

          .section-block {
            margin-bottom: 14px;
            page-break-inside: avoid;
          }

          .section-title {
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 6px;
            color: #5b8def;
            letter-spacing: 0.4px;
          }

          .section-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 22px;
          }

          .field-label {
            font-size: 10px;
            margin-bottom: 2px;
            opacity: 0.65;
          }

          .field-value {
            font-size: 12px;
          }

          .paragraph-text {
            font-size: 13px;
            line-height: 1.6;
          }

          /* ================= FOOTER ================= */

          .letter-footer {
            margin-top: 24px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            text-align: center;
            color: #666;
          }

        </style>
      </head>

      <body>

        ${content.querySelector(".letterhead")?.outerHTML || ""}

        <div class="patient-block">
          <div class="patient-grid">
            <div><span class="patient-label">Patient:</span> ${patient.firstName || ""} ${patient.lastName || ""}</div>
            <div><span class="patient-label">MRN:</span> ${patient.mrn || "—"}</div>
            <div><span class="patient-label">DOB:</span> ${patient.dob || "—"}</div>
            <div><span class="patient-label">Gender:</span> ${patient.gender || "—"}</div>
            <div><span class="patient-label">Contact:</span> ${patient.phone || "—"}</div>
          </div>
        </div>

        ${content.querySelector(".document-meta")?.outerHTML || ""}
        ${content.querySelector(".document-content")?.outerHTML || ""}
        ${content.querySelector(".letter-footer")?.outerHTML || ""}

      </body>
    </html>
  `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };




    return (
        <div>

            {/* ================= HEADER ================= */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileText size={20} />
                    Medical Documents
                </h2>

                <button
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
                    style={{
                        background: "var(--primary)",
                        color: "white",
                        borderRadius: "var(--radius-sm)",
                    }}
                    onClick={() => setShowTypeModal(true)}
                >
                    <Plus size={16} />
                    Add New
                </button>
            </div>

            {/* ================= DOCUMENT LIST ================= */}
            <div className="space-y-6">
                {Object.entries(groupedDocuments).map(([type, docs]) => {
                    const styles = getSectionStyle(type);

                    return (
                        <div
                            key={type}
                            style={{
                                borderLeft: `4px solid ${styles.border}`,
                                borderRadius: "var(--radius-md)",
                                background: "var(--bg-card)",
                            }}
                        >
                            <div
                                className="px-6 py-4 font-semibold"
                                style={{
                                    background: styles.bg,
                                    color: styles.text,
                                }}
                            >
                                {type} ({docs.length})
                            </div>

                            {docs.map((doc) => (
                                <div
                                    key={doc._id}
                                    className="flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-[var(--bg-light)]"
                                    style={{
                                        borderTop: "1px solid var(--border-light)",
                                    }}
                                    onClick={() => openDocument(doc._id)}
                                >
                                    <div>
                                        <div className="text-sm font-medium">
                                            {formatDate(doc.date)}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs mt-1 opacity-70">
                                            <User size={14} />
                                            {doc.doctor?.firstName} {doc.doctor?.lastName}
                                        </div>
                                    </div>

                                    {doc.status === "signed" ? (
                                        <span className="text-green-600 text-sm flex items-center gap-1">
                                            <CheckCircle size={16} />
                                            Signed
                                        </span>
                                    ) : (
                                        <span className="text-yellow-600 text-sm flex items-center gap-1">
                                            <Clock size={16} />
                                            Draft
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* ================= ADD NEW TYPE MODAL ================= */}
            {showTypeModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                    onClick={() => setShowTypeModal(false)}
                >
                    <div
                        ref={modalRef}
                        className="w-full max-w-xl p-6"
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: "var(--radius-md)",
                            boxShadow: "var(--shadow-lg)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold">
                                Select Document Type
                            </h3>
                            <button onClick={() => setShowTypeModal(false)}>✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {DOCUMENT_TYPES.map((doc) => (
                                <div
                                    key={doc.value}
                                    className="p-4 cursor-pointer"
                                    style={{
                                        border: "1px solid var(--border-light)",
                                        borderRadius: "var(--radius-md)",
                                        background: "var(--bg-light)",
                                    }}
                                    onClick={() => {
                                        setShowTypeModal(false);
                                        router.push(
                                            `/patients/${patientId}/documents/new?type=${doc.value}`
                                        );
                                    }}
                                >
                                    <div className="font-medium">{doc.label}</div>
                                    <div className="text-xs mt-1 opacity-70">
                                        Create new {doc.label.toLowerCase()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ================= DOCUMENT VIEW MODAL ================= */}
            {selectedDoc && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ background: "rgba(0,0,0,0.5)" }}
                    onClick={() => setSelectedDoc(null)}
                >
                    <div
                        className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: "var(--radius-lg)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 flex justify-between items-center border-b">
                            <div className="font-semibold">Document Preview</div>
                            <button onClick={() => setSelectedDoc(null)}>✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div id="printable-document">

                                {/* ================= LETTERHEAD ================= */}
                                <div className="letterhead">
                                    <div className="letterhead-top">
                                        <div>
                                            <h1 className="clinic-name">BetterYou Clinic</h1>
                                            <div className="clinic-tagline">
                                                Mental Health & Wellness Center
                                            </div>
                                        </div>

                                        <div className="clinic-contact">
                                            +91 98765 43210 <br />
                                            contact@betteryou.com <br />
                                            Ahmedabad, Gujarat
                                        </div>
                                    </div>

                                    <div className="letterhead-divider" />
                                </div>

                                {/* ================= DOCUMENT META ================= */}
                                <div className="document-meta">
                                    <div>
                                        <strong>
                                            {
                                                DOCUMENT_TYPES.find(
                                                    (d) => d.value === selectedDoc.type
                                                )?.label
                                            }
                                        </strong>
                                        <div className="meta-sub">
                                            Date: {formatDate(selectedDoc.date)}
                                        </div>
                                        <div className="meta-sub">
                                            Doctor: {selectedDoc.doctor?.firstName}{" "}
                                            {selectedDoc.doctor?.lastName}
                                        </div>
                                    </div>
                                </div>

                                {/* ================= CONTENT ================= */}
                                <div className="document-content">
                                    {selectedDoc.content &&
                                        Object.entries(selectedDoc.content).map(
                                            ([sectionKey, sectionValue]) => (
                                                <div key={sectionKey} className="section-block">
                                                    <div className="section-title">
                                                        {sectionKey.replace(/([A-Z])/g, " $1")}
                                                    </div>

                                                    {typeof sectionValue === "object" ? (
                                                        <div className="section-grid">
                                                            {Object.entries(sectionValue).map(
                                                                ([fieldKey, fieldValue]) => (
                                                                    <div key={fieldKey} className="field-item">
                                                                        <div className="field-label">
                                                                            {fieldKey.replace(/([A-Z])/g, " $1")}
                                                                        </div>
                                                                        <div className="field-value">
                                                                            {String(fieldValue)}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="paragraph-text">
                                                            {String(sectionValue)}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                </div>

                                {/* ================= FOOTER ================= */}
                                <div className="letter-footer">
                                    This document is electronically generated and does not require a signature.
                                </div>

                            </div>

                        </div>

                        <div className="px-6 py-4 flex justify-end gap-4 border-t no-print">
                            {selectedDoc.pdfUrl && (
                                <button
                                    onClick={() =>
                                        window.open(
                                            `/api${selectedDoc.pdfUrl}`,
                                            "_blank"
                                        )
                                    }
                                    className="px-4 py-2 text-sm font-medium"
                                    style={{
                                        background: "var(--primary)",
                                        color: "white",
                                        borderRadius: "var(--radius-sm)",
                                    }}
                                >
                                    Download PDF
                                </button>
                            )}

                            <button
                                onClick={handleCustomPrint}
                                className="px-4 py-2 text-sm font-medium"
                                style={{
                                    border: "1px solid var(--primary)",
                                    color: "var(--primary)",
                                    borderRadius: "var(--radius-sm)",
                                }}
                            >
                                Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
