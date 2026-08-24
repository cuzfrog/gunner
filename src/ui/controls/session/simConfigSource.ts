import type { CombatantConfig, SimConfig } from "../../../sim";
import { AGGRESSIVITY_MIN } from "../controlsFormat";
import type { BoosterController } from "../booster";
import type { EwarController } from "../ewar";
import type { PreferencesController } from "../preferencesController";
import type { SidePanelState } from "../sidePanel";

export interface SimConfigSource {
  getConfig(): SimConfig;
}

interface SimConfigSourceDeps {
  readonly attackerSide: { capture(): SidePanelState };
  readonly targetSide: { capture(): SidePanelState };
  readonly preferencesController: { getManeuverAggressivity(): number };
  readonly ewarController: EwarController;
  readonly boosterController: BoosterController;
  readonly distanceSource: { getInitialDistance(): number };
}

export class SimConfigSourceImpl implements SimConfigSource {
  private readonly attackerSide: { capture(): SidePanelState };
  private readonly targetSide: { capture(): SidePanelState };
  private readonly preferencesController: { getManeuverAggressivity(): number };
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly distanceSource: { getInitialDistance(): number };

  constructor(deps: SimConfigSourceDeps) {
    this.attackerSide = deps.attackerSide;
    this.targetSide = deps.targetSide;
    this.preferencesController = deps.preferencesController;
    this.ewarController = deps.ewarController;
    this.boosterController = deps.boosterController;
    this.distanceSource = deps.distanceSource;
  }

  getConfig(): SimConfig {
    const initialDistance = this.distanceSource.getInitialDistance();
    const aggressivity = this.preferencesController.getManeuverAggressivity();
    const attackerState = this.attackerSide.capture();
    const targetState = this.targetSide.capture();
    const attacker: CombatantConfig = {
      id: "attacker", maxSpeed: attackerState.speed, baseMaxSpeed: attackerState.baseMaxSpeed ?? attackerState.speed, mass: attackerState.mass,
      inertiaModifier: attackerState.inertia, mode: attackerState.mode,
      desiredRange: attackerState.range, aggressivity, orbitDirection: "cw",
      ewar: this.ewarController.projection("attacker"),
      boosts: this.boosterController.projection("attacker"),
    };
    const target: CombatantConfig = {
      id: "target", maxSpeed: targetState.speed, baseMaxSpeed: targetState.baseMaxSpeed ?? targetState.speed, mass: targetState.mass,
      inertiaModifier: targetState.inertia, mode: targetState.mode,
      desiredRange: targetState.range, aggressivity: AGGRESSIVITY_MIN, orbitDirection: "cw",
      ewar: this.ewarController.projection("target"),
      boosts: this.boosterController.projection("target"),
    };
    return { attacker, target, initialDistance };
  }
}
