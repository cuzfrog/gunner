import { Vec2, type ShipState } from "../../sim";
import { EngagementReadout, type ReadoutEls } from "./engagementReadout";

function fakeReadoutEls(): ReadoutEls {
  const make = (): HTMLElement =>
    ({ textContent: "", style: { color: "" } } as unknown as HTMLElement);
  return {
    resDistance: make(),
    resTransversal: make(),
    resAngular: make(),
    resRadial: make(),
    resTrackPen: make(),
    resRangePen: make(),
    resHit: make(),
  };
}

const T = (key: string): string => ({ "unit.kilometer": "km", "unit.meter": "m" }[key] ?? key);

function fakeShipState(): ShipState {
  return {
    id: "attacker",
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

describe("EngagementReadout", () => {
  test("formats short distance in meters and long distance in kilometers", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadout(els);
    const ship = fakeShipState();
    const frame = { time: 0, attacker: ship, target: ship, relPosition: new Vec2(0, 0), distance: 12345, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };

    readout.update(frame, { chance: 0, trackingTerm: 0, rangeTerm: 0 }, T);

    expect(els.resDistance.textContent).toBe("12.3 km");
  });

  test("rounds short distances to whole meters", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadout(els);
    const ship = fakeShipState();
    const frame = { time: 0, attacker: ship, target: ship, relPosition: new Vec2(0, 0), distance: 1234.4, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };

    readout.update(frame, { chance: 0, trackingTerm: 0, rangeTerm: 0 }, T);

    expect(els.resDistance.textContent).toBe("1,234 m");
  });

  test("writes speed, angular and radial readouts with units", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadout(els);
    const ship = fakeShipState();
    const frame = { time: 0, attacker: ship, target: ship, relPosition: new Vec2(0, 0), distance: 1000, relVelocity: new Vec2(0, 0), radialVelocity: 1234.5, transversalVelocity: new Vec2(0, 0), transversalSpeed: 1234.5, angularVelocity: 0.1234 };

    readout.update(frame, { chance: 0, trackingTerm: 0, rangeTerm: 0 }, T);

    expect(els.resTransversal.textContent).toBe("1,234.5 m/s");
    expect(els.resAngular.textContent).toBe("0.1234 rad/s");
    expect(els.resRadial.textContent).toBe("1,234.5 m/s");
  });

  test("computes tracking and range penalties from terms", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadout(els);
    const ship = fakeShipState();
    const frame = { time: 0, attacker: ship, target: ship, relPosition: new Vec2(0, 0), distance: 1000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };

    readout.update(frame, { chance: 0.5, trackingTerm: 1, rangeTerm: 2 }, T);

    expect(els.resTrackPen.textContent).toBe("50.0%");
    expect(els.resRangePen.textContent).toBe("25.0%");
    expect(els.resHit.textContent).toBe("50.0%");
  });

  test("treats non-finite terms as zero penalty", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadout(els);
    const ship = fakeShipState();
    const frame = { time: 0, attacker: ship, target: ship, relPosition: new Vec2(0, 0), distance: 1000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };

    readout.update(frame, { chance: 0.5, trackingTerm: Number.NaN, rangeTerm: Number.POSITIVE_INFINITY }, T);

    expect(els.resTrackPen.textContent).toBe("0.0%");
    expect(els.resRangePen.textContent).toBe("0.0%");
  });

  test("colors hit chance by threshold", () => {
    const els = fakeReadoutEls();
    const readout = new EngagementReadout(els);
    const ship = fakeShipState();
    const frame = { time: 0, attacker: ship, target: ship, relPosition: new Vec2(0, 0), distance: 1000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };

    readout.update(frame, { chance: 0.95, trackingTerm: 0, rangeTerm: 0 }, T);
    expect(els.resHit.style.color).toBe("#9cc954");

    readout.update(frame, { chance: 0.3, trackingTerm: 0, rangeTerm: 0 }, T);
    expect(els.resHit.style.color).toBe("#fce447");

    readout.update(frame, { chance: 0.04, trackingTerm: 0, rangeTerm: 0 }, T);
    expect(els.resHit.style.color).toBe("#d81f27");
  });
});
