"use client";

import {
    useState,
    useMemo,
    useEffect,
    useRef,
    useCallback,
} from "react";

import { useRouter } from "next/navigation";

import dynamic from "next/dynamic";
import toast from "react-hot-toast";

import {
    CheckCircle,
    Clock,
    User,
    FileText,
    Plus,
    ScanLine,
    Download,
    ExternalLink,
    Loader2,
    ClipboardList,
    ShieldAlert,
    CalendarClock,
    MessagesSquare,
    Siren,
    Pill,
    FileCheck2,
    NotebookPen,
    Brain,
    Printer,
    type LucideIcon,
} from "lucide-react";

/** Icon per document type in the "Select Document Type" picker. */
const DOCUMENT_TYPE_ICONS: Record<string, LucideIcon> = {
    "initial-evaluation": ClipboardList,
    "risk-assessment": ShieldAlert,
    "follow-up-note": CalendarClock,
    "individual-therapy-session": MessagesSquare,
    "crisis-intervention": Siren,
    "medication-review": Pill,
    "discharge-summary": FileCheck2,
    "progress-note-soap": NotebookPen,
    "psych-testing-report": Brain,
    "custom-document": ScanLine,
};

import { DOCUMENT_TYPES } from "@/lib/documentTypes";
import { api } from "@/lib/api";
import { Modal } from "@/components/common/Modal";
import { DocumentSheet, docTypeLabel, printSheet } from "@/components/containers/documents/DocumentSheet";
import {
    CUSTOM_DOCUMENT_TYPE,
    categoryLabel,
    fetchDocumentFile,
    formatBytes,
} from "@/lib/scanner/document";

// Camera + image processing are browser-only and only needed once the
// practitioner opens the scanner.
const DocumentScannerDialog = dynamic(
    () => import("@/components/containers/documents/scanner/DocumentScannerDialog"),
    { ssr: false },
);

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
    content?: Record<string, unknown>;
    // Custom (scanned / uploaded) documents
    title?: string;
    category?: string;
    description?: string;
    source?: "camera_scan" | "device_upload";
    file?: { mimeType: string; size: number; pageCount: number; fileName: string };
    createdAt?: string;
};

const isCustom = (doc: Document) => doc.type === CUSTOM_DOCUMENT_TYPE;

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
    dateOfBirth?: string;
    gender?: string;
    phoneNo?: string;
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
    const [showScanner, setShowScanner] = useState(false);
    // Keyed by document id so a stale result never shows for another document.
    const [loadedFile, setLoadedFile] = useState<
        { id: string; url: string } | { id: string; error: true } | null
    >(null);

    const router = useRouter();
    const sheetRef = useRef<HTMLDivElement | null>(null);


    useEffect(() => {
        async function fetchPatient() {
            try {
                const res = await api.get(`/patients/${patientId}`);
                setPatient(res.data);
            } catch (error) {
                console.error(error);
            }
        }

        fetchPatient();
    }, [patientId]);

    /* ========================================
       FETCH DOCUMENTS
    ======================================== */

    const fetchDocuments = useCallback(async () => {
        const res = await api.get(`/documents/patient/${patientId}`);
        setDocuments(res.data);
    }, [patientId]);

    useEffect(() => {
        async function loadDocuments() {
            try {
                const res = await api.get(`/documents/patient/${patientId}`);
                setDocuments(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        loadDocuments();
    }, [patientId]);

    /**
     * Show the saved scan immediately, then reconcile with the server. A
     * failed refresh must not hide a document that was already persisted.
     */
    const handleScanSaved = (saved: unknown) => {
        const doc = saved as Document;
        if (doc?._id) {
            setDocuments((prev) => [doc, ...prev.filter((d) => d._id !== doc._id)]);
        }
        fetchDocuments().catch(() => {
            toast("Saved. The list will fully refresh next time you open this tab.");
        });
    };

    // Load the stored PDF through the authorized endpoint when a custom
    // document is opened; the object URL is revoked when it closes.
    useEffect(() => {
        if (!selectedDoc || !isCustom(selectedDoc)) return;
        const id = selectedDoc._id;
        let url: string | null = null;
        let cancelled = false;
        fetchDocumentFile(id)
            .then((blob) => {
                if (cancelled) return;
                url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
                setLoadedFile({ id, url });
            })
            .catch(() => {
                if (!cancelled) setLoadedFile({ id, error: true });
            });
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [selectedDoc]);

    const fileState: { status: "loading" } | { status: "ready"; url: string } | { status: "error" } =
        !selectedDoc || loadedFile?.id !== selectedDoc._id
            ? { status: "loading" }
            : "url" in loadedFile
              ? { status: "ready", url: loadedFile.url }
              : { status: "error" };

    const downloadFile = (doc: Document) => {
        if (fileState?.status !== "ready") return;
        const a = document.createElement("a");
        a.href = fileState.url;
        a.download = doc.file?.fileName || "document.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const openDocument = async (id: string) => {
        try {
            const res = await api.get(`/documents/${id}`);
            setSelectedDoc(res.data);
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
            const typeLabel = docTypeLabel(doc.type);

            if (!grouped[typeLabel]) grouped[typeLabel] = [];
            grouped[typeLabel].push(doc);
        });

        return grouped;
    }, [documents]);

    if (loading) {
        return <div className="p-6 text-sm">Loading documents...</div>;
    }


    const openType = (value: string) => {
        setShowTypeModal(false);
        if (value === CUSTOM_DOCUMENT_TYPE) {
            setShowScanner(true);
            return;
        }
        router.push(`/patients/${patientId}/documents/new?type=${value}`);
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
                                    <div className="min-w-0">
                                        {isCustom(doc) && (
                                            <div className="text-sm font-semibold truncate">
                                                {doc.title}
                                            </div>
                                        )}
                                        <div className="text-sm font-medium">
                                            {formatDate(doc.date)}
                                            {isCustom(doc) && (
                                                <span className="font-normal opacity-70">
                                                    {" "}· {categoryLabel(doc.category)}
                                                    {doc.file && ` · ${doc.file.pageCount} ${doc.file.pageCount === 1 ? "page" : "pages"}`}
                                                </span>
                                            )}
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
                                    ) : isCustom(doc) ? (
                                        <span className="text-sm flex items-center gap-1" style={{ color: "var(--primary)" }}>
                                            <ScanLine size={16} />
                                            {doc.source === "camera_scan" ? "Scanned" : "Uploaded"}
                                        </span>
                                    ) : doc.status === "finalized" ? (
                                        <span className="text-green-600 text-sm flex items-center gap-1">
                                            <CheckCircle size={16} />
                                            Finalized
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
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="document-type-title"
                        className="w-full max-w-xl p-6"
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: "var(--radius-md)",
                            boxShadow: "var(--shadow-lg)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 id="document-type-title" className="text-lg font-semibold">
                                Select Document Type
                            </h3>
                            <button onClick={() => setShowTypeModal(false)} aria-label="Close">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {DOCUMENT_TYPES.map((doc) => {
                                const Icon = DOCUMENT_TYPE_ICONS[doc.value] ?? FileText;
                                return (
                                    <button
                                        key={doc.value}
                                        type="button"
                                        onClick={() => openType(doc.value)}
                                        className="group flex items-start gap-3 p-4 text-left rounded-md border border-border bg-bg-light hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer"
                                    >
                                        <span className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Icon size={19} aria-hidden />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-medium text-text-primary group-hover:text-primary transition-colors">
                                                {doc.label}
                                            </span>
                                            <span className="block text-xs mt-1 text-text-secondary">
                                                {doc.description ?? `Create new ${doc.label.toLowerCase()}`}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CUSTOM DOCUMENT SCANNER ================= */}
            {showScanner && (
                <DocumentScannerDialog
                    patientId={patientId}
                    onClose={() => setShowScanner(false)}
                    onSaved={handleScanSaved}
                />
            )}

            {/* ================= DOCUMENT VIEW MODAL ================= */}
            <Modal
                open={!!selectedDoc}
                onClose={() => setSelectedDoc(null)}
                maxWidth="sm:max-w-4xl"
                title={selectedDoc ? (isCustom(selectedDoc) ? selectedDoc.title || "Document" : docTypeLabel(selectedDoc.type)) : ""}
                subtitle={
                    selectedDoc
                        ? [
                              isCustom(selectedDoc) ? categoryLabel(selectedDoc.category) : null,
                              formatDate(selectedDoc.date),
                              selectedDoc.doctor?.firstName ? `Dr. ${selectedDoc.doctor.firstName} ${selectedDoc.doctor.lastName ?? ""}`.trim() : null,
                          ]
                              .filter(Boolean)
                              .join(" · ")
                        : undefined
                }
                footer={
                    selectedDoc && (
                        <div className="w-full flex flex-wrap items-center justify-end gap-2">
                            {isCustom(selectedDoc) ? (
                                <>
                                    <button
                                        onClick={() => fileState?.status === "ready" && window.open(fileState.url, "_blank", "noopener")}
                                        disabled={fileState?.status !== "ready"}
                                        className="h-10 inline-flex items-center gap-2 px-4 rounded-md border border-border bg-bg-card text-sm text-text-primary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ExternalLink size={15} aria-hidden /> Open in new tab
                                    </button>
                                    <button
                                        onClick={() => downloadFile(selectedDoc)}
                                        disabled={fileState?.status !== "ready"}
                                        className="h-10 inline-flex items-center gap-2 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Download size={15} aria-hidden /> Download PDF
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => printSheet(sheetRef.current, `${docTypeLabel(selectedDoc.type)} — ${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`)}
                                    className="h-10 inline-flex items-center gap-2 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer"
                                >
                                    <Printer size={15} aria-hidden /> Print
                                </button>
                            )}
                        </div>
                    )
                }
            >
                {selectedDoc && (isCustom(selectedDoc) ? (
                    <div className="flex flex-col gap-4">
                        <div className="text-xs text-text-secondary">
                            {selectedDoc.file && `${selectedDoc.file.pageCount} ${selectedDoc.file.pageCount === 1 ? "page" : "pages"} · ${formatBytes(selectedDoc.file.size)} · `}
                            {selectedDoc.source === "camera_scan" ? "Camera scan" : "Device upload"}
                            {selectedDoc.description && <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{selectedDoc.description}</p>}
                        </div>
                        <div className="rounded-md overflow-hidden border border-border bg-bg-page">
                            {fileState?.status === "ready" ? (
                                <iframe src={fileState.url} title={selectedDoc.title || "Document"} className="w-full h-[60vh]" />
                            ) : fileState?.status === "error" ? (
                                <div role="alert" className="h-[60vh] grid place-items-center text-sm p-6 text-center text-danger">
                                    The file couldn&apos;t be loaded. Close and reopen the document to try again.
                                </div>
                            ) : (
                                <div className="h-[60vh] flex items-center justify-center gap-2 text-sm text-text-secondary">
                                    <Loader2 className="animate-spin" size={18} aria-hidden /> Loading document…
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Paper-like sheet: the same markup is what prints. */
                    <div className="-m-1 rounded-md bg-bg-page p-2 sm:p-4">
                        <div className="mx-auto max-w-[800px] bg-white text-[#0f172a] rounded-md border border-border shadow-sm p-5 sm:p-10">
                            <DocumentSheet ref={sheetRef} doc={selectedDoc} patient={patient} />
                        </div>
                    </div>
                ))}
            </Modal>
        </div>
    );
}
