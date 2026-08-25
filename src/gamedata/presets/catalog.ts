import { PRESET_FITTINGS, type PresetFitting } from "./fittingPresets";

export type { PresetFitting };

export interface PresetFitTexts {
  hulls(): readonly string[];
  fittingsFor(hull: string): readonly PresetFitting[];
}

export class StaticPresetFitTexts implements PresetFitTexts {
  hulls(): readonly string[] {
    return Object.keys(PRESET_FITTINGS).sort();
  }

  fittingsFor(hull: string): readonly PresetFitting[] {
    return PRESET_FITTINGS[hull] ?? [];
  }
}
