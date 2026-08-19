import { hullTierOf } from "./tiers";

const FITTED_MASS_FACTORS = { small: 1.03, medium: 1.05, large: 1.03, capital: 1.02 } as const;
const UNFITTED_MASS_FACTOR = 1;

export function fittedMassFactor(hullType: string): number {
  const tier = hullTierOf(hullType);
  return tier ? FITTED_MASS_FACTORS[tier] : UNFITTED_MASS_FACTOR;
}
