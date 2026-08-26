import { MODULE_SLOT_CATALOG } from "../gamedata/moduleSlots";
import { parseEft } from "./eft";
import { type PresetFitting } from "../gamedata/presets";
import { PresetFittingsImpl, type PresetFittings } from "./presetFittings";
import { StaticPresetFitTexts } from "../gamedata/presets";
import type { ShipId } from "../gamedata/ids";

const RIFTER_ID = "587" as ShipId;
const THRASHER_ID = "16242" as ShipId;

describe("PresetFittings", () => {
  let presets: PresetFittings;

  beforeEach(() => {
    presets = new PresetFittingsImpl({ presetFitTexts: new StaticPresetFitTexts() });
  });

  test("listHulls returns sorted hull labels and is non-empty", () => {
    const hulls = presets.listHulls();
    expect(hulls.length).toBeGreaterThan(0);
    const sorted = [...hulls].sort((a, b) => a.label.localeCompare(b.label));
    expect(hulls).toEqual(sorted);
    expect(hulls).toContainEqual({ id: RIFTER_ID, label: "Rifter" });
    expect(hulls).toContainEqual({ id: THRASHER_ID, label: "Thrasher" });
  });

  test("fittingsFor returns all presets for a known hull", () => {
    const rifterFits = presets.fittingsFor(RIFTER_ID);
    expect(rifterFits.length).toBeGreaterThan(0);
    for (const fit of rifterFits) {
      expect(typeof fit.name).toBe("string");
      expect(fit.name.length).toBeGreaterThan(0);
      expect(typeof fit.body).toBe("string");
    }
  });

  test("fittingsFor returns an empty array for an unknown hull", () => {
    expect(presets.fittingsFor("99999" as ShipId)).toEqual([]);
  });

  test("eftText round-trips through parseEft with the same hull and name", () => {
    const fit = presets.fittingsFor(RIFTER_ID)[0];
    const text = presets.eftText(RIFTER_ID, fit);
    const parsed = parseEft(text, MODULE_SLOT_CATALOG);
    if (!parsed) throw new Error("expected parsed fitting");
    expect(parsed.hullName).toBe("Rifter");
    expect(parsed.fittingName).toBe(fit.name);
  });

  test("eftText round-trips for a fit whose name contains commas", () => {
    const fit: PresetFitting = { name: "Name, With, Commas", body: "1MN Afterburner II\nStasis Webifier II" };
    const text = presets.eftText(THRASHER_ID, fit);
    const parsed = parseEft(text, MODULE_SLOT_CATALOG);
    if (!parsed) throw new Error("expected parsed fitting");
    expect(parsed.hullName).toBe("Thrasher");
    expect(parsed.fittingName).toBe("Name, With, Commas");
  });
});
