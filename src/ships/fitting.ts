import type { HullTier, PropulsionModule, ShipProfile } from "./types";
import { PROPULSION_MODULES } from "./propulsion";
import { hullTierOf } from "./tiers";

export function fittingOptions(profile: ShipProfile): readonly PropulsionModule[] {
  const shipTier = hullTierOf(profile.hullType);
  if (!shipTier) return [];

  const options: PropulsionModule[] = [];
  for (const module of PROPULSION_MODULES) {
    if (module.sizeTier === shipTier) {
      options.push(module);
    } else if (module.kind === "afterburner" && isOverfitTier(module.sizeTier, shipTier)) {
      options.push(module);
    }
  }
  return options;
}

function isOverfitTier(moduleTier: HullTier, shipTier: HullTier): boolean {
  return (
    (shipTier === "small" && moduleTier === "medium") ||
    (shipTier === "medium" && moduleTier === "large")
  );
}
