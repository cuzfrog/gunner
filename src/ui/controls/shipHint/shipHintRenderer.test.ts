import { type FakeElement, fakeDocument } from "../../testing";
import type { ShipHintModel } from "./shipHintRenderer";
import { ShipHintRendererImpl } from "./shipHintRenderer";

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

function makeModel(): ShipHintModel {
  return {
    name: "Rifter",
    subtitle: "Frigate · Minmatar Republic",
    sections: [
      { heading: "Fitting", rows: [{ label: "High slots", value: "3" }, { label: "Medium slots", value: "4" }] },
      { heading: "Navigation", rows: [{ label: "Mass", value: "1,032,000 kg" }] },
    ],
    resists: {
      heading: "Resists",
      columns: ["EM", "Thermal", "Kinetic", "Explosive"],
      rows: [
        { layer: "Shield", values: ["0%", "20%", "40%", "50%"] },
        { layer: "Armor", values: ["50%", "35%", "25%", "20%"] },
      ],
    },
  };
}

describe("ShipHintRendererImpl", () => {
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

  test("renders header with name and subtitle", () => {
    const renderer = new ShipHintRendererImpl();
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    expect(root.className).toBe("ship-hint");
    const header = elementChildren(root)[0];
    expect(header.className).toBe("ship-hint-header");
    const headerParts = elementChildren(header);
    expect(headerParts[0].className).toBe("ship-hint-name");
    expect(headerParts[0].textContent).toBe("Rifter");
    expect(headerParts[1].className).toBe("ship-hint-subtitle");
    expect(headerParts[1].textContent).toBe("Frigate · Minmatar Republic");
  });

  test("renders sections with heading and label/value rows", () => {
    const renderer = new ShipHintRendererImpl();
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const sections = elementChildren(root).slice(1, 3);
    expect(sections.length).toBe(2);
    expect(sections[0].className).toBe("ship-hint-section");
    const sectionParts = elementChildren(sections[0]);
    expect(sectionParts[0].className).toBe("ship-hint-section-label");
    expect(sectionParts[0].textContent).toBe("Fitting");
    const firstRow = sectionParts[1];
    const rowParts = elementChildren(firstRow);
    expect(firstRow.className).toBe("ship-hint-row");
    expect(rowParts[0].className).toBe("ship-hint-label");
    expect(rowParts[0].textContent).toBe("High slots");
    expect(rowParts[1].className).toBe("ship-hint-value");
    expect(rowParts[1].textContent).toBe("3");
  });

  test("renders resists grid after sections", () => {
    const renderer = new ShipHintRendererImpl();
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const resistsSection = elementChildren(root)[3];
    const sectionParts = elementChildren(resistsSection);
    expect(sectionParts[0].textContent).toBe("Resists");
    const grid = sectionParts[1];
    expect(grid.className).toBe("ship-hint-resists");
    const cells = elementChildren(grid);
    expect(cells.length).toBe(15);
    expect(cells[0].textContent).toBe("");
    expect(cells[1].textContent).toBe("EM");
    expect(cells[4].textContent).toBe("Explosive");
    expect(cells[5].textContent).toBe("Shield");
    expect(cells[6].textContent).toBe("0%");
    expect(cells[9].textContent).toBe("50%");
    expect(cells[10].textContent).toBe("Armor");
    expect(cells[14].textContent).toBe("20%");
  });

  test("renders without resists when model has none", () => {
    const renderer = new ShipHintRendererImpl();
    const model = { ...makeModel(), resists: undefined };
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(model, container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    expect(elementChildren(root).length).toBe(3);
  });
});
