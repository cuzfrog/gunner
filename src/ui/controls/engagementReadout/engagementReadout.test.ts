import { Vec2, type AttackAssessment, type EngagementView, type ShipState, type TurretSpec } from "../../../sim";
import { EngagementReadoutImpl, type EngagementReadout, type ReadoutEls } from "./engagementReadout";

function fakeHitEls(): { resTrackPen: HTMLElement; resRangePen: HTMLElement; resHit: HTMLElement; resTrackPenLabel: HTMLElement; resRangePenLabel: HTMLElement; resHitLabel: HTMLElement } {
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
  return { resTrackPen: make(), resRangePen: make(), resHit: make(), resTrackPenLabel: make(), resRangePenLabel: make(), resHitLabel: make() };
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
  const shipA = fakeHitEls();
  const shipB = fakeHitEls();
  return {
    resDistance: make(),
    shipA,
    shipB,
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

function makeView(overrides: { distance?: number; transversalSpeed?: number; angularVelocity?: number; radialVelocity?: number; shipAHit?: { chance: number; trackingTerm: number; rangeTerm: number }; shipBHit?: { chance: number; trackingTerm: number; rangeTerm: number } }) {
  const ship = fakeShipState();
  const frame = {
    time: 0,
    shipA: ship,
    shipB: ship,
    relPosition: new Vec2(0, overrides.distance ?? 0),
    distance: overrides.distance ?? 0,
    relVelocity: new Vec2(0, 0),
    radialVelocity: overrides.radialVelocity ?? 0,
    transversalVelocity: new Vec2(0, 0),
    transversalSpeed: overrides.transversalSpeed ?? 0,
    angularVelocity: overrides.angularVelocity ?? 0,
  };
  const shipAHit = overrides.shipAHit ?? { chance: 0, trackingTerm: 0, rangeTerm: 0 };
  const shipBHit = overrides.shipBHit ?? { chance: 0, trackingTerm: 0, rangeTerm: 0 };
  const dummyTurret: TurretSpec = { kind: "turret", tracking: 0, sigResolution: 40, optimal: 0, falloff: 0, damagePerShot: 0, cycleTime: 1, turretCount: 1 };
  const shipAAttack: AttackAssessment = {
    boostedWeapon: dummyTurret, effectiveWeapon: dummyTurret,
    damage: { nominalDps: 0, appliedDps: 0, application: 0, volley: 0 },
    turret: { hit: shipAHit, expectedMultiplier: 0 },
  };
  const shipBAttack: AttackAssessment = {
    boostedWeapon: dummyTurret, effectiveWeapon: dummyTurret,
    damage: { nominalDps: 0, appliedDps: 0, application: 0, volley: 0 },
    turret: { hit: shipBHit, expectedMultiplier: 0 },
  };
  const view: EngagementView = {
    frame,
    attacks: { shipA: shipAAttack, shipB: shipBAttack },
    effectiveWeapons: { shipA: dummyTurret, shipB: dummyTurret },
  };
  return view;
}

describe("EngagementReadout", () => {
  test("formats short distance in meters and long distance in kilometers", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    const view = makeView({ distance: 12345 });
    readout.update(view, T);
    expect(els.resDistance.textContent).toBe("12.3 km");
  });

  test("rounds short distances to whole meters", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    const view = makeView({ distance: 1234.4 });
    readout.update(view, T);
    expect(els.resDistance.textContent).toBe("1,234 m");
  });

  test("computes tracking and range penalties from terms for shipA", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    const view = makeView({ distance: 1000, shipAHit: { chance: 0.5, trackingTerm: 1, rangeTerm: 2 } });
    readout.update(view, T);
    expect(els.shipA.resTrackPen.textContent).toBe("50.0%");
    expect(els.shipA.resRangePen.textContent).toBe("25.0%");
    expect(els.shipA.resHit.textContent).toBe("50.0%");
  });

  test("treats non-finite terms as zero penalty", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    const view = makeView({ distance: 1000, shipAHit: { chance: 0.5, trackingTerm: Number.NaN, rangeTerm: Number.POSITIVE_INFINITY } });
    readout.update(view, T);
    expect(els.shipA.resTrackPen.textContent).toBe("0.0%");
    expect(els.shipA.resRangePen.textContent).toBe("0.0%");
  });

  test("colors hit chance by threshold for both sides", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    const view = makeView({ distance: 1000, shipAHit: { chance: 0.95, trackingTerm: 0, rangeTerm: 0 }, shipBHit: { chance: 0.04, trackingTerm: 0, rangeTerm: 0 } });
    readout.update(view, T);
    expect(els.shipA.resHit.classList.contains("is-optimal")).toBe(true);
    expect(els.shipB.resHit.classList.contains("is-danger")).toBe(true);

    const view2 = makeView({ distance: 1000, shipAHit: { chance: 0.3, trackingTerm: 0, rangeTerm: 0 } });
    readout.update(view2, T);
    expect(els.shipA.resHit.classList.contains("is-caution")).toBe(true);
  });
});
