import type { PresetFittings } from "../../../fitting";
import type { UiEvents } from "../../events";

export interface HullDatalist {
  populate(): void;
}

export class HullDatalistImpl implements HullDatalist {
  private readonly hullOptions: HTMLElement;
  private readonly presetFittings: PresetFittings;

  constructor(hullOptions: HTMLElement, presetFittings: PresetFittings, events: UiEvents) {
    this.hullOptions = hullOptions;
    this.presetFittings = presetFittings;
    events.onLanguageChanged(() => this.populate());
  }

  populate(): void {
    const datalist = this.hullOptions;
    datalist.innerHTML = "";
    for (const hull of this.presetFittings.listHulls()) {
      const option = document.createElement("option");
      option.value = hull;
      datalist.appendChild(option);
    }
  }
}
