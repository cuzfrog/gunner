import { Vec2, type EngagementFrame, type HitChanceBreakdown, type ShipState, type SimSnapshot, type TurretSpec } from "../sim";
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

function fakeContext(): CanvasRenderingContext2D & { strokeStyles: string[]; arcs: number[][]; dashes: number[][] } {
  const strokeStyles: string[] = [];
  const arcs: number[][] = [];
  const dashes: number[][] = [];
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
    "fillText",
  ];
  const target: Record<string, unknown> = {
    strokeStyles,
    arcs,
    dashes,
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
  };
  for (const method of methods) {
    target[method] = () => {};
  }
  target.arc = (...args: number[]) => arcs.push(args);
  target.setLineDash = (dash: number[]) => dashes.push(dash);
  target.measureText = () => ({ width: 0 });
  return new Proxy(target, {
    get(o, p) {
      return o[p as string];
    },
    set(o, p, v) {
      if (p === "strokeStyle") strokeStyles.push(v);
      o[p as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { strokeStyles: string[]; arcs: number[][]; dashes: number[][] };
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
  id: "attacker",
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
  attacker: ship,
  target: { ...ship, id: "target" },
  commands: { attacker: new Vec2(0, 0), target: new Vec2(0, 0) },
};

const frame: EngagementFrame = {
  time: 0,
  attacker: ship,
  target: ship,
  relPosition: new Vec2(0, 5000),
  distance: 5000,
  relVelocity: new Vec2(0, 0),
  radialVelocity: 0,
  transversalVelocity: new Vec2(0, 0),
  transversalSpeed: 0,
  angularVelocity: 0,
};

const turret: TurretSpec = { tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };

function gridColorOf(renderer: CanvasRenderer, canvas: HTMLCanvasElement): string {
  renderer.draw(snapshot, frame, hit, turret, []);
  return (canvas.getContext("2d") as unknown as { strokeStyles: string[] }).strokeStyles[0];
}

function shipAt(position: Vec2, id: ShipState["id"] = "target", desiredRange = 5000): ShipState {
  return { ...ship, id, position, desiredRange };
}

function cameraScaleFor(attacker: ShipState, target: ShipState, clientWidth = 1000, clientHeight = 1000): number {
  const canvas = fakeCanvas(clientWidth, clientHeight);
  const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
  const testSnapshot: SimSnapshot = {
    time: 0,
    attacker,
    target,
    commands: { attacker: new Vec2(0, 0), target: new Vec2(0, 0) },
  };
  renderer.draw(testSnapshot, frame, hit, turret, []);
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
    renderer.draw(snapshot, frame, hit, turret, []);
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(400);
  });

  describe("updateCamera", () => {
    test("caps zoom in at 3x farScale when ships are very close", () => {
      const attacker = shipAt(new Vec2(0, 0), "attacker");
      const target = shipAt(new Vec2(0, 10), "target");
      const scale = cameraScaleFor(attacker, target);
      expect(scale).toBe(0.12);
    });

    test("uses farScale as baseline at the normal separation", () => {
      const attacker = shipAt(new Vec2(0, 0), "attacker");
      const target = shipAt(new Vec2(0, 3500), "target");
      const scale = cameraScaleFor(attacker, target);
      expect(scale).toBe(0.04);
    });

    test("stays at farScale while ships still fit inside the margin", () => {
      const attacker = shipAt(new Vec2(0, 0), "attacker");
      const target = shipAt(new Vec2(0, 10000), "target");
      const scale = cameraScaleFor(attacker, target);
      expect(scale).toBe(0.04);
    });

    test("zooms out below farScale when ships reach the canvas margin", () => {
      const attacker = shipAt(new Vec2(0, 0), "attacker");
      const target = shipAt(new Vec2(0, 30000), "target");
      const scale = cameraScaleFor(attacker, target);
      expect(scale).toBeCloseTo(0.028, 10);
    });

    test("caps zoom out at farScale / 3 when ships are very far apart", () => {
      const attacker = shipAt(new Vec2(0, 0), "attacker");
      const target = shipAt(new Vec2(0, 100000), "target");
      const scale = cameraScaleFor(attacker, target);
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
      const overlay: RangeOverlay = { side: "attacker", kind: "web", radius: 3000 };
      renderer.draw(snapshot, frame, hit, turret, [overlay]);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const camera = cameraOf(renderer);
      const expected = screenPosition(canvas, renderer, snapshot.attacker.position);
      const expectedRadius = overlay.radius * camera.scale;
      const arc = ctx.arcs.find((a) => Math.abs(a[0] - expected.x) < 0.5 && Math.abs(a[1] - expected.y) < 0.5 && Math.abs(a[2] - expectedRadius) < 0.5);
      expect(arc).toBeDefined();
    });

    test("draws a dashed second arc when falloffRadius is present", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const overlay: RangeOverlay = { side: "attacker", kind: "grappler", radius: 1000, falloffRadius: 8000 };
      renderer.draw(snapshot, frame, hit, turret, [overlay]);
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
      renderer.draw(snapshot, frame, hit, turret, []);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const arcsBeforeOverlays = 2;
      expect(ctx.arcs.length).toBe(arcsBeforeOverlays);
    });

    test("skips radii less than or equal to zero", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const bad: RangeOverlay = { side: "attacker", kind: "web", radius: 0 };
      renderer.draw(snapshot, frame, hit, turret, [bad]);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      expect(ctx.arcs.every((a) => a[2] !== 0)).toBe(true);
    });

    test("centers target overlays on the target ship position", () => {
      const canvas = fakeCanvas();
      const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
      const attackerPos = new Vec2(0, 0);
      const targetPos = new Vec2(1000, 0);
      const testSnapshot = { ...snapshot, attacker: { ...ship, position: attackerPos }, target: { ...ship, position: targetPos } };
      const overlay: RangeOverlay = { side: "target", kind: "scrambler", radius: 3000 };
      renderer.draw(testSnapshot, frame, hit, turret, [overlay]);
      const ctx = canvas.getContext("2d") as unknown as { arcs: number[][] };
      const expected = screenPosition(canvas, renderer, targetPos);
      const expectedRadius = overlay.radius * cameraOf(renderer).scale;
      const arc = ctx.arcs.find((a) => Math.abs(a[0] - expected.x) < 0.5 && Math.abs(a[1] - expected.y) < 0.5 && Math.abs(a[2] - expectedRadius) < 0.5);
      expect(arc).toBeDefined();
    });
  });
});
