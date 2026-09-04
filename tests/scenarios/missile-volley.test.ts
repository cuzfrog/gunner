import { MissileApplicationImpl } from "../../src/sim/missileApplication";
import { MissileSimulatorImpl } from "../../src/sim/missileSimulator";
import { DefenseSimulatorImpl } from "../../src/sim/defenseSimulator";
import { Vec2 } from "../../src/sim/vec2";
import { ZERO_RESISTS, damageVectorScale, damageVectorSum, type DamageEvent, type DefenseSpec, type EngagementFrame, type MissileLaunchSpec, type MissileSpec, type ShipState } from "../../src/sim/types";

const shipA: ShipState = { id: "shipA", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(0, 0), velocity: new Vec2(0, 0) };
const shipB: ShipState = { id: "shipB", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(100, 0), velocity: new Vec2(0, 0) };

function frame(): EngagementFrame {
  return { time: 0, shipA, shipB, relPosition: new Vec2(100, 0), distance: 100, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };
}

const missile: MissileSpec = {
  kind: "missile",
  damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 },
  cycleTime: 4,
  launcherCount: 3,
  explosionRadius: 40,
  explosionVelocity: 170,
  damageReductionFactor: 0.5,
  maxVelocity: 5000,
  flightTime: 5,
  flightRange: 25000,
};

const targetDefense: DefenseSpec = {
  layers: {
    shield: { hp: 10000, resists: ZERO_RESISTS },
    armor: { hp: 10000, resists: ZERO_RESISTS },
    hull: { hp: 10000, resists: ZERO_RESISTS },
  },
  shieldRechargeTime: 10000,
  repairers: [],
  signaturePenalty: 0,
  shieldUniformity: 0,
};

function launchSpec(weaponIndex: number, boosted: MissileSpec, paintedTargetSig: number): MissileLaunchSpec {
  return { weaponIndex, boosted, paintedTargetSig, baseVolleyByType: damageVectorScale(boosted.damagePerMissile, boosted.launcherCount) };
}

function runUntilImpact(sim: MissileSimulatorImpl, launches: Record<string, readonly MissileLaunchSpec[]>, maxSteps = 200): DamageEvent[] {
  const f = frame();
  sim.step(0.1, f, launches);
  for (let i = 0; i < maxSteps; i++) {
    const events = sim.step(0.1, f, { shipA: [], shipB: [] });
    if (events.length > 0) return [...events];
  }
  return [];
}

describe("missile volley count-scaling integration", () => {
  test("3-launcher missile deals 3x single-launcher damage through the full physical+defense pipeline", () => {
    const singleMissile: MissileSpec = { ...missile, launcherCount: 1 };
    const multiMissile: MissileSpec = { ...missile, launcherCount: 3 };

    const simSingle = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    simSingle.reset({ shipA: [singleMissile], shipB: [] });
    const singleEvents = runUntilImpact(simSingle, { shipA: [launchSpec(0, singleMissile, 40)], shipB: [] });

    const simMulti = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    simMulti.reset({ shipA: [multiMissile], shipB: [] });
    const multiEvents = runUntilImpact(simMulti, { shipA: [launchSpec(0, multiMissile, 40)], shipB: [] });

    expect(singleEvents.length).toBe(1);
    expect(multiEvents.length).toBe(1);
    const singleDamage = damageVectorSum(singleEvents[0].rawByType);
    const multiDamage = damageVectorSum(multiEvents[0].rawByType);
    expect(multiDamage).toBeCloseTo(singleDamage * 3, 6);

    const defenseSingle = new DefenseSimulatorImpl();
    defenseSingle.reset({ shipA: targetDefense, shipB: targetDefense, damageEnabled: { shipA: true, shipB: true }, repairMode: { shipA: "auto", shipB: "auto" }, repairerActivation: { shipA: [], shipB: [] }, rahActivation: { shipA: undefined, shipB: undefined } });
    defenseSingle.step(0.1, singleEvents);
    const singleView = defenseSingle.view();

    const defenseMulti = new DefenseSimulatorImpl();
    defenseMulti.reset({ shipA: targetDefense, shipB: targetDefense, damageEnabled: { shipA: true, shipB: true }, repairMode: { shipA: "auto", shipB: "auto" }, repairerActivation: { shipA: [], shipB: [] }, rahActivation: { shipA: undefined, shipB: undefined } });
    defenseMulti.step(0.1, multiEvents);
    const multiView = defenseMulti.view();

    const singleShieldLoss = 10000 - singleView.pools.shipB.shield;
    const multiShieldLoss = 10000 - multiView.pools.shipB.shield;
    expect(multiShieldLoss).toBeCloseTo(singleShieldLoss * 3, 6);
  });
});
