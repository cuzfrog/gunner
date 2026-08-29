import { fakeDocument, FakeElement } from "../../testing";
import { SummaryChipImpl } from "./summaryChip";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

describe("SummaryChipImpl", () => {
  test("render sets text and shows icon when url provided", () => {
    const textEl = document.createElement("span") as unknown as HTMLElement;
    const iconEl = document.createElement("img") as unknown as HTMLImageElement;
    const chip = new SummaryChipImpl(textEl, iconEl);
    chip.render("Hail S", "icon.png");
    expect(textEl.textContent).toBe("Hail S");
    expect(iconEl.src).toBe("icon.png");
    expect(iconEl.hidden).toBe(false);
  });

  test("render hides icon when url is undefined", () => {
    const textEl = document.createElement("span") as unknown as HTMLElement;
    const iconEl = document.createElement("img") as unknown as HTMLImageElement;
    const chip = new SummaryChipImpl(textEl, iconEl);
    chip.render("—", undefined);
    expect(textEl.textContent).toBe("—");
    expect(iconEl.src).toBe("");
    expect(iconEl.hidden).toBe(true);
  });

  test("render updates existing chip with new values", () => {
    const textEl = document.createElement("span") as unknown as HTMLElement;
    const iconEl = document.createElement("img") as unknown as HTMLImageElement;
    const chip = new SummaryChipImpl(textEl, iconEl);
    chip.render("First", "icon1.png");
    chip.render("Second", undefined);
    expect(textEl.textContent).toBe("Second");
    expect(iconEl.hidden).toBe(true);
  });
});
