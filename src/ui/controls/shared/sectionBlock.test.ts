import { fakeDocument } from "../../testing";
import { SectionBlockImpl } from "./sectionBlock";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

describe("SectionBlockImpl", () => {
  test("creates a preview-section div with label", () => {
    const block = new SectionBlockImpl();
    const section = block.create("High Slots", []);
    expect(section.tagName).toBe("DIV");
    expect(section.className).toBe("preview-section");
    expect(section.childElementCount).toBe(1);
    expect(section.children[0].tagName).toBe("DIV");
    expect(section.children[0].className).toBe("preview-section-label");
    expect(section.children[0].textContent).toBe("High Slots");
  });

  test("appends row elements after label", () => {
    const block = new SectionBlockImpl();
    const row = document.createElement("div");
    const section = block.create("Mid Slots", [row]);
    expect(section.childElementCount).toBe(2);
    expect(section.children[1]).toBe(row);
  });

  test("appends multiple rows", () => {
    const block = new SectionBlockImpl();
    const row1 = document.createElement("div");
    const row2 = document.createElement("div");
    const section = block.create("Rigs", [row1, row2]);
    expect(section.childElementCount).toBe(3);
    expect(section.children[1]).toBe(row1);
    expect(section.children[2]).toBe(row2);
  });
});
