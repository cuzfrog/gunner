import { type FakeElement, fakeDocument } from "../../testing";
import { LockStateHintProviderImpl } from "./lockStateHintProvider";
import type { EngagementView, LockState } from "../../../sim";
import type { ViewStore } from "../controlsContract";
import type { LockStateHintModel, LockStateHintRenderer } from "./lockStateHintRenderer";

function makeLock(overrides: Partial<LockState> = {}): LockState {
  return { status: "idle", progress: 0, remaining: 0, lockTime: 5, inRange: true, ...overrides };
}

function makeView(locks: { shipA: LockState | undefined; shipB: LockState | undefined }, sensorSpec?: { maxTargetingRange: number; maxLockedTargets: number }): EngagementView {
  return {
    frame: {
      time: 0,
      shipA: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, maxSpeed: 100, mass: 1, inertiaModifier: 1, mode: "keepAtRange", desiredRange: 1000, aggressivity: 1, sensorSpec },
      shipB: { position: { x: 1000, y: 0 }, velocity: { x: 0, y: 0 }, maxSpeed: 100, mass: 1, inertiaModifier: 1, mode: "keepAtRange", desiredRange: 1000, aggressivity: 1, sensorSpec },
      relPosition: { x: 1000, y: 0 },
      distance: 1000,
      relVelocity: { x: 0, y: 0 },
      radialVelocity: 0,
      transversalVelocity: { x: 0, y: 0 },
      transversalSpeed: 0,
      angularVelocity: 0,
    },
    attacks: { shipA: undefined, shipB: undefined },
    weaponAttacks: { shipA: [], shipB: [] },
    effectiveWeapons: { shipA: undefined, shipB: undefined },
    defenses: { shipA: {} as never, shipB: {} as never },
    locks,
  } as unknown as EngagementView;
}

function makeViewStore(view: EngagementView | undefined): ViewStore {
  return { currentView: () => view };
}

function makeMockRenderer(): { renderer: LockStateHintRenderer; models: LockStateHintModel[] } {
  const models: LockStateHintModel[] = [];
  const renderer: LockStateHintRenderer = {
    render(model: LockStateHintModel, container: HTMLElement): void {
      models.push(model);
      container.appendChild(document.createElement("div"));
    },
  };
  return { renderer, models };
}

function makeAnchor(side?: string): HTMLElement {
  const anchor = globalThis.document.createElement("span");
  if (side) anchor.dataset.side = side;
  return anchor;
}

describe("LockStateHintProvider", () => {
  let originalDocument: typeof globalThis.document | undefined;
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

  test("renders lock state hint for shipA", () => {
    const view = makeView({ shipA: makeLock({ status: "locked" }), shipB: makeLock() }, { maxTargetingRange: 30000, maxLockedTargets: 4 });
    const { renderer, models } = makeMockRenderer();
    const provider = new LockStateHintProviderImpl({ viewStore: makeViewStore(view), lockStateHintRenderer: renderer });
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(models.length).toBe(1);
    expect(models[0].lock.status).toBe("locked");
    expect(models[0].effectiveRange).toBe(30000);
    expect(models[0].maxLockedTargets).toBe(4);
  });

  test("renders lock state hint for shipB", () => {
    const view = makeView({ shipA: makeLock(), shipB: makeLock({ status: "locking", progress: 0.7, remaining: 1.5 }) }, { maxTargetingRange: 20000, maxLockedTargets: 2 });
    const { renderer, models } = makeMockRenderer();
    const provider = new LockStateHintProviderImpl({ viewStore: makeViewStore(view), lockStateHintRenderer: renderer });
    const anchor = makeAnchor("b");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(models.length).toBe(1);
    expect(models[0].lock.status).toBe("locking");
    expect(models[0].lock.progress).toBe(0.7);
    expect(models[0].effectiveRange).toBe(20000);
    expect(models[0].maxLockedTargets).toBe(2);
  });

  test("does not render when view is undefined", () => {
    const { renderer, models } = makeMockRenderer();
    const provider = new LockStateHintProviderImpl({ viewStore: makeViewStore(undefined), lockStateHintRenderer: renderer });
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(models.length).toBe(0);
  });

  test("does not render when side is missing from anchor", () => {
    const view = makeView({ shipA: makeLock(), shipB: makeLock() });
    const { renderer, models } = makeMockRenderer();
    const provider = new LockStateHintProviderImpl({ viewStore: makeViewStore(view), lockStateHintRenderer: renderer });
    const anchor = makeAnchor();
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(models.length).toBe(0);
  });

  test("does not render when lock is undefined for the side", () => {
    const view = makeView({ shipA: undefined, shipB: makeLock() });
    const { renderer, models } = makeMockRenderer();
    const provider = new LockStateHintProviderImpl({ viewStore: makeViewStore(view), lockStateHintRenderer: renderer });
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(models.length).toBe(0);
  });
});
