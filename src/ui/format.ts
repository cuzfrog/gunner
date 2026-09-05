export function formatWithCommas(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDistance(m: number, t: (key: string) => string): string {
  const roundedM = Math.round(m);
  if (roundedM >= 10000) return `${formatWithCommas(m / 1000, 1)} ${t("unit.kilometer")}`;
  return `${formatWithCommas(roundedM)} ${t("unit.meter")}`;
}

export function percentFromMultiplier(multiplier: number): number {
  return Math.round((1 - multiplier) * 100);
}

export function signedPercentFromMultiplier(multiplier: number): number {
  return Math.round((multiplier - 1) * 100);
}
