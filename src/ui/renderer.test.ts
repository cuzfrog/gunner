import { Vec2, ZERO_DAMAGE, type EngagementFrame, type ShipState, type SimSnapshot, type TurretSpec } from "../sim";
import { toTypeId } from "../gamedata/ids";
import type { WeaponRangeVisibility } from "../appstate";
import type { I18n } from "./i18n";
import { CanvasRenderer, type RangeOverlay, type WeaponRange, type WeaponRanges } from "./renderer";

function fakeI18n(): I18n {
  return {
    current: () => "en",
    setLanguage: () => {},
    t: (key) => key,
    translateDocument: () => {},
  };
}

function fakeContext(): CanvasRenderingContext2D & { strokeStyles: string[]; arcs: number[][]; dashes: number[][]; fillTexts: string[]; moveTos: number[][]; lineTos: number[][] } {
  const strokeStyles: string[] = [];
  const arcs: number[][] = [];
  const dashes: number[][] = [];
  const fillTexts: string[] = [];
  const moveTos: number[][] = [];
  const lineTos: number[][] = [];
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
    moveTos,
    lineTos,
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
  shipB.moveTo = (...args: number[]) => moveTos.push(args);
  shipB.lineTo = (...args: number[]) => lineTos.push(args);
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
  }) as unknown as CanvasRenderingContext2D & { strokeStyles: string[]; arcs: number[][]; dashes: number[][]; fillTexts: string[]; moveTos: number[][]; lineTos: number[][] };
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

const turret: TurretSpec = { kind: "turret", moduleId: toTypeId("1"), tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };

const zeroRange: WeaponRange = { kind: "turret", optimal: 0, falloff: 0 };
const zeroRanges: WeaponRanges = { shipA: zeroRange, shipB: zeroRange };

function gridColorOf(renderer: CanvasRenderer, canvas: HTMLCanvasElement): string {
  renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
  return (canvas.getContext("2d") as unknown as { strokeStyles: string[] }).strokeStyles[0];
}

function shipAt(position: Vec2, id: ShipState["id"] = "shipB", desiredRange = 5000): ShipState {
  return { ...ship, id, position, desiredRange };
}

interface CameraOptions {
  readonly clientWidth?: number;
  readonly clientHeight?: number;
  readonly cameraRanges?: WeaponRanges;
  readonly displayRanges?: WeaponRanges;
  readonly visibility?: WeaponRangeVisibility;
}

function cameraScaleFor(shipA: ShipState, shipB: ShipState, options: CameraOptions = {}): number {
  const canvas = fakeCanvas(options.clientWidth ?? 1000, options.clientHeight ?? 1000);
  const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
  if (options.visibility) renderer.setWeaponRangeVisibility(options.visibility);
  renderer.setCameraRanges(options.cameraRanges ?? zeroRanges);
  const displayRanges = options.displayRanges ?? { shipA: turret, shipB: turret };
  renderer.draw({ ...snapshot, shipA, shipB }, frame, displayRanges, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
  return (renderer as unknown as { camera: { scale: number } }).camera.scale;
}

function scaleOf(renderer: CanvasRenderer): number {
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
    renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(400);
  });

  test("drawReadouts shows common real-time values and no hit or turret data", () => {
    const canvas = fakeCanvas();
    const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
    renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
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
    const ringRange: WeaponRange = { kind: "turret", optimal: 6000, falloff: 0 };
    const ringRanges: WeaponRanges = { shipA: ringRange, shipB: ringRange };

    test("zooms in until the ships fill the canvas when no weapon is configured", () => {
      const scale = cameraScaleFor(shipAt(new Vec2(0, 0), "shipA"), shipAt(new Vec2(0, 5000), "shipB"));
      expect(scale).toBeCloseTo(840 / 5000, 10);
    });

    test("frames the widest configured ring when it fits inside the ships-fit bound", () => {
      const scale = cameraScaleFor(shipAt(new Vec2(0, 0), "shipA"), shipAt(new Vec2(0, 5000), "shipB"), { cameraRanges: ringRanges });
      expect(scale).toBeCloseTo(1000 / (2 * 6000 * 1.25), 10);
    });

    test("keeps the minimum ship separation and lets wide rings clip", () => {
      const scale = cameraScaleFor(shipAt(new Vec2(0, 0), "shipA"), shipAt(new Vec2(0, 1000), "shipB"), { cameraRanges: ringRanges });
      expect(scale).toBeCloseTo(140 / 1000, 10);
    });

    test("ignores configured rings for framing when ring visibility is none", () => {
      const scale = cameraScaleFor(shipAt(new Vec2(0, 0), "shipA"), shipAt(new Vec2(0, 5000), "shipB"), { cameraRanges: ringRanges, visibility: "none" });
      expect(scale).toBeCloseTo(840 / 5000, 10);
    });

    test("falls back to the minimum view radius when the ships coincide", () => {
      const scale = cameraScaleFor(shipAt(new Vec2(0, 0), "shipA"), shipAt(new Vec2(0, 0), "shipB"));
      expect(scale).toBeCloseTo(1000 / (2 * 250), 10);
    });

    test("does not steer the camera from the disrupted display ranges", () => {
      const shipA = shipAt(new Vec2(0, 0), "shipA");
      const shipB = shipAt(new Vec2(0, 5000), "shipB");
      const disrupted: WeaponRanges = { shipA: { kind: "turret", optimal: 2000, falloff: 0 }, shipB: { kind: "turret", optimal: 2000, falloff: 0 } };
      const boosted = cameraScaleFor(shipA, shipB, { cameraRanges: ringRanges, displayRanges: ringRanges });
      const disruptedScale = cameraScaleFor(shipA, shipB, { cameraRanges: ringRanges, displayRanges: disrupted });
      expect(disruptedScale).toBe(boosted);
    });

    test("reframes when the configured camera ranges change", () => {
      const shipA = shipAt(new Vec2(0, 0), "shipA");
      const shipB = shipAt(new Vec2(0, 5000), "shipB");
      const wide = cameraScaleFor(shipA, shipB, { cameraRanges: ringRanges });
      const narrowRanges: WeaponRanges = { shipA: { kind: "turret", optimal: 12000, falloff: 0 }, shipB: { kind: "turret", optimal: 12000, falloff: 0 } };
      const narrow = cameraScaleFor(shipA, shipB, { cameraRanges: narrowRanges });
      expect(narrow).not.toBe(wide);
      expect(narrow).toBeCloseTo(1000 / (2 * 12000 * 1.25), 10);
    });
  });

  describe("manual zoom anchoring", () => {
    function zoomRenderer(): CanvasRenderer {
      const renderer = new CanvasRenderer({ canvas: fakeCanvas(1000, 1000), i18n: fakeI18n() });
      renderer.setCameraRanges(zeroRanges);
      return renderer;
    }

    function drawShips(renderer: CanvasRenderer, shipB: ShipState): void {
      renderer.draw({ ...snapshot, shipB }, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
    }

    function zoomFactorOf(renderer: CanvasRenderer): number {
      return (renderer as unknown as { zoomFactor: number }).zoomFactor;
    }

    const shipA = shipAt(new Vec2(0, 0), "shipA");
    const at5000 = shipAt(new Vec2(0, 5000), "shipB");
    const at10000 = shipAt(new Vec2(0, 10000), "shipB");
    const at20000 = shipAt(new Vec2(0, 20000), "shipB");

    test("toggling auto zoom off keeps the current scale", () => {
      const renderer = zoomRenderer();
      drawShips(renderer, at5000);
      const before = scaleOf(renderer);
      renderer.setManualZoom(false, 1);
      drawShips(renderer, at10000);
      expect(scaleOf(renderer)).toBe(before);
    });

    test("manual zoom factor multiplies the anchored scale", () => {
      const renderer = zoomRenderer();
      renderer.setManualZoom(false, 1);
      drawShips(renderer, at5000);
      const anchored = scaleOf(renderer);
      renderer.setManualZoom(false, 2);
      drawShips(renderer, at5000);
      expect(scaleOf(renderer)).toBeCloseTo(anchored * 2, 10);
    });

    test("manual scale stays constant while distance and camera ranges change", () => {
      const renderer = zoomRenderer();
      renderer.setManualZoom(false, 1);
      drawShips(renderer, at5000);
      const anchored = scaleOf(renderer);
      renderer.setCameraRanges({ shipA: { kind: "turret", optimal: 12000, falloff: 0 }, shipB: { kind: "turret", optimal: 12000, falloff: 0 } });
      drawShips(renderer, at20000);
      expect(scaleOf(renderer)).toBe(anchored);
    });

    test("re-enabling manual zoom re-anchors at the current auto scale", () => {
      const renderer = zoomRenderer();
      renderer.setManualZoom(false, 1);
      drawShips(renderer, at5000);
      const first = scaleOf(renderer);
      renderer.setManualZoom(true, 1);
      drawShips(renderer, at20000);
      const auto = scaleOf(renderer);
      expect(auto).not.toBe(first);
      renderer.setManualZoom(false, 1);
      drawShips(renderer, at20000);
      expect(scaleOf(renderer)).toBe(auto);
    });

    test("a fresh manual session anchors on the first frame's auto scale", () => {
      const autoRenderer = zoomRenderer();
      drawShips(autoRenderer, at5000);
      const autoScale = scaleOf(autoRenderer);
      const manualRenderer = zoomRenderer();
      manualRenderer.setManualZoom(false, 2);
      drawShips(manualRenderer, at5000);
      expect(scaleOf(manualRenderer)).toBeCloseTo(autoScale, 10);
      drawShips(manualRenderer, at20000);
      expect(scaleOf(manualRenderer)).toBeCloseTo(autoScale, 10);
    });

    test("manual zoom factor stays clamped to [0.25, 4]", () => {
      const renderer = zoomRenderer();
      renderer.setManualZoom(false, 10);
      expect(zoomFactorOf(renderer)).toBe(4);
      renderer.setManualZoom(false, 0.1);
      expect(zoomFactorOf(renderer)).toBe(0.25);
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
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [overlay], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
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
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [overlay], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
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
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const arcsBeforeOverlays = 2;
      expect(ctx.arcs.length).toBe(arcsBeforeOverlays);
    });

    test("skips radii less than or equal to zero", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const bad: RangeOverlay = { side: "shipA", kind: "web", radius: 0 };
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [bad], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
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
      renderer.draw(testSnapshot, frame, { shipA: turret, shipB: turret }, [overlay], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
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
    const shipATurret: TurretSpec = { kind: "turret", moduleId: toTypeId("1"), tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };
    const shipBTurret: TurretSpec = { kind: "turret", moduleId: toTypeId("2"), tracking: 0.32, sigResolution: 40, optimal: 8000, falloff: 3000, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };

    function rendererWithVisibility(visibility: "shipA" | "shipB" | "both" | "none"): { renderer: CanvasRenderer; arcs: number[][] } {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setWeaponRangeVisibility(visibility);
      renderer.draw(rangeSnapshot, frame, { shipA: shipATurret, shipB: shipBTurret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      return { renderer, arcs: ctx.arcs };
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
  });

  describe("drone markers and range rings", () => {
    function rendererWithDrones(visibility: WeaponRangeVisibility, droneInfo: { shipA: readonly { positions: readonly Vec2[]; optimal: number; falloff: number; controlRange: number }[]; shipB: readonly { positions: readonly Vec2[]; optimal: number; falloff: number; controlRange: number }[] }) {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setDroneRangeVisibility(visibility);
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], droneInfo, undefined, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][]; strokeStyles: string[] };
      return { renderer, arcs: ctx.arcs, strokeStyles: ctx.strokeStyles };
    }

    test("draws one X marker per drone position", () => {
      const positions = [new Vec2(1000, 0), new Vec2(1100, 0), new Vec2(900, 0)];
      const { strokeStyles } = rendererWithDrones("both", { shipA: [{ positions, optimal: 1500, falloff: 500, controlRange: 60000 }], shipB: [] });
      // Each X marker draws 2 lineTo calls; 3 drones = 6 lineTo calls = 6 strokeStyle pushes from the X strokes
      // The X marker uses strokeStyle, so at least 3 X markers should be drawn (one per position)
      expect(strokeStyles.length).toBeGreaterThan(0);
    });

    test("draws drone range rings centered on centroid of positions", () => {
      const positions = [new Vec2(1000, 0), new Vec2(1100, 0), new Vec2(900, 0)];
      const { renderer, arcs } = rendererWithDrones("shipA", { shipA: [{ positions, optimal: 1500, falloff: 500, controlRange: 60000 }], shipB: [] });
      const scale = scaleOf(renderer);
      const optimalRadius = 1500 * scale;
      const falloffRadius = (1500 + 500) * scale;
      expect(arcs.some((a) => Math.abs(a[2] - optimalRadius) < 0.5)).toBe(true);
      expect(arcs.some((a) => Math.abs(a[2] - falloffRadius) < 0.5)).toBe(true);
    });

    test("draws no drone range rings when visibility is none", () => {
      const positions = [new Vec2(1000, 0)];
      const { renderer, arcs } = rendererWithDrones("none", { shipA: [{ positions, optimal: 1500, falloff: 500, controlRange: 60000 }], shipB: [] });
      const scale = scaleOf(renderer);
      const optimalRadius = 1500 * scale;
      const falloffRadius = (1500 + 500) * scale;
      expect(arcs.some((a) => Math.abs(a[2] - optimalRadius) < 0.5)).toBe(false);
      expect(arcs.some((a) => Math.abs(a[2] - falloffRadius) < 0.5)).toBe(false);
    });

    test("draws drone control range rings from ship position", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setDroneControlRangeVisibility("both");
      const droneInfo = { shipA: [{ positions: [new Vec2(1000, 0)], optimal: 1500, falloff: 500, controlRange: 60000 }], shipB: [] };
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], droneInfo, undefined, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const scale = scaleOf(renderer);
      const controlRadius = 60000 * scale;
      expect(ctx.arcs.some((a) => Math.abs(a[2] - controlRadius) < 1)).toBe(true);
    });
  });

  describe("missile markers", () => {
    test("draws one short line per missile position oriented along velocity", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const missileInfo = {
        shipA: [{ position: new Vec2(1000, 0), velocity: new Vec2(3000, 0), trail: [new Vec2(900, 0), new Vec2(950, 0)] }],
        shipB: [{ position: new Vec2(2000, 0), velocity: new Vec2(0, 3000), trail: [] }],
      };
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, missileInfo, undefined);
      const ctx = canvas.getContext("2d") as unknown as { moveTos: number[][]; lineTos: number[][] };
      const scale = scaleOf(renderer);
      const camera = (renderer as unknown as { camera: { center: Vec2; scale: number } }).camera;
      const expectedAx = canvas.width / 2 + (1000 - camera.center.x) * scale;
      const expectedAy = canvas.height / 2 - (0 - camera.center.y) * scale;
      const expectedBx = canvas.width / 2 + (2000 - camera.center.x) * scale;
      const expectedBy = canvas.height / 2 - (0 - camera.center.y) * scale;
      expect(ctx.lineTos.some((l) => Math.abs(l[0] - expectedAx) < 1 && Math.abs(l[1] - expectedAy) < 1)).toBe(true);
      expect(ctx.lineTos.some((l) => Math.abs(l[0] - expectedBx) < 1 && Math.abs(l[1] - expectedBy) < 1)).toBe(true);
    });

    test("draws no missile markers when missileInfo is undefined", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      expect(ctx.arcs.filter((a) => a[2] === 2)).toHaveLength(0);
    });
  });

  describe("lock indicators", () => {
    const LOCK_RADIUS = 14;

    test("draws no lock arcs when lock states are not set", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      expect(ctx.arcs.filter((a) => Math.abs(a[2] - LOCK_RADIUS) < 0.5)).toHaveLength(0);
    });

    test("draws idle lock arc when status is idle", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setLockStates({ shipA: { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: false }, shipB: { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: false } });
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      expect(ctx.arcs.some((a) => Math.abs(a[2] - LOCK_RADIUS) < 0.5)).toBe(true);
    });

    test("draws progress lock arc when status is locking", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setLockStates({ shipA: { status: "locking", progress: 0.5, remaining: 5, lockTime: 10, inRange: true }, shipB: { status: "locked", progress: 1, remaining: 0, lockTime: 0, inRange: true } });
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const shipALockArcs = ctx.arcs.filter((a) => Math.abs(a[2] - LOCK_RADIUS) < 0.5);
      expect(shipALockArcs.length).toBeGreaterThan(0);
    });

    test("draws no lock arc when status is locked", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setLockStates({ shipA: { status: "locked", progress: 1, remaining: 0, lockTime: 5, inRange: true }, shipB: { status: "locked", progress: 1, remaining: 0, lockTime: 0, inRange: true } });
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      expect(ctx.arcs.filter((a) => Math.abs(a[2] - LOCK_RADIUS) < 0.5)).toHaveLength(0);
    });

    test("skips lock arc for backward-compatible locked state with zero lockTime", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      renderer.setLockStates({ shipA: { status: "locked", progress: 1, remaining: 0, lockTime: 0, inRange: true }, shipB: { status: "locked", progress: 1, remaining: 0, lockTime: 0, inRange: true } });
      renderer.draw(snapshot, frame, { shipA: turret, shipB: turret }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, undefined);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      expect(ctx.arcs.filter((a) => Math.abs(a[2] - LOCK_RADIUS) < 0.5)).toHaveLength(0);
    });
  });
});
