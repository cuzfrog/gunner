import { type FakeElement, fakeDocument } from "../../testing";
import type { InflictedDpsHintModel } from "./inflictedDpsHintRenderer";
import { InflictedDpsHintRendererImpl } from "./inflictedDpsHintRenderer";

function makeModel(): InflictedDpsHintModel {
  return {
    layers: [
      { layer: "shield", inflicted: 80 },
      { layer: "armor", inflicted: 30 },
    ],
    totalAppliedDps: 150,
    totalInflictedDps: 110,
  };
}

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

describe("InflictedDpsHintRendererImpl", () => {
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
    const renderer = new InflictedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    expect(container.children.length).toBe(1);
    expect(container.children[0].className).toBe("dps-hint");
  });

  test("renders one row per non-zero layer plus a summary", () => {
    const renderer = new InflictedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const children = elementChildren(root);
    expect(children.length).toBe(3);
    expect(children[0].className).toBe("dps-hint-row");
    expect(children[1].className).toBe("dps-hint-row");
    expect(children[2].className).toBe("dps-hint-summary");
  });

  test("renders layer label and inflicted damage per layer row", () => {
    const renderer = new InflictedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = elementChildren(root);
    const shieldRow = elementChildren(rows[0]);
    expect(shieldRow[0].textContent).toBe("defense.layer.shield");
    expect(shieldRow[1].textContent).toBe("80.0");
    const armorRow = elementChildren(rows[1]);
    expect(armorRow[0].textContent).toBe("defense.layer.armor");
    expect(armorRow[1].textContent).toBe("30.0");
  });

  test("renders total applied and total inflicted in summary", () => {
    const renderer = new InflictedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const summary = elementChildren(root)[2];
    const summaryChildren = elementChildren(summary);
    expect(elementChildren(summaryChildren[0])[0].textContent).toBe("inflictedDpsHint.totalApplied");
    expect(elementChildren(summaryChildren[0])[1].textContent).toBe("150.0");
    expect(elementChildren(summaryChildren[1])[0].textContent).toBe("inflictedDpsHint.totalInflicted");
    expect(elementChildren(summaryChildren[1])[1].textContent).toBe("110.0");
  });

  test("renders only summary for empty model", () => {
    const renderer = new InflictedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render({ layers: [], totalAppliedDps: 0, totalInflictedDps: 0 }, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    expect(root.className).toBe("dps-hint");
    expect(elementChildren(root).length).toBe(1);
    expect(elementChildren(root)[0].className).toBe("dps-hint-summary");
  });

  test("skips layers with zero inflicted damage", () => {
    const renderer = new InflictedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render({ layers: [{ layer: "shield", inflicted: 50 }, { layer: "armor", inflicted: 0 }, { layer: "hull", inflicted: 0 }], totalAppliedDps: 100, totalInflictedDps: 50 }, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = elementChildren(root);
    expect(rows.length).toBe(2);
    expect(rows[0].className).toBe("dps-hint-row");
    expect(rows[1].className).toBe("dps-hint-summary");
  });
});
