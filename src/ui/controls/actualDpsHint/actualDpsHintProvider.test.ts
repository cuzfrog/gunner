import { type FakeElement, fakeDocument } from "../../testing";
import { ZERO_DAMAGE, EMPTY_DEFENSE_ASSESSMENT, EMPTY_PROJECTION, type AttackAssessment, type DamageProjection, type EngagementView, type TurretSpec } from "../../../sim";
import type { ViewStream } from "../../viewStream";
import type { ActualDpsHintModel, ActualDpsHintRenderer } from "./actualDpsHintRenderer";
import { type ActualDpsHintProviderDeps, ActualDpsHintProviderImpl } from "./actualDpsHintProvider";

const turret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 4 };

function makeAttack(appliedByType: { em: number; thermal: number; kinetic: number; explosive: number }, appliedDps: number): AttackAssessment {
  return {
    boostedWeapon: turret, effectiveWeapon: turret,
    damage: { nominalDps: 100, appliedDps, application: 0.8, volley: 400, baseVolleyByType: ZERO_DAMAGE, appliedByType, appliedVolleyByType: ZERO_DAMAGE },
    turret: { hit: { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1, trackingPenalty: 0.5 ** 0.1, rangePenalty: 0.5 ** 0.1 }, expectedMultiplier: 0.8 },
  };
}

function makeProjection(totalHpLost: number, byLayer: { shield: number; armor: number; hull: number }): DamageProjection {
  return { totalHpLost, byLayer };
}

function makeView(shipAAttack: AttackAssessment | undefined, shipBProjection: DamageProjection): EngagementView {
  return {
    frame: { time: 0, shipA: {} as never, shipB: {} as never, relPosition: {} as never, distance: 5000, relVelocity: {} as never, radialVelocity: 0, transversalVelocity: {} as never, transversalSpeed: 0, angularVelocity: 0 },
    attacks: { shipA: shipAAttack, shipB: undefined },
    weaponAttacks: { shipA: [], shipB: [] },
    effectiveWeapons: { shipA: turret, shipB: undefined },
    defenses: { shipA: EMPTY_DEFENSE_ASSESSMENT, shipB: EMPTY_DEFENSE_ASSESSMENT },
    projection: { shipA: EMPTY_PROJECTION, shipB: shipBProjection },
    locks: { shipA: { status: "locked", progress: 1, remaining: 0, lockTime: 5, inRange: true }, shipB: { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: false } },
  } as unknown as EngagementView;
}

function makeViewStream(view: EngagementView | undefined): ViewStream {
  return { connect: vi.fn(), onViewUpdated: vi.fn(), offViewUpdated: vi.fn(), currentView: vi.fn(() => view) } as unknown as ViewStream;
}

function makeMockRenderer(): { renderer: ActualDpsHintRenderer; renderMock: ReturnType<typeof vi.fn> } {
  const renderMock = vi.fn();
  const renderer = { render: renderMock } as unknown as ActualDpsHintRenderer;
  return { renderer, renderMock };
}

function makeDeps(overrides: Partial<ActualDpsHintProviderDeps> = {}): ActualDpsHintProviderDeps & { renderMock: ReturnType<typeof vi.fn> } {
  const { renderer, renderMock } = makeMockRenderer();
  const attack = makeAttack({ em: 100, thermal: 50, kinetic: 0, explosive: 0 }, 150);
  const projection = makeProjection(110, { shield: 80, armor: 30, hull: 0 });
  return {
    viewStream: makeViewStream(makeView(attack, projection)),
    actualDpsHintRenderer: renderer,
    ...overrides,
    renderMock,
  };
}

function makeAnchor(side?: string): HTMLElement {
  const anchor = globalThis.document.createElement("span");
  if (side) anchor.dataset.side = side;
  return anchor;
}

describe("ActualDpsHintProviderImpl", () => {
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
    const provider = new ActualDpsHintProviderImpl(deps);
    const anchor = makeAnchor();
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).not.toHaveBeenCalled();
  });

  test("renders nothing when view store has no current view", () => {
    const deps = makeDeps({ viewStream: makeViewStream(undefined) });
    const provider = new ActualDpsHintProviderImpl(deps);
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).not.toHaveBeenCalled();
  });

  test("renders nothing when side has no attack", () => {
    const projection = makeProjection(0, { shield: 0, armor: 0, hull: 0 });
    const deps = makeDeps({ viewStream: makeViewStream(makeView(undefined, projection)) });
    const provider = new ActualDpsHintProviderImpl(deps);
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).not.toHaveBeenCalled();
  });

  test("builds model with per-layer rows from opponent projection", () => {
    const deps = makeDeps();
    const provider = new ActualDpsHintProviderImpl(deps);
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).toHaveBeenCalledTimes(1);
    const model = deps.renderMock.mock.calls[0][0] as ActualDpsHintModel;
    expect(model.layers).toHaveLength(2);
    expect(model.layers[0].layer).toBe("shield");
    expect(model.layers[0].hpLost).toBe(80);
    expect(model.layers[1].layer).toBe("armor");
    expect(model.layers[1].hpLost).toBe(30);
    expect(model.totalAppliedDps).toBe(150);
    expect(model.totalActualDps).toBe(110);
  });

  test("skips layers with zero HP lost", () => {
    const attack = makeAttack({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, 100);
    const projection = makeProjection(50, { shield: 50, armor: 0, hull: 0 });
    const deps = makeDeps({ viewStream: makeViewStream(makeView(attack, projection)) });
    const provider = new ActualDpsHintProviderImpl(deps);
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    const model = deps.renderMock.mock.calls[0][0] as ActualDpsHintModel;
    expect(model.layers).toHaveLength(1);
    expect(model.layers[0].layer).toBe("shield");
  });

  test("renders summary even when all layers have zero HP lost", () => {
    const attack = makeAttack({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, 100);
    const projection = makeProjection(0, { shield: 0, armor: 0, hull: 0 });
    const deps = makeDeps({ viewStream: makeViewStream(makeView(attack, projection)) });
    const provider = new ActualDpsHintProviderImpl(deps);
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(deps.renderMock).toHaveBeenCalledTimes(1);
    const model = deps.renderMock.mock.calls[0][0] as ActualDpsHintModel;
    expect(model.layers).toHaveLength(0);
    expect(model.totalAppliedDps).toBe(100);
    expect(model.totalActualDps).toBe(0);
  });

  test("uses shipB projection for shipA side and shipA projection for shipB side", () => {
    const shipAAttack = makeAttack({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, 100);
    const shipAProjection = makeProjection(30, { shield: 30, armor: 0, hull: 0 });
    const shipBProjection = makeProjection(70, { shield: 70, armor: 0, hull: 0 });
    const view: EngagementView = {
      frame: { time: 0, shipA: {} as never, shipB: {} as never, relPosition: {} as never, distance: 5000, relVelocity: {} as never, radialVelocity: 0, transversalVelocity: {} as never, transversalSpeed: 0, angularVelocity: 0 },
      attacks: { shipA: shipAAttack, shipB: shipAAttack },
      weaponAttacks: { shipA: [], shipB: [] },
      effectiveWeapons: { shipA: turret, shipB: turret },
      defenses: { shipA: EMPTY_DEFENSE_ASSESSMENT, shipB: EMPTY_DEFENSE_ASSESSMENT },
      projection: { shipA: shipAProjection, shipB: shipBProjection },
      locks: { shipA: { status: "locked", progress: 1, remaining: 0, lockTime: 5, inRange: true }, shipB: { status: "locked", progress: 1, remaining: 0, lockTime: 5, inRange: true } },
    } as unknown as EngagementView;
    const deps = makeDeps({ viewStream: makeViewStream(view) });
    const provider = new ActualDpsHintProviderImpl(deps);
    const container = globalThis.document.createElement("div");
    provider.render(makeAnchor("shipA"), container);
    const modelA = deps.renderMock.mock.calls[0][0] as ActualDpsHintModel;
    expect(modelA.totalActualDps).toBe(70);
    deps.renderMock.mockClear();
    provider.render(makeAnchor("shipB"), container);
    const modelB = deps.renderMock.mock.calls[0][0] as ActualDpsHintModel;
    expect(modelB.totalActualDps).toBe(30);
  });
});
