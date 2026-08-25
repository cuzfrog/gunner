import type { CombatantConfig, SimConfig } from "../../../sim";
import { AGGRESSIVITY_MIN } from "../controlsFormat";
import type { BoosterController } from "../booster";
import type { EwarController } from "../ewar";
import type { PreferencesController } from "../preferences";
import type { SidePanelState } from "../sidePanel";

export interface SimConfigSource {
  getConfig(): SimConfig;
}

interface SimConfigSourceDeps {
  readonly shipASide: { capture(): SidePanelState };
  readonly shipBSide: { capture(): SidePanelState };
  readonly preferencesController: { getManeuverAggressivity(): number };
  readonly ewarController: EwarController;
  readonly boosterController: BoosterController;
  readonly distanceSource: { getInitialDistance(): number };
}

export class SimConfigSourceImpl implements SimConfigSource {
  private readonly shipASide: { capture(): SidePanelState };
  private readonly shipBSide: { capture(): SidePanelState };
  private readonly preferencesController: { getManeuverAggressivity(): number };
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly distanceSource: { getInitialDistance(): number };

  constructor(deps: SimConfigSourceDeps) {
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
    this.preferencesController = deps.preferencesController;
    this.ewarController = deps.ewarController;
    this.boosterController = deps.boosterController;
    this.distanceSource = deps.distanceSource;
  }

  getConfig(): SimConfig {
    const initialDistance = this.distanceSource.getInitialDistance();
    const aggressivity = this.preferencesController.getManeuverAggressivity();
    const shipAState = this.shipASide.capture();
    const shipBState = this.shipBSide.capture();
    const shipA: CombatantConfig = {
      id: "shipA", maxSpeed: shipAState.speed, baseMaxSpeed: shipAState.baseMaxSpeed ?? shipAState.speed,
      suppressedMaxSpeed: suppressedMaxSpeed(shipAState), mass: shipAState.mass,
      inertiaModifier: shipAState.inertia, mode: shipAState.mode,
      desiredRange: shipAState.range, aggressivity, orbitDirection: "cw",
      ewar: this.ewarController.projection("shipA"),
      boosts: this.boosterController.projection("shipA"),
    };
    const shipB: CombatantConfig = {
      id: "shipB", maxSpeed: shipBState.speed, baseMaxSpeed: shipBState.baseMaxSpeed ?? shipBState.speed,
      suppressedMaxSpeed: suppressedMaxSpeed(shipBState), mass: shipBState.mass,
      inertiaModifier: shipBState.inertia, mode: shipBState.mode,
      desiredRange: shipBState.range, aggressivity: AGGRESSIVITY_MIN, orbitDirection: "cw",
      ewar: this.ewarController.projection("shipB"),
      boosts: this.boosterController.projection("shipB"),
    };
    return { shipA, shipB, initialDistance };
  }
}

function suppressedMaxSpeed(state: SidePanelState): number | undefined {
  const kind = state.fittedHull?.propulsionKind;
  if (kind === undefined) return undefined;
  if (kind === "microwarpdrive") return state.baseMaxSpeed ?? state.speed;
  return state.speed;
}
