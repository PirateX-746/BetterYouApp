/**
 * Camera access helpers. Kept separate from the component so the error
 * classification is testable and the getUserMedia constraints live in one
 * place.
 */

export type CameraErrorKind =
  | "insecure"
  | "unsupported"
  | "denied"
  | "not-found"
  | "in-use"
  | "ended"
  | "unknown";

export const CAMERA_ERRORS: Record<CameraErrorKind, { title: string; help: string }> = {
  insecure: {
    title: "Camera requires a secure connection",
    help: "Open BetterYou over HTTPS (or localhost) to use the camera. You can still upload a photo from this device.",
  },
  unsupported: {
    title: "This browser can't access the camera",
    help: "Use a current version of Chrome, Safari, Edge or Firefox, or upload a photo from this device instead.",
  },
  denied: {
    title: "Camera permission was denied",
    help: "Allow camera access for this site in your browser's address bar or site settings, then try again.",
  },
  "not-found": {
    title: "No camera was found",
    help: "Connect a camera or switch to a device that has one. You can still upload a photo from this device.",
  },
  "in-use": {
    title: "The camera is busy",
    help: "Close other apps or browser tabs that may be using the camera (video calls, other scanners), then try again.",
  },
  ended: {
    title: "The camera stopped",
    help: "Camera access was revoked or the device was disconnected. Try starting the camera again.",
  },
  unknown: {
    title: "The camera couldn't be started",
    help: "Try again, or upload a photo from this device instead.",
  },
};

type Env = {
  isSecureContext?: boolean;
  mediaDevices?: { getUserMedia?: unknown } | undefined;
};

/** Checks the environment before asking for permission. */
export function cameraPreflight(env: Env): CameraErrorKind | null {
  if (env.isSecureContext === false) return "insecure";
  if (!env.mediaDevices || typeof env.mediaDevices.getUserMedia !== "function") {
    return "unsupported";
  }
  return null;
}

/** Maps a getUserMedia rejection to a user-facing category. */
export function classifyCameraError(err: unknown): CameraErrorKind {
  const name = (err as { name?: string } | null)?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "not-found";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "in-use";
    default:
      return "unknown";
  }
}

/** Video-only constraints. Prefers the rear camera unless a device is chosen. */
export function videoConstraints(deviceId?: string): MediaStreamConstraints {
  const size = { width: { ideal: 2560 }, height: { ideal: 1440 } };
  return {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, ...size }
      : { facingMode: { ideal: "environment" }, ...size },
  };
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}
