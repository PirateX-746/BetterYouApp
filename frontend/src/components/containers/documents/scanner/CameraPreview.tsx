"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, SwitchCamera, Upload } from "lucide-react";

import {
    CAMERA_ERRORS,
    cameraPreflight,
    classifyCameraError,
    stopStream,
    videoConstraints,
    type CameraErrorKind,
} from "@/lib/scanner/camera";
import { canvasToJpeg, quickQuality, type QualityHint, type Quad } from "@/lib/scanner/image";
import { DETECT_EDGE, detectDocument, quadsClose, smoothQuad } from "@/lib/scanner/detect";
import type { DetectRequest, DetectResponse } from "@/lib/scanner/detect.worker";

type Props = {
    /** `corners`: the auto-detected page outline (normalized), when one was locked on. */
    onCapture: (blob: Blob, quality: QualityHint, corners: Quad | null) => void | Promise<void>;
    /** Fallback when the camera can't be used. */
    onUploadInstead: () => void;
    disabled?: boolean;
    captureLabel?: string;
};

type Status = "starting" | "live" | "error";

/** How long a granted stream may go without delivering a frame. */
const FIRST_FRAME_TIMEOUT_MS = 10_000;
/** Detection runs at most this often (ms) — plenty for a guide, light on battery. */
const DETECT_INTERVAL_MS = 120;
/** Consecutive agreeing detections before the outline turns green ("locked"). */
const LOCK_FRAMES = 3;
/** Consecutive misses before the outline is dropped (rides out a blurry frame). */
const LOSE_FRAMES = 4;

/**
 * Live camera preview + shutter. Owns the MediaStream: it is requested only
 * when this component mounts (i.e. the practitioner chose "Scan using
 * Camera") and every track is stopped on unmount, camera switch or error.
 *
 * The <video> is driven through a ref, so frames never trigger React renders.
 */
export default function CameraPreview({ onCapture, onUploadInstead, disabled, captureLabel = "Capture Page" }: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<Status>("starting");
    const [error, setError] = useState<CameraErrorKind | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
    const [capturing, setCapturing] = useState(false);
    const [attempt, setAttempt] = useState(0);
    // Live document outline (normalized corners) and whether it's held steady.
    const [outline, setOutline] = useState<Quad | null>(null);
    const [locked, setLocked] = useState(false);
    const lockedQuadRef = useRef<Quad | null>(null);

    useEffect(() => {
        let cancelled = false;
        let attachedVideo: HTMLVideoElement | null = null;

        const fail = (kind: CameraErrorKind) => {
            if (cancelled) return;
            stopStream(streamRef.current);
            streamRef.current = null;
            setError(kind);
            setStatus("error");
        };

        async function start() {
            setStatus("starting");
            setError(null);

            const pre = cameraPreflight({
                isSecureContext: window.isSecureContext,
                mediaDevices: navigator.mediaDevices,
            });
            if (pre) return fail(pre);

            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(videoConstraints(deviceId));
            } catch (err) {
                // The exact rear camera may be gone (unplugged / rotated tablet
                // config) — retry once with the generic preference.
                if (deviceId && classifyCameraError(err) === "not-found") {
                    setDeviceId(undefined);
                    return;
                }
                return fail(classifyCameraError(err));
            }

            if (cancelled) {
                stopStream(stream);
                return;
            }

            streamRef.current = stream;
            // Permission revoked mid-scan, or the device unplugged.
            stream.getVideoTracks().forEach((track) => {
                track.onended = () => fail("ended");
            });

            const video = videoRef.current;
            if (video) {
                attachedVideo = video;
                video.srcObject = stream;
                // play() never settles if the device grants access but sends no
                // frames (commonly: held by another app), so bound the wait.
                const gotFrame = await Promise.race([
                    video.play().then(
                        () => true,
                        // Autoplay is allowed for muted inline video; a rejection
                        // here is an abort from a fast unmount.
                        () => true,
                    ),
                    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), FIRST_FRAME_TIMEOUT_MS)),
                ]);
                if (cancelled) return;
                if (!gotFrame && video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                    return fail("in-use");
                }
            }
            if (cancelled) return;
            setStatus("live");

            // Labels and the full list are only available after permission.
            try {
                const all = await navigator.mediaDevices.enumerateDevices();
                if (!cancelled) setDevices(all.filter((d) => d.kind === "videoinput"));
            } catch {
                /* switching is optional */
            }
        }

        start();

        return () => {
            cancelled = true;
            stopStream(streamRef.current);
            streamRef.current = null;
            if (attachedVideo) attachedVideo.srcObject = null;
        };
    }, [deviceId, attempt]);

    /* Live document detection: a few times a second, grab a small frame and
       find the page outline. Detection runs in a Web Worker so even a slow phone
       never blocks the preview or the buttons; one frame is in flight at a time,
       so slower devices simply sample less often. Falls back to the main thread
       (paced by measured cost) if the worker can't start. */
    useEffect(() => {
        if (status !== "live") return;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let prev: Quad | null = null;
        let hits = 0;
        let misses = 0;
        let seq = 0;

        const apply = (found: Quad | null) => {
            if (cancelled) return;
            if (found) {
                misses = 0;
                hits = prev && quadsClose(prev, found, 0.04) ? hits + 1 : 1;
                prev = smoothQuad(prev, found);
                const isLocked = hits >= LOCK_FRAMES;
                lockedQuadRef.current = isLocked ? prev : null;
                setOutline(prev);
                setLocked(isLocked);
            } else if (++misses >= LOSE_FRAMES) {
                prev = null;
                hits = 0;
                lockedQuadRef.current = null;
                setOutline(null);
                setLocked(false);
            }
        };

        /** Current preview frame at analysis size, or null if not ready. */
        const grab = (): ImageData | null => {
            const video = videoRef.current;
            if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return null;
            const scale = DETECT_EDGE / Math.max(video.videoWidth, video.videoHeight);
            const w = Math.max(16, Math.round(video.videoWidth * scale));
            const h = Math.max(16, Math.round(video.videoHeight * scale));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            ctx.drawImage(video, 0, 0, w, h);
            return ctx.getImageData(0, 0, w, h);
        };

        let worker: Worker | null = null;
        try {
            worker = new Worker(new URL("../../../../lib/scanner/detect.worker.ts", import.meta.url), { type: "module" });
        } catch {
            worker = null;
        }

        const schedule = (delay: number) => {
            if (!cancelled) timer = setTimeout(step, delay);
        };

        // Main-thread fallback: wait at least 2.5× the last run's cost.
        const stepInline = () => {
            const frame = grab();
            if (!frame) return schedule(DETECT_INTERVAL_MS);
            const t0 = performance.now();
            apply(detectDocument(frame.data, frame.width, frame.height));
            schedule(Math.max(DETECT_INTERVAL_MS, (performance.now() - t0) * 2.5));
        };

        const step = () => {
            if (cancelled) return;
            if (!worker) return stepInline();
            const frame = grab();
            if (!frame) return schedule(DETECT_INTERVAL_MS);
            const id = ++seq;
            worker.postMessage(
                { id, buffer: frame.data.buffer, width: frame.width, height: frame.height } satisfies DetectRequest,
                [frame.data.buffer],
            );
        };

        if (worker) {
            worker.onmessage = (e: MessageEvent<DetectResponse>) => {
                if (e.data.id !== seq) return; // stale
                apply(e.data.quad);
                schedule(DETECT_INTERVAL_MS);
            };
            worker.onerror = () => {
                // Couldn't load or crashed: keep detecting on the main thread.
                worker?.terminate();
                worker = null;
                schedule(DETECT_INTERVAL_MS);
            };
        }
        schedule(0);

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            worker?.terminate();
            canvas.width = canvas.height = 0;
            lockedQuadRef.current = null;
            setOutline(null);
            setLocked(false);
        };
    }, [status]);

    const switchCamera = useCallback(() => {
        if (devices.length < 2) return;
        const activeId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
        const index = devices.findIndex((d) => d.deviceId === activeId);
        setDeviceId(devices[(index + 1) % devices.length].deviceId);
    }, [devices]);

    const capture = useCallback(async () => {
        const video = videoRef.current;
        if (!video || status !== "live" || capturing) return;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) return;

        setCapturing(true);
        try {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas unavailable");
            ctx.drawImage(video, 0, 0, width, height);
            const quality = quickQuality(canvas, width, height);
            // Read before the await: the outline may change while encoding.
            const corners = lockedQuadRef.current;
            const blob = await canvasToJpeg(canvas, 0.92);
            canvas.width = canvas.height = 0;
            await onCapture(blob, quality, corners);
        } finally {
            setCapturing(false);
        }
    }, [status, capturing, onCapture]);

    if (status === "error" && error) {
        const info = CAMERA_ERRORS[error];
        const retryable = error !== "insecure" && error !== "unsupported";
        return (
            <div role="alert" className="flex flex-col items-center justify-center text-center gap-4 h-full px-6 py-10">
                <div className="w-14 h-14 rounded-full bg-danger-light text-danger-strong flex items-center justify-center">
                    <Camera size={26} />
                </div>
                <div>
                    <h3 className="font-semibold text-text-primary">{info.title}</h3>
                    <p className="text-sm text-text-secondary mt-1 max-w-sm">{info.help}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    {retryable && (
                        <button
                            type="button"
                            onClick={() => setAttempt((n) => n + 1)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <RefreshCw size={16} /> Try Again
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onUploadInstead}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <Upload size={16} /> Upload from Device
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="relative flex-1 min-h-0 bg-black rounded-xl overflow-hidden">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-contain"
                    playsInline
                    muted
                    autoPlay
                    aria-label="Live camera preview"
                />
                {/* Framing guide — shown until a page is found */}
                {status === "live" && !outline && (
                    <div className="pointer-events-none absolute inset-[6%] border-2 border-dashed border-white/60 rounded-lg" aria-hidden />
                )}
                {/* Detected page outline. viewBox = video pixels + "meet" matches
                    the video's object-contain letterboxing exactly. */}
                {status === "live" && outline && videoRef.current?.videoWidth ? (
                    <DocumentOutline
                        quad={outline}
                        locked={locked}
                        width={videoRef.current.videoWidth}
                        height={videoRef.current.videoHeight}
                    />
                ) : null}
                {status === "live" && (
                    <p
                        role="status"
                        aria-live="polite"
                        className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap backdrop-blur-sm ${
                            locked ? "bg-green-600/90 text-white" : "bg-black/60 text-white"
                        }`}
                    >
                        {locked
                            ? "Document detected — hold steady and capture"
                            : outline
                              ? "Finding edges…"
                              : "Fit the page in the frame, ideally on a darker surface"}
                    </p>
                )}
                {status === "starting" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 text-sm">
                        <Loader2 className="animate-spin" size={24} />
                        Waiting for camera permission…
                    </div>
                )}
                {devices.length > 1 && status === "live" && (
                    <button
                        type="button"
                        onClick={switchCamera}
                        className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label="Switch camera"
                    >
                        <SwitchCamera size={20} />
                    </button>
                )}
            </div>

            <div className="flex items-center justify-center pt-4 pb-1">
                <button
                    type="button"
                    onClick={capture}
                    disabled={status !== "live" || capturing || disabled}
                    className="flex items-center gap-2 h-14 px-8 rounded-full bg-primary text-white text-base font-semibold shadow-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={captureLabel}
                >
                    {capturing ? <Loader2 className="animate-spin" size={22} /> : <Camera size={22} />}
                    {captureLabel}
                </button>
            </div>
        </div>
    );
}

/** Page outline over the live preview: green once locked, white while settling. */
function DocumentOutline({ quad, locked, width, height }: { quad: Quad; locked: boolean; width: number; height: number }) {
    const pts = quad.map((p) => ({ x: p.x * width, y: p.y * height }));
    const stroke = locked ? "#22c55e" : "rgba(255,255,255,0.85)";
    const sw = Math.max(2, width / 260);
    return (
        <svg
            className="pointer-events-none absolute inset-0 w-full h-full"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
        >
            <polygon
                points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={locked ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.06)"}
                stroke={stroke}
                strokeWidth={sw}
                strokeLinejoin="round"
                strokeDasharray={locked ? undefined : `${sw * 4} ${sw * 3}`}
            />
            {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={sw * 3.2} fill={locked ? "#22c55e" : "white"} stroke="rgba(0,0,0,0.35)" strokeWidth={sw / 2} />
            ))}
        </svg>
    );
}
