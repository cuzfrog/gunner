import { vec } from "../math";
import type { EngagementFrame, HitChanceBreakdown, ShipState, SimSnapshot, TurretSpec } from "../sim";
import type { I18n } from "./i18n";
import { CanvasRenderer } from "./renderer";

function fakeI18n(): I18n {
  return {
    current: () => "en",
    setLanguage: () => {},
    t: (key) => key,
    translateDocument: () => {},
  };
}

function fakeContext(): CanvasRenderingContext2D & { strokeStyles: string[] } {
  const strokeStyles: string[] = [];
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
  }) as unknown as CanvasRenderingContext2D & { strokeStyles: string[] };
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
  position: vec(0, 0),
  velocity: vec(0, 0),
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
  commands: { attacker: vec(0, 0), target: vec(0, 0) },
};

const frame: EngagementFrame = {
  time: 0,
  attacker: ship,
  target: ship,
  relPosition: vec(0, 5000),
  distance: 5000,
  relVelocity: vec(0, 0),
  radialVelocity: 0,
  transversalVelocity: vec(0, 0),
  transversalSpeed: 0,
  angularVelocity: 0,
};

const turret: TurretSpec = { tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };

function gridColorOf(renderer: CanvasRenderer, canvas: HTMLCanvasElement): string {
  renderer.draw(snapshot, frame, hit, turret);
  return (canvas.getContext("2d") as unknown as { strokeStyles: string[] }).strokeStyles[0];
}

describe("CanvasRenderer", () => {
  test("drawGrid uses the default brightness when not overridden", () => {
    const canvas = fakeCanvas();
    const renderer = new CanvasRenderer({ canvas, i18n: fakeI18n() });
    expect(gridColorOf(renderer, canvas)).toBe("rgba(92, 203, 203, 0.08)");
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
    renderer.draw(snapshot, frame, hit, turret);
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(400);
  });
});
