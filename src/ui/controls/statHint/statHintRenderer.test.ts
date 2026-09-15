import { type FakeElement, fakeDocument } from "../../testing";
import type { StatHintModel } from "./statHintRenderer";
import { StatHintRendererImpl } from "./statHintRenderer";

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

function makeModel(): StatHintModel {
  return {
    name: "Rifter",
    subtitle: "Frigate · Minmatar Republic",
    sections: [
      { heading: "Fitting", rows: [{ label: "High slots", value: "3" }, { label: "Medium slots", value: "4" }] },
      { heading: undefined, rows: [{ label: "Range", value: "x0.5" }] },
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

describe("StatHintRendererImpl", () => {
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
    const renderer = new StatHintRendererImpl();
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    expect(root.className).toBe("stat-hint");
    const header = elementChildren(root)[0];
    expect(header.className).toBe("stat-hint-header");
    const headerParts = elementChildren(header);
    expect(headerParts[0].className).toBe("stat-hint-name");
    expect(headerParts[0].textContent).toBe("Rifter");
    expect(headerParts[1].className).toBe("stat-hint-subtitle");
    expect(headerParts[1].textContent).toBe("Frigate · Minmatar Republic");
  });

  test("renders header without subtitle when subtitle is omitted", () => {
    const renderer = new StatHintRendererImpl();
    const model = { ...makeModel(), subtitle: undefined };
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(model, container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const headerParts = elementChildren(elementChildren(root)[0]);
    expect(headerParts.length).toBe(1);
    expect(headerParts[0].className).toBe("stat-hint-name");
  });

  test("renders sections with heading and label/value rows", () => {
    const renderer = new StatHintRendererImpl();
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const sections = elementChildren(root).slice(1, 3);
    expect(sections.length).toBe(2);
    expect(sections[0].className).toBe("stat-hint-section");
    const sectionParts = elementChildren(sections[0]);
    expect(sectionParts[0].className).toBe("stat-hint-section-label");
    expect(sectionParts[0].textContent).toBe("Fitting");
    const firstRow = sectionParts[1];
    const rowParts = elementChildren(firstRow);
    expect(firstRow.className).toBe("stat-hint-row");
    expect(rowParts[0].className).toBe("stat-hint-label");
    expect(rowParts[0].textContent).toBe("High slots");
    expect(rowParts[1].className).toBe("stat-hint-value");
    expect(rowParts[1].textContent).toBe("3");
  });

  test("renders headingless sections with the divided modifier", () => {
    const renderer = new StatHintRendererImpl();
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const sections = elementChildren(root).slice(1, 3);
    expect(sections[1].className).toBe("stat-hint-section stat-hint-section-divided");
    const sectionParts = elementChildren(sections[1]);
    expect(sectionParts[0].className).toBe("stat-hint-row");
  });

  test("renders rows with icon and emphasis modifiers", () => {
    const renderer = new StatHintRendererImpl();
    const model: StatHintModel = {
      sections: [
        {
          heading: undefined,
          rows: [
            { label: "Total", value: "15", emphasis: true },
            { label: "EM", iconUrl: "images/icons/damage-em.png", value: "10" },
            { value: "x0.5" },
          ],
        },
      ],
    };
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(model, container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const rows = elementChildren(elementChildren(root)[0]);
    expect(rows[0].className).toBe("stat-hint-row stat-hint-row-emphasis");
    expect(rows[1].className).toBe("stat-hint-row stat-hint-row-icon");
    const iconRow = elementChildren(rows[1]);
    expect(iconRow[0].tagName).toBe("IMG");
    expect(iconRow[0].getAttribute("src")).toBe("images/icons/damage-em.png");
    expect(iconRow[0].className).toBe("stat-hint-icon");
    expect(iconRow[1].textContent).toBe("EM");
    expect(iconRow[2].textContent).toBe("10");
    const valueOnlyRow = elementChildren(rows[2]);
    expect(rows[2].className).toBe("stat-hint-row");
    expect(valueOnlyRow.length).toBe(1);
    expect(valueOnlyRow[0].className).toBe("stat-hint-value");
  });

  test("renders resists grid after sections", () => {
    const renderer = new StatHintRendererImpl();
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(makeModel(), container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    const resistsSection = elementChildren(root)[3];
    const sectionParts = elementChildren(resistsSection);
    expect(sectionParts[0].textContent).toBe("Resists");
    const grid = sectionParts[1];
    expect(grid.className).toBe("stat-hint-resists");
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

  test("renders without header when model has no name", () => {
    const renderer = new StatHintRendererImpl();
    const model = { ...makeModel(), name: undefined, subtitle: undefined };
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    renderer.render(model, container as unknown as HTMLElement);
    const root = elementChildren(container)[0];
    expect(elementChildren(root).length).toBe(3);
    expect(elementChildren(root)[0].className).toBe("stat-hint-section");
  });
});
