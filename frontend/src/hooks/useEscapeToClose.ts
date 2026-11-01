import { useEffect, useRef } from "react";

/** Open modals, innermost last: Escape closes only the top one. */
const stack: symbol[] = [];

/** Closes a custom modal on Escape, matching the built-in Dialog primitive's behavior. */
export function useEscapeToClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    stack.push(id);
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || stack[stack.length - 1] !== id) return;
      onCloseRef.current();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      const i = stack.indexOf(id);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [open]);
}
