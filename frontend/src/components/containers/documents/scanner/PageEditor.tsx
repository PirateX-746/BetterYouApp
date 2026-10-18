"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Loader2, RotateCcw, RotateCw, Scan } from "lucide-react";

import {
    FULL_QUAD,
    canvasToJpeg,
    drawRotated,
    isConvexQuad,
    loadImage,
    rotateQuadCw,
    fitWithin,
    type ColorMode,
    type PageEdits,
    type Quad,
    type Rotation,
} from "@/lib/scanner/image";

type Props = {
    original: Blob;
    initial: PageEdits;
    onApply: (edits: PageEdits) => Promise<void>;
    onCancel: () => void;
};

const MODES: { value: ColorMode; label: string }[] = [
    { value: "color", label: "Color" },
    { value: "grayscale", label: "Grayscale" },
    { value: "bw", label: "Black & White" },
];

const CORNER_LABELS = ["Top-left", "Top-right", "Bottom-right", "Bottom-left"];
const PREVIEW_EDGE = 1400;

/**
 * Crop / rotate / enhance one page. Works on a downscaled preview of the
 * untouched original; the full-resolution render only happens on Apply.
 *
 * The crop is four independent corners, so dragging them onto the paper's
 * edges both crops and perspective-corrects a photo taken at an angle.
 */
export default function PageEditor({ original, initial, onApply, onCancel }: Props) {
    const [edits, setEdits] = useState<PageEdits>(initial);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [aspect, setAspect] = useState(1);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const boxRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<number | null>(null);

    // Rotated low-res preview of the original.
    useEffect(() => {
        let cancelled = false;
        let url: string | null = null;
        (async () => {
            try {
                const img = await loadImage(original);
                const small = fitWithin(img.width, img.height, PREVIEW_EDGE);
                const scaled = document.createElement("canvas");
                scaled.width = small.width;
                scaled.height = small.height;
                scaled.getContext("2d")!.drawImage(img, 0, 0, small.width, small.height);
                const { canvas } = drawRotated(scaled, edits.rotation);
                const blob = await canvasToJpeg(canvas, 0.8);
                if (cancelled) return;
                url = URL.createObjectURL(blob);
                setAspect(canvas.width / canvas.height);
                setPreviewUrl(url);
            } catch (e) {
                if (!cancelled) setError((e as Error).message);
            }
        })();
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [original, edits.rotation]);

    const rotate = (dir: 1 | -1) => {
        setEdits((e) => {
            let corners = e.corners;
            const turns = dir === 1 ? 1 : 3;
            for (let i = 0; i < turns; i++) corners = rotateQuadCw(corners);
            return {
                ...e,
                rotation: (((e.rotation + dir * 90) % 360) + 360) % 360 as Rotation,
                corners,
            };
        });
    };

    const setCorner = (index: number, x: number, y: number) => {
        setEdits((e) => {
            const corners = e.corners.map((p, i) =>
                i === index ? { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) } : p,
            ) as Quad;
            return { ...e, corners };
        });
    };

    const onPointerDown = (index: number) => (ev: PointerEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        dragRef.current = index;
        (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
    };

    const onPointerMove = (ev: PointerEvent<HTMLButtonElement>) => {
        if (dragRef.current === null || !boxRef.current) return;
        const rect = boxRef.current.getBoundingClientRect();
        setCorner(dragRef.current, (ev.clientX - rect.left) / rect.width, (ev.clientY - rect.top) / rect.height);
    };

    const onPointerUp = () => {
        dragRef.current = null;
    };

    const onHandleKey = (index: number) => (ev: KeyboardEvent<HTMLButtonElement>) => {
        const step = ev.shiftKey ? 0.05 : 0.01;
        const p = edits.corners[index];
        const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        };
        const m = moves[ev.key];
        if (!m) return;
        ev.preventDefault();
        setCorner(index, p.x + m[0], p.y + m[1]);
    };

    const validCrop = isConvexQuad(edits.corners);

    const apply = async () => {
        if (!validCrop) return;
        setApplying(true);
        setError(null);
        try {
            await onApply(edits);
        } catch (e) {
            setError((e as Error).message || "This edit couldn't be applied. Try again.");
            setApplying(false);
        }
    };

    // Approximate the final tone in the preview with CSS (the exact render,
    // including adaptive B&W thresholding, happens on Apply).
    const cssFilter = [
        `brightness(${1 + edits.brightness / 200})`,
        `contrast(${1 + edits.contrast / 100 + (edits.mode === "bw" ? 1.2 : 0)})`,
        edits.mode !== "color" ? "grayscale(1)" : "",
    ].join(" ");

    const points = edits.corners.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");

    return (
        <div className="flex flex-col lg:flex-row gap-5 h-full min-h-0">
            {/* Canvas area */}
            <div className="flex-1 min-h-[260px] flex items-center justify-center bg-bg-light rounded-xl p-6 overflow-hidden">
                {previewUrl ? (
                    <div
                        ref={boxRef}
                        className="relative max-h-full max-w-full touch-none select-none"
                        style={{ aspectRatio: aspect, height: aspect < 1 ? "100%" : undefined, width: aspect >= 1 ? "100%" : undefined }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Page being edited" className="absolute inset-0 w-full h-full" style={{ filter: cssFilter }} draggable={false} />
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                            <defs>
                                <mask id="crop-mask">
                                    <rect width="100" height="100" fill="white" />
                                    <polygon points={points} fill="black" />
                                </mask>
                            </defs>
                            <rect width="100" height="100" fill="rgba(0,0,0,0.45)" mask="url(#crop-mask)" />
                            <polygon
                                points={points}
                                fill="none"
                                stroke={validCrop ? "var(--primary)" : "var(--danger)"}
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                        {edits.corners.map((p, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`${CORNER_LABELS[i]} crop corner. Use arrow keys to move.`}
                                onPointerDown={onPointerDown(i)}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                onPointerCancel={onPointerUp}
                                onKeyDown={onHandleKey(i)}
                                className="absolute w-11 h-11 -ml-[22px] -mt-[22px] flex items-center justify-center cursor-grab active:cursor-grabbing focus-visible:outline-none group"
                                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                            >
                                <span className="w-5 h-5 rounded-full bg-white border-[3px] border-primary shadow group-focus-visible:ring-4 group-focus-visible:ring-primary/40" />
                            </button>
                        ))}
                    </div>
                ) : error ? null : (
                    <Loader2 className="animate-spin text-text-secondary" />
                )}
            </div>

            {/* Controls */}
            <div className="lg:w-72 shrink-0 flex flex-col gap-5">
                <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-2">Crop & Rotate</div>
                    <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => rotate(-1)} className="flex flex-col items-center gap-1 py-2 rounded-xl border border-border text-xs hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <RotateCcw size={18} /> Left
                        </button>
                        <button type="button" onClick={() => rotate(1)} className="flex flex-col items-center gap-1 py-2 rounded-xl border border-border text-xs hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <RotateCw size={18} /> Right
                        </button>
                        <button type="button" onClick={() => setEdits((e) => ({ ...e, corners: FULL_QUAD }))} className="flex flex-col items-center gap-1 py-2 rounded-xl border border-border text-xs hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <Scan size={18} /> Full page
                        </button>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                        Drag the corners onto the edges of the paper — angled photos are straightened automatically.
                    </p>
                    {!validCrop && <p className="text-xs text-danger mt-1" role="alert">The corners overlap. Move them back into a box shape.</p>}
                </div>

                <fieldset>
                    <legend className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-2">Scan Mode</legend>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-bg-light">
                        {MODES.map((m) => (
                            <label key={m.value} className={`text-center text-xs py-2 rounded-lg cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${edits.mode === m.value ? "bg-bg-card shadow-sm font-medium text-primary" : "text-text-secondary"}`}>
                                <input type="radio" name="scan-mode" value={m.value} checked={edits.mode === m.value} onChange={() => setEdits((e) => ({ ...e, mode: m.value }))} className="sr-only" />
                                {m.label}
                            </label>
                        ))}
                    </div>
                </fieldset>

                {(["brightness", "contrast"] as const).map((key) => (
                    <div key={key}>
                        <label htmlFor={`scan-${key}`} className="flex justify-between text-xs font-medium uppercase tracking-wide text-text-secondary mb-2">
                            <span>{key}</span>
                            <span className="tabular-nums normal-case">{edits[key] > 0 ? `+${edits[key]}` : edits[key]}</span>
                        </label>
                        <input
                            id={`scan-${key}`}
                            type="range"
                            min={-100}
                            max={100}
                            step={5}
                            value={edits[key]}
                            onChange={(ev) => setEdits((e) => ({ ...e, [key]: Number(ev.target.value) }))}
                            className="w-full accent-[var(--primary)]"
                        />
                    </div>
                ))}

                {error && <p className="text-sm text-danger" role="alert">{error}</p>}

                <div className="flex gap-3 mt-auto">
                    <button type="button" onClick={onCancel} disabled={applying} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-bg-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        Cancel
                    </button>
                    <button type="button" onClick={apply} disabled={applying || !validCrop || !previewUrl} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        {applying && <Loader2 className="animate-spin" size={16} />}
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
