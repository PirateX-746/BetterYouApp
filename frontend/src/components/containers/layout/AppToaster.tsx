"use client";

import { X } from "lucide-react";
import toast, { Toaster, ToastBar } from "react-hot-toast";

/**
 * Wraps react-hot-toast's default renderer to add a manual dismiss (X)
 * button to every toast in the app — every existing `toast.success(...)` /
 * `toast.error(...)` call site keeps working unchanged.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "12px",
          fontSize: "14px",
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex items-center gap-2">
              {icon}
              {message}
              {t.type !== "loading" && (
                <button
                  onClick={() => toast.dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 p-0.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
