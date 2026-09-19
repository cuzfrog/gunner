import { EMPTY_BOOST_LOADOUT, EMPTY_EWAR_LOADOUT, EMPTY_MISSILE_BOOSTER_LOADOUT, EMPTY_SENSOR_BOOST_LOADOUT, EMPTY_DEFENSE_SPEC, scheduledDrainsFromProjections, type CombatantConfig, type EngineConfig, type SimConfig, type WeaponSpec } from "../../../sim";
import type { StatConditions } from "../../../ships";
import type { BoosterController } from "../booster";
import type { MissileBoosterController } from "../missileBooster";
import type { SensorBoosterController } from "../sensorBooster";
import type { EwarController } from "../ewar";
import type { DefenseController } from "../defense";
import type { CapacitorController } from "../capacitor";
import type { DroneController } from "../drone";
import type { FighterController } from "../fighter";
import type { LauncherController } from "../launcher";
import type { TurretController } from "../turret";
import type { WeaponSystemSwitch } from "../sidePanel";
import type { Side } from "../side";
import type { SidePanelState } from "../sidePanel";
import type { CapacitorStatsSource } from "./capacitorStatsSource";

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
  readonly fighterControllers: Record<Side, FighterController>;
  readonly defenseController: DefenseController;
  readonly capacitorController: CapacitorController;
  readonly capacitorStatsSource: CapacitorStatsSource;
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
  private readonly fighterControllers: Record<Side, FighterController>;
  private readonly defenseController: DefenseController;
  private readonly capacitorController: CapacitorController;
  private readonly capacitorStatsSource: CapacitorStatsSource;

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
    this.fighterControllers = deps.fighterControllers;
    this.defenseController = deps.defenseController;
    this.capacitorController = deps.capacitorController;
    this.capacitorStatsSource = deps.capacitorStatsSource;
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
      defense: this.defenseSimConfig(),
      overloaded: { shipA: this.overloadedFor("shipA"), shipB: this.overloadedFor("shipB") },
      capacitor: { shipA: this.capacitorSide("shipA"), shipB: this.capacitorSide("shipB") },
    };
  }

  private capacitorSide(side: Side): EngineConfig["capacitor"][Side] {
    const state = this.sideFor(side).capture();
    // Same gate as the capacitor popup: the summary keeps the module id after toggle-off as
    // variant-selection memory; a drain requires an active module. The row carries the
    // skill-modified amount and interval, so the runtime cannot diverge from the preview.
    const propulsionModuleId = state.fittedHull?.propulsionId !== undefined ? state.fittedHull.propulsionModuleId : undefined;
    const row = propulsionModuleId !== undefined ? this.capacitorStatsSource.stats(side)?.rows.find((candidate) => candidate.moduleId === propulsionModuleId) : undefined;
    // The net readout's drain basis is the same stat usage the popup renders (pyfa capUsed semantics),
    // so net + usage - incoming equals the regen curve at any pool level. The weapons split lets the
    // runtime subtract the lock-gated subset while no target lock is held.
    return {
      infinite: this.capacitorController.infiniteCapacitor(side),
      fittedDrainPerSecond: this.capacitorStatsSource.stats(side)?.usagePerSecond ?? 0,
      weaponsDrainPerSecond: this.capacitorStatsSource.stats(side)?.weaponsPerSecond ?? 0,
      drains: scheduledDrainsFromProjections(
        this.ewarController.projection(side) ?? { loadout: EMPTY_EWAR_LOADOUT, activation: undefined },
        this.boosterController.projection(side) ?? { loadout: EMPTY_BOOST_LOADOUT, activation: undefined },
        this.missileBoosterController.projection(side) ?? { loadout: EMPTY_MISSILE_BOOSTER_LOADOUT, activation: undefined },
        this.sensorBoosterController.projection(side) ?? { loadout: EMPTY_SENSOR_BOOST_LOADOUT, activation: undefined },
        this.capacitorStatsSource.commandBursts(side),
      ),
      boosters: this.capacitorController.capBoosterSpecs(side),
      ...(row ? { propulsion: { moduleId: row.moduleId, amount: row.amount, interval: row.cycleTime } } : {}),
    };
  }

  private buildCombatantConfig(state: SidePanelState, side: Side): CombatantConfig {
    return {
      id: side,
      maxSpeed: state.speed,
      baseMaxSpeed: state.baseMaxSpeed ?? state.speed,
      propulsionKind: state.fittedHull?.propulsionKind,
      mass: state.mass,
      inertiaModifier: state.inertia,
      mode: state.mode,
      desiredRange: state.range,
      aggressivity: state.aggressivity,
      sig: state.sig ?? 1,
      sigBloom: state.sigBloomFactor ?? 0,
      sigPenalty: this.defenseController.spec(side)?.signaturePenalty ?? 0,
      capacitor: state.capacitor,
      energyWarfareResistancePercent: state.energyWarfareResistancePercent,
      propulsionCapacityMultiplier: state.propulsionCapacityMultiplier,
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
    } else if (activeKind === "fighter") {
      for (const spec of this.fighterControllers[side].currentFighterSpecs()) weapons.push(spec);
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
    if (activeKind !== "fighter") {
      for (const spec of this.fighterControllers[side].currentFighterSpecs()) weapons.push(spec);
    }
    return weapons;
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

