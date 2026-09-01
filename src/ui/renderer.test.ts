import { Vec2, type EngagementFrame, type ShipState, type SimSnapshot, type TurretSpec } from "../sim";
import type { I18n } from "./i18n";
import { CanvasRenderer, type RangeOverlay } from "./renderer";

function fakeI18n(): I18n {
  return {
    current: () => "en",
    setLanguage: () => {},
    t: (key) => key,
    translateDocument: () => {},
  };
}

function fakeContext(): CanvasRenderingContext2D & { strokeStyles: string[]; arcs: number[][]; dashes: number[][]; fillTexts: string[] } {
  const strokeStyles: string[] = [];
  const arcs: number[][] = [];
  const dashes: number[][] = [];
  const fillTexts: string[] = [];
  const methods = [
    "fillRect",
    "strokeRect",
    "clearRect",
    "beginPath",
    "closePath",
    "moveTo",
    "lineTo",
    "arc",
    "stroke",
    "fill",
    "save",
    "restore",
    "translate",
    "rotate",
    "setLineDash",
  ];
  const shipB: Record<string, unknown> = {
    strokeStyles,
    arcs,
    dashes,
    fillTexts,
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
  };
  for (const method of methods) {
    shipB[method] = () => {};
  }
  shipB.arc = (...args: number[]) => arcs.push(args);
  shipB.setLineDash = (dash: number[]) => dashes.push(dash);
  shipB.fillText = (text: string) => fillTexts.push(text);
  shipB.measureText = () => ({ width: 0 });
  return new Proxy(shipB, {
    get(o, p) {
      return o[p as string];
    },
    set(o, p, v) {
      if (p === "strokeStyle") strokeStyles.push(v);
      o[p as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { strokeStyles: string[]; arcs: number[][]; dashes: number[][]; fillTexts: string[] };
}

function fakeCanvas(clientWidth = 0, clientHeight = 0): HTMLCanvasElement {
  const ctx = fakeContext();
  return {
    width: 800,
    height: 600,
    clientWidth,
    clientHeight,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

const ship: ShipState = {
  id: "shipA",
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
  maxSpeed: 0,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: "orbit",
  desiredRange: 5000,
  aggressivity: 1,
};

const snapshot: SimSnapshot = {
  time: 0,
  shipA: ship,
  shipB: { ...ship, id: "shipB" },
  commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) },
};

const frame: EngagementFrame = {
  time: 0,
  shipA: ship,
  shipB: ship,
  relPosition: new Vec2(0, 5000),
  distance: 5000,
  relVelocity: new Vec2(0, 0),
  radialVelocity: 0,
  transversalVelocity: new Vec2(0, 0),
  transversalSpeed: 0,
  angularVelocity: 0,
};

const turret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: 0, cycleTime: 1, turretCount: 1 };

function gridColorOf(renderer: CanvasRenderer, canvas: HTMLCanvasElement): string {
  renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] });
  return (canvas.getContext("2d") as unknown as { strokeStyles: string[] }).strokeStyles[0];
}

function shipAt(position: Vec2, id: ShipState["id"] = "shipB", desiredRange = 5000): ShipState {
  return { ...ship, id, position, desiredRange };
}

function cameraScaleFor(shipA: ShipState, shipB: ShipState, clientWidth = 1000, clientHeight = 1000): number {
  const canvas = fakeCanvas(clientWidth, clientHeight);
  const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
  const testSnapshot: SimSnapshot = {
    time: 0,
    shipA,
    shipB,
    commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) },
  };
  renderer.draw(testSnapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] });
  return (renderer as unknown as { camera: { scale: number } }).camera.scale;
}

describe("CanvasRenderer", () => {
  test("drawGrid uses the default brightness when not overridden", () => {
    const canvas = fakeCanvas();
    const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
    expect(gridColorOf(renderer, canvas)).toBe("rgba(92, 203, 203, 0.2)");
  });

  test("setGridBrightness clamps negative values to 0", () => {
    const canvas = fakeCanvas();
    const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
    renderer.setGridBrightness(-0.5);
    expect(gridColorOf(renderer, canvas)).toBe("rgba(92, 203, 203, 0)");
  });

  test("setGridBrightness clamps values above 1 to max", () => {
    const canvas = fakeCanvas();
    const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
    renderer.setGridBrightness(2);
    expect(gridColorOf(renderer, canvas)).toBe("rgba(92, 203, 203, 0.4)");
  });

  test("setGridBrightness scales the grid alpha linearly", () => {
    const canvas = fakeCanvas();
    const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
    renderer.setGridBrightness(0.5);
    expect(gridColorOf(renderer, canvas)).toBe("rgba(92, 203, 203, 0.2)");
  });

  test("draw resizes the canvas buffer to match the displayed size", () => {
    const canvas = fakeCanvas(1000, 400);
    const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
    renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] });
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(400);
  });

  test("drawReadouts shows common real-time values and no hit or turret data", () => {
    const canvas = fakeCanvas();
    const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
    renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] });
    const ctx = canvas.getContext("2d") as unknown as { fillTexts: string[] };
    const readouts = ctx.fillTexts.filter((t) => t.startsWith("readout."));
    expect(readouts).toEqual([
      "readout.time0:00.0",
      "readout.range5,000 unit.meter",
      "readout.angular0.0000 rad/s",
      "readout.transversal0.0 m/s",
      "readout.radial0.0 m/s",
    ]);
  });

  describe("updateCamera", () => {
    test("caps zoom in at 3x farScale when ships are very close", () => {
      const shipA = shipAt(new Vec2(0, 0), "shipA");
      const shipB = shipAt(new Vec2(0, 10), "shipB");
      const scale = cameraScaleFor(shipA, shipB);
      expect(scale).toBe(0.12);
    });

    test("uses farScale as baseline at the normal separation", () => {
      const shipA = shipAt(new Vec2(0, 0), "shipA");
      const shipB = shipAt(new Vec2(0, 3500), "shipB");
      const scale = cameraScaleFor(shipA, shipB);
      expect(scale).toBe(0.04);
    });

    test("stays at farScale while ships still fit inside the margin", () => {
      const shipA = shipAt(new Vec2(0, 0), "shipA");
      const shipB = shipAt(new Vec2(0, 10000), "shipB");
      const scale = cameraScaleFor(shipA, shipB);
      expect(scale).toBe(0.04);
    });

    test("zooms out below farScale when ships reach the canvas margin", () => {
      const shipA = shipAt(new Vec2(0, 0), "shipA");
      const shipB = shipAt(new Vec2(0, 30000), "shipB");
      const scale = cameraScaleFor(shipA, shipB);
      expect(scale).toBeCloseTo(0.028, 10);
    });

    test("caps zoom out at farScale / 3 when ships are very far apart", () => {
      const shipA = shipAt(new Vec2(0, 0), "shipA");
      const shipB = shipAt(new Vec2(0, 100000), "shipB");
      const scale = cameraScaleFor(shipA, shipB);
      expect(scale).toBeCloseTo(0.04 / 3, 10);
    });
  });

  describe("drawRangeOverlays", () => {
    function cameraOf(renderer: CanvasRenderer): { center: Vec2; scale: number } {
      return (renderer as unknown as { camera: { center: Vec2; scale: number } }).camera;
    }

    function screenPosition(canvas: HTMLCanvasElement, renderer: CanvasRenderer, position: Vec2): Vec2 {
      const camera = cameraOf(renderer);
      return new Vec2(
        canvas.width / 2 + (position.x - camera.center.x) * camera.scale,
        canvas.height / 2 - (position.y - camera.center.y) * camera.scale,
      );
    }

    test("draws one arc per overlay radius centered on the side's ship position", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const overlay: RangeOverlay = { side: "shipA", kind: "web", radius: 3000 };
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [overlay], { shipA: [], shipB: [] });
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const camera = cameraOf(renderer);
      const expected = screenPosition(canvas, renderer, snapshot.shipA.position);
      const expectedRadius = overlay.radius * camera.scale;
      const arc = ctx.arcs.find((a) => Math.abs(a[0] - expected.x) < 0.5 && Math.abs(a[1] - expected.y) < 0.5 && Math.abs(a[2] - expectedRadius) < 0.5);
      expect(arc).toBeDefined();
    });

    test("draws a dashed second arc when falloffRadius is present", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const overlay: RangeOverlay = { side: "shipA", kind: "grappler", radius: 1000, falloffRadius: 8000 };
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [overlay], { shipA: [], shipB: [] });
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][]; dashes: number[][] };
      const camera = cameraOf(renderer);
      const radii = new Set(ctx.arcs.map((a) => a[2]));
      const scale = camera.scale;
      expect(radii.has(overlay.radius * scale)).toBe(true);
      expect(radii.has((overlay.radius + overlay.falloffRadius!) * scale)).toBe(true);
      expect(ctx.dashes.some((d) => d.length === 2 && d[0] === 4 && d[1] === 6)).toBe(true);
    });

    test("skips overlay arcs when the overlay list is empty", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setWeaponRangeVisibility("shipA");
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] });
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const arcsBeforeOverlays = 2;
      expect(ctx.arcs.length).toBe(arcsBeforeOverlays);
    });

    test("skips radii less than or equal to zero", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const bad: RangeOverlay = { side: "shipA", kind: "web", radius: 0 };
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [bad], { shipA: [], shipB: [] });
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      expect(ctx.arcs.every((a) => a[2] !== 0)).toBe(true);
    });

    test("centers shipB overlays on the shipB ship position", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const shipAPos = new Vec2(0, 0);
      const shipBPos = new Vec2(1000, 0);
      const testSnapshot = { ...snapshot, shipA: { ...ship, position: shipAPos }, shipB: { ...ship, position: shipBPos } };
      const overlay: RangeOverlay = { side: "shipB", kind: "scrambler", radius: 3000 };
      renderer.draw(testSnapshot, frame, { shipA: turret, shipB: turret }, [overlay], { shipA: [], shipB: [] });
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const expected = screenPosition(canvas, renderer, shipBPos);
      const expectedRadius = overlay.radius * cameraOf(renderer).scale;
      const arc = ctx.arcs.find((a) => Math.abs(a[0] - expected.x) < 0.5 && Math.abs(a[1] - expected.y) < 0.5 && Math.abs(a[2] - expectedRadius) < 0.5);
      expect(arc).toBeDefined();
    });
  });

  describe("weapon range visibility", () => {
    const shipAPos = new Vec2(0, 0);
    const shipBPos = new Vec2(10000, 0);
    const rangeSnapshot: SimSnapshot = {
      time: 0,
      shipA: { ...ship, id: "shipA", position: shipAPos },
      shipB: { ...ship, id: "shipB", position: shipBPos },
      commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) },
    };
    const shipATurret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: 0, cycleTime: 1, turretCount: 1 };
    const shipBTurret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 8000, falloff: 3000, damagePerShot: 0, cycleTime: 1, turretCount: 1 };

    function rendererWithVisibility(visibility: "shipA" | "shipB" | "both" | "none"): { renderer: CanvasRenderer; arcs: number[][] } {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setWeaponRangeVisibility(visibility);
      renderer.draw(rangeSnapshot, frame, { shipA: shipATurret, shipB: shipBTurret }, [], { shipA: [], shipB: [] });
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      return { renderer, arcs: ctx.arcs };
    }

    function scaleOf(renderer: CanvasRenderer): number {
      return (renderer as unknown as { camera: { scale: number } }).camera.scale;
    }

    test("draws both ships' range rings by default", () => {
      const { renderer, arcs } = rendererWithVisibility("both");
      const scale = scaleOf(renderer);
      const shipAOptimal = shipATurret.optimal * scale;
      const shipBOptimal = shipBTurret.optimal * scale;
      expect(arcs.some((a) => Math.abs(a[2] - shipAOptimal) < 0.5)).toBe(true);
      expect(arcs.some((a) => Math.abs(a[2] - shipBOptimal) < 0.5)).toBe(true);
    });

    test("draws only shipA rings when visibility is shipA", () => {
      const { renderer, arcs } = rendererWithVisibility("shipA");
      const scale = scaleOf(renderer);
      const shipAOptimal = shipATurret.optimal * scale;
      const shipBOptimal = shipBTurret.optimal * scale;
      expect(arcs.some((a) => Math.abs(a[2] - shipAOptimal) < 0.5)).toBe(true);
      expect(arcs.some((a) => Math.abs(a[2] - shipBOptimal) < 0.5)).toBe(false);
    });

    test("draws only shipB rings when visibility is shipB", () => {
      const { renderer, arcs } = rendererWithVisibility("shipB");
      const scale = scaleOf(renderer);
      const shipAOptimal = shipATurret.optimal * scale;
      const shipBOptimal = shipBTurret.optimal * scale;
      expect(arcs.some((a) => Math.abs(a[2] - shipAOptimal) < 0.5)).toBe(false);
      expect(arcs.some((a) => Math.abs(a[2] - shipBOptimal) < 0.5)).toBe(true);
    });

    test("draws no range rings when visibility is none", () => {
      const { arcs } = rendererWithVisibility("none");
      expect(arcs.length).toBe(0);
    });

    test("draws drone range rings identically to turret rings", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const droneRange = { kind: "drone" as const, optimal: 4000, falloff: 2000 };
      renderer.draw(rangeSnapshot, frame, { shipA: droneRange, shipB: droneRange }, [], { shipA: [], shipB: [] });
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const scale = scaleOf(renderer);
      const optimalRadius = droneRange.optimal * scale;
      const falloffRadius = (droneRange.optimal + droneRange.falloff) * scale;
      expect(ctx.arcs.some((a) => Math.abs(a[2] - optimalRadius) < 0.5)).toBe(true);
      expect(ctx.arcs.some((a) => Math.abs(a[2] - falloffRadius) < 0.5)).toBe(true);
    });

    test("draws turret and drone rings through the same optimal/falloff path", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const shipARange = { kind: "turret" as const, optimal: 5000, falloff: 3000 };
      const shipBRange = { kind: "drone" as const, optimal: 4000, falloff: 2000 };
      renderer.draw(rangeSnapshot, frame, { shipA: shipARange, shipB: shipBRange }, [], { shipA: [], shipB: [] });
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const scale = scaleOf(renderer);
      const shipAFalloff = (shipARange.optimal + shipARange.falloff) * scale;
      const shipBFalloff = (shipBRange.optimal + shipBRange.falloff) * scale;
      expect(ctx.arcs.some((a) => Math.abs(a[2] - shipAFalloff) < 0.5)).toBe(true);
      expect(ctx.arcs.some((a) => Math.abs(a[2] - shipBFalloff) < 0.5)).toBe(true);
    });
  });
});
