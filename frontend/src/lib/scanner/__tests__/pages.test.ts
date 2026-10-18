import { describe, expect, it } from "vitest";
import { DEFAULT_EDITS } from "../image";
import { MAX_PAGES, initialPages, pagesReducer, type PagesState, type ScanPage } from "../pages";

const page = (id: string): ScanPage => ({
    id,
    original: new Blob(),
    edits: DEFAULT_EDITS,
    quality: null,
    processed: { blob: new Blob(), url: `blob:${id}`, width: 1, height: 1 },
});

const withPages = (...ids: string[]) =>
    ids.reduce<PagesState>((s, id) => pagesReducer(s, { type: "add", page: page(id) }), initialPages);

const ids = (s: PagesState) => s.pages.map((p) => p.id);

describe("pagesReducer", () => {
    it("adds pages and selects the newest", () => {
        const s = withPages("a", "b");
        expect(ids(s)).toEqual(["a", "b"]);
        expect(s.current).toBe(1);
    });

    it("enforces the page limit", () => {
        const full = withPages(...Array.from({ length: MAX_PAGES }, (_, i) => `p${i}`));
        expect(pagesReducer(full, { type: "add", page: page("extra") })).toBe(full);
    });

    it("retake replaces in place", () => {
        const s = pagesReducer(withPages("a", "b", "c"), { type: "replace", id: "b", page: { ...page("b"), quality: "blurry" } });
        expect(ids(s)).toEqual(["a", "b", "c"]);
        expect(s.pages[1].quality).toBe("blurry");
        expect(s.current).toBe(1);
    });

    it("removes pages and keeps the pointer valid", () => {
        let s = pagesReducer(withPages("a", "b", "c"), { type: "select", index: 2 });
        s = pagesReducer(s, { type: "remove", id: "c" });
        expect(ids(s)).toEqual(["a", "b"]);
        expect(s.current).toBe(1);
        s = pagesReducer(s, { type: "remove", id: "a" });
        expect(s.current).toBe(0);
        s = pagesReducer(s, { type: "remove", id: "b" });
        expect(s.pages).toHaveLength(0);
        expect(s.current).toBe(0);
    });

    it("reorders and follows the moved page", () => {
        let s = pagesReducer(withPages("a", "b", "c"), { type: "move", id: "a", delta: 1 });
        expect(ids(s)).toEqual(["b", "a", "c"]);
        expect(s.current).toBe(1);
        s = pagesReducer(s, { type: "move", id: "b", delta: -1 });
        expect(ids(s)).toEqual(["b", "a", "c"]); // already first: no-op
    });

    it("clamps navigation", () => {
        const s = withPages("a", "b");
        expect(pagesReducer(s, { type: "select", index: 9 }).current).toBe(1);
        expect(pagesReducer(s, { type: "select", index: -3 }).current).toBe(0);
    });
});
