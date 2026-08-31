import { type FakeElement, fakeDocument } from "../../testing";
import type { AttackAssessment, EngagementView, TurretSpec, DroneSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import type { ViewStore } from "../controlsContract";
import type { AppliedDpsHintRenderer } from "./appliedDpsHintRenderer";
import { AppliedDpsHintRendererImpl } from "./appliedDpsHintRenderer";
import { type AppliedDpsHintProviderDeps, AppliedDpsHintProviderImpl } from "./appliedDpsHintProvider";

const turret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: 100, cycleTime: 5, turretCount: 4 };
const drone: DroneSpec = { kind: "drone", tracking: 0.15, sigResolution: 40, optimal: 1000, falloff: 500, damagePerShot: 20, cycleTime: 4, droneCount: 5, maxVelocity: 6000, orbitSpeed: 1800, isSentry: false };

const turretAssessment: AttackAssessment = {
  boostedWeapon: turret, effectiveWeapon: turret,
  damage: { nominalDps: 80, appliedDps: 64, application: 0.8, volley: 400 },
  turret: { hit: { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1 }, expectedMultiplier: 0.8 },
};

const droneAssessment: AttackAssessment = {
  boostedWeapon: drone, effectiveWeapon: drone,
  damage: { nominalDps: 25, appliedDps: 20, application: 0.8, volley: 100 },
  drone: { hit: { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1 }, expectedMultiplier: 0.8, inRange: true, orbiting: true },
};

function makeView(weaponAttacks: { shipA: readonly { weapon: TurretSpec | DroneSpec; assessment: AttackAssessment }[]; shipB: readonly never[] }): EngagementView {
  return {
    frame: { time: 0, shipA: {} as never, shipB: {} as never, relPosition: {} as never, distance: 5000, relVelocity: {} as never, radialVelocity: 0, transversalVelocity: {} as never, transversalSpeed: 0, angularVelocity: 0 },
    attacks: { shipA: turretAssessment, shipB: undefined },
    weaponAttacks,
    effectiveWeapons: { shipA: turret, shipB: undefined },
  } as unknown as EngagementView;
}

function makeI18n(): I18n {
  return { current: vi.fn(() => "en"), t: vi.fn((key: string) => key) } as unknown as I18n;
}

function makeViewStore(view: EngagementView | undefined): ViewStore {
  return { currentView: vi.fn(() => view) } as unknown as ViewStore;
}

function makeRenderer(): AppliedDpsHintRenderer {
  const renderer = new AppliedDpsHintRendererImpl({ t: (key) => key });
  return renderer as unknown as AppliedDpsHintRenderer;
}

function makeDeps(overrides: Partial<AppliedDpsHintProviderDeps> = {}): AppliedDpsHintProviderDeps {
  return {
    i18n: makeI18n(),
    viewStore: makeViewStore(makeView({ shipA: [{ weapon: turret, assessment: turretAssessment }], shipB: [] })),
    appliedDpsHintRenderer: makeRenderer(),
    ...overrides,
  };
}

function makeAnchor(side?: string): HTMLElement {
  const anchor = globalThis.document.createElement("span");
  if (side) anchor.dataset.side = side;
  return anchor;
}

describe("AppliedDpsHintProviderImpl", () => {
  let originalDocument: Document | undefined;
  let originalElement: typeof Element | undefined;

  beforeEach(() => {
    originalDocument = globalThis.document;
    originalElement = globalThis.Element;
    globalThis.document = fakeDocument();
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      globalThis.document = originalDocument;
    }
    if (originalElement === undefined) {
      delete (globalThis as Record<string, unknown>).Element;
    } else {
      globalThis.Element = originalElement;
    }
  });

  test("renders nothing when anchor has no data-side", () => {
    const provider = new AppliedDpsHintProviderImpl(makeDeps());
    const anchor = makeAnchor();
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(0);
  });

  test("renders nothing when view store has no current view", () => {
    const provider = new AppliedDpsHintProviderImpl(makeDeps({ viewStore: makeViewStore(undefined) }));
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(0);
  });

  test("renders nothing when side has no weapon attacks", () => {
    const provider = new AppliedDpsHintProviderImpl(makeDeps({ viewStore: makeViewStore(makeView({ shipA: [], shipB: [] })) }));
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(0);
  });

  test("renders per-weapon rows for ship A", () => {
    const view = makeView({ shipA: [{ weapon: turret, assessment: turretAssessment }, { weapon: drone, assessment: droneAssessment }], shipB: [] });
    const provider = new AppliedDpsHintProviderImpl(makeDeps({ viewStore: makeViewStore(view) }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    provider.render(anchor, container as unknown as HTMLElement);
    expect(container.children.length).toBe(1);
    const root = container.children[0] as FakeElement;
    expect(root.className).toBe("dps-hint");
    expect(root.children.length).toBe(3);
  });

  test("accepts short side names (a/b)", () => {
    const provider = new AppliedDpsHintProviderImpl(makeDeps());
    const anchor = makeAnchor("b");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(0);
  });
});
