import { parseEft, type ParsedFitting } from "./eft";
import { CHARGES } from "./fittingDb";
import { MODULE_SLOTS, type ModuleSlot } from "./moduleSlots";

export interface FittingRow {
  readonly name: string;
  readonly charge?: string;
  readonly quantity?: number;
}

export interface FittingSection {
  readonly kind: ModuleSlot | "cargo" | "drones";
  readonly rows: readonly FittingRow[];
}

export interface FittingSummary {
  readonly hullName: string;
  readonly fittingName: string;
  readonly sections: readonly FittingSection[];
}

export function describeFitting(text: string): FittingSummary | undefined {
  const parsed = parseEft(text);
  if (!parsed) return undefined;
  return {
    hullName: parsed.hullName,
    fittingName: parsed.fittingName,
    sections: buildSections(parsed),
  };
}

function buildSections(parsed: ParsedFitting): readonly FittingSection[] {
  const buckets: Record<ModuleSlot | "cargo" | "drones", FittingRow[]> = { high: [], mid: [], low: [], rig: [], cargo: [], drones: [] };

  for (const line of parsed.modules) {
    const slot = MODULE_SLOTS[line.name];
    if (slot === undefined) continue;
    buckets[slot].push({ name: line.name, charge: line.charge });
  }

  for (const item of parsed.cargo) {
    buckets.cargo.push({ name: item.name, quantity: item.quantity });
  }

  for (const item of parsed.drones) {
    if (item.name in CHARGES) {
      buckets.cargo.push({ name: item.name, quantity: item.quantity });
    } else {
      buckets.drones.push({ name: item.name, quantity: item.quantity });
    }
  }

  const sections: FittingSection[] = [];
  for (const kind of ["high", "mid", "low", "rig", "cargo", "drones"] as const) {
    if (buckets[kind].length > 0) sections.push({ kind, rows: buckets[kind] });
  }
  return sections;
}
