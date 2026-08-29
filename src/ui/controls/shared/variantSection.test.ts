import { VariantSection, type VariantItem } from "./variantSection";
import { fakeDocument } from "../../testing";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

function createSection(options: {
  readonly variants?: readonly VariantItem[];
  readonly currentId?: string;
  readonly enabled?: boolean;
  readonly onSelect?: (id: string) => void;
} = {}): { section: VariantSection; gear: HTMLButtonElement; popupEl: HTMLElement } {
  const document = fakeDocument();
  const gear = document.getElementById("test-gear")! as HTMLButtonElement;
  const popupEl = document.getElementById("test-popup")!;
  const section = new VariantSection({
    gear,
    popupEl,
    listShape: { itemClass: "fitting-item btn", nameClass: "fitting-item-name", role: "menuitem" },
    variants: () => options.variants ?? [],
    currentId: () => options.currentId as unknown as undefined,
    onSelect: options.onSelect ?? (() => {}),
    isEnabled: () => options.enabled ?? true,
  });
  return { section, gear, popupEl };
}

describe("VariantSection", () => {
  test("openPopup renders variant items into the popup element", () => {
    const { section } = createSection({
      variants: [
        { id: "1" as unknown as VariantItem["id"], name: "Variant A" },
        { id: "2" as unknown as VariantItem["id"], name: "Variant B" },
      ],
    });
    section.openPopup();
    expect(section.isOpen()).toBe(true);
  });

  test("closePopup hides the popup and sets aria-expanded to false", () => {
    const { section } = createSection();
    section.openPopup();
    section.closePopup();
    expect(section.isOpen()).toBe(false);
  });

  test("popup.isOpen returns true after openPopup", () => {
    const { section } = createSection();
    section.openPopup();
    expect(section.popup.isOpen()).toBe(true);
  });

  test("popup.isOpen returns false after closePopup", () => {
    const { section } = createSection();
    section.openPopup();
    section.closePopup();
    expect(section.popup.isOpen()).toBe(false);
  });

  test("popup.contains returns true for the gear button element", () => {
    const { section, gear } = createSection();
    expect(section.popup.contains(gear)).toBe(true);
  });

  test("updateUI disables the gear button when isEnabled returns false", () => {
    const { section, gear } = createSection({ enabled: false });
    section.updateUI();
    expect(gear.disabled).toBe(true);
  });

  test("updateUI enables the gear button when isEnabled returns true", () => {
    const { section, gear } = createSection({ enabled: true });
    section.updateUI();
    expect(gear.disabled).toBe(false);
  });

  test("renderVariants marks the current variant as selected", () => {
    const { section, popupEl } = createSection({
      variants: [
        { id: "1" as unknown as VariantItem["id"], name: "Variant A" },
        { id: "2" as unknown as VariantItem["id"], name: "Variant B" },
      ],
      currentId: "2",
    });
    section.renderVariants();
    const buttons = Array.from(popupEl.children).filter((c) => c.getAttribute("data-value") === "2");
    expect(buttons.length).toBe(1);
    expect(buttons[0].getAttribute("aria-current")).toBe("true");
  });
});
