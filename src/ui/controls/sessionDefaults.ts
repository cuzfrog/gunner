import type { HitChance } from "../../sim";
import type { Els } from "./elements";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";
import type { SidePanel } from "./sidePanel";
import type { TurretController } from "./turretController";
import { num } from "./controlsDom";

export interface SessionDefaultsDeps {
  readonly els: Els;
  readonly hitChance: HitChance;
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly turretController: TurretController;
  readonly preferencesController: PreferencesController;
  readonly profileController: ProfileController;
  readonly setPlaying: (playing: boolean) => void;
}

function setBestInitialDistance({ els, hitChance, turretController, preferencesController }: SessionDefaultsDeps): void {
  const turret = turretController.currentTurretSpec(preferencesController.trackingInput.rad);
  const targetSig = Math.max(num(els.targetSig), 1);
  const targetSpeed = num(els.targetSpeed);
  const best = hitChance.findBestDistance(targetSpeed, turret, targetSig);
  if (!Number.isFinite(best) || best <= 0) return;
  els.initialDistance.value = String(Math.round(best));
  els.targetRange.value = String(Math.round(best));
}

function setDefaultSkillAndOverload({ attackerSide, targetSide }: SessionDefaultsDeps): void {
  attackerSide.setSkillLevel(5); targetSide.setSkillLevel(5); attackerSide.setOverloadActive(true); targetSide.setOverloadActive(true);
}

export function setInitialDefaults(deps: SessionDefaultsDeps): void {
  setDefaultSkillAndOverload(deps);
  deps.attackerSide.setOverloadDisabled(); deps.targetSide.setOverloadDisabled();
  setBestInitialDistance(deps);
  deps.preferencesController.updateManeuverAggressivityDisplay();
  deps.preferencesController.updateManeuverAggressivityEnabled(deps.els.attackerMode.value === "midships");
  deps.setPlaying(false);
  deps.attackerSide.renderPropulsionOptions(); deps.targetSide.renderPropulsionOptions();
  deps.profileController.refresh();
}
