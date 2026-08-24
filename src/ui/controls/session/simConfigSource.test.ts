import type { EwarProjection, TurretBoostProjection } from "../../../sim";
import type { SidePanelState } from "../sidePanel";
import type { EwarController } from "../ewar";
import type { BoosterController } from "../booster";
import { SimConfigSourceImpl } from "./simConfigSource";

function baseAttackerState(): SidePanelState {
  return {
    speed: 400,
    baseMaxSpeed: 300,
    mass: 1_000_000,
    inertia: 3,
    mode: "orbit",
    range: 5000,
    skillLevel: 5,
    overload: true,
    hull: undefined,
    propulsion: undefined,
    fitting: undefined,
    overrides: {},
    fittedHull: undefined,
    sig: undefined,
  };
}

function baseTargetState(): SidePanelState {
  return {
    speed: 250,
    baseMaxSpeed: 250,
    mass: 1_000_000,
    inertia: 3,
    mode: "orbit",
    range: 6000,
    skillLevel: 5,
    overload: true,
    hull: undefined,
    propulsion: undefined,
    fitting: undefined,
    overrides: {},
    fittedHull: undefined,
    sig: 40,
  };
}

function ewarProjection(): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
    activation: { webs: [], grapplers: [], disruptors: [], scramblers: [] },
  };
}

function boostProjection(): TurretBoostProjection {
  return { loadout: { computers: [], scripts: [] }, activation: { computers: [] } };
}

function build() {
  const attackerState = baseAttackerState();
  const targetState = baseTargetState();
  const ewar = ewarProjection();
  const boost = boostProjection();
  const ewarController = vi.mocked<EwarController>({
    setHost: vi.fn(),
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "attacker" | "target") => (side === "attacker" ? ewar : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const boosterController = vi.mocked<BoosterController>({
    setHost: vi.fn(),
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "attacker" | "target") => (side === "attacker" ? boost : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const attackerSide = { capture: vi.fn(() => attackerState) };
  const targetSide = { capture: vi.fn(() => targetState) };
  const preferencesController = { getManeuverAggressivity: vi.fn(() => 1.5) };
  const distanceSource = { getInitialDistance: vi.fn(() => 6000) };
  return { attackerSide, targetSide, preferencesController, ewarController, boosterController, distanceSource, ewar, boost };
}

describe("SimConfigSourceImpl", () => {
  test("getConfig assembles attacker and target from side state, preferences, ewar, boosters and distance", () => {
    const deps = build();
    const source = new SimConfigSourceImpl({
      attackerSide: deps.attackerSide,
      targetSide: deps.targetSide,
      preferencesController: deps.preferencesController,
      ewarController: deps.ewarController,
      boosterController: deps.boosterController,
      distanceSource: deps.distanceSource,
    });
    const config = source.getConfig();
    expect(config.attacker.id).toBe("attacker");
    expect(config.attacker.maxSpeed).toBe(400);
    expect(config.attacker.baseMaxSpeed).toBe(300);
    expect(config.attacker.mass).toBe(1_000_000);
    expect(config.attacker.inertiaModifier).toBe(3);
    expect(config.attacker.mode).toBe("orbit");
    expect(config.attacker.desiredRange).toBe(5000);
    expect(config.attacker.aggressivity).toBe(1.5);
    expect(config.attacker.ewar).toBe(deps.ewar);
    expect(config.attacker.boosts).toBe(deps.boost);
    expect(config.target.id).toBe("target");
    expect(config.target.maxSpeed).toBe(250);
    expect(config.target.baseMaxSpeed).toBe(250);
    expect(config.target.aggressivity).toBe(0.01);
    expect(config.target.ewar).toBeUndefined();
    expect(config.target.boosts).toBeUndefined();
    expect(config.initialDistance).toBe(6000);
    expect(deps.attackerSide.capture).toHaveBeenCalled();
    expect(deps.targetSide.capture).toHaveBeenCalled();
    expect(deps.preferencesController.getManeuverAggressivity).toHaveBeenCalled();
    expect(deps.distanceSource.getInitialDistance).toHaveBeenCalled();
  });

  test("getConfig falls back to current speed when baseMaxSpeed is missing", () => {
    const deps = build();
    deps.attackerSide.capture = vi.fn(() => ({ ...baseAttackerState(), baseMaxSpeed: undefined }));
    const source = new SimConfigSourceImpl({
      attackerSide: deps.attackerSide,
      targetSide: deps.targetSide,
      preferencesController: deps.preferencesController,
      ewarController: deps.ewarController,
      boosterController: deps.boosterController,
      distanceSource: deps.distanceSource,
    });
    const config = source.getConfig();
    expect(config.attacker.baseMaxSpeed).toBe(400);
  });
});
