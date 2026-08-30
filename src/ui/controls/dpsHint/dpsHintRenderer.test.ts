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
        ammo: 50,
        factors: [
          { kind: "base", multiplier: 3, cumulative: 3, sources: [] },
          { kind: "module", multiplier: 1.3, cumulative: 3.9, sources: ["Heat Sink"] },
          { kind: "skill", multiplier: 1.1, cumulative: 4.29, sources: ["Surgical Strike"] },
        ],
        summary: { ammo: 50, multiplier: 4.29, count: 4, volley: 858, cycleTime: 3.5, dps: 245.1 },
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

  test("renders ammo row with label and value", () => {
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const group = elementChildren(root)[0];
    const groupChildren = elementChildren(group);
    const ammoRow = groupChildren[3];
    expect(ammoRow.className).toContain("dps-hint-sum-row");
    const ammoChildren = elementChildren(ammoRow);
    expect(ammoChildren[0].textContent).toBe("dpsHint.ammo");
    expect(ammoChildren[1].textContent).toBe("50.0");
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
    const mainRow = elementChildren(baseFactor)[0];
    expect(mainRow.className).toBe("dps-hint-factor-main");
    const mainChildren = elementChildren(mainRow);
    expect(mainChildren[0].textContent).toBe("dpsHint.factor.base");
    expect(mainChildren[1].textContent).toBe("x3");
    expect(mainChildren[2].textContent).toBe("(x3)");
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
    const mainRow = elementChildren(factorChildren[0]);
    expect(mainRow[0].textContent).toBe("dpsHint.factor.module");
    expect(mainRow[1].textContent).toBe("x1.3");
    expect(mainRow[2].textContent).toBe("(x3.9)");
    const source = factorChildren[1];
    expect(source.className).toBe("dps-hint-factor-source");
    expect(source.textContent).toBe("Heat Sink");
  });

  test("renders multiple module sources on separate rows", () => {
    const model: DpsHintModel = {
      groups: [{
        name: "Group",
        types: [],
        ammo: 10,
        factors: [{ kind: "module", multiplier: 1.5, cumulative: 1.5, sources: ["Heat Sink II x2", "Damage Control II"] }],
        summary: { ammo: 10, multiplier: 1.5, count: 1, volley: 15, cycleTime: 5, dps: 3 },
      }],
    };
    const renderer = new DpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(model, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const group = elementChildren(root)[0];
    const factorRow = elementChildren(group)[2];
    const factorChildren = elementChildren(factorRow);
    expect(factorChildren[1].textContent).toBe("Heat Sink II x2");
    expect(factorChildren[2].textContent).toBe("Damage Control II");
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
    expect(elementChildren(volleyRow)[1].textContent).toBe("50.0 × 4.29 × 4 = 858.0");
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
        { name: "Group A", types: [], ammo: 0, factors: [], summary: { ammo: 0, multiplier: 1, count: 0, volley: 0, cycleTime: 1, dps: 0 } },
        { name: "Group B", types: [], ammo: 0, factors: [], summary: { ammo: 0, multiplier: 1, count: 0, volley: 0, cycleTime: 1, dps: 0 } },
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
