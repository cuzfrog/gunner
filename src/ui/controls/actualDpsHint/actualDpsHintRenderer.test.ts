import { type FakeElement, fakeDocument } from "../../testing";
import type { ActualDpsHintModel } from "./actualDpsHintRenderer";
import { ActualDpsHintRendererImpl } from "./actualDpsHintRenderer";

function makeModel(): ActualDpsHintModel {
  return {
    layers: [
      { layer: "shield", hpLost: 80 },
      { layer: "armor", hpLost: 30 },
    ],
    totalAppliedDps: 150,
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

  test("renders one row per non-zero layer plus a summary", () => {
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

  test("renders layer label and HP lost per layer row", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
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

  test("renders total applied and total actual in summary", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const summary = elementChildren(root)[2];
    const summaryChildren = elementChildren(summary);
    expect(elementChildren(summaryChildren[0])[0].textContent).toBe("actualDpsHint.totalApplied");
    expect(elementChildren(summaryChildren[0])[1].textContent).toBe("150.0");
    expect(elementChildren(summaryChildren[1])[0].textContent).toBe("actualDpsHint.totalActual");
    expect(elementChildren(summaryChildren[1])[1].textContent).toBe("110.0");
  });

  test("renders only summary for empty model", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render({ layers: [], totalAppliedDps: 0, totalActualDps: 0 }, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    expect(root.className).toBe("dps-hint");
    expect(elementChildren(root).length).toBe(1);
    expect(elementChildren(root)[0].className).toBe("dps-hint-summary");
  });

  test("skips layers with zero HP lost", () => {
    const renderer = new ActualDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render({ layers: [{ layer: "shield", hpLost: 50 }, { layer: "armor", hpLost: 0 }, { layer: "hull", hpLost: 0 }], totalAppliedDps: 100, totalActualDps: 50 }, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const rows = elementChildren(root);
    expect(rows.length).toBe(2);
    expect(rows[0].className).toBe("dps-hint-row");
    expect(rows[1].className).toBe("dps-hint-summary");
  });
});
