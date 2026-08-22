import { num } from "./controlsDom";
import { isSigResClass } from "./controlsFormat";
import type { Els } from "./elements";
import type { PreferencesController } from "./preferencesController";
import type { SidePanel } from "./sidePanel";
import type { SigResolutionClass } from "../../sim";

export function currentSigResValue(els: Els): SigResolutionClass {
  const value = els.sigRes.value;
  if (!isSigResClass(value)) throw new Error(`Invalid sigRes value: ${value}`);
  return value;
}

export function recordOverrideForDisplayInput(els: Els, attackerSide: SidePanel, targetSide: SidePanel, preferences: PreferencesController, id: keyof Els): void {
  if (id === "tracking") attackerSide.recordOverride("tracking", preferences.trackingInput.rad);
  if (id === "sigRes") attackerSide.recordOverride("sigRes", currentSigResValue(els));
  if (id === "optimal") attackerSide.recordOverride("optimal", num(els.optimal));
  if (id === "falloff") attackerSide.recordOverride("falloff", num(els.falloff));
  if (id === "targetSig") targetSide.recordOverride("targetSig", Math.max(num(els.targetSig), 1));
}

export function recordOverrideForShipInput(els: Els, attackerSide: SidePanel, targetSide: SidePanel, id: keyof Els): void {
  if (id === "attackerSpeed") attackerSide.recordOverride("attackerSpeed", num(els.attackerSpeed));
  if (id === "attackerMass") attackerSide.recordOverride("attackerMass", num(els.attackerMass));
  if (id === "attackerInertia") attackerSide.recordOverride("attackerInertia", num(els.attackerInertia));
  if (id === "targetSpeed") targetSide.recordOverride("targetSpeed", num(els.targetSpeed));
  if (id === "targetMass") targetSide.recordOverride("targetMass", num(els.targetMass));
  if (id === "targetInertia") targetSide.recordOverride("targetInertia", num(els.targetInertia));
}

export function applyDisplayInput(els: Els, attackerSide: SidePanel, targetSide: SidePanel, preferences: PreferencesController, id: keyof Els): void {
  if (id === "tracking") preferences.updateTrackingFromInput();
  if (id === "sigRes") preferences.updateTrackingForSigResolution();
  recordOverrideForDisplayInput(els, attackerSide, targetSide, preferences, id);
}

export function applyShipInput(els: Els, attackerSide: SidePanel, targetSide: SidePanel, id: keyof Els): void {
  if (id === "attackerMass") attackerSide.updateSpeedFromMass();
  if (id === "targetMass") targetSide.updateSpeedFromMass();
  if (id === "attackerMass" || id === "attackerInertia") attackerSide.updateAlignTime();
  if (id === "targetMass" || id === "targetInertia") targetSide.updateAlignTime();
  recordOverrideForShipInput(els, attackerSide, targetSide, id);
}
