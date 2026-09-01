import { type FakeElement, fakeDocument } from "../../testing";
import type { AttackAssessment, EngagementView, TurretSpec, DroneSpec } from "../../../sim";
import type { ViewStore } from "../controlsContract";
import type { AppliedDpsHintModel, AppliedDpsHintRenderer } from "./appliedDpsHintRenderer";
import { type AppliedDpsHintProviderDeps, AppliedDpsHintProviderImpl } from "./appliedDpsHintProvider";

const turret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: 100, cycleTime: 5, turretCount: 4 };
const drone: DroneSpec = { kind: "drone", tracking: 0.15, sigResolution: 40, optimal: 1000, falloff: 500, damagePerShot: 20, cycleTime: 4, droneCount: 5, maxVelocity: 6000, orbitSpeed: 1800, isSentry: false, controlRange: 60000 };

const turretAssessment: AttackAssessment = {
  boostedWeapon: turret, effectiveWeapon: turret,
  damage: { nominalDps: 80, appliedDps: 64, application: 0.8, volley: 400 },
  turret: { hit: { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1 }, expectedMultiplier: 0.8 },
};

const droneAssessment: AttackAssessment = {
  boostedWeapon: drone, effectiveWeapon: drone,
  damage: { nominalDps: 25, appliedDps: 20, application: 0.8, volley: 100 },
  drone: { hit: { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1 }, expectedMultiplier: 0.8, inRange: true, orbiting: true, mode: "orbiting", distanceToTarget: 1000, inControlRange: true },
};

function makeView(weaponAttacks: { shipA: readonly { weapon: TurretSpec | DroneSpec; assessment: AttackAssessment }[]; shipB: readonly never[] }, attacks?: { shipA: AttackAssessment | undefined; shipB: AttackAssessment | undefined }): EngagementView {
  return {
    frame: { time: 0, shipA: {} as never, shipB: {} as never, relPosition: {} as never, distance: 5000, relVelocity: {} as never, radialVelocity: 0, transversalVelocity: {} as never, transversalSpeed: 0, angularVelocity: 0 },
    attacks: attacks ?? { shipA: turretAssessment, shipB: undefined },
    weaponAttacks,
    effectiveWeapons: { shipA: turret, shipB: undefined },
  } as unknown as EngagementView;
}

function makeViewStore(view: EngagementView | undefined): ViewStore {
  return { currentView: vi.fn(() => view) } as unknown as ViewStore;
}

function makeMockRenderer(): { renderer: AppliedDpsHintRenderer; renderMock: ReturnType<typeof vi.fn> } {
  const renderMock = vi.fn();
  const renderer = { render: renderMock } as unknown as AppliedDpsHintRenderer;
  return { renderer, renderMock };
}

function makeDeps(overrides: Partial<AppliedDpsHintProviderDeps> = {}): AppliedDpsHintProviderDeps & { renderMock: ReturnType<typeof vi.fn> } {
  const { renderer, renderMock } = makeMockRenderer();
  return {
    viewStore: makeViewStore(makeView({ shipA: [{ weapon: turret, assessment: turretAssessment }], shipB: [] })),
    appliedDpsHintRenderer: renderer,
    ...overrides,
    renderMock,
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
    const deps = makeDeps();
    const provider = new AppliedDpsHintProviderImpl(deps);
    const anchor = makeAnchor();
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).not.toHaveBeenCalled();
  });

  test("renders nothing when view store has no current view", () => {
    const deps = makeDeps({ viewStore: makeViewStore(undefined) });
    const provider = new AppliedDpsHintProviderImpl(deps);
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).not.toHaveBeenCalled();
  });

  test("renders nothing when side has no weapon attacks and no combined attack", () => {
    const view = makeView({ shipA: [], shipB: [] }, { shipA: undefined, shipB: undefined });
    const deps = makeDeps({ viewStore: makeViewStore(view) });
    const provider = new AppliedDpsHintProviderImpl(deps);
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).not.toHaveBeenCalled();
  });

  test("renders per-weapon rows for ship A with correct totals", () => {
    const view = makeView({ shipA: [{ weapon: turret, assessment: turretAssessment }, { weapon: drone, assessment: droneAssessment }], shipB: [] });
    const deps = makeDeps({ viewStore: makeViewStore(view) });
    const provider = new AppliedDpsHintProviderImpl(deps);
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).toHaveBeenCalledTimes(1);
    const model = deps.renderMock.mock.calls[0][0] as AppliedDpsHintModel;
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0].weaponKind).toBe("turret");
    expect(model.rows[0].nominalDps).toBe(80);
    expect(model.rows[0].appliedDps).toBe(64);
    expect(model.rows[1].weaponKind).toBe("drone");
    expect(model.rows[1].nominalDps).toBe(25);
    expect(model.totalNominalDps).toBe(105);
    expect(model.totalAppliedDps).toBe(84);
    expect(model.totalApplication).toBeCloseTo(0.8, 5);
  });

  test("falls back to combined attack when weaponAttacks is empty", () => {
    const view = makeView({ shipA: [], shipB: [] }, { shipA: turretAssessment, shipB: undefined });
    const deps = makeDeps({ viewStore: makeViewStore(view) });
    const provider = new AppliedDpsHintProviderImpl(deps);
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).toHaveBeenCalledTimes(1);
    const model = deps.renderMock.mock.calls[0][0] as AppliedDpsHintModel;
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0].weaponKind).toBe("turret");
    expect(model.rows[0].nominalDps).toBe(80);
    expect(model.totalNominalDps).toBe(80);
  });

  test("accepts short side names (a/b)", () => {
    const deps = makeDeps();
    const provider = new AppliedDpsHintProviderImpl(deps);
    const anchor = makeAnchor("b");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).not.toHaveBeenCalled();
  });
});
