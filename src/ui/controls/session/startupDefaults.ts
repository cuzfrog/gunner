import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { SidePanel } from "../sidePanel";
import type { SessionControl } from "./sessionControl";

export interface StartupContext {
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly preferencesController: PreferencesController;
  readonly profileController: ProfileController;
  readonly sessionControl?: SessionControl;
}

export function applyStartupDefaults(context: StartupContext): void {
  applyDefaultSkillAndOverload(context);
  context.attackerSide.sections.skill.setOverloadDisabled();
  context.targetSide.sections.skill.setOverloadDisabled();
  context.preferencesController.updateManeuverAggressivityDisplay();
  context.preferencesController.updateManeuverAggressivityEnabled(context.attackerSide.capture().mode === "midships");
  context.sessionControl?.setPlaying(false);
  context.attackerSide.sections.propulsion.renderPropulsionOptions();
  context.targetSide.sections.propulsion.renderPropulsionOptions();
  context.profileController.markLoaded("");
}

function applyDefaultSkillAndOverload({ attackerSide, targetSide }: StartupContext): void {
  attackerSide.sections.skill.setSkillLevel(5);
  targetSide.sections.skill.setSkillLevel(5);
  attackerSide.sections.skill.setOverloadActive(true);
  targetSide.sections.skill.setOverloadActive(true);
}
