import { type FakeElement, fakeDocument } from "../../testing";
import type { AmmoHintModel } from "./ammoHintRenderer";
import { AmmoHintRendererImpl } from "./ammoHintRenderer";

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

function makeModel(typeRows: { type: "em" | "thermal" | "kinetic" | "explosive"; value: number }[] = [], totalDamage = 0, modifiers: string[] = []): AmmoHintModel {
  return {
    typeRows: typeRows.map((r) => ({ type: r.type, iconUrl: `images/icons/damage-${r.type}.png`, value: r.value })),
    totalDamage,
    modifiers,
  };
}

describe("AmmoHintRendererImpl", () => {
  let originalDocument: Document | undefined;

  beforeEach(() => {
    originalDocument = globalThis.document;
    globalThis.document = fakeDocument();
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      globalThis.document = originalDocument;
    }
  });

  test("renders nothing for empty model", () => {
    const renderer = new AmmoHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    expect(elementChildren(container).length).toBe(0);
  });

  test("renders total row first with damage label, then type rows", () => {
    const renderer = new AmmoHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel([{ type: "em", value: 10 }, { type: "explosive", value: 5 }], 15), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    expect(root.className).toBe("ammo-hint");
    const rows = elementChildren(root);
    expect(rows.length).toBe(3);
    const totalRow = elementChildren(rows[0]);
    expect(rows[0].className).toContain("ammo-hint-total-row");
    expect(totalRow[0].textContent).toBe("dpsHint.damage");
    expect(totalRow[1].textContent).toBe("15");
    const emRow = elementChildren(rows[1]);
    expect(emRow[0].tagName).toBe("IMG");
    expect(emRow[0].getAttribute("src")).toBe("images/icons/damage-em.png");
    expect(emRow[1].textContent).toBe("dpsHint.damageType.em");
    expect(emRow[2].textContent).toBe("10");
  });

  test("renders total row with damage label", () => {
    const renderer = new AmmoHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel([{ type: "kinetic", value: 83 }], 83), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const rows = elementChildren(root);
    const totalRow = rows[0];
    expect(totalRow.className).toContain("ammo-hint-total-row");
    const totalChildren = elementChildren(totalRow);
    expect(totalChildren[0].textContent).toBe("dpsHint.damage");
    expect(totalChildren[1].textContent).toBe("83");
  });

  test("renders modifiers row when modifiers are present", () => {
    const renderer = new AmmoHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel([{ type: "em", value: 10 }], 10, ["range x0.5", "track x1"]), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const rows = elementChildren(root);
    const modifiersRow = rows[2];
    expect(modifiersRow.className).toBe("ammo-hint-modifiers");
    expect(modifiersRow.textContent).toBe("range x0.5 · track x1");
  });

  test("omits modifiers row when no modifiers", () => {
    const renderer = new AmmoHintRendererImpl({ t: (key) => key });
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel([{ type: "em", value: 10 }], 10), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const rows = elementChildren(root);
    expect(rows.length).toBe(2);
  });
});
