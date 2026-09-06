import { EMPTY_DEFENSE_SPEC, type CombatantConfig, type EngineConfig, type SimConfig, type WeaponSpec } from "../../../sim";
import type { StatConditions } from "../../../ships";
import type { BoosterController } from "../booster";
import type { MissileBoosterController } from "../missileBooster";
import type { SensorBoosterController } from "../sensorBooster";
import type { EwarController } from "../ewar";
import type { DefenseController } from "../defense";
import type { DroneController } from "../drone";
import type { LauncherController } from "../launcher";
import type { TurretController } from "../turret";
import type { WeaponSystemSwitch } from "../sidePanel";
import type { Side } from "../side";
import type { SidePanelState } from "../sidePanel";

export interface SimConfigSource {
  getConfig(): SimConfig;
  getEngineConfig(): EngineConfig;
}

interface SimConfigSourceDeps {
  readonly shipASide: SidePanelConfigSource;
  readonly shipBSide: SidePanelConfigSource;
  readonly ewarController: EwarController;
  readonly boosterController: BoosterController;
  readonly missileBoosterController: MissileBoosterController;
  readonly sensorBoosterController: SensorBoosterController;
  readonly distanceSource: { getInitialDistance(): number };
  readonly weaponSystemSwitches: Record<Side, WeaponSystemSwitch>;
  readonly turretControllers: Record<Side, TurretController>;
  readonly launcherControllers: Record<Side, LauncherController>;
  readonly droneControllers: Record<Side, DroneController>;
  readonly defenseController: DefenseController;
}

export class SimConfigSourceImpl implements SimConfigSource {
  private readonly shipASide: SidePanelConfigSource;
  private readonly shipBSide: SidePanelConfigSource;
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly missileBoosterController: MissileBoosterController;
  private readonly sensorBoosterController: SensorBoosterController;
  private readonly distanceSource: { getInitialDistance(): number };
  private readonly weaponSystemSwitches: Record<Side, WeaponSystemSwitch>;
  private readonly turretControllers: Record<Side, TurretController>;
  private readonly launcherControllers: Record<Side, LauncherController>;
  private readonly droneControllers: Record<Side, DroneController>;
  private readonly defenseController: DefenseController;

  constructor(deps: SimConfigSourceDeps) {
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
    this.ewarController = deps.ewarController;
    this.boosterController = deps.boosterController;
    this.missileBoosterController = deps.missileBoosterController;
    this.sensorBoosterController = deps.sensorBoosterController;
    this.distanceSource = deps.distanceSource;
    this.weaponSystemSwitches = deps.weaponSystemSwitches;
    this.turretControllers = deps.turretControllers;
    this.launcherControllers = deps.launcherControllers;
    this.droneControllers = deps.droneControllers;
    this.defenseController = deps.defenseController;
  }

  getConfig(): SimConfig {
    const initialDistance = this.distanceSource.getInitialDistance();
    const shipAState = this.shipASide.capture();
    const shipBState = this.shipBSide.capture();
    const shipA = this.buildCombatantConfig(shipAState, "shipA");
    const shipB = this.buildCombatantConfig(shipBState, "shipB");
    return { shipA, shipB, initialDistance };
  }

  getEngineConfig(): EngineConfig {
    return {
      sim: this.getConfig(),
      weapons: { shipA: this.weaponsFor("shipA"), shipB: this.weaponsFor("shipB") },
      sigRadii: { shipA: this.sigFor("shipA"), shipB: this.sigFor("shipB") },
      defense: this.defenseSimConfig(),
      overloaded: { shipA: this.overloadedFor("shipA"), shipB: this.overloadedFor("shipB") },
    };
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
      baseSig: state.baseSig ?? state.sig ?? 1,
      orbitDirection: "cw",
      ewar: this.ewarController.projection(side),
      boosts: this.boosterController.projection(side),
      missileBoosts: this.missileBoosterController.projection(side),
      sensorSpec: state.sensorSpec,
      sensorBoosts: this.sensorBoosterController.projection(side),
    };
  }

  private weaponsFor(side: Side): readonly WeaponSpec[] {
    const activeKind = this.weaponSystemSwitches[side].activeKind();
    const weapons: WeaponSpec[] = [];
    if (activeKind === "drone") {
      for (const spec of this.droneControllers[side].currentDroneSpecs()) weapons.push(spec);
    } else if (activeKind === "missile") {
      const missile = this.launcherControllers[side].currentMissileSpec();
      if (missile) weapons.push(missile);
    } else {
      for (const turret of this.turretControllers[side].currentTurretSpecs()) weapons.push(turret);
    }
    if (activeKind !== "turret") {
      for (const turret of this.turretControllers[side].currentTurretSpecs()) weapons.push(turret);
    }
    if (activeKind !== "missile") {
      const missile = this.launcherControllers[side].currentMissileSpec();
      if (missile) weapons.push(missile);
    }
    if (activeKind !== "drone") {
      for (const spec of this.droneControllers[side].currentDroneSpecs()) weapons.push(spec);
    }
    return weapons;
  }

  private sigFor(side: Side): number {
    return this.sideFor(side).capture().sig ?? 1;
  }

  private overloadedFor(side: Side): boolean {
    return this.sideFor(side).skillConditions().overloaded;
  }

  private sideFor(side: Side): SidePanelConfigSource {
    return side === "shipA" ? this.shipASide : this.shipBSide;
  }

  private defenseSimConfig(): EngineConfig["defense"] {
    return {
      shipA: this.defenseController.spec("shipA") ?? EMPTY_DEFENSE_SPEC,
      shipB: this.defenseController.spec("shipB") ?? EMPTY_DEFENSE_SPEC,
      damageEnabled: { shipA: this.defenseController.damageEnabled("shipA"), shipB: this.defenseController.damageEnabled("shipB") },
      repairMode: { shipA: this.defenseController.repairMode("shipA"), shipB: this.defenseController.repairMode("shipB") },
      repairerActivation: { shipA: this.defenseController.repairerActivation("shipA"), shipB: this.defenseController.repairerActivation("shipB") },
      rahActivation: { shipA: this.defenseController.rahActivation("shipA"), shipB: this.defenseController.rahActivation("shipB") },
    };
  }
}

interface SidePanelConfigSource {
  capture(): SidePanelState;
  skillConditions(): StatConditions;
}

function suppressedMaxSpeed(state: SidePanelState): number | undefined {
  const kind = state.fittedHull?.propulsionKind;
  if (kind === undefined) return undefined;
  if (kind === "microwarpdrive") return state.baseMaxSpeed ?? state.speed;
  return state.speed;
}
