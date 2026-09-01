import { type FakeElement, fakeDocument } from "../../testing";
import type { AppliedDpsHintModel } from "./appliedDpsHintRenderer";
import { AppliedDpsHintRendererImpl } from "./appliedDpsHintRenderer";

function makeModel(): AppliedDpsHintModel {
  return {
    rows: [
      { weaponKind: "turret", nominalDps: 100, appliedDps: 80, application: 0.8 },
      { weaponKind: "drone", nominalDps: 50, appliedDps: 40, application: 0.8 },
    ],
    totalNominalDps: 150,
    totalAppliedDps: 120,
    totalApplication: 0.8,
  };
}

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

describe("AppliedDpsHintRendererImpl", () => {
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
    const renderer = new AppliedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    expect(container.children.length).toBe(1);
    expect(container.children[0].className).toBe("dps-hint");
  });

  test("renders one group per row plus a total summary", () => {
    const renderer = new AppliedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const children = elementChildren(root);
    expect(children.length).toBe(3);
    expect(children[0].className).toBe("dps-hint-group");
    expect(children[1].className).toBe("dps-hint-group");
    expect(children[2].className).toBe("dps-hint-summary");
  });

  test("renders weapon-kind heading, nominal, applied, and application per row", () => {
    const renderer = new AppliedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const firstGroup = elementChildren(root)[0];
    const groupChildren = elementChildren(firstGroup);
    expect(groupChildren[0].className).toBe("dps-hint-group-name");
    expect(groupChildren[0].textContent).toBe("dpsHint.turretDps");
    const nominalRow = groupChildren[1];
    expect(elementChildren(nominalRow)[0].textContent).toBe("appliedDpsHint.nominal");
    expect(elementChildren(nominalRow)[1].textContent).toBe("100.0");
    const appliedRow = groupChildren[2];
    expect(elementChildren(appliedRow)[0].textContent).toBe("appliedDpsHint.applied");
    expect(elementChildren(appliedRow)[1].textContent).toBe("80.0");
    const applicationRow = groupChildren[3];
    expect(elementChildren(applicationRow)[0].textContent).toBe("appliedDpsHint.application");
    expect(elementChildren(applicationRow)[1].textContent).toBe("80.0%");
  });

  test("renders total nominal, applied, and application in summary", () => {
    const renderer = new AppliedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    const summary = elementChildren(root)[2];
    const summaryChildren = elementChildren(summary);
    expect(elementChildren(summaryChildren[0])[0].textContent).toBe("appliedDpsHint.totalNominal");
    expect(elementChildren(summaryChildren[0])[1].textContent).toBe("150.0");
    expect(elementChildren(summaryChildren[1])[0].textContent).toBe("appliedDpsHint.totalApplied");
    expect(elementChildren(summaryChildren[1])[1].textContent).toBe("120.0");
    expect(elementChildren(summaryChildren[2])[0].textContent).toBe("appliedDpsHint.totalApplication");
    expect(elementChildren(summaryChildren[2])[1].textContent).toBe("80.0%");
  });

  test("renders only total summary for empty model", () => {
    const renderer = new AppliedDpsHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render({ rows: [], totalNominalDps: 0, totalAppliedDps: 0, totalApplication: 0 }, container as unknown as HTMLElement);
    const root = container.children[0] as FakeElement;
    expect(root.className).toBe("dps-hint");
    expect(elementChildren(root).length).toBe(1);
    expect(elementChildren(root)[0].className).toBe("dps-hint-summary");
  });
});
