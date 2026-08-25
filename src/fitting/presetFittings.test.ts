import { parseEft } from "./eft";
import { type PresetFitting } from "../gamedata/presets";
import { PresetFittingsImpl, type PresetFittings } from "./presetFittings";
import { StaticPresetFitTexts } from "../gamedata/presets";

describe("PresetFittings", () => {
  let presets: PresetFittings;

  beforeEach(() => {
    presets = new PresetFittingsImpl({ presetFitTexts: new StaticPresetFitTexts() });
  });

  test("listHulls returns sorted hull names and is non-empty", () => {
    const hulls = presets.listHulls();
    expect(hulls.length).toBeGreaterThan(0);
    expect(hulls).toEqual([...hulls].sort());
    expect(hulls).toContain("Rifter");
    expect(hulls).toContain("Thrasher");
  });

  test("fittingsFor returns all presets for a known hull", () => {
    const rifterFits = presets.fittingsFor("Rifter");
    expect(rifterFits.length).toBeGreaterThan(0);
    for (const fit of rifterFits) {
      expect(typeof fit.name).toBe("string");
      expect(fit.name.length).toBeGreaterThan(0);
      expect(typeof fit.body).toBe("string");
    }
  });

  test("fittingsFor returns an empty array for an unknown hull", () => {
    expect(presets.fittingsFor("Not A Ship")).toEqual([]);
  });

  test("eftText round-trips through parseEft with the same hull and name", () => {
    const fit = presets.fittingsFor("Rifter")[0];
    const text = presets.eftText("Rifter", fit);
    const parsed = parseEft(text);
    if (!parsed) throw new Error("expected parsed fitting");
    expect(parsed.hullName).toBe("Rifter");
    expect(parsed.fittingName).toBe(fit.name);
  });

  test("eftText round-trips for a fit whose name contains commas", () => {
    const fit: PresetFitting = { name: "Name, With, Commas", body: "1MN Afterburner II\nStasis Webifier II" };
    const text = presets.eftText("Thrasher", fit);
    const parsed = parseEft(text);
    if (!parsed) throw new Error("expected parsed fitting");
    expect(parsed.hullName).toBe("Thrasher");
    expect(parsed.fittingName).toBe("Name, With, Commas");
  });
});
