import type { ShipId } from "../gamedata/ids";
import type { PresetFitTexts, PresetFitting, PresetHull } from "../gamedata/presets";

export type { PresetFitting };

export interface PresetFittings {
  listHulls(): readonly PresetHull[];
  fittingsFor(hullId: ShipId): readonly PresetFitting[];
  eftText(hullId: ShipId, fit: PresetFitting): string;
}

export class PresetFittingsImpl implements PresetFittings {
  private readonly presetFitTexts: PresetFitTexts;

  constructor({ presetFitTexts }: { presetFitTexts: PresetFitTexts }) {
    this.presetFitTexts = presetFitTexts;
  }

  listHulls(): readonly PresetHull[] {
    return this.presetFitTexts.listHulls();
  }

  fittingsFor(hullId: ShipId): readonly PresetFitting[] {
    return this.presetFitTexts.fittingsFor(hullId);
  }

  eftText(hullId: ShipId, fit: PresetFitting): string {
    const hullName = this.presetFitTexts.hullNameFor(hullId) ?? String(hullId);
    return `[${hullName}, ${fit.name}]\n${fit.body}`;
  }
}
