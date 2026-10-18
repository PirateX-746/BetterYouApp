import { describe, expect, it, vi } from "vitest";
import { cameraPreflight, classifyCameraError, stopStream, videoConstraints } from "../camera";

describe("camera helpers", () => {
    it("blocks insecure contexts and missing APIs before prompting", () => {
        expect(cameraPreflight({ isSecureContext: false, mediaDevices: { getUserMedia: () => 0 } })).toBe("insecure");
        expect(cameraPreflight({ isSecureContext: true, mediaDevices: undefined })).toBe("unsupported");
        expect(cameraPreflight({ isSecureContext: true, mediaDevices: {} })).toBe("unsupported");
        expect(cameraPreflight({ isSecureContext: true, mediaDevices: { getUserMedia: () => 0 } })).toBeNull();
    });

    it.each([
        ["NotAllowedError", "denied"],
        ["SecurityError", "denied"],
        ["NotFoundError", "not-found"],
        ["OverconstrainedError", "not-found"],
        ["NotReadableError", "in-use"],
        ["TypeError", "unknown"],
    ])("classifies %s as %s", (name, kind) => {
        expect(classifyCameraError({ name })).toBe(kind);
    });

    it("requests video only, preferring the rear camera", () => {
        const c = videoConstraints();
        expect(c.audio).toBe(false);
        expect((c.video as MediaTrackConstraints).facingMode).toEqual({ ideal: "environment" });
        expect((videoConstraints("cam-2").video as MediaTrackConstraints).deviceId).toEqual({ exact: "cam-2" });
    });

    it("stops every track", () => {
        const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
        stopStream({ getTracks: () => tracks } as unknown as MediaStream);
        tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
        expect(() => stopStream(null)).not.toThrow();
    });
});
