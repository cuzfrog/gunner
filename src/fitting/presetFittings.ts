import { PRESET_FITTINGS, type PresetFitting } from "./fittingPresets";

export type { PresetFitting };

export interface PresetFittings {
  listHulls(): readonly string[];
  fittingsFor(hull: string): readonly PresetFitting[];
  eftText(hull: string, fit: PresetFitting): string;
}

export class PresetFittingsImpl implements PresetFittings {
  listHulls(): readonly string[] {
    return Object.keys(PRESET_FITTINGS).sort();
  }

  fittingsFor(hull: string): readonly PresetFitting[] {
    return PRESET_FITTINGS[hull] ?? [];
  }

  eftText(hull: string, fit: PresetFitting): string {
    return `[${hull}, ${fit.name}]\n${fit.body}`;
  }
}
