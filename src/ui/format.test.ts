import { formatDistance, formatWithCommas, percentFromMultiplier, signedPercentFromMultiplier } from "./format";

describe("format", () => {
  test("formatWithCommas adds comma separators and respects decimals", () => {
    expect(formatWithCommas(1234)).toBe("1,234");
    expect(formatWithCommas(1234.5, 1)).toBe("1,234.5");
    expect(formatWithCommas(1000000, 2)).toBe("1,000,000.00");
  });

  test("formatDistance formats short distances in meters and long distances in kilometers", () => {
    const t = (key: string): string => ({ "unit.meter": "m", "unit.kilometer": "km" }[key] ?? key);
    expect(formatDistance(1234.4, t)).toBe("1,234 m");
    expect(formatDistance(12345, t)).toBe("12.3 km");
  });

  test("formatDistance switches to kilometers once rounded value reaches the threshold", () => {
    const t = (key: string): string => ({ "unit.meter": "m", "unit.kilometer": "km" }[key] ?? key);
    expect(formatDistance(9999.4, t)).toBe("9,999 m");
    expect(formatDistance(9999.6, t)).toBe("10.0 km");
  });

  test("percentFromMultiplier rounds (1 - m) * 100", () => {
    expect(percentFromMultiplier(1)).toBe(0);
    expect(percentFromMultiplier(0.5)).toBe(50);
    expect(percentFromMultiplier(0.753)).toBe(25);
    expect(percentFromMultiplier(0)).toBe(100);
  });

  test("signedPercentFromMultiplier rounds (m - 1) * 100", () => {
    expect(signedPercentFromMultiplier(1)).toBe(0);
    expect(signedPercentFromMultiplier(1.5)).toBe(50);
    expect(signedPercentFromMultiplier(0.753)).toBe(-25);
    expect(signedPercentFromMultiplier(0)).toBe(-100);
  });
});
