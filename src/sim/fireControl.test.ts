import { Vec2 } from "./vec2";
import { EngagementEvaluatorImpl } from "./fireControl";
import type { DroneApplication } from "./droneApplication";
import type { EwarResolver } from "./ewarResolver";
import type { HitChance } from "./hitChance";
import type { MissileApplication } from "./missileApplication";
import type { MissileBoosterResolver } from "./missileBoosterResolver";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { TurretDamage } from "./turretDamage";
import { type DamageAssessment, type DroneDamageBreakdown, type DroneSpec, type EngagementFrame, type HitChanceBreakdown, type MissileDamageBreakdown, type MissileSpec, type ShipState, type TurretSpec, ZERO_DAMAGE, damageVectorScale, damageVectorSum } from "./types";

const turret: TurretSpec = { kind: "turret", tracking: 0.1, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const boostedTurret: TurretSpec = { kind: "turret", tracking: 0.11, sigResolution: 40, optimal: 5500, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const effectiveTurret: TurretSpec = { kind: "turret", tracking: 0.05, sigResolution: 40, optimal: 4000, falloff: 4000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const hit: HitChanceBreakdown = { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1 };
const turretDamageResult: DamageAssessment = { nominalDps: 20, appliedDps: 16, application: 0.8, volley: 100, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };

const shipA: ShipState = {
  id: "shipA",
  maxSpeed: 1000,
  mass: 1_000_000,
  inertiaModifier: 1,
  mode: "keepAtRange",
  desiredRange: 5000,
  aggressivity: 1,
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
  ewar: {
    loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
    activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [] },
  },
};

const shipB: ShipState = {
  id: "shipB",
  maxSpeed: 1000,
  mass: 1_000_000,
  inertiaModifier: 1,
  mode: "orbit",
  desiredRange: 5000,
  aggressivity: 1,
  position: new Vec2(0, 6000),
  velocity: new Vec2(0, 0),
};

const frame: EngagementFrame = {
  time: 1,
  shipA,
  shipB,
  relPosition: new Vec2(0, 6000),
  distance: 6000,
  relVelocity: new Vec2(0, 0),
  radialVelocity: 0,
  transversalVelocity: new Vec2(0, 0),
  transversalSpeed: 0,
  angularVelocity: 0,
};

const missile: MissileSpec = {
  kind: "missile",
  damagePerMissile: { em: 0, thermal: 0, kinetic: 200, explosive: 0 },
  cycleTime: 10,
  launcherCount: 2,
  explosionRadius: 40,
  explosionVelocity: 170,
  damageReductionFactor: 3.0,
  maxVelocity: 3750,
  flightTime: 5,
  flightRange: 18750,
};

const missileBreakdown: MissileDamageBreakdown = {
  application: 0.8,
  signatureTerm: 1,
  velocityTerm: 0.8,
  inRange: true,
  timeToImpact: 1.6,
};

const missileApplicationResult = { application: 0.8, signatureTerm: 1, velocityTerm: 0.8 };

const drone: DroneSpec = { kind: "drone", tracking: 2.0, sigResolution: 25, optimal: 1500, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 38.4, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 3360, orbitSpeed: 4000, orbitRange: 1000, isSentry: false, controlRange: 60000 };

const droneBreakdownResult: DroneDamageBreakdown & DamageAssessment = {
  hit: { chance: 0.5, trackingTerm: 0, rangeTerm: 0 },
  expectedMultiplier: 1.0,
  inRange: true,
  inWeaponRange: true,
  mode: "engaging",
  distanceToTarget: 1500,
  inControlRange: true,
  nominalDps: 48,
  appliedDps: 48,
  application: 1.0,
  volley: 192,
  appliedByType: ZERO_DAMAGE,
  appliedVolleyByType: ZERO_DAMAGE,
};

function makeEvaluator(): {
  hitChance: HitChance;
  ewarResolver: EwarResolver;
  turretBoosterResolver: TurretBoosterResolver;
  missileBoosterResolver: MissileBoosterResolver;
  turretDamage: TurretDamage;
  missileApplication: MissileApplication;
  droneApplication: DroneApplication;
  evaluator: EngagementEvaluatorImpl;
} {
  const hitChance = vi.mocked<HitChance>({ compute: vi.fn(() => hit), findBestDistance: vi.fn() });
  const ewarResolver = vi.mocked<EwarResolver>({
    speedMultiplier: vi.fn(() => 1),
    speedMultiplierIgnoringRange: vi.fn(() => 1), sigMultiplier: vi.fn(() => 1), sigMultiplierIgnoringRange: vi.fn(() => 1),
    appliedEffects: vi.fn(() => []),
    disruptedTurret: vi.fn(() => effectiveTurret),
    disruptedTurretIgnoringRange: vi.fn(() => effectiveTurret),
    propulsionSuppressed: vi.fn(() => false),
    propulsionSuppressedIgnoringRange: vi.fn(() => false),
    speedBreakdown: vi.fn(() => ({ effects: [], propulsionSuppressed: false })),
    disruptionBreakdown: vi.fn(() => ({ tracking: [], optimal: [], falloff: [] })),
  });
  const turretBoosterResolver = vi.mocked<TurretBoosterResolver>({ boostedTurret: vi.fn(() => boostedTurret) });
  const missileBoosterResolver = vi.mocked<MissileBoosterResolver>({ boostedMissile: vi.fn((m) => m) });
  const turretDamage = vi.mocked<TurretDamage>({ compute: vi.fn(() => ({ hit, expectedMultiplier: 0.8, ...turretDamageResult })) });
  const missileApplication = vi.mocked<MissileApplication>({ compute: vi.fn(() => missileApplicationResult) });
  const droneApplication = vi.mocked<DroneApplication>({ compute: vi.fn(() => droneBreakdownResult) });
  const evaluator = new EngagementEvaluatorImpl({ hitChance, ewarResolver, turretBoosterResolver, missileBoosterResolver, turretDamage, missileApplication, droneApplication });
  return { hitChance, ewarResolver, turretBoosterResolver, missileBoosterResolver, turretDamage, missileApplication, droneApplication, evaluator };
}

describe("EngagementEvaluatorImpl", () => {
  test("evaluates shipA turret attack using shipB ewar", () => {
    const { hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(frame, { shipA: { weapon: turret, opponentSigRadius: 40 } });
    expect(result.shipA?.boostedWeapon).toEqual(boostedTurret);
    expect(result.shipA?.effectiveWeapon).toEqual(effectiveTurret);
    expect(result.shipA?.turret?.hit).toEqual(hit);
    expect(result.shipA?.damage.nominalDps).toBe(turretDamageResult.nominalDps);
    expect(result.shipA?.damage.appliedDps).toBe(turretDamageResult.appliedDps);
    expect(result.shipA?.damage.application).toBe(turretDamageResult.application);
    expect(result.shipA?.damage.volley).toBe(turretDamageResult.volley);
    expect(result.shipB).toBeUndefined();
    expect(ewarResolver.disruptedTurret).toHaveBeenCalledWith(boostedTurret, shipB.ewar, 6000);
    expect(hitChance.compute).toHaveBeenCalledWith(frame, effectiveTurret, 40);
  });

  test("evaluates shipB turret attack using shipA ewar", () => {
    const { hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(frame, { shipB: { weapon: turret, opponentSigRadius: 30 } });
    expect(result.shipB?.effectiveWeapon).toEqual(effectiveTurret);
    expect(result.shipB?.turret?.hit).toEqual(hit);
    expect(result.shipA).toBeUndefined();
    expect(ewarResolver.disruptedTurret).toHaveBeenCalledWith(boostedTurret, shipA.ewar, 6000);
    expect(hitChance.compute).toHaveBeenCalledWith(frame, effectiveTurret, 30);
  });

  test("applies own boosts before enemy disruption for turrets", () => {
    const { ewarResolver, turretBoosterResolver, evaluator } = makeEvaluator();
    const boosted: TurretSpec = { kind: "turret", tracking: 0.12, sigResolution: 40, optimal: 5500, falloff: 5500, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
    vi.mocked(turretBoosterResolver.boostedTurret).mockReturnValue(boosted);
    const shipAWithBoosts = { ...shipA, boosts: { loadout: { computers: [], scripts: [] } } };
    const frameWithBoosts = { ...frame, shipA: shipAWithBoosts };
    const result = evaluator.evaluate(frameWithBoosts, { shipA: { weapon: turret, opponentSigRadius: 40 } });
    expect(result.shipA?.boostedWeapon).toEqual(boosted);
    expect(result.shipA?.effectiveWeapon).toEqual(effectiveTurret);
    expect(turretBoosterResolver.boostedTurret).toHaveBeenCalledWith(turret, shipAWithBoosts.boosts);
    expect(ewarResolver.disruptedTurret).toHaveBeenCalledWith(boosted, shipB.ewar, 6000);
  });

  test("evaluates missile attack without boost or ewar", () => {
    const { missileApplication, ewarResolver, turretBoosterResolver, missileBoosterResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(frame, { shipA: { weapon: missile, opponentSigRadius: 40 } });
    expect(result.shipA?.effectiveWeapon).toBe(missile);
    expect(result.shipA?.boostedWeapon).toBe(missile);
    expect(result.shipA?.missile).toEqual(missileBreakdown);
    expect(result.shipA?.damage.nominalDps).toBeCloseTo((200 * 2) / 10, 10);
    expect(result.shipA?.damage.appliedDps).toBeCloseTo(((200 * 2) / 10) * 0.8, 10);
    expect(result.shipA?.damage.volley).toBe(400);
    expect(result.shipA?.turret).toBeUndefined();
    expect(missileApplication.compute).toHaveBeenCalledWith(missile, 0, 40);
    expect(ewarResolver.disruptedTurret).not.toHaveBeenCalled();
    expect(turretBoosterResolver.boostedTurret).not.toHaveBeenCalled();
    expect(missileBoosterResolver.boostedMissile).toHaveBeenCalledWith(missile, undefined);
  });

  test("applies painter sig multiplier to opponentSigRadius for turret assessment", () => {
    const { ewarResolver, hitChance, evaluator } = makeEvaluator();
    vi.mocked(ewarResolver.sigMultiplier).mockReturnValue(1.3);
    const result = evaluator.evaluate(frame, { shipA: { weapon: turret, opponentSigRadius: 100 } });
    expect(hitChance.compute).toHaveBeenCalledWith(frame, effectiveTurret, 130);
    expect(ewarResolver.sigMultiplier).toHaveBeenCalledWith(frame.shipA.ewar, 6000);
  });

  test("applies painter sig multiplier to opponentSigRadius for missile assessment", () => {
    const { ewarResolver, missileApplication, evaluator } = makeEvaluator();
    vi.mocked(ewarResolver.sigMultiplier).mockReturnValue(1.3);
    const result = evaluator.evaluate(frame, { shipA: { weapon: missile, opponentSigRadius: 100 } });
    expect(missileApplication.compute).toHaveBeenCalledWith(missile, 0, 130);
    expect(ewarResolver.sigMultiplier).toHaveBeenCalledWith(frame.shipA.ewar, 6000);
  });

  test("passes ship missileBoosts to missileBoosterResolver", () => {
    const { missileBoosterResolver, evaluator } = makeEvaluator();
    const projection = { loadout: { computers: [], enhancers: [], scripts: [] } };
    const shipAWithMissileBoosts = { ...shipA, missileBoosts: projection };
    const frameWithBoosts = { ...frame, shipA: shipAWithMissileBoosts };
    evaluator.evaluate(frameWithBoosts, { shipA: { weapon: missile, opponentSigRadius: 40 } });
    expect(missileBoosterResolver.boostedMissile).toHaveBeenCalledWith(missile, projection);
  });

  test("passes boosted missile to missileApplication", () => {
    const { missileBoosterResolver, missileApplication, evaluator } = makeEvaluator();
    const boostedMissile: MissileSpec = { ...missile, explosionRadius: 30, explosionVelocity: 150 };
    vi.mocked(missileBoosterResolver.boostedMissile).mockReturnValue(boostedMissile);
    evaluator.evaluate(frame, { shipA: { weapon: missile, opponentSigRadius: 40 } });
    expect(missileApplication.compute).toHaveBeenCalledWith(boostedMissile, 0, 40);
  });

  test("zeros missile applied DPS when out of range", () => {
    const { missileApplication, evaluator } = makeEvaluator();
    const shortRangeMissile: MissileSpec = { ...missile, flightRange: 5000, maxVelocity: 1000, flightTime: 5 };
    const result = evaluator.evaluate(frame, { shipA: { weapon: shortRangeMissile, opponentSigRadius: 40 } });
    expect(result.shipA?.damage.appliedDps).toBe(0);
    expect(result.shipA?.damage.application).toBe(0);
    expect(result.shipA?.damage.nominalDps).toBeCloseTo(40, 10);
    expect(result.shipA?.missile?.inRange).toBe(false);
  });

  test("missile appliedVolleyByType carries per-cycle volley scaled by application", () => {
    const { evaluator } = makeEvaluator();
    const result = evaluator.evaluate(frame, { shipA: { weapon: missile, opponentSigRadius: 40 } });
    const expected = damageVectorScale(missile.damagePerMissile, missile.launcherCount * 0.8);
    expect(result.shipA?.damage.appliedVolleyByType).toEqual(expected);
    expect(damageVectorSum(result.shipA!.damage.appliedVolleyByType)).toBeCloseTo(result.shipA!.damage.volley * 0.8, 10);
  });

  test("missile appliedVolleyByType is zero when out of range", () => {
    const { evaluator } = makeEvaluator();
    const shortRangeMissile: MissileSpec = { ...missile, flightRange: 5000, maxVelocity: 1000, flightTime: 5 };
    const result = evaluator.evaluate(frame, { shipA: { weapon: shortRangeMissile, opponentSigRadius: 40 } });
    expect(result.shipA?.damage.appliedVolleyByType).toEqual(ZERO_DAMAGE);
  });

  test("missile appliedVolleyByType uses facts application when facts provided", () => {
    const { evaluator } = makeEvaluator();
    const facts = { inFlightCount: 2, nearestTimeToImpact: 1.5, predicted: { application: 0.5, signatureTerm: 1, velocityTerm: 0.6 }, interceptable: true };
    const result = evaluator.evaluate(frame, { shipA: { weapon: missile, opponentSigRadius: 40, missileFacts: facts } });
    const expected = damageVectorScale(missile.damagePerMissile, missile.launcherCount * 0.5);
    expect(result.shipA?.damage.appliedVolleyByType).toEqual(expected);
  });

  test("uses missile facts for applied DPS when facts are provided", () => {
    const { missileApplication, evaluator } = makeEvaluator();
    const facts = { inFlightCount: 2, nearestTimeToImpact: 1.5, predicted: { application: 0.5, signatureTerm: 1, velocityTerm: 0.6 }, interceptable: true };
    const result = evaluator.evaluate(frame, { shipA: { weapon: missile, opponentSigRadius: 40, missileFacts: facts } });
    const nominalDps = (200 * 2) / 10;
    expect(result.shipA?.damage.appliedDps).toBeCloseTo(nominalDps * 0.5, 10);
    expect(result.shipA?.damage.application).toBeCloseTo(0.5, 10);
    expect(result.shipA?.missile?.inRange).toBe(true);
    expect(result.shipA?.missile?.timeToImpact).toBe(1.5);
    expect(result.shipA?.missile?.application).toBeCloseTo(0.5, 10);
    expect(result.shipA?.missile?.signatureTerm).toBe(1);
    expect(result.shipA?.missile?.velocityTerm).toBe(0.6);
    expect(missileApplication.compute).not.toHaveBeenCalled();
  });

  test("uses missile facts with zero predicted application", () => {
    const { evaluator } = makeEvaluator();
    const facts = { inFlightCount: 1, nearestTimeToImpact: 2.0, predicted: { application: 0, signatureTerm: 1, velocityTerm: 1 }, interceptable: true };
    const result = evaluator.evaluate(frame, { shipA: { weapon: missile, opponentSigRadius: 40, missileFacts: facts } });
    expect(result.shipA?.damage.appliedDps).toBe(0);
    expect(result.shipA?.missile?.application).toBe(0);
    expect(result.shipA?.missile?.signatureTerm).toBe(1);
    expect(result.shipA?.missile?.velocityTerm).toBe(1);
    expect(result.shipA?.missile?.inRange).toBe(true);
    expect(result.shipA?.missile?.timeToImpact).toBe(2.0);
  });

  test("returns empty result when no attacks are requested", () => {
    const { hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(frame, {});
    expect(result.shipA).toBeUndefined();
    expect(result.shipB).toBeUndefined();
    expect(ewarResolver.disruptedTurret).not.toHaveBeenCalled();
    expect(hitChance.compute).not.toHaveBeenCalled();
  });

  test("uses effective weapon for renderer and hit for readout", () => {
    const { evaluator } = makeEvaluator();
    const result = evaluator.evaluate(frame, { shipA: { weapon: turret, opponentSigRadius: 40 } });
    expect(result.shipA!.effectiveWeapon).not.toEqual(turret);
    expect(result.shipA?.turret?.hit).toEqual(hit);
  });
});
