// types.ts
export type BlockedSlot = {
  _id: string; // Mongo ID
  practitionerId: string;
  blockType: "day" | "slot";
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  reason?: string;
};
