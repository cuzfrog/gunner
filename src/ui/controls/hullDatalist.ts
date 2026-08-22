import type { PresetFittings } from "../../fitting";
import type { Els } from "./elementsContract";

export class HullDatalist {
  private readonly els: Els;
  private readonly presetFittings: PresetFittings;

  constructor(els: Els, presetFittings: PresetFittings) {
    this.els = els;
    this.presetFittings = presetFittings;
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
