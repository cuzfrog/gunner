import { type FakeElement, fakeDocument } from "../../testing";
import { LockStateHintRendererImpl, type LockStateHintModel } from "./lockStateHintRenderer";
import type { LockState } from "../../../sim";

function mockT(): (key: string) => string {
  return (key: string) => key;
}

function makeLock(overrides: Partial<LockState> = {}): LockState {
  return { status: "idle", progress: 0, remaining: 0, lockTime: 5, inRange: true, ...overrides };
}

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

function rowChildren(root: FakeElement): { label: string; value: string }[] {
  return elementChildren(root).map((row) => {
    const kids = elementChildren(row);
    return { label: kids[0]?.textContent ?? "", value: kids[1]?.textContent ?? "" };
  });
}

describe("LockStateHintRenderer", () => {
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

  test("renders status row for idle lock", () => {
    const renderer = new LockStateHintRendererImpl({ t: mockT() });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    const model: LockStateHintModel = { lock: makeLock({ status: "idle" }), effectiveRange: 30000, maxLockedTargets: 4 };
    renderer.render(model, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = rowChildren(root);
    expect(rows[0].label).toBe("lockHint.status");
    expect(rows[0].value).toBe("lockHint.idle");
  });

  test("renders progress and remaining for locking state", () => {
    const renderer = new LockStateHintRendererImpl({ t: mockT() });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    const model: LockStateHintModel = { lock: makeLock({ status: "locking", progress: 0.5, remaining: 2.5 }), effectiveRange: 30000, maxLockedTargets: 4 };
    renderer.render(model, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = rowChildren(root);
    expect(rows[1].label).toBe("lockHint.progress");
    expect(rows[1].value).toBe("50%");
    expect(rows[2].label).toBe("lockHint.remaining");
    expect(rows[2].value).toBe("2.5unit.second");
  });

  test("renders locked status", () => {
    const renderer = new LockStateHintRendererImpl({ t: mockT() });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    const model: LockStateHintModel = { lock: makeLock({ status: "locked" }), effectiveRange: 30000, maxLockedTargets: 4 };
    renderer.render(model, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = rowChildren(root);
    expect(rows[0].value).toBe("lockHint.locked");
  });

  test("renders targeting range and max locked targets when provided", () => {
    const renderer = new LockStateHintRendererImpl({ t: mockT() });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    const model: LockStateHintModel = { lock: makeLock({ status: "locked" }), effectiveRange: 30000, maxLockedTargets: 4 };
    renderer.render(model, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = rowChildren(root);
    const rangeRow = rows.find((r) => r.label === "lockHint.targetingRange");
    expect(rangeRow).toBeDefined();
    expect(rangeRow!.value).toBe("30,000unit.meter");
    const maxRow = rows.find((r) => r.label === "lockHint.maxLockedTargets");
    expect(maxRow).toBeDefined();
    expect(maxRow!.value).toBe("4");
  });

  test("renders out of range when not in range and not locked", () => {
    const renderer = new LockStateHintRendererImpl({ t: mockT() });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    const model: LockStateHintModel = { lock: makeLock({ status: "idle", inRange: false }), effectiveRange: 30000, maxLockedTargets: 4 };
    renderer.render(model, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = rowChildren(root);
    const outOfRangeRow = rows.find((r) => r.label === "lockHint.outOfRange");
    expect(outOfRangeRow).toBeDefined();
  });

  test("omits targeting range when undefined", () => {
    const renderer = new LockStateHintRendererImpl({ t: mockT() });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    const model: LockStateHintModel = { lock: makeLock({ status: "locked" }), effectiveRange: undefined, maxLockedTargets: undefined };
    renderer.render(model, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = rowChildren(root);
    expect(rows.find((r) => r.label === "lockHint.targetingRange")).toBeUndefined();
    expect(rows.find((r) => r.label === "lockHint.maxLockedTargets")).toBeUndefined();
  });
});
