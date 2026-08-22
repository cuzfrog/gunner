import type { UserSettings } from "../settings";
import type { Side } from "./sidePanel";

export function sidePanelState(settings: UserSettings, side: Side) {
  if (side === "attacker") {
    return {
      speed: settings.attackerSpeed,
      mass: settings.attackerMass,
      inertia: settings.attackerInertia,
      mode: settings.attackerMode,
      range: settings.attackerRange,
      skillLevel: settings.attackerSkillLevel,
      overload: settings.attackerOverload ?? true,
      hull: settings.attackerHull,
      propulsion: settings.attackerPropulsion,
      fitting: settings.attackerFitting,
      overrides: settings.attackerOverrides ?? {},
      fittedHull: settings.attackerFittedHull,
    };
  }
  return {
    speed: settings.targetSpeed,
    mass: settings.targetMass,
    inertia: settings.targetInertia,
    mode: settings.targetMode,
    range: settings.targetRange,
    skillLevel: settings.targetSkillLevel,
    overload: settings.targetOverload ?? true,
    hull: settings.targetHull,
    propulsion: settings.targetPropulsion,
    fitting: settings.targetFitting,
    overrides: settings.targetOverrides ?? {},
    fittedHull: settings.targetFittedHull,
    sig: settings.targetSig,
  };
}
