import { IDLE_LOCK, Vec2, ZERO_DAMAGE, type AttackAssessment, type DamageAssessment, type DroneSpec, type EngagementView, type LockState, type MissileSpec, type ShipState, type TurretSpec } from "../../../sim";
import { EngagementReadoutImpl, type EngagementReadout, type ReadoutEls } from "./engagementReadout";

function fakeSideEls(): ReadoutEls["shipA"] {
  const make = (): HTMLElement => {
    const classes: string[] = [];
    return {
      textContent: "",
      hidden: false,
      style: { color: "" },
      classList: {
        add: (...names: string[]): number => classes.push(...names),
        remove: (...names: string[]): void => {
          for (const n of names) {
            const i = classes.indexOf(n);
            if (i >= 0) classes.splice(i, 1);
          }
        },
        contains: (name: string): boolean => classes.includes(name),
      },
    } as unknown as HTMLElement;
  };
  return {
    resTrackPen: make(), resRangePen: make(), resHit: make(),
    resTrackPenLabel: make(), resRangePenLabel: make(), resHitLabel: make(),
    resNominalDps: make(), resAppliedDps: make(), resAppliedDpsApplication: make(), resTimeToImpact: make(),
    resSigFactor: make(), resVelocityFactor: make(),
    resNominalDpsLabel: make(), resAppliedDpsLabel: make(),
    resTimeToImpactLabel: make(),
    resSigFactorLabel: make(), resVelocityFactorLabel: make(),
    resLockState: make(), resLockStateLabel: make(),
    resTurretCards: make(), resMissileCards: make(),
  };
}

function fakeReadoutEls(): ReadoutEls {
  const make = (): HTMLElement => {
    const classes: string[] = [];
    return {
      textContent: "",
      style: { color: "" },
      classList: {
        add: (...names: string[]): number => classes.push(...names),
        remove: (...names: string[]): void => {
          for (const n of names) {
            const i = classes.indexOf(n);
            if (i >= 0) classes.splice(i, 1);
          }
        },
        contains: (name: string): boolean => classes.includes(name),
      },
    } as unknown as HTMLElement;
  };
  return {
    resDistance: make(),
    shipA: fakeSideEls(),
    shipB: fakeSideEls(),
  };
}

const T = (key: string): string => ({ "unit.kilometer": "km", "unit.meter": "m" }[key] ?? key);

function fakeShipState(): ShipState {
  return {
    id: "shipA",
    maxSpeed: 0,
    mass: 0,
    inertiaModifier: 0,
    mode: "orbit",
    desiredRange: 0,
    aggressivity: 1,
    position: new Vec2(0, 0),
    velocity: new Vec2(0, 0),
  };
}

const DUMMY_TURRET: TurretSpec = { kind: "turret", tracking: 0, sigResolution: 40, optimal: 0, falloff: 0, damagePerShot: { em: 0, thermal: 0, kinetic: 12, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const DUMMY_MISSILE: MissileSpec = { kind: "missile", damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 10, launcherCount: 2, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 3, maxVelocity: 3750, flightTime: 5, flightRange: 18750 };
const DUMMY_DRONE: DroneSpec = { kind: "drone", tracking: 0.15, sigResolution: 40, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 6000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 };

function makeTurretView(overrides: { distance?: number; shipAHit?: { chance: number; trackingTerm: number; rangeTerm: number }; shipBHit?: { chance: number; trackingTerm: number; rangeTerm: number }; shipADamage?: DamageAssessment; shipALock?: LockState }) {
  const ship = fakeShipState();
  const frame = {
    time: 0, shipA: ship, shipB: ship,
    relPosition: new Vec2(0, overrides.distance ?? 0),
    distance: overrides.distance ?? 0,
    relVelocity: new Vec2(0, 0), radialVelocity: 0,
    transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
  };
  const shipAHit = overrides.shipAHit ?? { chance: 0, trackingTerm: 0, rangeTerm: 0 };
  const shipBHit = overrides.shipBHit ?? { chance: 0, trackingTerm: 0, rangeTerm: 0 };
  const shipADamage = overrides.shipADamage ?? { nominalDps: 2.4, appliedDps: 2.0, application: 0.83, volley: 12, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
  const shipAAttack: AttackAssessment = {
    boostedWeapon: DUMMY_TURRET, effectiveWeapon: DUMMY_TURRET,
    damage: shipADamage,
    turret: { hit: shipAHit, expectedMultiplier: 0 },
  };
  const shipBAttack: AttackAssessment = {
    boostedWeapon: DUMMY_TURRET, effectiveWeapon: DUMMY_TURRET,
    damage: { nominalDps: 0, appliedDps: 0, application: 0, volley: 0, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE },
    turret: { hit: shipBHit, expectedMultiplier: 0 },
  };
  const shipALock = overrides.shipALock ?? IDLE_LOCK;
  return { frame, attacks: { shipA: shipAAttack, shipB: shipBAttack }, effectiveWeapons: { shipA: DUMMY_TURRET, shipB: DUMMY_TURRET }, locks: { shipA: shipALock, shipB: IDLE_LOCK } } as unknown as EngagementView;
}

function makeMissileView(overrides: { distance?: number; shipADamage?: DamageAssessment; shipAMissile?: { application: number; signatureTerm: number; velocityTerm: number; inRange: boolean; timeToImpact: number } }) {
  const ship = fakeShipState();
  const frame = {
    time: 0, shipA: ship, shipB: ship,
    relPosition: new Vec2(0, overrides.distance ?? 0),
    distance: overrides.distance ?? 0,
    relVelocity: new Vec2(0, 0), radialVelocity: 0,
    transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
  };
  const shipADamage = overrides.shipADamage ?? { nominalDps: 40, appliedDps: 32, application: 0.8, volley: 200, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
  const shipAMissile = overrides.shipAMissile ?? { application: 0.8, signatureTerm: 1, velocityTerm: 0.8, inRange: true, timeToImpact: 2.5 };
  const shipAAttack: AttackAssessment = {
    boostedWeapon: DUMMY_MISSILE, effectiveWeapon: DUMMY_MISSILE,
    damage: shipADamage,
    missile: shipAMissile,
  };
  return { frame, attacks: { shipA: shipAAttack, shipB: undefined }, effectiveWeapons: { shipA: DUMMY_MISSILE, shipB: undefined }, locks: { shipA: IDLE_LOCK, shipB: IDLE_LOCK } } as unknown as EngagementView;
}

function makeDroneView(overrides: { distance?: number; shipAHit?: { chance: number; trackingTerm: number; rangeTerm: number }; shipADamage?: DamageAssessment }) {
  const ship = fakeShipState();
  const frame = {
    time: 0, shipA: ship, shipB: ship,
    relPosition: new Vec2(0, overrides.distance ?? 0),
    distance: overrides.distance ?? 0,
    relVelocity: new Vec2(0, 0), radialVelocity: 0,
    transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
  };
  const shipAHit = overrides.shipAHit ?? { chance: 0.5, trackingTerm: 1, rangeTerm: 0 };
  const shipADamage = overrides.shipADamage ?? { nominalDps: 25, appliedDps: 20, application: 0.8, volley: 100, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
  const shipAAttack: AttackAssessment = {
    boostedWeapon: DUMMY_DRONE, effectiveWeapon: DUMMY_DRONE,
    damage: shipADamage,
    drone: { hit: shipAHit, expectedMultiplier: 0.8, inRange: true, inWeaponRange: true, mode: "engaging", distanceToTarget: 1000, inControlRange: true },
  };
  return { frame, attacks: { shipA: shipAAttack, shipB: undefined }, effectiveWeapons: { shipA: DUMMY_DRONE, shipB: undefined }, locks: { shipA: IDLE_LOCK, shipB: IDLE_LOCK } } as unknown as EngagementView;
}

function makeNoWeaponView(distance: number = 1000): EngagementView {
  const ship = fakeShipState();
  return {
    frame: {
      time: 0, shipA: ship, shipB: ship,
      relPosition: new Vec2(0, distance), distance,
      relVelocity: new Vec2(0, 0), radialVelocity: 0,
      transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
    },
    attacks: { shipA: undefined, shipB: undefined },
    effectiveWeapons: { shipA: undefined, shipB: undefined },
    locks: { shipA: IDLE_LOCK, shipB: IDLE_LOCK },
  } as unknown as EngagementView;
}

describe("EngagementReadout", () => {
  test("formats short distance in meters and long distance in kilometers", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 12345 }), T);
    expect(els.resDistance.textContent).toBe("12.3 km");
  });

  test("rounds short distances to whole meters", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1234.4 }), T);
    expect(els.resDistance.textContent).toBe("1,234 m");
  });

  test("computes tracking and range penalties from terms for shipA", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipAHit: { chance: 0.5, trackingTerm: 1, rangeTerm: 2 } }), T);
    expect(els.shipA.resTrackPen.textContent).toBe("50.0%");
    expect(els.shipA.resRangePen.textContent).toBe("25.0%");
    expect(els.shipA.resHit.textContent).toBe("50.0%");
  });

  test("treats non-finite terms as zero penalty", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipAHit: { chance: 0.5, trackingTerm: Number.NaN, rangeTerm: Number.POSITIVE_INFINITY } }), T);
    expect(els.shipA.resTrackPen.textContent).toBe("0.0%");
    expect(els.shipA.resRangePen.textContent).toBe("0.0%");
  });

  test("colors hit chance by threshold for both sides", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipAHit: { chance: 0.95, trackingTerm: 0, rangeTerm: 0 }, shipBHit: { chance: 0.04, trackingTerm: 0, rangeTerm: 0 } }), T);
    expect(els.shipA.resHit.classList.contains("is-optimal")).toBe(true);
    expect(els.shipB.resHit.classList.contains("is-danger")).toBe(true);

    readout.update(makeTurretView({ distance: 1000, shipAHit: { chance: 0.3, trackingTerm: 0, rangeTerm: 0 } }), T);
    expect(els.shipA.resHit.classList.contains("is-caution")).toBe(true);
  });

  test("colors tracking and range penalties by their ratio", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipAHit: { chance: 0.95, trackingTerm: 0, rangeTerm: 0 } }), T);
    expect(els.shipA.resTrackPen.classList.contains("is-optimal")).toBe(true);
    expect(els.shipA.resRangePen.classList.contains("is-optimal")).toBe(true);
  });

  test("turret side shows DPS and application percentage in separate grid cells", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipADamage: { nominalDps: 50, appliedDps: 40, application: 0.8, volley: 100, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE } }), T);
    expect(els.shipA.resTurretCards.hidden).toBe(false);
    expect(els.shipA.resMissileCards.hidden).toBe(true);
    expect(els.shipA.resNominalDps.textContent).toBe("50.0");
    expect(els.shipA.resAppliedDps.textContent).toBe("40.0");
    expect(els.shipA.resAppliedDpsApplication.textContent).toBe("(80.0%)");
    expect(els.shipA.resAppliedDpsApplication.classList.contains("is-good")).toBe(true);
  });

  test("turret side with zero applied DPS shows is-danger", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipADamage: { nominalDps: 50, appliedDps: 0, application: 0, volley: 100, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE } }), T);
    expect(els.shipA.resAppliedDpsApplication.classList.contains("is-danger")).toBe(true);
  });

  test("turret side with application > 1 (wrecking hits) shows is-optimal", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipADamage: { nominalDps: 100, appliedDps: 101.5, application: 1.015, volley: 100, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE } }), T);
    expect(els.shipA.resAppliedDps.textContent).toBe("101.5");
    expect(els.shipA.resAppliedDpsApplication.textContent).toBe("(101.5%)");
    expect(els.shipA.resAppliedDpsApplication.classList.contains("is-optimal")).toBe(true);
  });

  test("missile side shows DPS, application and missile factors in separate cells", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeMissileView({ distance: 5000 }), T);
    expect(els.shipA.resTurretCards.hidden).toBe(true);
    expect(els.shipA.resMissileCards.hidden).toBe(false);
    expect(els.shipA.resNominalDps.textContent).toBe("40.0");
    expect(els.shipA.resAppliedDps.textContent).toBe("32.0");
    expect(els.shipA.resAppliedDpsApplication.textContent).toBe("(80.0%)");
    expect(els.shipA.resTimeToImpact.textContent).toBe("2.5s");
    expect(els.shipA.resSigFactor.textContent).toBe("100.0%");
    expect(els.shipA.resVelocityFactor.textContent).toBe("80.0%");
  });

  test("missile side colors sig and velocity factors by ratio", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeMissileView({ distance: 5000 }), T);
    expect(els.shipA.resSigFactor.classList.contains("is-optimal")).toBe(true);
    expect(els.shipA.resVelocityFactor.classList.contains("is-good")).toBe(true);
  });

  test("missile side with zero applied DPS shows is-danger", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeMissileView({ distance: 5000, shipADamage: { nominalDps: 40, appliedDps: 0, application: 0, volley: 200, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE }, shipAMissile: { application: 0, signatureTerm: 0, velocityTerm: 0, inRange: false, timeToImpact: 2.5 } }), T);
    expect(els.shipA.resAppliedDpsApplication.classList.contains("is-danger")).toBe(true);
  });

  test("no-weapon side shows em-dash and is-dim on all values", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeNoWeaponView(1000), T);
    expect(els.shipA.resTurretCards.hidden).toBe(false);
    expect(els.shipA.resMissileCards.hidden).toBe(true);
    expect(els.shipA.resNominalDps.textContent).toBe("-");
    expect(els.shipA.resAppliedDps.textContent).toBe("-");
    expect(els.shipA.resAppliedDpsApplication.textContent).toBe("-");
    expect(els.shipA.resHit.textContent).toBe("-");
    expect(els.shipA.resTrackPen.textContent).toBe("-");
    expect(els.shipA.resRangePen.textContent).toBe("-");
    expect(els.shipA.resSigFactor.textContent).toBe("-");
    expect(els.shipA.resVelocityFactor.textContent).toBe("-");
    expect(els.shipA.resTimeToImpact.textContent).toBe("-");
    expect(els.shipA.resHit.classList.contains("is-dim")).toBe(true);
    expect(els.shipA.resTrackPen.classList.contains("is-dim")).toBe(true);
    expect(els.shipA.resRangePen.classList.contains("is-dim")).toBe(true);
    expect(els.shipA.resNominalDps.classList.contains("is-dim")).toBe(true);
    expect(els.shipA.resAppliedDps.classList.contains("is-dim")).toBe(true);
    expect(els.shipA.resAppliedDpsApplication.classList.contains("is-dim")).toBe(true);
    expect(els.shipA.resSigFactor.classList.contains("is-dim")).toBe(true);
    expect(els.shipA.resVelocityFactor.classList.contains("is-dim")).toBe(true);
    expect(els.shipA.resTimeToImpact.classList.contains("is-dim")).toBe(true);
  });

  test("transition from no-weapon to turret clears is-dim from all values", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeNoWeaponView(1000), T);
    expect(els.shipA.resHit.classList.contains("is-dim")).toBe(true);
    readout.update(makeTurretView({ distance: 1000, shipAHit: { chance: 0.5, trackingTerm: 0, rangeTerm: 0 } }), T);
    expect(els.shipA.resHit.classList.contains("is-dim")).toBe(false);
    expect(els.shipA.resTrackPen.classList.contains("is-dim")).toBe(false);
    expect(els.shipA.resRangePen.classList.contains("is-dim")).toBe(false);
    expect(els.shipA.resSigFactor.classList.contains("is-dim")).toBe(false);
    expect(els.shipA.resVelocityFactor.classList.contains("is-dim")).toBe(false);
    expect(els.shipA.resTimeToImpact.classList.contains("is-dim")).toBe(false);
  });

  test("drone side shows hit-chance cards with DPS like turret", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeDroneView({ distance: 1000 }), T);
    expect(els.shipA.resTurretCards.hidden).toBe(false);
    expect(els.shipA.resMissileCards.hidden).toBe(true);
    expect(els.shipA.resHit.textContent).toBe("50.0%");
    expect(els.shipA.resTrackPen.textContent).toBe("50.0%");
    expect(els.shipA.resRangePen.textContent).toBe("100.0%");
    expect(els.shipA.resNominalDps.textContent).toBe("25.0");
    expect(els.shipA.resAppliedDps.textContent).toBe("20.0");
    expect(els.shipA.resAppliedDpsApplication.textContent).toBe("(80.0%)");
  });

  test("drone side with zero applied DPS shows is-danger", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeDroneView({ distance: 1000, shipADamage: { nominalDps: 25, appliedDps: 0, application: 0, volley: 100, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE } }), T);
    expect(els.shipA.resAppliedDpsApplication.classList.contains("is-danger")).toBe(true);
  });

  test("locked lock state shows lockHint.locked text and is-optimal class", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipALock: { ...IDLE_LOCK, status: "locked", lockTime: 5, inRange: true } }), T);
    expect(els.shipA.resLockState.textContent).toBe("lockHint.locked");
    expect(els.shipA.resLockState.classList.contains("is-optimal")).toBe(true);
  });

  test("locking lock state shows progress percentage and is-caution class", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000, shipALock: { ...IDLE_LOCK, status: "locking", progress: 0.6, lockTime: 5, inRange: true } }), T);
    expect(els.shipA.resLockState.textContent).toBe("60%");
    expect(els.shipA.resLockState.classList.contains("is-caution")).toBe(true);
  });

  test("lockTime of zero shows dash and is-dim class", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    readout.update(makeTurretView({ distance: 1000 }), T);
    expect(els.shipA.resLockState.textContent).toBe("-");
    expect(els.shipA.resLockState.classList.contains("is-dim")).toBe(true);
  });
});
