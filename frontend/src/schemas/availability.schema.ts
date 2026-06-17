import { z } from "zod";

export const blockSlotSchema = z
  .object({
    blockType: z.enum(["slot", "day"]),
    date:      z.string().min(1, "Date is required"),
    startTime: z.string().optional(),
    endTime:   z.string().optional(),
    reason:    z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.blockType === "slot") {
      if (!d.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Start time is required" });
      if (!d.endTime)   ctx.addIssue({ code: "custom", path: ["endTime"],   message: "End time is required"   });
      if (d.startTime && d.endTime && d.startTime >= d.endTime) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after start time" });
      }
    }
  });
export type BlockSlotValues = z.infer<typeof blockSlotSchema>;
