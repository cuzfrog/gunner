import { toShipId, type ShipId } from "../ids";
import { PRESET_FITTINGS, type PresetFitting } from "./fittingPresets";

export type { PresetFitting };

export interface PresetHull {
  readonly id: ShipId;
  readonly label: string;
}

export interface PresetFitTexts {
  listHulls(): readonly PresetHull[];
  fittingsFor(hullId: ShipId): readonly PresetFitting[];
  hullNameFor(hullId: ShipId): string | undefined;
}

export class StaticPresetFitTexts implements PresetFitTexts {
  listHulls(): readonly PresetHull[] {
    return Object.entries(PRESET_FITTINGS)
      .map(([id, hull]) => ({ id: toShipId(id), label: hull.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  fittingsFor(hullId: ShipId): readonly PresetFitting[] {
    return PRESET_FITTINGS[hullId]?.fittings ?? [];
  }

  hullNameFor(hullId: ShipId): string | undefined {
    return PRESET_FITTINGS[hullId]?.name;
  }
}
