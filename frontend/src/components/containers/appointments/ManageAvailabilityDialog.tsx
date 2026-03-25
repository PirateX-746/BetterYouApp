"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Loader2, CalendarOff } from "lucide-react";
import { api } from "@/lib/api";
import { Helpers } from "@/utils/helpers";
import { BlockedSlot } from "./types";

type Props = {
  open: boolean;
  practitionerId: string;
  onClose: () => void;
  onRefresh: () => void;
};

const fieldCls =
  "w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition";

export default function ManageAvailabilityDialog({
  open,
  practitionerId,
  onClose,
  onRefresh,
}: Props) {
  const [blockType, setBlockType] = useState<"day" | "slot">("slot");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchBlockedSlots = async () => {
    try {
      const res = await api.get(`/availability/${practitionerId}`);
      setBlockedSlots(Array.isArray(res.data) ? res.data : []);
    } catch {
      Helpers.showNotification("Failed to load blocked slots", "error");
    }
  };

  useEffect(() => {
    if (open) fetchBlockedSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleBlock = async () => {
    if (!date) {
      Helpers.showNotification("Please select a date", "error");
      return;
    }
    if (blockType === "slot" && (!startTime || !endTime)) {
      Helpers.showNotification("Select start and end time", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/availability", {
        practitionerId,
        blockType,
        date,
        startTime: blockType === "slot" ? startTime : null,
        endTime: blockType === "slot" ? endTime : null,
        reason: reason || undefined,
      });
      Helpers.showNotification("Slot blocked", "success");
      setDate("");
      setStartTime("");
      setEndTime("");
      setReason("");
      await fetchBlockedSlots();
      onRefresh();
    } catch {
      Helpers.showNotification("Failed to block slot", "error");
    } finally {
      setLoading(false);
    }
  };

  const removeBlock = async (id: string) => {
    setRemoving(id);
    try {
      await api.delete(`/availability/${id}`);
      Helpers.showNotification("Block removed", "success");
      await fetchBlockedSlots();
      onRefresh();
    } catch {
      Helpers.showNotification("Failed to remove block", "error");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92dvh] flex flex-col">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Manage Availability
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Block times you're unavailable
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-secondary transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Add block form */}
          <div className="bg-bg-hover border border-border rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Add Block
            </h3>

            {/* Block type */}
            <select
              className={fieldCls}
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as "day" | "slot")}
            >
              <option value="slot">Specific Time Slot</option>
              <option value="day">Entire Day</option>
            </select>

            {/* Date */}
            <input
              type="date"
              className={fieldCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            {/* Start / End time — only for slot */}
            {blockType === "slot" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">
                    Start time
                  </label>
                  <input
                    type="time"
                    className={fieldCls}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">
                    End time
                  </label>
                  <input
                    type="time"
                    className={fieldCls}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <input
              type="text"
              className={fieldCls}
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <button
              onClick={handleBlock}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Blocking…" : "Block Time"}
            </button>
          </div>

          {/* Active blocks list */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Active Blocks
            </h3>

            {blockedSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-text-disabled">
                <CalendarOff size={28} />
                <p className="text-sm">No blocked slots</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedSlots.map((slot) => (
                  <div
                    key={slot._id}
                    className="flex items-center justify-between gap-3 bg-bg-page border border-border rounded-xl px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {slot.blockType === "day"
                          ? `All day — ${slot.date}`
                          : `${slot.date} · ${slot.startTime} – ${slot.endTime}`}
                      </p>
                      {slot.reason && (
                        <p className="text-xs text-text-secondary mt-0.5 truncate">
                          {slot.reason}
                        </p>
                      )}
                    </div>

                    <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger font-medium shrink-0">
                      Blocked
                    </span>

                    <button
                      onClick={() => removeBlock(slot._id)}
                      disabled={removing === slot._id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-text-disabled hover:text-danger hover:bg-danger/10 transition shrink-0 disabled:opacity-40"
                      aria-label="Remove block"
                    >
                      {removing === slot._id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
