// types.ts
export type BlockedSlot = {
  id: string;
  start: string;
  end?: string;
  blockType: "day" | "slot";
  reason?: string;
};
