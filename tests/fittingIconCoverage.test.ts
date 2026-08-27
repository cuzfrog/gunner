import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { StackingPenalty } from "../src/sim";
import { FittingImportImpl, type FittingRow } from "../src/fitting/fittingImport";
import { ChargeCatalogImpl } from "../src/fitting/chargeCatalog";
import { GunFamiliesImpl } from "../src/fitting/gunFamilies";
import { parseEft } from "../src/fitting/eft";
import { ShipsImpl } from "../src/ships/ships";
import { StaticShipProfileCatalog } from "../src/gamedata/shipProfiles";
import { StaticNameI18nCatalog } from "../src/gamedata/nameI18n";
import { StaticItemNameCatalog, StaticItemNameResolver } from "../src/gamedata/itemNames";
import { MODULE_SLOT_CATALOG } from "../src/gamedata/moduleSlots";
import { FITTING_DB } from "../src/gamedata/fittingDb";
import { PRESET_FITTINGS } from "../src/gamedata/presets/fittingPresets";
import { StaticImageCatalog } from "../src/ui/icons/imageCatalog";
import { TYPE_ICON_FILES } from "../src/ui/icons/typeIconFiles";

const ALLOWED_NO_IDENTITY = new Set([
  "Adaptive Invulnerability Field II",
  "Adaptive Nano Plating II",
  "Armor Explosive Hardener II",
  "Armor Kinetic Hardener II",
  "Armor Thermal Hardener II",
  "Civilian Gatling Autocannon",
  "Civilian Gatling Pulse Laser",
  "Civilian Gatling Railgun",
  "EM Ward Field II",
  "Energized Adaptive Nano Membrane II",
  "Explosive Plating II",
  "F85 Peripheral Damage System I",
  "Gistum C-Type Adaptive Invulnerability Field",
  "Helium Isotopes",
  "Hydrogen Isotopes",
  "Kinetic Plating II",
  "Large Anti-EM Screen Reinforcer II",
  "Limited Energized Explosive Membrane I",
  "Liquid Ozone",
  "Local Hull Conversion Nanofiber Structure I",
  "Medium Anti-EM Screen Reinforcer I",
  "Mobile Depot",
  "Mobile Small Warp Disruptor I",
  "Mobile Small Warp Disruptor II",
  "Nitrogen Isotopes",
  "Oxygen Isotopes",
  "Pneumatic Stabilization Actuator I",
  "Prototype 'Arbalest' Light Missile Launcher",
  "Small Anti-EM Screen Reinforcer I",
  "Stabilized Weapon Mounts",
  "Strontium Clathrates",
  "Thermal Plating II",
  "True Sansha Energized Adaptive Nano Membrane",
]);

class TestStackingPenalty implements StackingPenalty {
  apply(multipliers: readonly number[]): number {
    const values = multipliers.filter((value) => value !== 1);
    const positive = values.filter((value) => value > 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));
    const negative = values.filter((value) => value < 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));
    let product = 1;
    for (const list of [positive, negative]) {
      for (let i = 0; i < list.length; i++) product *= 1 + (list[i]! - 1) * Math.exp(-(i * i) / 7.1289);
    }
    return product;
  }
}

const ships = new ShipsImpl({ shipProfileCatalog: new StaticShipProfileCatalog(), nameI18nCatalog: new StaticNameI18nCatalog() });
const gunFamilies = new GunFamiliesImpl({ fittingDb: FITTING_DB });
const chargeCatalog = new ChargeCatalogImpl({ fittingDb: FITTING_DB, gunFamilies });
const fittingImport = new FittingImportImpl({
  ships,
  fittingDb: FITTING_DB,
  chargeCatalog,
  stackingPenalty: new TestStackingPenalty(),
  itemNameCatalog: new StaticItemNameCatalog(),
  itemNameResolver: new StaticItemNameResolver(),
  moduleSlotCatalog: MODULE_SLOT_CATALOG,
});
const imageCatalog = new StaticImageCatalog();

function iconResolves(id: FittingRow["id"]): boolean {
  if (id === undefined) return false;
  return imageCatalog.itemIconUrl(id) !== undefined;
}

function checkFitting(text: string, sourceKey: string, failures: string[]): void {
  const parsed = parseEft(text);
  if (!parsed) {
    failures.push(`[${sourceKey}] parseEft failed`);
    return;
  }
  const summary = fittingImport.summarize(text);
  if (!summary) {
    failures.push(`[${sourceKey}] summarize failed (hull not resolved)`);
    return;
  }
  for (const section of summary.sections) {
    for (const row of section.rows) {
      if (row.empty) continue;
      if (ALLOWED_NO_IDENTITY.has(row.name)) {
        if (row.id !== undefined) failures.push(`[${sourceKey}] ${section.kind}: "${row.name}" - allowlisted as no-identity but resolved id ${row.id}`);
        continue;
      }
      if (row.id === undefined) {
        failures.push(`[${sourceKey}] ${section.kind}: "${row.name}" - missing identity id`);
        continue;
      }
      if (!iconResolves(row.id)) failures.push(`[${sourceKey}] ${section.kind}: "${row.name}" - no icon for id ${row.id}`);
      if (row.charge) {
        if (ALLOWED_NO_IDENTITY.has(row.charge)) {
          if (row.chargeId !== undefined) failures.push(`[${sourceKey}] ${section.kind}: "${row.name}" charge "${row.charge}" - allowlisted as no-identity but resolved chargeId ${row.chargeId}`);
        } else if (row.chargeId === undefined) {
          failures.push(`[${sourceKey}] ${section.kind}: "${row.name}" charge "${row.charge}" - missing charge identity id`);
        } else if (imageCatalog.itemIconUrl(row.chargeId) === undefined) {
          failures.push(`[${sourceKey}] ${section.kind}: "${row.name}" charge "${row.charge}" - no icon for chargeId ${row.chargeId}`);
        }
      }
    }
  }
}

function walkFittingFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walkFittingFiles(path) : [path];
  });
}

describe("bundled fitting icon coverage", () => {
  test("every data/ship-fittings row has an identity id that resolves to an icon", () => {
    const failures: string[] = [];
    for (const path of walkFittingFiles("data/ship-fittings")) {
      if (!path.endsWith(".txt")) continue;
      checkFitting(readFileSync(path, "utf8"), path, failures);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("every preset fitting row has an identity id that resolves to an icon", () => {
    const failures: string[] = [];
    for (const [hullId, hullPresets] of Object.entries(PRESET_FITTINGS)) {
      for (const fit of hullPresets.fittings) {
        const text = `[${hullPresets.name}, ${fit.name}]\n${fit.body}`;
        checkFitting(text, `preset:${hullId}:${fit.name}`, failures);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("every TYPE_ICON_FILES entry has a corresponding icon file on disk", () => {
    const missing: string[] = [];
    for (const file of new Set(Object.values(TYPE_ICON_FILES))) {
      if (!existsSync(join("data/ship-modules", file))) missing.push(file);
    }
    expect(missing, `Missing icon files: ${missing.join(", ")}`).toEqual([]);
  });
});
