import type { Els } from "../elementsContract";
import type { PreferencesController } from "../preferencesController";
import type { SidePanel } from "../sidePanel";
import type { TurretController } from "../turret";
import type { TrackingInput } from "../trackingInput";

export function applyDisplayInput(
  id: keyof Els,
  { attackerSide, targetSide, preferences, turret, trackingInput }: {
    attackerSide: SidePanel;
    targetSide: SidePanel;
    preferences: PreferencesController;
    turret: TurretController;
    trackingInput: TrackingInput;
  },
): void {
  if (id === "tracking") {
    preferences.updateTrackingFromInput();
    attackerSide.recordOverride("tracking", trackingInput.rad);
  }
  if (id === "sigRes") {
    preferences.updateTrackingForSigResolution();
    attackerSide.recordOverride("sigRes", turret.currentSigResClass());
  }
  if (id === "optimal" || id === "falloff") {
    const spec = turret.currentTurretSpec();
    if (id === "optimal") attackerSide.recordOverride("optimal", spec.optimal);
    if (id === "falloff") attackerSide.recordOverride("falloff", spec.falloff);
  }
  if (id === "targetSig") {
    const sig = targetSide.capture().sig ?? 1;
    targetSide.recordOverride("targetSig", sig);
  }
}

export function applyShipInput(
  id: keyof Els,
  attackerSide: SidePanel,
  targetSide: SidePanel,
): void {
  if (id === "attackerMass") attackerSide.sections.stats.updateSpeedFromMass();
  if (id === "targetMass") targetSide.sections.stats.updateSpeedFromMass();
  if (id === "attackerMass" || id === "attackerInertia") attackerSide.sections.stats.updateAlignTime();
  if (id === "targetMass" || id === "targetInertia") targetSide.sections.stats.updateAlignTime();
  if (id === "attackerSpeed" || id === "attackerMass" || id === "attackerInertia") {
    const state = attackerSide.capture();
    const key = id === "attackerSpeed" ? "speed" : id === "attackerMass" ? "mass" : "inertia";
    attackerSide.recordOverride(id, state[key]);
  }
  if (id === "targetSpeed" || id === "targetMass" || id === "targetInertia") {
    const state = targetSide.capture();
    const key = id === "targetSpeed" ? "speed" : id === "targetMass" ? "mass" : "inertia";
    targetSide.recordOverride(id, state[key]);
  }
}
