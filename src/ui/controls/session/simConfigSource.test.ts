import type { EwarProjection, MissileBoosterProjection, TurretBoostProjection } from "../../../sim";
import type { FittedHullSummary } from "../../../appstate";
import type { SidePanelState } from "../sidePanel";
import type { EwarController } from "../ewar";
import type { BoosterController } from "../booster";
import type { MissileBoosterController } from "../missileBooster";
import { SimConfigSourceImpl } from "./simConfigSource";

function baseShipAState(): SidePanelState {
  return {
    speed: 400,
    baseMaxSpeed: 300,
    mass: 1_000_000,
    inertia: 3,
    mode: "orbit",
    range: 5000,
    aggressivity: 1.5,
    skillLevel: 5,
    overload: true, weaponOverload: false,
    hull: undefined,
    propulsion: undefined,
    fitting: undefined,
    overrides: {},
    fittedHull: undefined,
    sig: undefined,
    defenseSkills: undefined,
  };
}

function baseShipBState(): SidePanelState {
  return {
    speed: 250,
    baseMaxSpeed: 250,
    mass: 1_000_000,
    inertia: 3,
    mode: "orbit",
    range: 6000,
    aggressivity: 1,
    skillLevel: 5,
    overload: true, weaponOverload: false,
    hull: undefined,
    propulsion: undefined,
    fitting: undefined,
    overrides: {},
    fittedHull: undefined,
    sig: 40,
    defenseSkills: undefined,
  };
}

function ewarProjection(): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
    activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [] },
  };
}

function boostProjection(): TurretBoostProjection {
  return { loadout: { computers: [], scripts: [] }, activation: { computers: [] } };
}

function fittedHull(propulsionKind: "afterburner" | "microwarpdrive" | undefined): FittedHullSummary {
  return {
    fittingName: "Brawler",
    fitted: { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 },
    propulsionKind,
  };
}

function build() {
  const shipAState = baseShipAState();
  const shipBState = baseShipBState();
  const ewar = ewarProjection();
  const boost = boostProjection();
  const ewarController = vi.mocked<EwarController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? ewar : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const boosterController = vi.mocked<BoosterController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? boost : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const missileBoost: MissileBoosterProjection | undefined = undefined;
  const missileBoosterController = vi.mocked<MissileBoosterController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => (side === "shipA" ? missileBoost : undefined)),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const shipASide = { capture: vi.fn(() => shipAState) };
  const shipBSide = { capture: vi.fn(() => shipBState) };
  const distanceSource = { getInitialDistance: vi.fn(() => 6000) };
  return { shipASide, shipBSide, ewarController, boosterController, missileBoosterController, distanceSource, ewar, boost, missileBoost };
}

describe("SimConfigSourceImpl", () => {
  test("getConfig assembles shipA and shipB from side state, ewar, boosters and distance", () => {
    const deps = build();
    const source = new SimConfigSourceImpl({
      shipASide: deps.shipASide,
      shipBSide: deps.shipBSide,
      ewarController: deps.ewarController,
      boosterController: deps.boosterController,
      missileBoosterController: deps.missileBoosterController,
      distanceSource: deps.distanceSource,
    });
    const config = source.getConfig();
    expect(config.shipA.id).toBe("shipA");
    expect(config.shipA.maxSpeed).toBe(400);
    expect(config.shipA.baseMaxSpeed).toBe(300);
    expect(config.shipA.mass).toBe(1_000_000);
    expect(config.shipA.inertiaModifier).toBe(3);
    expect(config.shipA.mode).toBe("orbit");
    expect(config.shipA.desiredRange).toBe(5000);
    expect(config.shipA.aggressivity).toBe(1.5);
    expect(config.shipA.ewar).toBe(deps.ewar);
    expect(config.shipA.boosts).toBe(deps.boost);
    expect(config.shipA.missileBoosts).toBe(deps.missileBoost);
    expect(config.shipB.id).toBe("shipB");
    expect(config.shipB.maxSpeed).toBe(250);
    expect(config.shipB.baseMaxSpeed).toBe(250);
    expect(config.shipB.aggressivity).toBe(1);
    expect(config.shipB.ewar).toBeUndefined();
    expect(config.shipB.boosts).toBeUndefined();
    expect(config.shipB.missileBoosts).toBeUndefined();
    expect(config.initialDistance).toBe(6000);
    expect(deps.shipASide.capture).toHaveBeenCalled();
    expect(deps.shipBSide.capture).toHaveBeenCalled();
    expect(deps.distanceSource.getInitialDistance).toHaveBeenCalled();
  });

  test("getConfig falls back to current speed when baseMaxSpeed is missing", () => {
    const deps = build();
    deps.shipASide.capture = vi.fn(() => ({ ...baseShipAState(), baseMaxSpeed: undefined }));
    const source = new SimConfigSourceImpl({
      shipASide: deps.shipASide,
      shipBSide: deps.shipBSide,
      ewarController: deps.ewarController,
      boosterController: deps.boosterController,
      missileBoosterController: deps.missileBoosterController,
      distanceSource: deps.distanceSource,
    });
    const config = source.getConfig();
    expect(config.shipA.baseMaxSpeed).toBe(400);
  });

  test("getConfig sets suppressedMaxSpeed to speed for an afterburner fitted hull", () => {
    const deps = build();
    deps.shipASide.capture = vi.fn(() => ({ ...baseShipAState(), fittedHull: fittedHull("afterburner") }));
    const source = new SimConfigSourceImpl({
      shipASide: deps.shipASide,
      shipBSide: deps.shipBSide,
      ewarController: deps.ewarController,
      boosterController: deps.boosterController,
      missileBoosterController: deps.missileBoosterController,
      distanceSource: deps.distanceSource,
    });
    const config = source.getConfig();
    expect(config.shipA.suppressedMaxSpeed).toBe(400);
  });

  test("getConfig sets suppressedMaxSpeed to baseMaxSpeed for a microwarpdrive fitted hull", () => {
    const deps = build();
    deps.shipASide.capture = vi.fn(() => ({ ...baseShipAState(), fittedHull: fittedHull("microwarpdrive") }));
    const source = new SimConfigSourceImpl({
      shipASide: deps.shipASide,
      shipBSide: deps.shipBSide,
      ewarController: deps.ewarController,
      boosterController: deps.boosterController,
      missileBoosterController: deps.missileBoosterController,
      distanceSource: deps.distanceSource,
    });
    const config = source.getConfig();
    expect(config.shipA.suppressedMaxSpeed).toBe(300);
  });

  test("getConfig leaves suppressedMaxSpeed undefined when fittedHull is missing", () => {
    const deps = build();
    const source = new SimConfigSourceImpl({
      shipASide: deps.shipASide,
      shipBSide: deps.shipBSide,
      ewarController: deps.ewarController,
      boosterController: deps.boosterController,
      missileBoosterController: deps.missileBoosterController,
      distanceSource: deps.distanceSource,
    });
    const config = source.getConfig();
    expect(config.shipA.suppressedMaxSpeed).toBeUndefined();
    expect(config.shipB.suppressedMaxSpeed).toBeUndefined();
  });
});
