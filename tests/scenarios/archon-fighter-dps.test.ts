import { asValue, createContainer, InjectionMode } from "awilix";
import { registerSimModule, ZERO_RESISTS, type DefenseSpec, type EngineConfig, type EngagementEngine, type FighterSpec, type ShipConfig, type SimCradle, type SimConfig } from "../../src/sim";
import { toTypeId } from "../../src/gamedata/ids";

function stationaryHull(id: "shipA" | "shipB"): ShipConfig {
  return { id, maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1, sig: 100 };
}

function tankedDefense(hp: number): DefenseSpec {
  return { layers: { shield: { hp, resists: ZERO_RESISTS }, armor: { hp, resists: ZERO_RESISTS }, hull: { hp, resists: ZERO_RESISTS } }, shieldRechargeTime: 0, repairers: [], signaturePenalty: 0, shieldUniformity: 0.25 };
}

function engineConfig(sim: SimConfig, shipAWeapons: EngineConfig["weapons"]["shipA"]): EngineConfig {
  return {
    sim,
    weapons: { shipA: shipAWeapons, shipB: [] },
    defense: { shipA: tankedDefense(1_000_000), shipB: tankedDefense(1_000_000), damageEnabled: { shipA: true, shipB: true }, repairMode: { shipA: "auto", shipB: "auto" }, repairerActivation: { shipA: [], shipB: [] }, rahActivation: { shipA: undefined, shipB: undefined } },
    overloaded: { shipA: false, shipB: false },
    capacitor: { shipA: { infinite: false, drains: [], boosters: [], fittedDrainPerSecond: 0, weaponsDrainPerSecond: 0 }, shipB: { infinite: false, drains: [], boosters: [], fittedDrainPerSecond: 0, weaponsDrainPerSecond: 0 } },
  };
}

function makeEngine(sim: SimConfig, shipAWeapons: EngineConfig["weapons"]["shipA"]): EngagementEngine {
  const container = createContainer<SimCradle & { simConfig: SimConfig }>({ injectionMode: InjectionMode.PROXY });
  container.register({ simConfig: asValue(sim) });
  registerSimModule(container);
  return container.resolve("engine");
}

/** Templar I squadron on an Archon at all-5 skills: the fitting-layer output the sim consumes (pyfa goldens). */
const TEMPLAR_SQUADRON: FighterSpec = {
  kind: "fighter",
  moduleId: toTypeId("34359"),
  damagePerVolley: { em: 97.5 * 1.875, thermal: 0, kinetic: 0, explosive: 0 },
  cycleTime: 5,
  fighterCount: 6,
  maxVelocity: 833 * 1.5625,
  orbitRange: 6500,
  explosionRadius: 185,
  explosionVelocity: 105,
  damageReductionFactor: Math.log(3) / Math.log(5.5),
  optimal: 10000,
  falloff: 5000,
  magazine: { numShots: 12, rearmTime: 4, refuelingTime: 5 },
};

const NOMINAL_DPS = 219.375; // 97.5 * 1.875 * 6 / 5
const STATIONARY_APPLICATION = 100 / 185; // sig 100 hull, explosion radius 185, no velocity term

describe("Archon Templar squadron end to end", () => {
  test("squadron applies the pyfa stationary-target application against a sig-100 hull", () => {
    const sim: SimConfig = { shipA: stationaryHull("shipA"), shipB: stationaryHull("shipB"), initialDistance: 5000 };
    const engine = makeEngine(sim, [TEMPLAR_SQUADRON]);
    engine.reset(engineConfig(sim, [TEMPLAR_SQUADRON]));
    for (let i = 0; i < 8; i++) engine.step(0.5);
    const view = engine.view();
    const attack = view.weaponAttacks.shipA[0];
    expect(attack).toBeDefined();
    const fighter = attack!.assessment.fighter;
    expect(fighter).toBeDefined();
    expect(attack!.assessment.damage.nominalDps).toBeCloseTo(NOMINAL_DPS, 9);
    expect(fighter!.rangeFactor).toBe(1);
    expect(fighter!.signatureTerm).toBeCloseTo(STATIONARY_APPLICATION, 9);
    expect(fighter!.velocityTerm).toBe(1);
    expect(attack!.assessment.damage.appliedDps).toBeCloseTo(NOMINAL_DPS * STATIONARY_APPLICATION, 9);
    expect(attack!.assessment.damage.appliedVolleyByType.em).toBeCloseTo(1096.875 * STATIONARY_APPLICATION, 9);
  });

  test("view carries squadron readout, specs and live fighter positions", () => {
    const sim: SimConfig = { shipA: stationaryHull("shipA"), shipB: stationaryHull("shipB"), initialDistance: 5000 };
    const engine = makeEngine(sim, [TEMPLAR_SQUADRON]);
    engine.reset(engineConfig(sim, [TEMPLAR_SQUADRON]));
    for (let i = 0; i < 600; i++) engine.step(0.5);
    const view = engine.view();
    expect(view.fighterSpecs.shipA).toEqual([TEMPLAR_SQUADRON]);
    const squadron = view.fighters.shipA[0];
    expect(squadron).toBeDefined();
    expect(squadron!.positions).toHaveLength(6);
    for (const position of squadron!.positions) {
      const dist = position.dist(view.snapshot.shipB.position);
      expect(dist).toBeGreaterThan(5500);
      expect(dist).toBeLessThan(7500);
    }
    const readout = view.readouts.shipA;
    expect(readout.kind).toBe("fighter");
    if (readout.kind === "fighter") {
      expect(readout.maxVelocity).toBeCloseTo(1301.5625, 9);
      expect(readout.optimal).toBe(10000);
      expect(readout.falloff).toBe(5000);
      expect(readout.explosionRadius).toBe(185);
      expect(readout.explosionVelocity).toBe(105);
    }
  });

  test("sustained DPS converges to the magazine-averaged value (12 volleys per 113s cycle)", () => {
    const sim: SimConfig = { shipA: stationaryHull("shipA"), shipB: stationaryHull("shipB"), initialDistance: 5000 };
    const engine = makeEngine(sim, [TEMPLAR_SQUADRON]);
    engine.reset(engineConfig(sim, [TEMPLAR_SQUADRON]));
    // Steady state from the second reload onward: volleys at 118 + 113k. Sample the full period [457, 570).
    const samples: number[] = [];
    for (let i = 0; i < 1140; i++) {
      engine.step(0.5);
      const time = engine.view().snapshot.time;
      if (time >= 457 && time < 570) samples.push(engine.view().inflicted.shipB.total);
    }
    expect(samples.length).toBe(226);
    const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    const sustained = 12 * (1096.875 * STATIONARY_APPLICATION) / 113;
    expect(mean).toBeCloseTo(sustained, 0);
  });
});
