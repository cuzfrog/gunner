import { type FakeElement, fakeDocument } from "../../testing";
import type { ActualDpsHintModel } from "./actualDpsHintRenderer";
import { ActualDpsHintRendererImpl } from "./actualDpsHintRenderer";

function makeModel(): ActualDpsHintModel {
  return {
    types: [
      { type: "em", iconUrl: "/em.png", appliedDps: 100, resist: 0.5, actualDps: 50 },
      { type: "thermal", iconUrl: "/thermal.png", appliedDps: 80, resist: 0.25, actualDps: 60 },
    ],
    totalAppliedDps: 180,
    totalActualDps: 110,
  };
}

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

describe("ActualDpsHintRendererImpl", () => {
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

  test("renders a root dps-hint container", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    expect(container.children.length).toBe(1);
    expect(container.children[0].className).toBe("dps-hint");
  });

  test("renders one row per damage type plus a summary", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const children = elementChildren(root);
    expect(children.length).toBe(3);
    expect(children[0].className).toBe("dps-hint-row");
    expect(children[1].className).toBe("dps-hint-row");
    expect(children[2].className).toBe("dps-hint-summary");
  });

  test("renders damage type label, formula with pass-through fraction, and icon per type row", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = elementChildren(root);
    const emRow = elementChildren(rows[0]);
    expect(emRow[0].tagName).toBe("IMG");
    expect(emRow[1].textContent).toBe("dpsHint.damageType.em");
    expect(emRow[2].textContent).toBe("100.0 × 50.0% = 50.0");
    const thermalRow = elementChildren(rows[1]);
    expect(thermalRow[1].textContent).toBe("dpsHint.damageType.thermal");
    expect(thermalRow[2].textContent).toBe("80.0 × 75.0% = 60.0");
  });

  test("renders total applied and total actual in summary", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const summary = elementChildren(root)[2];
    const summaryChildren = elementChildren(summary);
    expect(elementChildren(summaryChildren[0])[0].textContent).toBe("actualDpsHint.totalApplied");
    expect(elementChildren(summaryChildren[0])[1].textContent).toBe("180.0");
    expect(elementChildren(summaryChildren[1])[0].textContent).toBe("actualDpsHint.totalActual");
    expect(elementChildren(summaryChildren[1])[1].textContent).toBe("110.0");
  });

  test("renders only summary for empty model", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render({ types: [], totalAppliedDps: 0, totalActualDps: 0 }, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    expect(root.className).toBe("dps-hint");
    expect(elementChildren(root).length).toBe(1);
    expect(elementChildren(root)[0].className).toBe("dps-hint-summary");
  });
});
