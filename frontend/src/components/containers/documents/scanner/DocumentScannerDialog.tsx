"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ChangeEvent } from "react";
import toast from "react-hot-toast";
import {
    AlertTriangle,
    Camera,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    ScanLine,
    Trash2,
    Upload,
    X,
} from "lucide-react";

import CameraPreview from "./CameraPreview";
import PageEditor from "./PageEditor";
import DocumentReviewPanel from "./DocumentReviewPanel";
import { DEFAULT_EDITS, renderPage, type PageEdits, type QualityHint, type Quad } from "@/lib/scanner/image";
import { MAX_PAGES, initialPages, newPageId, pagesReducer, randomId, type ScanPage } from "@/lib/scanner/pages";
import {
    MAX_UPLOAD_BYTES,
    defaultTitle,
    formatBytes,
    todayIso,
    uploadCustomDocument,
    uploadErrorMessage,
    validateFile,
    validateMeta,
    type DocumentMeta,
    type DocumentSource,
    type MetaErrors,
} from "@/lib/scanner/document";

type Props = {
    patientId: string;
    onClose: () => void;
    /** Called with the persisted document returned by the API. */
    onSaved: (document: unknown) => void;
};

type Step = "source" | "camera" | "pages" | "edit" | "review";

/** Raw image files above this are refused before decoding (memory bound). */
const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024;

const STEPS = ["Capture", "Review", "Save"] as const;

const QUALITY_TEXT: Record<Exclude<QualityHint, null>, string> = {
    dark: "This page looks dark. Retake it with more light, or raise the brightness in Edit.",
    blurry: "This page may be blurry. Hold the device steady and retake it if the text is hard to read.",
};

/**
 * Scan or upload a paper document into a patient's record as one PDF.
 *
 * Mounted only while open, so all camera/blob resources are released on
 * unmount. Nothing is persisted to browser storage; page images live in
 * memory as Blobs until the dialog closes.
 */
export default function DocumentScannerDialog({ patientId, onClose, onSaved }: Props) {
    const [step, setStep] = useState<Step>("source");
    const [{ pages, current }, dispatch] = useReducer(pagesReducer, initialPages);
    const [pdf, setPdf] = useState<{ blob: Blob; url: string; pageCount: number } | null>(null);
    const [source, setSource] = useState<DocumentSource>("camera_scan");
    const [retakeId, setRetakeId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [meta, setMeta] = useState<DocumentMeta>(() => ({ title: defaultTitle(), category: "", description: "", date: todayIso() }));
    const [errors, setErrors] = useState<MetaErrors>({});
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<null | { title: string; body: string; action: string; onConfirm: () => void }>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const savingRef = useRef(false);
    const urlsRef = useRef(new Set<string>());
    const uploadKeyRef = useRef(randomId());
    const editFromReview = useRef(false);

    const hasWork = pages.length > 0 || !!pdf;
    const currentPage = pages[current];

    /* ---------------- resource tracking ---------------- */

    const track = (url: string) => {
        urlsRef.current.add(url);
        return url;
    };
    const release = (url?: string) => {
        if (!url) return;
        URL.revokeObjectURL(url);
        urlsRef.current.delete(url);
    };

    useEffect(() => {
        const urls = urlsRef.current;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            urls.forEach((u) => URL.revokeObjectURL(u));
            urls.clear();
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    // New content => new idempotency key. A pure retry keeps the old one, so a
    // request that reached the server before the connection dropped is not
    // saved twice.
    useEffect(() => {
        uploadKeyRef.current = randomId();
    }, [pages, pdf, meta]);

    // Warn before a hard navigation would discard the scan.
    useEffect(() => {
        if (!hasWork && !saving) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasWork, saving]);

    /* ---------------- close ---------------- */

    const requestClose = useCallback(() => {
        if (savingRef.current) return; // never abandon an in-flight save
        if (!hasWork) return onClose();
        setConfirm({
            title: "Discard this scan?",
            body: "The captured pages haven't been saved to the patient record and will be lost.",
            action: "Discard",
            onConfirm: onClose,
        });
    }, [hasWork, onClose]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            if (confirm) setConfirm(null);
            else if (step === "edit") setStep("pages");
            else requestClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [confirm, step, requestClose]);

    /* ---------------- page creation ---------------- */

    const buildPage = async (original: Blob, quality: QualityHint, edits: PageEdits = DEFAULT_EDITS): Promise<ScanPage> => {
        const processed = await renderPage(original, edits);
        return {
            id: newPageId(),
            original,
            edits,
            quality,
            processed: { ...processed, url: track(URL.createObjectURL(processed.blob)) },
        };
    };

    const handleCapture = async (blob: Blob, quality: QualityHint, corners: Quad | null = null) => {
        setNotice(null);
        try {
            // An auto-detected outline becomes the page's crop (flattened by
            // renderPage's perspective warp); it stays adjustable in the editor.
            // If the warp can't use it, fall back to the full frame.
            let page: ScanPage;
            try {
                page = await buildPage(blob, quality, corners ? { ...DEFAULT_EDITS, corners } : DEFAULT_EDITS);
            } catch (err) {
                if (!corners) throw err;
                page = await buildPage(blob, quality);
            }
            if (retakeId) {
                const old = pages.find((p) => p.id === retakeId);
                release(old?.processed.url);
                dispatch({ type: "replace", id: retakeId, page: { ...page, id: retakeId } });
                setRetakeId(null);
            } else {
                if (pages.length >= MAX_PAGES) {
                    release(page.processed.url);
                    setNotice(`A document can have at most ${MAX_PAGES} pages.`);
                } else {
                    dispatch({ type: "add", page });
                }
            }
            setStep("pages");
        } catch (e) {
            setNotice((e as Error).message || "The photo couldn't be processed. Try again.");
        }
    };

    const openFilePicker = () => fileInputRef.current?.click();

    const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = ""; // allow re-selecting the same file
        if (files.length === 0) return;
        setNotice(null);

        const pdfs = files.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
        if (pdfs.length > 0) {
            if (files.length > 1 || pages.length > 0) {
                setNotice("A PDF must be uploaded on its own. Remove the other pages or upload it separately.");
                return;
            }
            await acceptPdf(pdfs[0]);
            return;
        }

        const room = MAX_PAGES - (retakeId ? 0 : pages.length);
        const images = files.slice(0, Math.max(0, room));
        if (images.length < files.length) setNotice(`Only ${MAX_PAGES} pages are allowed — extra files were skipped.`);

        setBusy("Processing images…");
        let lastError: string | null = null;
        if (!retakeId && pages.length === 0) setSource("device_upload");
        for (const file of images) {
            if (!file.type.startsWith("image/")) {
                lastError = `"${file.name}" isn't an image or PDF.`;
                continue;
            }
            if (file.size > MAX_IMAGE_FILE_BYTES) {
                lastError = `"${file.name}" is larger than ${formatBytes(MAX_IMAGE_FILE_BYTES)}.`;
                continue;
            }
            try {
                const page = await buildPage(file, null);
                if (retakeId) {
                    release(pages.find((p) => p.id === retakeId)?.processed.url);
                    dispatch({ type: "replace", id: retakeId, page: { ...page, id: retakeId } });
                    setRetakeId(null);
                    break;
                }
                dispatch({ type: "add", page });
            } catch (err) {
                lastError = `"${file.name}": ${(err as Error).message}`;
            }
        }
        setBusy(null);
        if (lastError) setNotice(lastError);
        setStep((s) => (s === "source" || s === "camera" ? "pages" : s));
    };

    const acceptPdf = async (file: File) => {
        if (file.size > MAX_UPLOAD_BYTES) {
            setNotice(`This PDF is ${formatBytes(file.size)}, over the ${formatBytes(MAX_UPLOAD_BYTES)} limit.`);
            return;
        }
        const { looksLikePdf, estimatePdfPageCount } = await import("@/lib/scanner/pdf");
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!looksLikePdf(bytes)) {
            setNotice("This file isn't a valid PDF.");
            return;
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        setSource("device_upload");
        setPdf({ blob, url: track(URL.createObjectURL(blob)), pageCount: estimatePdfPageCount(bytes) });
        setMeta((m) => ({ ...m, title: m.title === defaultTitle() ? file.name.replace(/\.pdf$/i, "").slice(0, 120) || m.title : m.title }));
        setStep("review");
    };

    /* ---------------- page actions ---------------- */

    const removePage = (id: string) => {
        setConfirm({
            title: "Remove this page?",
            body: "The page will be removed from this document.",
            action: "Remove",
            onConfirm: () => {
                const page = pages.find((p) => p.id === id);
                release(page?.processed.url);
                dispatch({ type: "remove", id });
                if (pages.length === 1) setStep("source");
            },
        });
    };

    const applyEdits = async (edits: PageEdits) => {
        const page = pages.find((p) => p.id === editId);
        if (!page) return;
        const processed = await renderPage(page.original, edits);
        release(page.processed.url);
        dispatch({
            type: "replace",
            id: page.id,
            page: { ...page, edits, processed: { ...processed, url: track(URL.createObjectURL(processed.blob)) } },
        });
        setEditId(null);
        setStep(editFromReview.current ? "review" : "pages");
    };

    const startEdit = (id: string, fromReview = false) => {
        editFromReview.current = fromReview;
        setEditId(id);
        setStep("edit");
    };

    const startRetake = (id: string) => {
        setRetakeId(id);
        if (source === "camera_scan") setStep("camera");
        else openFilePicker();
    };

    const addPage = () => {
        setRetakeId(null);
        if (source === "camera_scan") setStep("camera");
        else openFilePicker();
    };

    /* ---------------- save ---------------- */

    const estimatedBytes = useMemo(
        () => (pdf ? pdf.blob.size : pages.reduce((n, p) => n + p.processed.blob.size + 600, 400)),
        [pages, pdf],
    );

    const save = async () => {
        if (savingRef.current) return;
        const metaErrors = validateMeta(meta);
        setErrors(metaErrors);
        if (Object.keys(metaErrors).length > 0) return;

        savingRef.current = true;
        setSaving(true);
        setUploadError(null);
        setProgress(0);

        try {
            let file: Blob;
            let pageCount: number;
            if (pdf) {
                file = pdf.blob;
                pageCount = pdf.pageCount;
            } else {
                const { buildPdfFromJpegs } = await import("@/lib/scanner/pdf");
                const bytes = buildPdfFromJpegs(
                    await Promise.all(
                        pages.map(async (p) => ({
                            jpeg: new Uint8Array(await p.processed.blob.arrayBuffer()),
                            width: p.processed.width,
                            height: p.processed.height,
                        })),
                    ),
                );
                file = new Blob([bytes as BlobPart], { type: "application/pdf" });
                pageCount = pages.length;
            }

            const fileError = validateFile(file.size, pageCount);
            if (fileError) throw Object.assign(new Error(fileError), { local: true });

            const saved = await uploadCustomDocument({
                patientId,
                pdf: file,
                pageCount,
                meta,
                source,
                uploadKey: uploadKeyRef.current,
                onProgress: setProgress,
            });

            toast.success("Document saved to the patient record");
            onSaved(saved);
            savingRef.current = false;
            onClose();
        } catch (e) {
            const err = e as Error & { local?: boolean; isAxiosError?: boolean };
            if (!err.local && !err.isAxiosError) console.error("Custom document save failed", e);
            setUploadError(err.local ? err.message : uploadErrorMessage(e));
            savingRef.current = false;
            setSaving(false);
        }
    };

    /* ---------------- render ---------------- */

    const stepIndex = saving ? 2 : step === "review" ? 1 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={requestClose} aria-hidden />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="scanner-title"
                className="relative w-full sm:max-w-5xl h-[100dvh] sm:h-[92dvh] bg-bg-card sm:rounded-2xl shadow-xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border shrink-0">
                    <div className="min-w-0">
                        <h2 id="scanner-title" className="text-base font-semibold text-text-primary flex items-center gap-2">
                            <ScanLine size={18} className="text-primary" /> Custom Document
                        </h2>
                        <ol className="flex items-center gap-1.5 mt-1 text-xs" aria-label="Progress">
                            {STEPS.map((label, i) => (
                                <li key={label} className="flex items-center gap-1.5">
                                    <span
                                        aria-current={i === stepIndex ? "step" : undefined}
                                        className={i === stepIndex ? "font-semibold text-primary" : i < stepIndex ? "text-text-primary" : "text-text-light"}
                                    >
                                        {label}
                                    </span>
                                    {i < STEPS.length - 1 && <ChevronRight size={12} className="text-text-light" aria-hidden />}
                                </li>
                            ))}
                        </ol>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-secondary disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Close scanner"
                    >
                        <X size={18} />
                    </button>
                </header>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple={!retakeId}
                    className="hidden"
                    onChange={handleFiles}
                    aria-hidden
                    tabIndex={-1}
                />

                {notice && (
                    <div role="status" className="mx-5 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-warning-light text-sm text-text-primary">
                        <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
                        <span className="flex-1">{notice}</span>
                        <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-text-secondary hover:text-text-primary">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                    {busy && (
                        <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-text-secondary" role="status">
                            <Loader2 className="animate-spin" /> {busy}
                        </div>
                    )}

                    {!busy && step === "source" && (
                        <div className="h-full flex flex-col items-center justify-center gap-6">
                            <p className="text-sm text-text-secondary text-center max-w-md">
                                Scan a paper document with your camera or upload an existing photo or PDF. It will be saved as a PDF in this patient&apos;s documents.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4 w-full max-w-xl">
                                <SourceCard
                                    autoFocus
                                    icon={<Camera size={26} />}
                                    title="Scan using Camera"
                                    body="Capture one or more pages with this device's camera"
                                    onClick={() => {
                                        setSource("camera_scan");
                                        setStep("camera");
                                    }}
                                />
                                <SourceCard
                                    icon={<Upload size={26} />}
                                    title="Upload from Device"
                                    body="Choose photos (JPEG, PNG) or a PDF"
                                    onClick={openFilePicker}
                                />
                            </div>
                            <button type="button" onClick={requestClose} className="text-sm text-text-secondary hover:text-text-primary underline-offset-4 hover:underline">
                                Cancel
                            </button>
                        </div>
                    )}

                    {!busy && step === "camera" && (
                        <div className="h-full flex flex-col min-h-[360px]">
                            <CameraPreview
                                onCapture={handleCapture}
                                onUploadInstead={() => {
                                    setStep(pages.length ? "pages" : "source");
                                    openFilePicker();
                                }}
                                captureLabel={retakeId ? "Retake Page" : "Capture Page"}
                            />
                            <div className="flex justify-center gap-3 pt-2">
                                {pages.length > 0 ? (
                                    <button type="button" onClick={() => { setRetakeId(null); setStep("pages"); }} className="text-sm text-text-secondary hover:text-text-primary px-3 py-2">
                                        Back to pages ({pages.length})
                                    </button>
                                ) : (
                                    <button type="button" onClick={() => setStep("source")} className="text-sm text-text-secondary hover:text-text-primary px-3 py-2">
                                        Back
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {!busy && step === "pages" && currentPage && (
                        <div className="h-full flex flex-col gap-4 min-h-0">
                            <div className="relative flex-1 min-h-[280px] bg-bg-light rounded-xl flex items-center justify-center overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={currentPage.processed.url} alt={`Page ${current + 1}`} className="max-h-full max-w-full object-contain" />
                                {pages.length > 1 && (
                                    <>
                                        <NavButton side="left" label="Previous page" disabled={current === 0} onClick={() => dispatch({ type: "select", index: current - 1 })} />
                                        <NavButton side="right" label="Next page" disabled={current === pages.length - 1} onClick={() => dispatch({ type: "select", index: current + 1 })} />
                                    </>
                                )}
                            </div>

                            {currentPage.quality && (
                                <div role="status" className="flex items-start gap-2 px-3 py-2 rounded-xl bg-warning-light text-sm">
                                    <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
                                    {QUALITY_TEXT[currentPage.quality]}
                                </div>
                            )}

                            <div className="text-center text-sm font-medium text-text-primary" aria-live="polite">
                                Page {current + 1} of {pages.length}
                            </div>

                            <div className="flex flex-wrap justify-center gap-2">
                                <ActionButton icon={<RefreshCw size={16} />} label="Retake" onClick={() => startRetake(currentPage.id)} />
                                <ActionButton icon={<Pencil size={16} />} label="Edit Page" onClick={() => startEdit(currentPage.id)} />
                                <ActionButton icon={<Trash2 size={16} />} label="Remove Page" onClick={() => removePage(currentPage.id)} danger />
                                <ActionButton icon={<Plus size={16} />} label="Add Page" onClick={addPage} disabled={pages.length >= MAX_PAGES} />
                                {source === "camera_scan" && (
                                    <ActionButton icon={<ImageIcon size={16} />} label="Add from Device" onClick={() => { setRetakeId(null); openFilePicker(); }} disabled={pages.length >= MAX_PAGES} />
                                )}
                            </div>
                        </div>
                    )}

                    {!busy && step === "edit" && editId && pages.find((p) => p.id === editId) && (
                        <PageEditor
                            key={editId}
                            original={pages.find((p) => p.id === editId)!.original}
                            initial={pages.find((p) => p.id === editId)!.edits}
                            onApply={applyEdits}
                            onCancel={() => {
                                setEditId(null);
                                setStep(editFromReview.current ? "review" : "pages");
                            }}
                        />
                    )}

                    {!busy && step === "review" && (
                        <DocumentReviewPanel
                            pages={pages}
                            pdf={pdf}
                            meta={meta}
                            errors={errors}
                            estimatedBytes={estimatedBytes}
                            disabled={saving}
                            onMetaChange={(patch) => {
                                setMeta((m) => ({ ...m, ...patch }));
                                setErrors((e) => {
                                    const next = { ...e };
                                    for (const k of Object.keys(patch)) delete next[k as keyof MetaErrors];
                                    return next;
                                });
                            }}
                            onEditPage={(id) => startEdit(id, true)}
                            onRemovePage={removePage}
                            onMovePage={(id, delta) => dispatch({ type: "move", id, delta })}
                        />
                    )}
                </div>

                {/* Footer */}
                {(step === "pages" || step === "review") && (
                    <footer className="px-5 py-4 border-t border-border shrink-0 space-y-3">
                        {uploadError && (
                            <div role="alert" className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger-light text-sm text-text-primary">
                                <AlertTriangle size={16} className="text-danger mt-0.5 shrink-0" />
                                {uploadError}
                            </div>
                        )}
                        {saving && (
                            <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-1.5 rounded-full bg-bg-light overflow-hidden">
                                <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(5, progress * 100)}%` }} />
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => (step === "review" && !pdf ? setStep("pages") : requestClose())}
                                disabled={saving}
                                className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {step === "review" && !pdf ? (<span className="flex items-center gap-1"><ChevronLeft size={16} /> Back to pages</span>) : "Cancel"}
                            </button>

                            {step === "pages" ? (
                                <button
                                    type="button"
                                    onClick={() => setStep("review")}
                                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    Review Document
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={saving || (!pdf && pages.length === 0)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    {saving && <Loader2 className="animate-spin" size={16} />}
                                    {saving ? (progress >= 1 ? "Finishing…" : "Saving…") : uploadError ? "Retry Save" : "Save to Patient"}
                                </button>
                            )}
                        </div>
                    </footer>
                )}

                {/* Inline confirmation (kept inside the dialog so focus stays here) */}
                {confirm && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/40">
                        <div role="alertdialog" aria-modal="true" aria-labelledby="scanner-confirm-title" aria-describedby="scanner-confirm-body" className="w-full max-w-sm bg-bg-card rounded-2xl shadow-xl p-5">
                            <h3 id="scanner-confirm-title" className="font-semibold text-text-primary">{confirm.title}</h3>
                            <p id="scanner-confirm-body" className="text-sm text-text-secondary mt-1.5">{confirm.body}</p>
                            <div className="flex justify-end gap-3 mt-5">
                                <button type="button" autoFocus onClick={() => setConfirm(null)} className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    Keep
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const run = confirm.onConfirm;
                                        setConfirm(null);
                                        run();
                                    }}
                                    className="px-5 py-2.5 rounded-xl bg-danger text-white text-sm font-medium hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    {confirm.action}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SourceCard({ icon, title, body, onClick, autoFocus }: { icon: React.ReactNode; title: string; body: string; onClick: () => void; autoFocus?: boolean }) {
    return (
        <button
            type="button"
            autoFocus={autoFocus}
            onClick={onClick}
            className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl border border-border bg-bg-light hover:border-primary hover:bg-primary-light transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
            <span className="w-14 h-14 rounded-full bg-bg-card text-primary flex items-center justify-center shadow-sm">{icon}</span>
            <span className="font-semibold text-text-primary">{title}</span>
            <span className="text-xs text-text-secondary">{body}</span>
        </button>
    );
}

function ActionButton({ icon, label, onClick, disabled, danger }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${danger ? "border-danger/30 text-danger hover:bg-danger-light" : "border-border text-text-primary hover:bg-bg-hover"}`}
        >
            {icon}
            {label}
        </button>
    );
}

function NavButton({ side, label, onClick, disabled }: { side: "left" | "right"; label: string; onClick: () => void; disabled: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-3" : "right-3"} w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
        >
            {side === "left" ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
    );
}
