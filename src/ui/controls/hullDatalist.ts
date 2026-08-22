import type { Els } from "./elements";
import type { PresetFittings } from "../../fitting";
import type { Side } from "./sidePanel";

export function populateHullDatalist(els: Els, presetFittings: PresetFittings): void {
  const datalist = els.hullOptions;
  datalist.innerHTML = "";
  for (const hull of presetFittings.listHulls()) {
    const option = document.createElement("option");
    option.value = hull;
    datalist.appendChild(option);
  }
}

export function updateFittingTrigger(els: Els, side: Side, enabled: boolean): void {
  const trigger = side === "attacker" ? els.attackerFittingTrigger : els.targetFittingTrigger;
  const eye = side === "attacker" ? els.attackerFittingEye : els.targetFittingEye;
  trigger.disabled = !enabled;
  eye.disabled = !enabled;
}
