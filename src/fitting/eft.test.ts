import { moduleLines, parseEft, type EftDocument } from "./eft";

function bankLines(document: EftDocument, bank: string) {
  const found = document.banks.find((b) => b.bank === bank);
  return found ? found.lines : [];
}

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

  test("glues the header to the first body block when the blank after it is missing", () => {
    const text = `[Rifter, Glued]
1MN Afterburner I
200mm AutoCannon I`;
    const parsed = parseEft(text);
    expect(moduleLines(parsed!)).toEqual([
      { name: "1MN Afterburner I", offline: false },
      { name: "200mm AutoCannon I", offline: false },
    ]);
  });

  test("parses module names with optional charges and offline flags", () => {
    const text = `[Rifter, Offline]
Damage Control II /OFFLINE
200mm AutoCannon I, EMP S /offline
Nanofiber Internal Structure II /Offline`;
    const parsed = parseEft(text);
    expect(moduleLines(parsed!)).toEqual([
      { name: "Damage Control II", offline: true },
      { name: "200mm AutoCannon I", charge: "EMP S", offline: true },
      { name: "Nanofiber Internal Structure II", offline: true },
    ]);
  });

  test("preserves empty slot labels by bank", () => {
    const text = `[Rifter, Stubs]

[empty low slot]
400mm Steel Plates II

[empty high slot]
200mm AutoCannon I`;
    const parsed = parseEft(text);
    expect(parsed!.banks.length).toBe(2);
    expect(bankLines(parsed!, "low")).toEqual([
      { kind: "empty", label: "[empty low slot]" },
      { kind: "module", name: "400mm Steel Plates II", offline: false },
    ]);
    expect(bankLines(parsed!, "high")).toEqual([
      { kind: "empty", label: "[empty high slot]" },
      { kind: "module", name: "200mm AutoCannon I", offline: false },
    ]);
  });

  test("re-banks a unanimous block past a zero-slot bank", () => {
    // Hull without low slots (e.g. Monitor): the mid block maps to "low" by contiguous run, but every
    // module is a known mid and the burst block is a known high, so blocks shift to their catalog banks.
    const text = `[Monitor, Burst]

50MN Microwarpdrive I
Multispectrum Shield Hardener I

Shield Command Burst II`;
    const parsed = parseEft(text);
    expect(parsed!.banks.map((b) => b.bank)).toEqual(["mid", "high"]);
    expect(bankLines(parsed!, "mid").map((l) => (l.kind === "module" ? l.name : ""))).toEqual([
      "50MN Microwarpdrive I",
      "Multispectrum Shield Hardener I",
    ]);
    expect(bankLines(parsed!, "high").map((l) => (l.kind === "module" ? l.name : ""))).toEqual(["Shield Command Burst II"]);
  });

  test("keeps a mixed block in its positional bank instead of re-banking it", () => {
    const text = `[Rifter, Mixed]

Damage Control II
400mm Steel Plates II
Small Ancillary Armor Repairer

1MN Afterburner I`;
    const parsed = parseEft(text);
    expect(parsed!.banks.map((b) => b.bank)).toEqual(["low", "mid"]);
    expect(bankLines(parsed!, "low").length).toBe(3);
  });

  test("assigns unanchored blocks by contiguous run for unknown modules", () => {
    const text = `[Rifter, Unknowns]

Unknown Low Module A
Unknown Low Module B

Unknown Mid Module A

Unknown High Module A

Unknown Rig Module A`;
    const parsed = parseEft(text);
    expect(parsed!.banks.map((b) => b.bank)).toEqual(["low", "mid", "high", "rig"]);
    expect(bankLines(parsed!, "low").length).toBe(2);
    expect(bankLines(parsed!, "mid").length).toBe(1);
    expect(bankLines(parsed!, "high").length).toBe(1);
    expect(bankLines(parsed!, "rig").length).toBe(1);
  });

  test("anchors blocks by empty slot placeholders", () => {
    const text = `[Rifter, Anchored]

[Empty High slot]

[Empty Med slot]
1MN Afterburner I

[Empty Low slot]
400mm Steel Plates II`;
    const parsed = parseEft(text);
    expect(bankLines(parsed!, "high").length).toBe(1);
    expect(bankLines(parsed!, "low").length).toBe(2);
    expect(bankLines(parsed!, "mid")).toEqual([
      { kind: "empty", label: "[Empty Med slot]" },
      { kind: "module", name: "1MN Afterburner I", offline: false },
    ]);
  });

  test("keeps unknown modules in an anchored block instead of dropping them", () => {
    const text = `[Rifter, Anchored Unknown]
[Empty High slot]
Dread Guristas Capacitor Power Relay`;
    const parsed = parseEft(text);
    expect(bankLines(parsed!, "high")).toEqual([
      { kind: "empty", label: "[Empty High slot]" },
      { kind: "module", name: "Dread Guristas Capacitor Power Relay", offline: false },
    ]);
  });

  test("keeps anchored block lines in the anchored bank even when the catalog disagrees", () => {
    const text = `[Rifter, Contradiction]
[Empty Low slot]
200mm AutoCannon I
400mm Steel Plates II`;
    const parsed = parseEft(text);
    expect(bankLines(parsed!, "low")).toEqual([
      { kind: "empty", label: "[Empty Low slot]" },
      { kind: "module", name: "200mm AutoCannon I", offline: false },
      { kind: "module", name: "400mm Steel Plates II", offline: false },
    ]);
  });

  test("parses quantity lines mixed into a module block as cargo", () => {
    const text = `[Rifter, Cargo]
200mm AutoCannon I
EMP S x1000
Nanite Repair Paste x50`;
    const parsed = parseEft(text);
    expect(moduleLines(parsed!)).toEqual([{ name: "200mm AutoCannon I", offline: false }]);
    expect(parsed!.cargo).toEqual([
      { name: "EMP S", quantity: 1000 },
      { name: "Nanite Repair Paste", quantity: 50 },
    ]);
  });

  test("parses the first quantity-only block as drones and the rest as cargo", () => {
    const text = `[Rifter, Drones]
1MN Afterburner I

Hobgoblin I x3

EMP S x1000
Republic Fleet EMP S x500`;
    const parsed = parseEft(text);
    expect(moduleLines(parsed!)).toEqual([{ name: "1MN Afterburner I", offline: false }]);
    expect(parsed!.drones).toEqual([{ name: "Hobgoblin I", quantity: 3 }]);
    expect(parsed!.cargo).toEqual([
      { name: "EMP S", quantity: 1000 },
      { name: "Republic Fleet EMP S", quantity: 500 },
    ]);
  });

  test("tolerates double blank boundaries between services, drones and cargo", () => {
    const text = `[Rifter, Boundaries]
200mm AutoCannon I


Hobgoblin I x3


EMP S x1000`;
    const parsed = parseEft(text);
    expect(moduleLines(parsed!)).toEqual([{ name: "200mm AutoCannon I", offline: false }]);
    expect(parsed!.drones).toEqual([{ name: "Hobgoblin I", quantity: 3 }]);
    expect(parsed!.cargo).toEqual([{ name: "EMP S", quantity: 1000 }]);
  });

  test("drops lines that match nothing", () => {
    const text = `[Rifter, Garbage]
1MN Afterburner I
weird [line]
200mm AutoCannon I`;
    const parsed = parseEft(text);
    expect(moduleLines(parsed!)).toEqual([
      { name: "1MN Afterburner I", offline: false },
      { name: "200mm AutoCannon I", offline: false },
    ]);
  });

  test("moduleLines returns all module rows in canonical bank order", () => {
    const text = `[Rifter, Order]

400mm Steel Plates II

1MN Afterburner I

200mm AutoCannon I

Small Trimark Armor Pump I`;
    const parsed = parseEft(text);
    expect(moduleLines(parsed!)).toEqual([
      { name: "400mm Steel Plates II", offline: false },
      { name: "1MN Afterburner I", offline: false },
      { name: "200mm AutoCannon I", offline: false },
      { name: "Small Trimark Armor Pump I", offline: false },
    ]);
  });
});
