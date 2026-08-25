import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { SidePanel } from "../sidePanel";

export interface StartupContext {
  readonly shipASide: SidePanel;
  readonly shipBSide: SidePanel;
  readonly preferencesController: PreferencesController;
  readonly profileController: ProfileController;
}

export function applyStartupDefaults(context: StartupContext): void {
  applyDefaultSkillAndOverload(context);
  context.shipASide.sections.skill.setOverloadDisabled();
  context.shipBSide.sections.skill.setOverloadDisabled();
  context.preferencesController.updateManeuverAggressivityDisplay();
  context.preferencesController.setManeuverAggressivityEnabled(context.shipASide.capture().mode === "maneuver");
  context.shipASide.sections.propulsion.renderPropulsionOptions();
  context.shipBSide.sections.propulsion.renderPropulsionOptions();
  context.profileController.markLoaded("");
}

function applyDefaultSkillAndOverload({ shipASide, shipBSide }: StartupContext): void {
  shipASide.sections.skill.setSkillLevel(5);
  shipBSide.sections.skill.setSkillLevel(5);
  shipASide.sections.skill.setOverloadActive(true);
  shipBSide.sections.skill.setOverloadActive(true);
}
