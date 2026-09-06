import { asClass, asValue, createContainer, InjectionMode } from "awilix";
import {
  ReactiveAutopilot,
  registerSimModule,
  Vec2,
  type AutopilotMode,
  type CombatantConfig,
  type EwarProjection,
  type Kinematics,
  type SimConfig,
  type SimCradle,
  type Simulation,
  type SimValueParser,
} from "../src/sim";
import { DAMAGE_TYPES, DEFENSE_LAYERS, EMPTY_DEFENSE_SPEC, SIG_RESOLUTIONS, damageVectorSum, type BoostLoadout, type DefenseSpec, type DroneSpec, type EngagementEngine, type EngineConfig, type EngineView, type MissileBoosterLoadout, type MissileBoosterProjection, type MissileSpec, type SensorBoostLoadout, type SensorBoostProjection, type Side, type TurretBoostProjection, type TurretSpec, type WeaponSpec } from "../src/sim";
import { registerShipsModule, type Ships, type ShipsCradle, type StatConditions } from "../src/ships";
import { registerFittingModule, type FittingCradle, type FittingImport, type ImportedDrone, type ImportedFitting, type ImportedLauncher, type ImportedTurret } from "../src/fitting";
import { registerGameDataModule } from "../src/gamedata";
import { toTypeId } from "../src/gamedata/ids";
import { readFileSync } from "node:fs";

const FIXED_DT = 1 / 60;

type MutableCombatantConfig = { -readonly [K in keyof SimConfig["shipA"]]: SimConfig["shipA"][K] };

interface TraceParams {
  readonly durationSeconds: number;
  readonly sampleSeconds: number;
  readonly shipASteering: "predictive" | "reactive";
  readonly config: SimConfig;
  readonly engineConfig: EngineConfig | undefined;
}

interface TraceCradle extends SimCradle, FittingCradle, ShipsCradle {
  readonly traceParamsParser: TraceParamsParser;
  readonly simTrace: SimTrace;
  readonly engine: EngagementEngine;
}

export interface TraceParamsParser {
  parse(args: string[]): TraceParams;
}

export interface SimTrace {
  trace(params: TraceParams): void;
}

const AUTOPILOT_MODES: readonly AutopilotMode[] = ["orbit", "keepAtRange"];
const DEFAULT_SHIP_A_MODE: AutopilotMode = "keepAtRange";
const DEFAULT_SHIP_B_MODE: AutopilotMode = "orbit";

const DEFAULT_SHIP_A: MutableCombatantConfig = {
  id: "shipA",
  maxSpeed: 0,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: DEFAULT_SHIP_A_MODE,
  desiredRange: 5000,
  aggressivity: 1,
  orbitDirection: "cw",
};

const DEFAULT_SHIP_B: MutableCombatantConfig = {
  id: "shipB",
  maxSpeed: 1000,
  mass: 10_000_000,
  inertiaModifier: 0.45,
  mode: DEFAULT_SHIP_B_MODE,
  desiredRange: 5000,
  aggressivity: 0.01,
  orbitDirection: "cw",
};

class TraceParamsParserImpl implements TraceParamsParser {
  private readonly simValueParser: SimValueParser;
  private readonly fittingImport: FittingImport;
  private readonly ships: Ships;

  constructor({ simValueParser, fittingImport, ships }: { simValueParser: SimValueParser; fittingImport: FittingImport; ships: Ships }) {
    this.simValueParser = simValueParser;
    this.fittingImport = fittingImport;
    this.ships = ships;
  }

  parse(args: string[]): TraceParams {
    const draft = {
      durationSeconds: 120,
      sampleSeconds: 1,
      shipASteering: "predictive" as "predictive" | "reactive",
      initialDistance: 5000,
      shipA: { ...DEFAULT_SHIP_A },
      shipB: { ...DEFAULT_SHIP_B },
      shipAFitFile: undefined as string | undefined,
      shipBFitFile: undefined as string | undefined,
      shipAEwarFile: undefined as string | undefined,
      shipAEwarOverload: false,
      shipBEwarFile: undefined as string | undefined,
      shipBEwarOverload: false,
    };
    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i];
      const raw = args[i + 1];
      if (raw === undefined) throw new Error(`Missing value for ${flag}\n${USAGE}`);
      switch (flag) {
        case "--duration":
          draft.durationSeconds = parseNumber(flag, raw);
          break;
        case "--sample":
          draft.sampleSeconds = parseNumber(flag, raw);
          break;
        case "--distance":
          draft.initialDistance = parseNumber(flag, raw);
          break;
        case "--ship-a-fit":
          draft.shipAFitFile = raw;
          break;
        case "--ship-b-fit":
          draft.shipBFitFile = raw;
          break;
        case "--ship-a-speed":
          draft.shipA.maxSpeed = parseNumber(flag, raw);
          break;
        case "--ship-a-mode":
          draft.shipA.mode = this.parseMode(raw);
          break;
        case "--ship-a-range":
          draft.shipA.desiredRange = parseNumber(flag, raw);
          break;
        case "--ship-a-mass":
          draft.shipA.mass = parseNumber(flag, raw);
          break;
        case "--ship-a-inertia":
          draft.shipA.inertiaModifier = parseNumber(flag, raw);
          break;
        case "--ship-a-aggressivity":
          draft.shipA.aggressivity = parseAggressivity(flag, raw);
          break;
        case "--ship-a-steering":
          draft.shipASteering = parseShipASteering(raw);
          break;
        case "--ship-a-ewar":
          draft.shipAEwarFile = raw;
          break;
        case "--ship-a-ewar-overload":
          draft.shipAEwarOverload = parseBoolean(flag, raw);
          break;
        case "--ship-b-speed":
          draft.shipB.maxSpeed = parseNumber(flag, raw);
          break;
        case "--ship-b-mode":
          draft.shipB.mode = this.parseMode(raw);
          break;
        case "--ship-b-range":
          draft.shipB.desiredRange = parseNumber(flag, raw);
          break;
        case "--ship-b-mass":
          draft.shipB.mass = parseNumber(flag, raw);
          break;
        case "--ship-b-inertia":
          draft.shipB.inertiaModifier = parseNumber(flag, raw);
          break;
        case "--ship-b-ewar":
          draft.shipBEwarFile = raw;
          break;
        case "--ship-b-ewar-overload":
          draft.shipBEwarOverload = parseBoolean(flag, raw);
          break;
        default:
          throw new Error(`Unknown flag ${flag}\n${USAGE}`);
      }
    }
    const shipA: CombatantConfig = draft.shipAEwarFile
      ? { ...draft.shipA, ewar: this.loadEwarProjection(draft.shipAEwarFile, draft.shipAEwarOverload) }
      : draft.shipA;
    const shipB: CombatantConfig = draft.shipBEwarFile
      ? { ...draft.shipB, ewar: this.loadEwarProjection(draft.shipBEwarFile, draft.shipBEwarOverload) }
      : draft.shipB;
    const config: SimConfig = { shipA, shipB, initialDistance: draft.initialDistance };
    const engineConfig = draft.shipAFitFile || draft.shipBFitFile
      ? this.buildEngineConfig(config, draft.shipAFitFile, draft.shipBFitFile)
      : undefined;
    return {
      durationSeconds: draft.durationSeconds,
      sampleSeconds: draft.sampleSeconds,
      shipASteering: draft.shipASteering,
      config,
      engineConfig,
    };
  }

  private buildEngineConfig(config: SimConfig, shipAFitFile?: string, shipBFitFile?: string): EngineConfig {
    const shipAImport = shipAFitFile ? this.importFit(shipAFitFile) : undefined;
    const shipBImport = shipBFitFile ? this.importFit(shipBFitFile) : undefined;
    const sim: SimConfig = {
      shipA: shipAImport ? this.combatantFromImport(shipAImport, config.shipA) : config.shipA,
      shipB: shipBImport ? this.combatantFromImport(shipBImport, config.shipB) : config.shipB,
      initialDistance: config.initialDistance,
    };
    return {
      sim,
      weapons: {
        shipA: shipAImport ? weaponSpecsFromImport(shipAImport) : [],
        shipB: shipBImport ? weaponSpecsFromImport(shipBImport) : [],
      },
      defense: {
        shipA: shipAImport?.defense ?? EMPTY_DEFENSE_SPEC,
        shipB: shipBImport?.defense ?? EMPTY_DEFENSE_SPEC,
        damageEnabled: { shipA: true, shipB: true },
        repairMode: { shipA: "auto", shipB: "auto" },
        repairerActivation: { shipA: repairerActivationFrom(shipAImport), shipB: repairerActivationFrom(shipBImport) },
        rahActivation: { shipA: undefined, shipB: undefined },
      },
      overloaded: { shipA: false, shipB: false },
    };
  }

  private importFit(path: string): ImportedFitting {
    const text = readFileSync(path, "utf-8");
    const conditions: StatConditions = { skillLevel: 5, overloaded: false, weaponOverloaded: false };
    const imported = this.fittingImport.importFitting(text, conditions);
    if (!imported) throw new Error(`Could not import fitting from ${path}`);
    return imported;
  }

  private combatantFromImport(imported: ImportedFitting, overrides: MutableCombatantConfig): CombatantConfig {
    const conditions: StatConditions = { skillLevel: 5, overloaded: false, weaponOverloaded: false };
    const stats = this.ships.fittedStats(imported.profile, imported.fitted, imported.propulsion, conditions);
    return {
      id: overrides.id,
      maxSpeed: overrides.maxSpeed > 0 ? overrides.maxSpeed : stats.maxSpeed,
      baseMaxSpeed: stats.baseMaxSpeed,
      propulsionKind: imported.propulsion ? propulsionKindOf(imported.propulsion.propulsionId) : undefined,
      mass: stats.mass,
      inertiaModifier: stats.inertiaModifier,
      mode: overrides.mode,
      desiredRange: overrides.desiredRange,
      aggressivity: overrides.aggressivity,
      sig: stats.sigRadius,
      sigBloom: stats.sigBloomFactor,
      sigPenalty: imported.defense.signaturePenalty,
      orbitDirection: overrides.orbitDirection,
      ewar: buildEwarProjection(imported.ewar, false),
      boosts: boostProjectionFrom(imported.boosts),
      missileBoosts: missileBoostProjectionFrom(imported.missileBoosts),
      sensorBoosts: sensorBoostProjectionFrom(imported.sensorBoosts),
      sensorSpec: imported.sensorSpec,
    };
  }

  private parseMode(raw: string): AutopilotMode {
    const parsed = this.simValueParser.parseAutopilotMode(raw);
    if (parsed === undefined || !AUTOPILOT_MODES.includes(parsed)) {
      throw new Error(`Mode must be one of ${AUTOPILOT_MODES.join(", ")}, got "${raw}"`);
    }
    return parsed;
  }

  private loadEwarProjection(path: string, overloaded: boolean): EwarProjection {
    const text = readFileSync(path, "utf-8");
    const conditions: StatConditions = { skillLevel: 5, overloaded: false, weaponOverloaded: false };
    const imported = this.fittingImport.importFitting(text, conditions);
    if (!imported) throw new Error(`Could not import ewar fitting from ${path}`);
    return buildEwarProjection(imported.ewar, overloaded);
  }
}

class SimTraceImpl implements SimTrace {
  private readonly simulation: Simulation;
  private readonly kinematics: Kinematics;
  private readonly engine: EngagementEngine;

  constructor({ simulation, kinematics, engine }: { simulation: Simulation; kinematics: Kinematics; engine: EngagementEngine }) {
    this.simulation = simulation;
    this.kinematics = kinematics;
    this.engine = engine;
  }

  trace(params: TraceParams): void {
    if (params.engineConfig) {
      this.traceCombat(params);
      return;
    }
    console.error(scenarioSummary(params));
    const columns = ["t", "dist", "radialVel", "angularVel", "aSpeed", "aCmd", "tSpeed", "tCmd", "tCmdRadial"];
    console.log(columns.join("\t"));

    const steps = Math.round(params.durationSeconds / FIXED_DT);
    const sampleEvery = Math.max(1, Math.round(params.sampleSeconds / FIXED_DT));
    for (let step = 0; step <= steps; step++) {
      if (step > 0) this.simulation.step(FIXED_DT);
      if (step % sampleEvery !== 0 && step !== steps) continue;
      const snapshot = this.simulation.snapshot();
      const frame = this.kinematics.computeEngagement(snapshot.shipA, snapshot.shipB, snapshot.time);
      console.log(traceRow(snapshot, frame).join("\t"));
    }
  }

  private traceCombat(params: TraceParams): void {
    const engineConfig = params.engineConfig;
    if (!engineConfig) throw new Error("combat trace requires an engine config");
    console.error(combatScenarioSummary(engineConfig));
    const columns = ["t", "dist", "aApplied", "aInflicted", "tApplied", "tInflicted", "aShield", "aArmor", "aHull", "tShield", "tArmor", "tHull"];
    console.log(columns.join("\t"));

    const view = this.engine.reset(engineConfig);
    console.log(combatRow(view).join("\t"));
    const steps = Math.round(params.durationSeconds / FIXED_DT);
    const sampleEvery = Math.max(1, Math.round(params.sampleSeconds / FIXED_DT));
    for (let step = 1; step <= steps; step++) {
      const current = this.engine.step(FIXED_DT);
      if (step % sampleEvery !== 0 && step !== steps) continue;
      console.log(combatRow(current).join("\t"));
    }
  }
}

function parseNumber(flag: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${flag} expects a number, got "${raw}"`);
  return value;
}

function parseBoolean(flag: string, raw: string): boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${flag} expects "true" or "false", got "${raw}"`);
}

function parseAggressivity(flag: string, raw: string): number {
  const value = parseNumber(flag, raw);
  if (value <= 0) throw new Error(`${flag} must be positive, got "${raw}"`);
  return value;
}

function parseShipASteering(raw: string): "predictive" | "reactive" {
  if (raw !== "predictive" && raw !== "reactive") {
    throw new Error(`--ship-a-steering must be "predictive" or "reactive", got "${raw}"`);
  }
  return raw;
}

function buildEwarProjection(loadout: EwarProjection["loadout"], overloaded: boolean): EwarProjection {
  const { webs, grapplers, disruptors, scramblers = [], painters = [] } = loadout;
  return {
    loadout,
    activation: {
      webs: webs.map(() => ({ active: true, overloaded })),
      grapplers: grapplers.map(() => ({ active: true, overloaded })),
      disruptors: disruptors.map(() => ({ active: true, overloaded, script: undefined })),
      scramblers: scramblers.map(() => ({ active: true, overloaded })),
      painters: painters.map(() => ({ active: true, overloaded })),
      dampeners: [],
    },
  };
}

function traceRow(
  snapshot: { shipA: { velocity: Vec2 }; shipB: { velocity: Vec2 }; commands: { shipA: Vec2; shipB: Vec2 } },
  frame: { time: number; distance: number; radialVelocity: number; angularVelocity: number; relPosition: Vec2 },
): string[] {
  return [
    frame.time.toFixed(1),
    frame.distance.toFixed(0),
    frame.radialVelocity.toFixed(1),
    frame.angularVelocity.toFixed(4),
    snapshot.shipA.velocity.len().toFixed(1),
    snapshot.commands.shipA.len().toFixed(1),
    snapshot.shipB.velocity.len().toFixed(1),
    snapshot.commands.shipB.len().toFixed(1),
    radialComponent(snapshot.commands.shipB, frame).toFixed(1),
  ];
}

function radialComponent(command: Vec2, frame: { relPosition: Vec2; distance: number }): number {
  if (frame.distance === 0) return 0;
  return (command.x * frame.relPosition.x + command.y * frame.relPosition.y) / frame.distance;
}

function combatRow(view: EngineView): string[] {
  const aAttack = view.attacks.shipA?.damage.appliedDps ?? 0;
  const tAttack = view.attacks.shipB?.damage.appliedDps ?? 0;
  const aPools = view.defenseRuntime.poolPercentages.shipA;
  const tPools = view.defenseRuntime.poolPercentages.shipB;
  return [
    view.frame.time.toFixed(1),
    view.frame.distance.toFixed(0),
    aAttack.toFixed(1),
    view.projection.shipB.totalInflicted.toFixed(1),
    tAttack.toFixed(1),
    view.projection.shipA.totalInflicted.toFixed(1),
    aPools.shield.toFixed(3),
    aPools.armor.toFixed(3),
    aPools.hull.toFixed(3),
    tPools.shield.toFixed(3),
    tPools.armor.toFixed(3),
    tPools.hull.toFixed(3),
  ];
}

function combatScenarioSummary(config: EngineConfig): string {
  const describe = (side: Side, weapons: readonly WeaponSpec[], defense: DefenseSpec): string => {
    const parts = weapons.map((weapon) => {
      if (weapon.kind === "turret") return `turret dps=${(damageVectorSum(weapon.damagePerShot) * weapon.turretCount / weapon.cycleTime).toFixed(1)}`;
      if (weapon.kind === "missile") return `missile dps=${(damageVectorSum(weapon.damagePerMissile) * weapon.launcherCount / weapon.cycleTime).toFixed(1)}`;
      return `drone dps=${(damageVectorSum(weapon.damagePerShot) * weapon.droneCount / weapon.cycleTime).toFixed(1)}`;
    });
    const layers = DEFENSE_LAYERS.map((layer) => {
      const spec = defense.layers[layer];
      const resists = DAMAGE_TYPES.map((type) => `${type[0].toUpperCase()}${(spec.resists[type] * 100).toFixed(0)}`).join("/");
      return `${layer} hp=${spec.hp} ${resists}`;
    });
    return `${side}: ${parts.join(", ") || "no weapons"} | ${layers.join(" | ")}`;
  };
  return [
    describe("shipA", config.weapons.shipA, config.defense.shipA),
    describe("shipB", config.weapons.shipB, config.defense.shipB),
  ].join("\n");
}

function scenarioSummary(params: TraceParams): string {
  const { shipA, shipB } = params.config;
  const tau = (mass: number, inertia: number) => (mass * inertia * 1e-6).toFixed(2);
  return [
    `shipA: mode=${shipA.mode} speed=${shipA.maxSpeed} range=${shipA.desiredRange} ` +
      `aggressivity=${shipA.aggressivity} steering=${params.shipASteering} ` +
      `tau=${tau(shipA.mass, shipA.inertiaModifier)}s`,
    `shipB:   mode=${shipB.mode} speed=${shipB.maxSpeed} range=${shipB.desiredRange} ` +
      `aggressivity=${shipB.aggressivity} ` +
      `tau=${tau(shipB.mass, shipB.inertiaModifier)}s`,
    `initial distance=${params.config.initialDistance} duration=${params.durationSeconds}s dt=${FIXED_DT}s`,
  ].join("\n");
}

const USAGE = `Usage: bun run scripts/sim-trace.ts -- [flags]
  --duration <s>          simulated seconds to run (default 120)
  --sample <s>            output interval in simulated seconds (default 1)
  --distance <m>          initial distance between ships (default 5000)
  --ship-a-fit <path>     EFT fitting for shipA: enables the full combat trace
  --ship-b-fit <path>     EFT fitting for shipB: enables the full combat trace
  --ship-a-speed <m/s>  --ship-a-mode <mode>    --ship-a-range <m>
  --ship-a-mass <kg>    --ship-a-inertia <modifier>
  --ship-a-aggressivity <value>  --ship-a-steering <predictive|reactive>
  --ship-a-ewar <path>  EFT fitting to read shipA ewar from
  --ship-a-ewar-overload <true|false>
  --ship-b-speed <m/s>    --ship-b-mode <mode>      --ship-b-range <m>
  --ship-b-mass <kg>      --ship-b-inertia <modifier>
  --ship-b-ewar <path>    EFT fitting to read shipB ewar from
  --ship-b-ewar-overload <true|false>
Modes: ${AUTOPILOT_MODES.join(", ")}`;

function weaponSpecsFromImport(imported: ImportedFitting): readonly WeaponSpec[] {
  const weapons: WeaponSpec[] = [];
  for (const turret of imported.turrets ?? []) weapons.push(turretSpecFrom(turret));
  if (imported.launcher) weapons.push(missileSpecFrom(imported.launcher));
  for (const drone of imported.drones) weapons.push(droneSpecFrom(drone));
  return weapons;
}

function turretSpecFrom(turret: ImportedTurret): TurretSpec {
  return {
    kind: "turret",
    moduleId: toTypeId("1"),
    tracking: turret.tracking,
    sigResolution: SIG_RESOLUTIONS[turret.sigResolutionClass],
    optimal: turret.optimal,
    falloff: turret.falloff,
    damagePerShot: turret.damagePerShot,
    cycleTime: turret.cycleTime,
    turretCount: turret.turretCount,
  };
}

function missileSpecFrom(launcher: ImportedLauncher): MissileSpec {
  return {
    kind: "missile",
    moduleId: toTypeId("2"),
    damagePerMissile: launcher.damagePerMissile,
    cycleTime: launcher.cycleTime,
    launcherCount: launcher.count,
    explosionRadius: launcher.explosionRadius,
    explosionVelocity: launcher.explosionVelocity,
    damageReductionFactor: launcher.damageReductionFactor,
    maxVelocity: launcher.maxVelocity,
    flightTime: launcher.flightTime,
    flightRange: launcher.maxVelocity * launcher.flightTime,
  };
}

function droneSpecFrom(drone: ImportedDrone): DroneSpec {
  return {
    kind: "drone",
    moduleId: toTypeId("3"),
    tracking: drone.tracking,
    sigResolution: drone.sigResolution,
    optimal: drone.optimal,
    falloff: drone.falloff,
    damagePerShot: { em: drone.emDamage, thermal: drone.thermalDamage, kinetic: drone.kineticDamage, explosive: drone.explosiveDamage },
    cycleTime: drone.cycleTime,
    droneCount: drone.count,
    maxVelocity: drone.maxVelocity,
    orbitSpeed: drone.orbitSpeed,
    orbitRange: drone.orbitRange,
    isSentry: drone.maxVelocity === 0,
    controlRange: drone.controlRange,
  };
}

function repairerActivationFrom(imported: ImportedFitting | undefined): EngineConfig["defense"]["repairerActivation"]["shipA"] {
  if (!imported) return [];
  return imported.defense.repairers.map(() => ({ active: true, overloaded: false }));
}

function propulsionKindOf(propulsionId: string): "afterburner" | "microwarpdrive" {
  return propulsionId.startsWith("mwd") ? "microwarpdrive" : "afterburner";
}

function boostProjectionFrom(loadout: BoostLoadout): TurretBoostProjection | undefined {
  if (loadout.computers.length === 0) return undefined;
  return { loadout, activation: { computers: loadout.computers.map(() => ({ active: true, overloaded: false, script: undefined })) } };
}

function missileBoostProjectionFrom(loadout: MissileBoosterLoadout): MissileBoosterProjection | undefined {
  if (loadout.computers.length === 0) return undefined;
  return { loadout, activation: { computers: loadout.computers.map(() => ({ active: true, overloaded: false, script: undefined })) } };
}

function sensorBoostProjectionFrom(loadout: SensorBoostLoadout): SensorBoostProjection | undefined {
  if (loadout.boosters.length === 0) return undefined;
  return { loadout, activation: loadout.boosters.map(() => ({ active: true, overloaded: false, script: undefined })) };
}

export { TraceParamsParserImpl as _TraceParamsParserImpl };

if (import.meta.main) {
  try {
    const container = createContainer<TraceCradle>({ injectionMode: InjectionMode.PROXY });
    registerGameDataModule(container);
    registerSimModule(container);
    registerShipsModule(container);
    registerFittingModule(container);
    container.register({
      traceParamsParser: asClass(TraceParamsParserImpl).singleton(),
      simTrace: asClass(SimTraceImpl).singleton(),
    });
    const params = container.cradle.traceParamsParser.parse(process.argv.slice(2));
    if (params.shipASteering === "reactive") {
      container.register({ shipASteering: asClass(ReactiveAutopilot).singleton() });
    }
    container.register({ simConfig: asValue(params.config) });
    container.cradle.simTrace.trace(params);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
