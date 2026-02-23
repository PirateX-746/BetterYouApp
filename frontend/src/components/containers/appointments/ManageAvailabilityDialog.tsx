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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/availability/${practitionerId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();
      setBlockedSlots(data);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerId,
          blockType,
          date,
          startTime: blockType === "slot" ? startTime : null,
          endTime: blockType === "slot" ? endTime : null,
          reason,
        }),
      });

      if (!res.ok) throw new Error();

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
      await fetch(`/api/availability/${id}`, {
        method: "DELETE",
      });

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Availability</DialogTitle>
        </DialogHeader>

        {/* Block Form */}
        <div className="space-y-4 bg-muted p-4 rounded-md">
          <Select
            value={blockType}
            onValueChange={(v) => setBlockType(v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Block type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slot">Specific Time Slot</SelectItem>
              <SelectItem value="day">Entire Day</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {blockType === "slot" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          )}

          <Input
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Button onClick={handleBlock} disabled={loading}>
            {loading ? "Blocking..." : "Block Slot"}
          </Button>
        </div>

        {/* Blocked List */}
        <div className="space-y-3 max-h-64 overflow-auto">
          {blockedSlots.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No blocked slots
            </p>
          )}

          {blockedSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex justify-between items-center bg-muted p-3 rounded-md"
            >
              <div>
                <p className="text-sm font-medium">
                  {slot.blockType === "day"
                    ? `Entire day – ${new Date(slot.start).toDateString()}`
                    : `${new Date(slot.start).toLocaleString()} → ${new Date(
                      slot.end!,
                    ).toLocaleTimeString()}`}
                </p>
                {slot.reason && (
                  <p className="text-xs text-muted-foreground">{slot.reason}</p>
                )}
              </div>

              <Button
                size="icon"
                variant="destructive"
                onClick={() => removeBlock(slot.id)}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
