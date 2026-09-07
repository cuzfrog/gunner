import { asValue, createContainer, InjectionMode } from "awilix";
import { registerSimModule, ZERO_RESISTS, type DefenseSpec, type EngineConfig, type EngagementEngine, type MissileSpec, type ShipConfig, type SimCradle, type SimConfig, type TurretSpec } from "../../src/sim";
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
  };
}

function makeEngine(sim: SimConfig, shipAWeapons: EngineConfig["weapons"]["shipA"]): EngagementEngine {
  const container = createContainer<SimCradle & { simConfig: SimConfig }>({ injectionMode: InjectionMode.PROXY });
  container.register({ simConfig: asValue(sim) });
  registerSimModule(container);
  return container.resolve("engine");
}

describe("inflicted DPS projection", () => {
  test("turret projection converges to the applied DPS of the live view", () => {
    const turret: TurretSpec = { kind: "turret", moduleId: toTypeId("34"), tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 2, turretCount: 1 };
    const sim: SimConfig = { shipA: stationaryHull("shipA"), shipB: stationaryHull("shipB"), initialDistance: 5000 };
    const engine = makeEngine(sim, [turret]);
    engine.reset(engineConfig(sim, [turret]));
    for (let i = 0; i < 8; i++) engine.step(0.5);
    const view = engine.view();
    const appliedDps = view.weaponAttacks.shipA[0].assessment.damage.appliedDps;
    expect(appliedDps).toBeGreaterThan(0);
    expect(Math.abs(view.inflicted.shipB.total - appliedDps)).toBeLessThan(appliedDps * 0.001);
  });

  test("turret projection is stable across phase-misaligned recompute boundaries", () => {
    const turret: TurretSpec = { kind: "turret", moduleId: toTypeId("34"), tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 2, turretCount: 1 };
    const sim: SimConfig = { shipA: stationaryHull("shipA"), shipB: stationaryHull("shipB"), initialDistance: 5000 };
    const engine = makeEngine(sim, [turret]);
    engine.reset(engineConfig(sim, [turret]));
    for (let i = 0; i < 480; i++) engine.step(1 / 60);
    const samples: number[] = [];
    for (let i = 0; i < 6; i++) {
      for (let frame = 0; frame < 30; frame++) engine.step(1 / 60);
      samples.push(engine.view().inflicted.shipB.total);
    }
    const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    expect(Math.max(...samples) - Math.min(...samples)).toBeLessThan(mean * 0.001);
  });

  test("missile projection is stable across consecutive cadence recomputes", () => {
    const missile: MissileSpec = { kind: "missile", moduleId: toTypeId("506"), damagePerMissile: { em: 0, thermal: 0, kinetic: 200, explosive: 0 }, cycleTime: 6, launcherCount: 1, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 3, maxVelocity: 3750, flightTime: 5, flightRange: 18750 };
    const sim: SimConfig = { shipA: stationaryHull("shipA"), shipB: stationaryHull("shipB"), initialDistance: 5000 };
    const engine = makeEngine(sim, [missile]);
    engine.reset(engineConfig(sim, [missile]));
    for (let i = 0; i < 30; i++) engine.step(0.5);
    const samples: number[] = [];
    for (let i = 0; i < 16; i++) {
      engine.step(0.5);
      samples.push(engine.view().inflicted.shipB.total);
    }
    for (const sample of samples) expect(sample).toBeGreaterThan(0);
    const mean = samples.reduce((sum, s) => sum + s, 0) / samples.length;
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread / mean).toBeLessThan(0.1);
  });
});
