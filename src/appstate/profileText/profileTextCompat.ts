const SHIP_A_LEGACY = "attacker";
const SHIP_B_LEGACY = "target";
const SHIP_A = "shipA";
const SHIP_B = "shipB";

export function normalizeProfileTextDotKey(dotKey: string): string {
  if (dotKey.startsWith(`override.${SHIP_A_LEGACY}.`)) return `override.${SHIP_A}.${dotKey.slice(`override.${SHIP_A_LEGACY}.`.length)}`;
  if (dotKey.startsWith(`override.${SHIP_B_LEGACY}.`)) return `override.${SHIP_B}.${dotKey.slice(`override.${SHIP_B_LEGACY}.`.length)}`;
  if (dotKey === SHIP_A_LEGACY) return SHIP_A;
  if (dotKey === SHIP_B_LEGACY) return SHIP_B;
  if (dotKey.startsWith(`${SHIP_A_LEGACY}.`)) return `${SHIP_A}.${dotKey.slice(`${SHIP_A_LEGACY}.`.length)}`;
  if (dotKey.startsWith(`${SHIP_B_LEGACY}.`)) return `${SHIP_B}.${dotKey.slice(`${SHIP_B_LEGACY}.`.length)}`;
  return dotKey;
}
