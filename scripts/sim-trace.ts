import { asClass, asValue, createContainer, InjectionMode } from "awilix";
import { ReactiveAutopilot, registerSimModule, Vec2, type AutopilotMode, type Kinematics, type ShipConfig, type SimConfig, type Simulation } from "../src/sim";

const FIXED_DT = 1 / 60;

interface TraceCradle {
  simConfig: SimConfig;
  simulation: Simulation;
  kinematics: Kinematics;
}

type MutableShipConfig = { -readonly [K in keyof ShipConfig]: ShipConfig[K] };

interface TraceParams {
  durationSeconds: number;
  sampleSeconds: number;
  attackerSteering: "predictive" | "reactive";
  config: SimConfig;
}

const AUTOPILOT_MODES: readonly AutopilotMode[] = ["orbit", "keepAtRange"];
const DEFAULT_ATTACKER_MODE: AutopilotMode = "keepAtRange";
const DEFAULT_TARGET_MODE: AutopilotMode = "orbit";

const DEFAULT_ATTACKER: MutableShipConfig = {
  id: "attacker",
  maxSpeed: 0,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: DEFAULT_ATTACKER_MODE,
  desiredRange: 5000,
  aggressivity: 1,
  orbitDirection: "cw",
};

const DEFAULT_TARGET: MutableShipConfig = {
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
    attacker: MutableShipConfig;
    target: MutableShipConfig;
  } = {
    durationSeconds: 120,
    sampleSeconds: 1,
    attackerSteering: "predictive",
    initialDistance: 5000,
    attacker: { ...DEFAULT_ATTACKER },
    target: { ...DEFAULT_TARGET },
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
      default:
        throw new Error(`Unknown flag ${flag}\n${USAGE}`);
    }
  }
  return {
    durationSeconds: draft.durationSeconds,
    sampleSeconds: draft.sampleSeconds,
    attackerSteering: draft.attackerSteering,
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

function trace(params: TraceParams): void {
  const container = createContainer<TraceCradle>({ injectionMode: InjectionMode.PROXY });
  registerSimModule(container);
  if (params.attackerSteering === "reactive") {
    container.register({ attackerSteering: asClass(ReactiveAutopilot).singleton() });
  }
  container.register({ simConfig: asValue(params.config) });
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

const USAGE = `Usage: bun run trace -- [flags]
  --duration <s>          simulated seconds to run (default 120)
  --sample <s>            output interval in simulated seconds (default 1)
  --distance <m>          initial distance between ships (default 5000)
  --attacker-speed <m/s>  --attacker-mode <mode>    --attacker-range <m>
  --attacker-mass <kg>    --attacker-inertia <modifier>
  --attacker-aggressivity <value>  --attacker-steering <predictive|reactive>
  --target-speed <m/s>    --target-mode <mode>      --target-range <m>
  --target-mass <kg>      --target-inertia <modifier>
Modes: ${AUTOPILOT_MODES.join(", ")}`;

try {
  trace(parseParams(process.argv.slice(2)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
