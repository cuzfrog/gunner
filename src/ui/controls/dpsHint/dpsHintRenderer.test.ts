import { type FakeElement, fakeDocument } from "../../testing";
import type { DpsHintModel } from "./dpsHintRenderer";
import { DpsHintRendererImpl } from "./dpsHintRenderer";

function makeModel(): DpsHintModel {
  return {
    groups: [
      {
        name: "Pulse Laser x4",
        types: [
          { type: "em", iconUrl: "images/icons/damage-em.png", damage: 30, percent: 0.6 },
          { type: "thermal", iconUrl: "images/icons/damage-thermal.png", damage: 20, percent: 0.4 },
        ],
        sum: 50,
        factors: [
          { kind: "base", multiplier: 3, cumulative: 3, source: undefined },
          { kind: "module", multiplier: 1.3, cumulative: 3.9, source: "Heat Sink" },
          { kind: "skill", multiplier: 1.1, cumulative: 4.29, source: "Surgical Strike" },
        ],
        summary: { volley: 858, cycleTime: 3.5, dps: 245.1 },
      },
    ],
  };
}

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

describe("DpsHintRendererImpl", () => {
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
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    expect(container.children.length).toBe(1);
    expect(container.children[0].className).toBe("dps-hint");
  });

  test("renders group name", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const group = elementChildren(root)[0];
    expect(group.className).toBe("dps-hint-group");
    const nameEl = elementChildren(group)[0];
    expect(nameEl.className).toBe("dps-hint-group-name");
    expect(nameEl.textContent).toBe("Pulse Laser x4");
  });

  test("renders type rows with icon, label, value, and percent", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const group = elementChildren(root)[0];
    const groupChildren = elementChildren(group);
    const emRow = groupChildren[1];
    expect(emRow.className).toBe("dps-hint-row");
    const emChildren = elementChildren(emRow);
    const icon = emChildren[0];
    expect(icon.tagName).toBe("IMG");
    expect(icon.getAttribute("src")).toBe("images/icons/damage-em.png");
    expect(emChildren[1].textContent).toBe("dpsHint.damageType.em");
    expect(emChildren[2].textContent).toBe("30.0");
    expect(emChildren[3].textContent).toBe("60%");
  });

  test("renders sum row with label and value", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const group = elementChildren(root)[0];
    const groupChildren = elementChildren(group);
    const sumRow = groupChildren[3];
    expect(sumRow.className).toContain("dps-hint-sum-row");
    const sumChildren = elementChildren(sumRow);
    expect(sumChildren[0].textContent).toBe("dpsHint.sum");
    expect(sumChildren[1].textContent).toBe("50.0");
  });

  test("renders factor rows with kind, multiplier, cumulative, and source", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const group = elementChildren(root)[0];
    const groupChildren = elementChildren(group);
    const baseFactor = groupChildren[4];
    expect(baseFactor.className).toBe("dps-hint-factor-row");
    const factorChildren = elementChildren(baseFactor);
    expect(factorChildren[0].textContent).toBe("dpsHint.factor.base");
    expect(factorChildren[1].textContent).toBe("x3");
    expect(factorChildren[2].textContent).toBe("(x3)");
  });

  test("renders module factor with source name", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const group = elementChildren(root)[0];
    const groupChildren = elementChildren(group);
    const moduleFactor = groupChildren[5];
    const factorChildren = elementChildren(moduleFactor);
    expect(factorChildren[0].textContent).toBe("dpsHint.factor.module");
    expect(factorChildren[1].textContent).toBe("x1.3");
    expect(factorChildren[2].textContent).toBe("(x3.9)");
    const source = factorChildren[3];
    expect(source.className).toBe("dps-hint-factor-source");
    expect(source.textContent).toBe("Heat Sink");
  });

  test("renders summary with volley, cycle time, and DPS", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const group = elementChildren(root)[0];
    const groupChildren = elementChildren(group);
    const summaryEl = groupChildren[7];
    expect(summaryEl.className).toBe("dps-hint-summary");
    const summaryChildren = elementChildren(summaryEl);
    const volleyRow = summaryChildren[0];
    expect(elementChildren(volleyRow)[0].textContent).toBe("dpsHint.volley");
    expect(elementChildren(volleyRow)[1].textContent).toBe("858.0");
    const cycleRow = summaryChildren[1];
    expect(elementChildren(cycleRow)[0].textContent).toBe("dpsHint.cycleTime");
    expect(elementChildren(cycleRow)[1].textContent).toBe("3.50s");
    const dpsRow = summaryChildren[2];
    expect(dpsRow.className).toContain("dps-hint-dps-row");
    expect(elementChildren(dpsRow)[0].textContent).toBe("dpsHint.dps");
    expect(elementChildren(dpsRow)[1].textContent).toBe("245.1");
  });

  test("renders multiple groups", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    const model: DpsHintModel = {
      groups: [
        { name: "Group A", types: [], sum: 0, factors: [], summary: { volley: 0, cycleTime: 1, dps: 0 } },
        { name: "Group B", types: [], sum: 0, factors: [], summary: { volley: 0, cycleTime: 1, dps: 0 } },
      ],
    };
    renderer.render(model, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const groups = elementChildren(root);
    expect(groups.length).toBe(2);
    expect(elementChildren(groups[0])[0].textContent).toBe("Group A");
    expect(elementChildren(groups[1])[0].textContent).toBe("Group B");
  });

  test("renders empty hint for empty model", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render({ groups: [] }, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    expect(root.className).toBe("dps-hint");
    expect(elementChildren(root).length).toBe(0);
  });
});
