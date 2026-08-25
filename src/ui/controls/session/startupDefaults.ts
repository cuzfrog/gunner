import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { SidePanel } from "../sidePanel";

export interface StartupContext {
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly preferencesController: PreferencesController;
  readonly profileController: ProfileController;
}

export function applyStartupDefaults(context: StartupContext): void {
  applyDefaultSkillAndOverload(context);
  context.attackerSide.sections.skill.setOverloadDisabled();
  context.targetSide.sections.skill.setOverloadDisabled();
  context.preferencesController.updateManeuverAggressivityDisplay();
  context.preferencesController.setManeuverAggressivityEnabled(context.attackerSide.capture().mode === "maneuver");
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
