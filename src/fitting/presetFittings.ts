import type { PresetFitting, PresetFitTexts } from "../gamedata/presets";

export type { PresetFitting };

export interface PresetFittings {
  listHulls(): readonly string[];
  fittingsFor(hull: string): readonly PresetFitting[];
  eftText(hull: string, fit: PresetFitting): string;
}

export class PresetFittingsImpl implements PresetFittings {
  private readonly presetFitTexts: PresetFitTexts;

  constructor({ presetFitTexts }: { presetFitTexts: PresetFitTexts }) {
    this.presetFitTexts = presetFitTexts;
  }

  listHulls(): readonly string[] {
    return this.presetFitTexts.hulls();
  }

  fittingsFor(hull: string): readonly PresetFitting[] {
    return this.presetFitTexts.fittingsFor(hull);
  }

  eftText(hull: string, fit: PresetFitting): string {
    return `[${hull}, ${fit.name}]\n${fit.body}`;
  }
}
