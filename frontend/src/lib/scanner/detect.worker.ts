/// <reference lib="webworker" />
/**
 * Runs document detection off the main thread, so the camera preview and the
 * scanner's buttons stay responsive however slow the device is. CameraPreview
 * posts one small frame at a time (its pixel buffer transferred, not copied)
 * and waits for the answer before sending the next.
 */
import { detectDocument } from "./detect";
import type { Quad } from "./image";

export type DetectRequest = { id: number; buffer: ArrayBuffer; width: number; height: number };
export type DetectResponse = { id: number; quad: Quad | null; ms: number };

self.onmessage = (e: MessageEvent<DetectRequest>) => {
  const { id, buffer, width, height } = e.data;
  const t0 = performance.now();
  let quad: Quad | null = null;
  try {
    quad = detectDocument(new Uint8ClampedArray(buffer), width, height);
  } catch {
    quad = null; // a bad frame just means "nothing found this time"
  }
  const res: DetectResponse = { id, quad, ms: performance.now() - t0 };
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(res);
};
