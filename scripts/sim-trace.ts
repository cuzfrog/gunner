import { asValue, createContainer, InjectionMode } from "awilix";
import { len, type Vec2 } from "../src/math";
import { registerSimModule, type AutopilotMode, type Kinematics, type SimConfig, type Simulation } from "../src/sim";

const FIXED_DT = 1 / 60;

interface TraceCradle {
  simConfig: SimConfig;
  simulation: Simulation;
  kinematics: Kinematics;
}

interface TraceParams {
  durationSeconds: number;
  sampleSeconds: number;
  config: SimConfig;
}

const AUTOPILOT_MODES: readonly AutopilotMode[] = ["orbit", "keepAtRange"];
const DEFAULT_ATTACKER_MODE: AutopilotMode = "keepAtRange";
const DEFAULT_TARGET_MODE: AutopilotMode = "orbit";

function parseParams(args: string[]): TraceParams {
  const draft = {
    durationSeconds: 120,
    sampleSeconds: 1,
    initialDistance: 5000,
    attacker: { maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: DEFAULT_ATTACKER_MODE, desiredRange: 5000 },
    target: { maxSpeed: 1000, mass: 10_000_000, inertiaModifier: 0.45, mode: DEFAULT_TARGET_MODE, desiredRange: 5000 },
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
    config: {
      attacker: { id: "attacker", ...draft.attacker },
      target: { id: "target", ...draft.target },
      initialDistance: draft.initialDistance,
    },
  };
}

function parseNumber(flag: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${flag} expects a number, got "${raw}"`);
  return value;
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
      len(snapshot.attacker.velocity).toFixed(1),
      len(snapshot.commands.attacker).toFixed(1),
      len(snapshot.target.velocity).toFixed(1),
      len(snapshot.commands.target).toFixed(1),
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
      `tau=${tau(attacker.mass, attacker.inertiaModifier)}s`,
    `target:   mode=${target.mode} speed=${target.maxSpeed} range=${target.desiredRange} ` +
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
  --target-speed <m/s>    --target-mode <mode>      --target-range <m>
  --target-mass <kg>      --target-inertia <modifier>
Modes: ${AUTOPILOT_MODES.join(", ")}`;

try {
  trace(parseParams(process.argv.slice(2)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
