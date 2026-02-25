"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { Helpers } from "@/utils/helpers";
import { BlockedSlot } from "./types";

type Props = {
  open: boolean;
  practitionerId: string;
  onClose: () => void;
  onRefresh: () => void;
};

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

  /* ===============================
     FETCH BLOCKED SLOTS
     =============================== */

  const fetchBlockedSlots = async () => {
    try {
      const res = await api.get(`/availability/${practitionerId}`);
      setBlockedSlots(res.data);
    } catch {
      Helpers.showNotification("Failed to load blocked slots", "error");
    }
  };

  useEffect(() => {
    if (open) fetchBlockedSlots();
  }, [open]);

  /* ===============================
     BLOCK SLOT
     =============================== */

  const handleBlock = async () => {
    if (!date) {
      Helpers.showNotification("Please select a date", "error");
      return;
    }

    if (blockType === "slot" && (!startTime || !endTime)) {
      Helpers.showNotification("Select start & end time", "error");
      return;
    }

    setLoading(true);

    try {
      await api.post(`/availability`, {
        practitionerId,
        blockType,
        date,
        startTime: blockType === "slot" ? startTime : null,
        endTime: blockType === "slot" ? endTime : null,
        reason,
      });

      Helpers.showNotification("Slot blocked successfully", "success");
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

  /* ===============================
     REMOVE BLOCK
     =============================== */

  const removeBlock = async (id: string) => {
    if (!confirm("Remove this blocked slot?")) return;

    try {
      await api.delete(`/availability/${id}`);

      Helpers.showNotification("Blocked slot removed", "success");
      await fetchBlockedSlots();
      onRefresh();
    } catch {
      Helpers.showNotification("Failed to remove slot", "error");
    }
  };

  /* ===============================
     UI
     =============================== */

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-bg-page border-border shadow-lg sm:rounded-xl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-text-primary">Manage Availability</DialogTitle>
        </DialogHeader>

        {/* Block Form */}
        <div className="space-y-4 bg-bg-card p-5 rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-medium text-text-primary mb-2">Add New Block</h3>
          <Select
            value={blockType}
            onValueChange={(v) => setBlockType(v as any)}
          >
            <SelectTrigger className="w-full px-4 py-3 rounded-xl bg-bg-light border border-border focus:border-primary focus:ring-2 focus:ring-primary-light outline-none transition-all duration-300 text-text-primary h-auto">
              <SelectValue placeholder="Block type" />
            </SelectTrigger>
            <SelectContent className="bg-bg-card border-border shadow-md rounded-xl">
              <SelectItem value="slot" className="focus:bg-bg-hover cursor-pointer py-2">Specific Time Slot</SelectItem>
              <SelectItem value="day" className="focus:bg-bg-hover cursor-pointer py-2">Entire Day</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="input-style h-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {blockType === "slot" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="time"
                className="input-style h-auto"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                type="time"
                className="input-style h-auto"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          )}

          <Input
            placeholder="Reason (optional)"
            className="input-style h-auto"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Button onClick={handleBlock} disabled={loading} className="btn-primary w-full py-3 h-auto">
            {loading ? "Blocking..." : "Block Time"}
          </Button>
        </div>

        {/* Blocked List */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-text-primary mb-3 px-1">Active Blocks</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {blockedSlots.length === 0 && (
              <div className="text-center p-8 bg-bg-light rounded-xl border border-dashed border-border/50">
                <p className="text-sm text-text-secondary">
                  No blocked slots found.
                </p>
              </div>
            )}

            {blockedSlots.map((slot) => (
              <div
                key={slot._id}
                className="flex justify-between items-center bg-bg-light p-4 rounded-xl border border-border hover:border-primary-light transition-colors group"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    {slot.blockType === "day"
                      ? `Entire day – ${slot.date}`
                      : `${slot.date} | ${slot.startTime} → ${slot.endTime}`}
                    <span className="badge badge-warning opacity-80 h-auto py-0.5 text-[10px] uppercase shadow-none border-0">Blocked</span>
                  </p>
                  {slot.reason && (
                    <p className="text-xs text-text-secondary">{slot.reason}</p>
                  )}
                </div>

                <Button
                  size="icon"
                  className="h-8 w-8 min-h-0 bg-transparent text-text-secondary hover:text-danger hover:bg-rose-50 rounded-full transition-colors opacity-70 group-hover:opacity-100 shadow-none border-0"
                  onClick={() => removeBlock(slot._id)}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
