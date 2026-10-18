import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("@/lib/api", () => ({ api: { post: (...args: unknown[]) => post(...args), get: vi.fn() } }));

import {
    MAX_UPLOAD_BYTES,
    defaultTitle,
    todayIso,
    uploadCustomDocument,
    uploadErrorMessage,
    validateFile,
    validateMeta,
    type DocumentMeta,
} from "../document";

const now = new Date(2026, 9, 12, 23, 30);
const meta = (patch: Partial<DocumentMeta> = {}): DocumentMeta => ({
    title: "Lab Results",
    category: "lab-result",
    description: "",
    date: "2026-10-12",
    ...patch,
});

describe("metadata", () => {
    it("default name carries the date but no patient details", () => {
        expect(defaultTitle(now)).toBe("Patient_Document_2026-10-12");
        expect(todayIso(now)).toBe("2026-10-12"); // local date, not UTC
    });

    it("requires a name, category and a non-future date", () => {
        expect(validateMeta(meta(), now)).toEqual({});
        expect(validateMeta(meta({ title: "   " }), now).title).toBeDefined();
        expect(validateMeta(meta({ category: "" }), now).category).toBeDefined();
        expect(validateMeta(meta({ date: "2026-10-13" }), now).date).toMatch(/future/);
        expect(validateMeta(meta({ date: "garbage" }), now).date).toBeDefined();
        expect(validateMeta(meta({ title: "x".repeat(121) }), now).title).toBeDefined();
    });
});

describe("validateFile", () => {
    it("checks page count and size", () => {
        expect(validateFile(1000, 1)).toBeNull();
        expect(validateFile(1000, 0)).toMatch(/at least one/);
        expect(validateFile(1000, 31)).toMatch(/at most/);
        expect(validateFile(0, 1)).toMatch(/empty/);
        expect(validateFile(MAX_UPLOAD_BYTES + 1, 1)).toMatch(/limit/);
    });
});

describe("uploadErrorMessage", () => {
    it.each([
        [{ response: { status: 403 } }, /permission/],
        [{ response: { status: 404 } }, /could not be found/],
        [{ response: { status: 413 } }, /too large/],
        [{ response: { status: 415, data: { message: "Only valid PDF files are accepted" } } }, /valid PDF/],
        [{ response: { status: 500 } }, /retry/],
        [{ code: "ECONNABORTED" }, /timed out/],
        [{ isAxiosError: true, code: "ERR_NETWORK", message: "Network Error" }, /Network error/],
        [new TypeError("x is not a function"), /couldn't be prepared/],
    ])("maps %j", (err, re) => {
        expect(uploadErrorMessage(err)).toMatch(re);
    });
});

describe("uploadCustomDocument", () => {
    beforeEach(() => post.mockReset());

    it("posts multipart data to the patient upload route", async () => {
        post.mockResolvedValue({ data: { _id: "d1" } });
        const pdf = new Blob(["%PDF-"], { type: "application/pdf" });

        const res = await uploadCustomDocument({
            patientId: "p1",
            pdf,
            pageCount: 2,
            meta: meta({ description: "  notes " }),
            source: "camera_scan",
            uploadKey: "key-0123456789abcdef",
        });

        expect(res).toEqual({ _id: "d1" });
        const [url, form, config] = post.mock.calls[0];
        expect(url).toBe("/documents/patient/p1/upload");
        expect(config.headers["Content-Type"]).toBe("multipart/form-data");
        const fd = form as FormData;
        expect(fd.get("title")).toBe("Lab Results");
        expect(fd.get("description")).toBe("notes");
        expect(fd.get("pageCount")).toBe("2");
        expect(fd.get("source")).toBe("camera_scan");
        expect(fd.get("uploadKey")).toBe("key-0123456789abcdef");
        // Generic filename — never the patient's name.
        expect((fd.get("file") as File).name).toBe("document.pdf");
        // No client-chosen identity fields.
        expect(fd.has("doctor")).toBe(false);
        expect(fd.has("practiceId")).toBe(false);
    });
});
