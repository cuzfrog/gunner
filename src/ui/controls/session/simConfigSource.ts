import type { CombatantConfig, SimConfig } from "../../../sim";
import type { BoosterController } from "../booster";
import type { MissileBoosterController } from "../missileBooster";
import type { SensorBoosterController } from "../sensorBooster";
import type { EwarController } from "../ewar";
import type { Side } from "../side";
import type { SidePanelState } from "../sidePanel";

export interface SimConfigSource {
  getConfig(): SimConfig;
}

interface SimConfigSourceDeps {
  readonly shipASide: { capture(): SidePanelState };
  readonly shipBSide: { capture(): SidePanelState };
  readonly ewarController: EwarController;
  readonly boosterController: BoosterController;
  readonly missileBoosterController: MissileBoosterController;
  readonly sensorBoosterController: SensorBoosterController;
  readonly distanceSource: { getInitialDistance(): number };
}

export class SimConfigSourceImpl implements SimConfigSource {
  private readonly shipASide: { capture(): SidePanelState };
  private readonly shipBSide: { capture(): SidePanelState };
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly missileBoosterController: MissileBoosterController;
  private readonly sensorBoosterController: SensorBoosterController;
  private readonly distanceSource: { getInitialDistance(): number };

  constructor(deps: SimConfigSourceDeps) {
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
    this.ewarController = deps.ewarController;
    this.boosterController = deps.boosterController;
    this.missileBoosterController = deps.missileBoosterController;
    this.sensorBoosterController = deps.sensorBoosterController;
    this.distanceSource = deps.distanceSource;
  }

  getConfig(): SimConfig {
    const initialDistance = this.distanceSource.getInitialDistance();
    const shipAState = this.shipASide.capture();
    const shipBState = this.shipBSide.capture();
    const shipA = this.buildCombatantConfig(shipAState, "shipA");
    const shipB = this.buildCombatantConfig(shipBState, "shipB");
    return { shipA, shipB, initialDistance };
  }

  private buildCombatantConfig(state: SidePanelState, side: Side): CombatantConfig {
    return {
      id: side,
      maxSpeed: state.speed,
      baseMaxSpeed: state.baseMaxSpeed ?? state.speed,
      suppressedMaxSpeed: suppressedMaxSpeed(state),
      mass: state.mass,
      inertiaModifier: state.inertia,
      mode: state.mode,
      desiredRange: state.range,
      aggressivity: state.aggressivity,
      sig: state.sig ?? 1,
      orbitDirection: "cw",
      ewar: this.ewarController.projection(side),
      boosts: this.boosterController.projection(side),
      missileBoosts: this.missileBoosterController.projection(side),
      sensorSpec: state.sensorSpec,
      sensorBoosts: this.sensorBoosterController.projection(side),
    };
  }
}

function suppressedMaxSpeed(state: SidePanelState): number | undefined {
  const kind = state.fittedHull?.propulsionKind;
  if (kind === undefined) return undefined;
  if (kind === "microwarpdrive") return state.baseMaxSpeed ?? state.speed;
  return state.speed;
}
