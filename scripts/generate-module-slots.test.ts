import { readdirSync, readFileSync } from "node:fs";
import type { TypeId } from "../src/gamedata/ids";
import { MODULE_SLOTS_BY_ID } from "../src/gamedata/moduleSlots";
import { generateModuleSlotsContent, type ModuleSlot } from "./generate-module-slots";

const POWER_SLOT_BY_EFFECT: Readonly<Record<number, ModuleSlot>> = { 11: "low", 12: "high", 13: "mid" };

type DogmaEntry = { readonly dogmaEffects?: readonly { readonly effectID?: unknown }[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadDogmaFittingEffects(): Map<string, ModuleSlot[]> {
  const effects = new Map<string, ModuleSlot[]>();
  for (const file of readdirSync("sde").filter((name) => /^typedogma\..*\.json$/.test(name)).sort()) {
    const parsed: unknown = JSON.parse(readFileSync(`sde/${file}`, "utf8"));
    if (!isRecord(parsed)) throw new Error(`Expected typedogma root object in ${file}`);
    for (const [id, entry] of Object.entries(parsed)) {
      if (!isRecord(entry)) throw new Error(`Expected typedogma entry object for ${id}`);
      const raw = Array.isArray(entry.dogmaEffects) ? entry.dogmaEffects : [];
      const slots = raw.map((effect) => (isRecord(effect) ? effect.effectID : undefined)).map((effectId) => (typeof effectId === "number" ? POWER_SLOT_BY_EFFECT[effectId] : undefined)).filter((slot): slot is ModuleSlot => slot !== undefined);
      effects.set(id, slots);
    }
  }
  return effects;
}

function majoritySlot(slots: readonly ModuleSlot[]): ModuleSlot {
  const counts = new Map<ModuleSlot, number>();
  for (const slot of slots) counts.set(slot, (counts.get(slot) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function nameToIdFixture(): {
  readonly byName: {
    readonly iconID: Readonly<Record<string, ReadonlyArray<{ readonly group: string }>>>;
  };
} {
  return {
    byName: {
      iconID: {
        "1MN Afterburner I": [{ group: "Propulsion Module" }],
        "250mm Railgun I": [{ group: "Hybrid Weapon" }],
        "Medium Shield Extender II": [{ group: "Shield Extender" }],
        "Medium Trimark Armor Pump I": [{ group: "Rig Armor" }],
        "Unknown Group Module": [{ group: "Unknown" }],
      },
    },
  };
}

const GROUP_SLOTS: Readonly<Record<string, ModuleSlot>> = {
  "Propulsion Module": "mid",
  "Hybrid Weapon": "high",
  "Shield Extender": "mid",
  "Rig Armor": "rig",
};

function asTypeId(value: string): TypeId {
  return value as TypeId;
}

describe("generateModuleSlotsContent", () => {
  test("classifies known names to their slot", () => {
    const content = generateModuleSlotsContent(
      nameToIdFixture(),
      [
        { name: "1MN Afterburner I", id: asTypeId("439") },
        { name: "Medium Shield Extender II", id: asTypeId("382") },
      ],
      [{ name: "250mm Railgun I", id: asTypeId("570") }],
      GROUP_SLOTS,
    );
    expect(content).toMatch(/^import type \{ TypeId \} from "\.\.\/ids";\n/);
    expect(content).toMatch(/^export type ModuleSlot = "high" \| "mid" \| "low" \| "rig" \| "subsystem";\n/m);
    expect(content).toContain('"1MN Afterburner I": "mid",');
    expect(content).toContain('"250mm Railgun I": "high",');
    expect(content).toContain('"Medium Shield Extender II": "mid",');
    expect(content).toContain('["439" as TypeId]: "mid",');
    expect(content).toContain('["570" as TypeId]: "high",');
    expect(content).toContain('["382" as TypeId]: "mid",');
  });

  test("throws when a name is missing from nameToId", () => {
    expect(() =>
      generateModuleSlotsContent(nameToIdFixture(), [{ name: "Missing Module", id: asTypeId("0") }], [], GROUP_SLOTS),
    ).toThrow(/missing from nameToId/);
  });

  test("throws when a group has no slot mapping", () => {
    expect(() =>
      generateModuleSlotsContent(nameToIdFixture(), [{ name: "Unknown Group Module", id: asTypeId("0") }], [], GROUP_SLOTS),
    ).toThrow(/unmatched groups/);
  });

  test("every power-slot mapping agrees with the SDE dogma fitting effect", () => {
    const dogma = loadDogmaFittingEffects();
    const violations: string[] = [];
    let checked = 0;
    for (const [id, slot] of Object.entries(MODULE_SLOTS_BY_ID)) {
      if (slot === "rig" || slot === "subsystem") continue;
      checked++;
      const fitting = dogma.get(id);
      if (fitting === undefined || fitting.length === 0) {
        violations.push(`${id} (${slot}): no dogma fitting effect`);
        continue;
      }
      const majority = majoritySlot(fitting);
      if (majority !== slot) violations.push(`${id} (${slot}): dogma says ${majority}`);
    }
    expect(checked).toBeGreaterThan(2000);
    expect(violations).toEqual([]);
  }, 15000);
});
