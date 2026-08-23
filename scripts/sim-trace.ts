import { asClass, asValue, createContainer, InjectionMode } from "awilix";
import { ReactiveAutopilot, registerSimModule, Vec2, ALL_ACTIVE, type AutopilotMode, type CombatantConfig, type EwarProjection, type Kinematics, type ShipConfig, type SimConfig, type SimCradle, type Simulation } from "../src/sim";
import { registerShipsModule, type ShipsCradle, type StatConditions } from "../src/ships";
import { registerFittingModule, type FittingCradle, type FittingImport } from "../src/fitting";
import { readFileSync } from "node:fs";

const FIXED_DT = 1 / 60;

interface TraceCradle extends SimCradle, FittingCradle, ShipsCradle {}

type MutableCombatantConfig = { -readonly [K in keyof SimConfig["attacker"]]: SimConfig["attacker"][K] };

interface TraceParams {
  durationSeconds: number;
  sampleSeconds: number;
  attackerSteering: "predictive" | "reactive";
  attackerEwarFile: string | undefined;
  attackerEwarOverload: boolean;
  targetEwarFile: string | undefined;
  targetEwarOverload: boolean;
  config: SimConfig;
}

const AUTOPILOT_MODES: readonly AutopilotMode[] = ["orbit", "keepAtRange"];
const DEFAULT_ATTACKER_MODE: AutopilotMode = "keepAtRange";
const DEFAULT_TARGET_MODE: AutopilotMode = "orbit";

const DEFAULT_ATTACKER: MutableCombatantConfig = {
  id: "attacker",
  maxSpeed: 0,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: DEFAULT_ATTACKER_MODE,
  desiredRange: 5000,
  aggressivity: 1,
  orbitDirection: "cw",
};

const DEFAULT_TARGET: MutableCombatantConfig = {
  id: "target",
  maxSpeed: 1000,
  mass: 10_000_000,
  inertiaModifier: 0.45,
  mode: DEFAULT_TARGET_MODE,
  desiredRange: 5000,
  aggressivity: 0.01,
  orbitDirection: "cw",
};

function parseParams(args: string[]): TraceParams {
  const draft: {
    durationSeconds: number;
    sampleSeconds: number;
    attackerSteering: "predictive" | "reactive";
    initialDistance: number;
    attacker: MutableCombatantConfig;
    target: MutableCombatantConfig;
    attackerEwarFile: string | undefined;
    attackerEwarOverload: boolean;
    targetEwarFile: string | undefined;
    targetEwarOverload: boolean;
  } = {
    durationSeconds: 120,
    sampleSeconds: 1,
    attackerSteering: "predictive",
    initialDistance: 5000,
    attacker: { ...DEFAULT_ATTACKER },
    target: { ...DEFAULT_TARGET },
    attackerEwarFile: undefined,
    attackerEwarOverload: false,
    targetEwarFile: undefined,
    targetEwarOverload: false,
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
      case "--attacker-speed":
        draft.attacker.maxSpeed = parseNumber(flag, raw);
        break;
      case "--attacker-mode":
        draft.attacker.mode = parseMode(raw);
        break;
      case "--attacker-range":
        draft.attacker.desiredRange = parseNumber(flag, raw);
        break;
      case "--attacker-mass":
        draft.attacker.mass = parseNumber(flag, raw);
        break;
      case "--attacker-inertia":
        draft.attacker.inertiaModifier = parseNumber(flag, raw);
        break;
      case "--attacker-aggressivity":
        draft.attacker.aggressivity = parseAggressivity(flag, raw);
        break;
      case "--attacker-steering":
        draft.attackerSteering = parseAttackerSteering(raw);
        break;
      case "--attacker-ewar":
        draft.attackerEwarFile = raw;
        break;
      case "--attacker-ewar-overload":
        draft.attackerEwarOverload = parseBoolean(flag, raw);
        break;
      case "--target-speed":
        draft.target.maxSpeed = parseNumber(flag, raw);
        break;
      case "--target-mode":
        draft.target.mode = parseMode(raw);
        break;
      case "--target-range":
        draft.target.desiredRange = parseNumber(flag, raw);
        break;
      case "--target-mass":
        draft.target.mass = parseNumber(flag, raw);
        break;
      case "--target-inertia":
        draft.target.inertiaModifier = parseNumber(flag, raw);
        break;
      case "--target-ewar":
        draft.targetEwarFile = raw;
        break;
      case "--target-ewar-overload":
        draft.targetEwarOverload = parseBoolean(flag, raw);
        break;
      default:
        throw new Error(`Unknown flag ${flag}\n${USAGE}`);
    }
  }
  return {
    durationSeconds: draft.durationSeconds,
    sampleSeconds: draft.sampleSeconds,
    attackerSteering: draft.attackerSteering,
    attackerEwarFile: draft.attackerEwarFile,
    attackerEwarOverload: draft.attackerEwarOverload,
    targetEwarFile: draft.targetEwarFile,
    targetEwarOverload: draft.targetEwarOverload,
    config: {
      attacker: draft.attacker,
      target: draft.target,
      initialDistance: draft.initialDistance,
    },
  };
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

function parseAttackerSteering(raw: string): "predictive" | "reactive" {
  if (raw !== "predictive" && raw !== "reactive") {
    throw new Error(`--attacker-steering must be "predictive" or "reactive", got "${raw}"`);
  }
  return raw;
}

function isAutopilotMode(raw: string): raw is AutopilotMode {
  return AUTOPILOT_MODES.some((mode) => mode === raw);
}

function parseMode(raw: string): AutopilotMode {
  if (!isAutopilotMode(raw)) throw new Error(`Mode must be one of ${AUTOPILOT_MODES.join(", ")}, got "${raw}"`);
  return raw;
}

function loadEwarProjection(fittingImport: FittingImport, path: string, overloaded: boolean): EwarProjection {
  const text = readFileSync(path, "utf-8");
  const conditions: StatConditions = { skillLevel: 5, overloaded: false };
  const imported = fittingImport.importFitting(text, conditions);
  if (!imported) throw new Error(`Could not import ewar fitting from ${path}`);
  return { loadout: imported.ewar, activation: ALL_ACTIVE(imported.ewar), overloaded };
}

function trace(params: TraceParams): void {
  const container = createContainer<TraceCradle>({ injectionMode: InjectionMode.PROXY });
  registerSimModule(container);
  registerShipsModule(container);
  registerFittingModule(container);
  if (params.attackerSteering === "reactive") {
    container.register({ attackerSteering: asClass(ReactiveAutopilot).singleton() });
  }
  const fittingImport = container.cradle.fittingImport;
  const attacker: CombatantConfig = params.config.attacker;
  const target: CombatantConfig = params.config.target;
  const simConfig: SimConfig = {
    initialDistance: params.config.initialDistance,
    attacker: params.attackerEwarFile
      ? { ...attacker, ewar: loadEwarProjection(fittingImport, params.attackerEwarFile, params.attackerEwarOverload) }
      : attacker,
    target: params.targetEwarFile
      ? { ...target, ewar: loadEwarProjection(fittingImport, params.targetEwarFile, params.targetEwarOverload) }
      : target,
  };
  container.register({ simConfig: asValue(simConfig) });
  const simulation = container.cradle.simulation;
  const kinematics = container.cradle.kinematics;

  console.error(scenarioSummary(params));
  const columns = ["t", "dist", "radialVel", "angularVel", "aSpeed", "aCmd", "tSpeed", "tCmd", "tCmdRadial"];
  console.log(columns.join("\t"));

  const steps = Math.round(params.durationSeconds / FIXED_DT);
  const sampleEvery = Math.max(1, Math.round(params.sampleSeconds / FIXED_DT));
  for (let step = 0; step <= steps; step++) {
    if (step > 0) simulation.step(FIXED_DT);
    if (step % sampleEvery !== 0 && step !== steps) continue;
    const snapshot = simulation.snapshot();
    const frame = kinematics.computeEngagement(snapshot.attacker, snapshot.target, snapshot.time);
    const row = [
      frame.time.toFixed(1),
      frame.distance.toFixed(0),
      frame.radialVelocity.toFixed(1),
      frame.angularVelocity.toFixed(4),
      snapshot.attacker.velocity.len().toFixed(1),
      snapshot.commands.attacker.len().toFixed(1),
      snapshot.target.velocity.len().toFixed(1),
      snapshot.commands.target.len().toFixed(1),
      radialComponent(snapshot.commands.target, frame).toFixed(1),
    ];
    console.log(row.join("\t"));
  }
}

function radialComponent(command: Vec2, frame: { relPosition: Vec2; distance: number }): number {
  if (frame.distance === 0) return 0;
  return (command.x * frame.relPosition.x + command.y * frame.relPosition.y) / frame.distance;
}

function scenarioSummary(params: TraceParams): string {
  const { attacker, target } = params.config;
  const tau = (mass: number, inertia: number) => (mass * inertia * 1e-6).toFixed(2);
  return [
    `attacker: mode=${attacker.mode} speed=${attacker.maxSpeed} range=${attacker.desiredRange} ` +
      `aggressivity=${attacker.aggressivity} steering=${params.attackerSteering} ` +
      `tau=${tau(attacker.mass, attacker.inertiaModifier)}s`,
    `target:   mode=${target.mode} speed=${target.maxSpeed} range=${target.desiredRange} ` +
      `aggressivity=${target.aggressivity} ` +
      `tau=${tau(target.mass, target.inertiaModifier)}s`,
    `initial distance=${params.config.initialDistance} duration=${params.durationSeconds}s dt=${FIXED_DT}s`,
  ].join("\n");
}

const USAGE = `Usage: bun run scripts/sim-trace.ts -- [flags]
  --duration <s>          simulated seconds to run (default 120)
  --sample <s>            output interval in simulated seconds (default 1)
  --distance <m>          initial distance between ships (default 5000)
  --attacker-speed <m/s>  --attacker-mode <mode>    --attacker-range <m>
  --attacker-mass <kg>    --attacker-inertia <modifier>
  --attacker-aggressivity <value>  --attacker-steering <predictive|reactive>
  --attacker-ewar <path>  EFT fitting to read attacker ewar from
  --attacker-ewar-overload <true|false>
  --target-speed <m/s>    --target-mode <mode>      --target-range <m>
  --target-mass <kg>      --target-inertia <modifier>
  --target-ewar <path>    EFT fitting to read target ewar from
  --target-ewar-overload <true|false>
Modes: ${AUTOPILOT_MODES.join(", ")}`;

export { parseParams, loadEwarProjection };

if (import.meta.main) {
  try {
    trace(parseParams(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
