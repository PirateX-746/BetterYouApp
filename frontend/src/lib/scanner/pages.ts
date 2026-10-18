/**
 * Multi-page scan state. Pure reducer so ordering, limits and the
 * "current page" pointer can be unit-tested without React.
 */
import { DEFAULT_EDITS, type PageEdits, type QualityHint } from "./image";

export const MAX_PAGES = 30;

export type ScanPage = {
  id: string;
  /** Untouched capture. Never overwritten — edits re-render from this. */
  original: Blob;
  edits: PageEdits;
  /** Rendered result used for previews and the PDF. */
  processed: { blob: Blob; url: string; width: number; height: number };
  quality: QualityHint;
};

export type PagesState = { pages: ScanPage[]; current: number };

export type PagesAction =
  | { type: "add"; page: ScanPage }
  | { type: "replace"; id: string; page: ScanPage }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; delta: -1 | 1 }
  | { type: "select"; index: number }
  | { type: "reset" };

export const initialPages: PagesState = { pages: [], current: 0 };

const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max));

export function pagesReducer(state: PagesState, action: PagesAction): PagesState {
  switch (action.type) {
    case "add": {
      if (state.pages.length >= MAX_PAGES) return state;
      const pages = [...state.pages, action.page];
      return { pages, current: pages.length - 1 };
    }
    case "replace": {
      const index = state.pages.findIndex((p) => p.id === action.id);
      if (index === -1) return state;
      const pages = state.pages.slice();
      pages[index] = action.page;
      return { pages, current: index };
    }
    case "remove": {
      const index = state.pages.findIndex((p) => p.id === action.id);
      if (index === -1) return state;
      const pages = state.pages.filter((p) => p.id !== action.id);
      const current = state.current > index ? state.current - 1 : state.current;
      return { pages, current: clamp(current, pages.length - 1) };
    }
    case "move": {
      const index = state.pages.findIndex((p) => p.id === action.id);
      const target = index + action.delta;
      if (index === -1 || target < 0 || target >= state.pages.length) return state;
      const pages = state.pages.slice();
      [pages[index], pages[target]] = [pages[target], pages[index]];
      return { pages, current: target };
    }
    case "select":
      return { ...state, current: clamp(action.index, state.pages.length - 1) };
    case "reset":
      return initialPages;
  }
}

/** Object URLs a page owns — revoke when it leaves the state. */
export function pageUrls(page: ScanPage): string[] {
  return [page.processed.url];
}

export function newPageId(): string {
  return randomId();
}

/** UUID where available (secure contexts), random hex otherwise. */
export function randomId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export { DEFAULT_EDITS };
