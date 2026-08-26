import { Vec2, type ShipState } from "../../../sim";
import { EngagementReadoutImpl, type EngagementReadout, type ReadoutEls } from "./engagementReadout";

function fakeHitEls(): { resTrackPen: HTMLElement; resRangePen: HTMLElement; resHit: HTMLElement } {
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
  return { resTrackPen: make(), resRangePen: make(), resHit: make() };
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
    resTransversal: make(),
    resAngular: make(),
    resRadial: make(),
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
  const hits = {
    shipA: overrides.shipAHit ?? { chance: 0, trackingTerm: 0, rangeTerm: 0 },
    shipB: overrides.shipBHit ?? { chance: 0, trackingTerm: 0, rangeTerm: 0 },
  };
  return { frame, attacks: { shipA: undefined, shipB: undefined }, effectiveTurrets: { shipA: { tracking: 0, sigResolution: 40, optimal: 0, falloff: 0 }, shipB: { tracking: 0, sigResolution: 40, optimal: 0, falloff: 0 } }, hits };
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

  test("writes speed, angular and radial readouts with units", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadoutImpl(els);
    const view = makeView({ distance: 1000, radialVelocity: 1234.5, transversalSpeed: 1234.5, angularVelocity: 0.1234 });
    readout.update(view, T);
    expect(els.resTransversal.textContent).toBe("1,234.5 m/s");
    expect(els.resAngular.textContent).toBe("0.1234 rad/s");
    expect(els.resRadial.textContent).toBe("1,234.5 m/s");
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
