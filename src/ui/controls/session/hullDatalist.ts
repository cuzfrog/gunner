import type { PresetFittings } from "../../../fitting";
import type { UiEvents } from "../../events";
import type { Els } from "../elementsContract";

export interface HullDatalist {
  populate(): void;
}

export class HullDatalistImpl implements HullDatalist {
  private readonly els: Els;
  private readonly presetFittings: PresetFittings;

  constructor(els: Els, presetFittings: PresetFittings, events: UiEvents) {
    this.els = els;
    this.presetFittings = presetFittings;
    events.onLanguageChanged(() => this.populate());
  }

  populate(): void {
    const datalist = this.els.hullOptions;
    datalist.innerHTML = "";
    for (const hull of this.presetFittings.listHulls()) {
      const option = document.createElement("option");
      option.value = hull;
      datalist.appendChild(option);
    }
  }
}
