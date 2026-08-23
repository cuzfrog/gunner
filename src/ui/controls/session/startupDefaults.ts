import type { HitChance } from "../../../sim";
import type { Els } from "../elementsContract";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { SidePanel } from "../sidePanel";
import type { TurretController } from "../turret";
import type { TrackingInput } from "../trackingInput";
import type { SessionControl } from "./sessionControl";

export interface StartupContext {
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly turretController: TurretController;
  readonly trackingInput: TrackingInput;
  readonly els: Els;
  readonly hitChance: HitChance;
  readonly preferencesController: PreferencesController;
  readonly profileController: ProfileController;
  readonly sessionControl?: SessionControl;
}

export function applyStartupDefaults(context: StartupContext): void {
  applyDefaultSkillAndOverload(context);
  context.attackerSide.sections.skill.setOverloadDisabled();
  context.targetSide.sections.skill.setOverloadDisabled();
  applyBestInitialDistance(context);
  context.preferencesController.updateManeuverAggressivityDisplay();
  context.preferencesController.updateManeuverAggressivityEnabled(context.els.attackerMode.value === "midships");
  context.sessionControl?.setPlaying(false);
  context.attackerSide.sections.propulsion.renderPropulsionOptions();
  context.targetSide.sections.propulsion.renderPropulsionOptions();
  context.profileController.refresh();
}

function applyDefaultSkillAndOverload({ attackerSide, targetSide }: StartupContext): void {
  attackerSide.sections.skill.setSkillLevel(5);
  targetSide.sections.skill.setSkillLevel(5);
  attackerSide.sections.skill.setOverloadActive(true);
  targetSide.sections.skill.setOverloadActive(true);
}

function applyBestInitialDistance({ turretController, trackingInput, targetSide, els, hitChance }: StartupContext): void {
  const turret = turretController.currentTurretSpec(trackingInput.rad);
  const targetState = targetSide.capture();
  const best = hitChance.findBestDistance(targetState.speed, turret, targetState.sig ?? 1);
  if (!Number.isFinite(best) || best <= 0) return;
  els.initialDistance.value = String(Math.round(best));
  els.targetRange.value = String(Math.round(best));
}
