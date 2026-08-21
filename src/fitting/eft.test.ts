import { parseEft } from "./eft";

describe("parseEft", () => {
  test("returns undefined when there is no header", () => {
    expect(parseEft("\n\nSome Module\n")).toBeUndefined();
    expect(parseEft("")).toBeUndefined();
    expect(parseEft("   \n  \n")).toBeUndefined();
  });

  test("parses a header into hull and fitting names", () => {
    const parsed = parseEft("[Rifter, Test Fit]");
    expect(parsed).toBeDefined();
    expect(parsed!.hullName).toBe("Rifter");
    expect(parsed!.fittingName).toBe("Test Fit");
  });

  test("trims whitespace around the header and fitting name", () => {
    const parsed = parseEft("[  Rifter  ,  My Test Fit  ]");
    expect(parsed!.hullName).toBe("Rifter");
    expect(parsed!.fittingName).toBe("My Test Fit");
  });

  test("ignores leading blank lines before the header", () => {
    const parsed = parseEft("\n\n\n[Rifter, Fit]");
    expect(parsed).toBeDefined();
    expect(parsed!.hullName).toBe("Rifter");
  });

  test("parses module names without charges or offline flags", () => {
    const text = `[Rifter, Simple]
1MN Afterburner I
200mm AutoCannon I`;
    const parsed = parseEft(text);
    expect(parsed!.modules).toEqual([
      { name: "1MN Afterburner I", offline: false },
      { name: "200mm AutoCannon I", offline: false },
    ]);
  });

  test("parses module names with an optional charge", () => {
    const text = `[Rifter, Ammo]
200mm AutoCannon I, EMP S`;
    const parsed = parseEft(text);
    expect(parsed!.modules).toEqual([{ name: "200mm AutoCannon I", charge: "EMP S", offline: false }]);
  });

  test("parses offline modules with and without charges", () => {
    const text = `[Rifter, Offline]
Damage Control II /OFFLINE
200mm AutoCannon I, EMP S /offline`;
    const parsed = parseEft(text);
    expect(parsed!.modules).toEqual([
      { name: "Damage Control II", offline: true },
      { name: "200mm AutoCannon I", charge: "EMP S", offline: true },
    ]);
  });

  test("skips empty slot stubs", () => {
    const text = `[Rifter, Stubs]
[empty low slot]
1MN Afterburner I
[empty high slot]
200mm AutoCannon I`;
    const parsed = parseEft(text);
    expect(parsed!.modules).toEqual([
      { name: "1MN Afterburner I", offline: false },
      { name: "200mm AutoCannon I", offline: false },
    ]);
  });

  test("parses quantity lines as cargo", () => {
    const text = `[Rifter, Cargo]
EMP S x1000
Nanite Repair Paste x50`;
    const parsed = parseEft(text);
    expect(parsed!.cargo).toEqual([
      { name: "EMP S", quantity: 1000 },
      { name: "Nanite Repair Paste", quantity: 50 },
    ]);
    expect(parsed!.modules).toEqual([]);
  });

  test("tolerates blank lines between sections", () => {
    const text = `[Rifter, Sections]

1MN Afterburner I

EMP S x1000

[empty low slot]`;
    const parsed = parseEft(text);
    expect(parsed!.modules).toEqual([{ name: "1MN Afterburner I", offline: false }]);
    expect(parsed!.cargo).toEqual([{ name: "EMP S", quantity: 1000 }]);
  });

  test("parses a second quantity block as drones", () => {
    const text = `[Rifter, Drones]
1MN Afterburner I

EMP S x1000

Hobgoblin I x3`;
    const parsed = parseEft(text);
    expect(parsed!.modules).toEqual([{ name: "1MN Afterburner I", offline: false }]);
    expect(parsed!.cargo).toEqual([{ name: "EMP S", quantity: 1000 }]);
    expect(parsed!.drones).toEqual([{ name: "Hobgoblin I", quantity: 3 }]);
  });

  test("drops lines that match nothing", () => {
    const text = `[Rifter, Garbage]
1MN Afterburner I
weird [line]
200mm AutoCannon I`;
    const parsed = parseEft(text);
    expect(parsed!.modules).toEqual([
      { name: "1MN Afterburner I", offline: false },
      { name: "200mm AutoCannon I", offline: false },
    ]);
  });
});
