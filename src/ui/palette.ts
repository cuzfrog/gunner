export const PALETTE = {
  bgDeep: "#05080c",
  bgPanel: "#101418",
  bgInset: "#0a0f14",
  borderDim: "rgba(92, 203, 203, 0.25)",
  accentTeal: "#5ccbcb",
  accentBlue: "#30b2e6",
  accentOrange: "#f67c0f",
  dangerRed: "#d81f27",
  optimalGreen: "#9cc954",
  warnYellow: "#fce447",
  overlayWeb: "#4a9fe2",
  overlayGrappler: "#2b6cb5",
  overlayScrambler: "#8bb8e8",
  overlayDisruptor: "#1e3f7a",
  textPrimary: "#e8eef0",
  textSecondary: "#9fb3b8",
  textDim: "#5d7078",
} as const;

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}
