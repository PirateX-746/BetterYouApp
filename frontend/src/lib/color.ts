function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toHexByte(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [tr, tg, tb] = target;
  return `#${toHexByte(r + (tr - r) * amount)}${toHexByte(g + (tg - g) * amount)}${toHexByte(b + (tb - b) * amount)}`;
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, [255, 255, 255], amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, [0, 0, 0], amount);
}

export function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}
