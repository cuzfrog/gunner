const NUMBER_FORMATS = new Map<number, Intl.NumberFormat>();

export function formatWithCommas(value: number, decimals = 0): string {
  let format = NUMBER_FORMATS.get(decimals);
  if (!format) {
    format = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    NUMBER_FORMATS.set(decimals, format);
  }
  return format.format(value);
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
