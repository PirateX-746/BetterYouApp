/** "45 min", "1 hr", "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Quick picks in the type editor; any 5–480 minute value is allowed. */
export const DURATION_PRESETS = [15, 30, 45, 50, 60, 90] as const;

/**
 * Swatches offered for a type's calendar accent. Mid-tone hues that stay
 * legible as a stripe on both the light and dark calendar backgrounds.
 */
export const TYPE_COLOR_PRESETS = [
  "#5b8def", // blue
  "#34a853", // green
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#14b8a6", // teal
  "#ef4444", // red
  "#64748b", // slate
] as const;

export const TYPE_NAME_MAX = 60;
export const TYPE_DURATION_MIN = 5;
export const TYPE_DURATION_MAX = 480;
