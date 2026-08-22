import type { FittingSummary } from "../fitting";
import type { I18n } from "./i18n";
import type { ImageCatalog } from "./imageCatalog";
import { DomFittingPreview } from "./fittingPreview";

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

function rect(left: number, top: number, right: number, bottom: number, width: number, height: number): Rect {
  return { left, top, right, bottom, width, height };
}

class FakeElement {
  tagName = "div";
  className = "";
  textContent = "";
  hidden = false;
  src = "";
  alt = "";
  type = "";
  style: Record<string, string> = {};
  children: FakeElement[] = [];
  offsetParent: FakeElement | null = null;
  offsetWidth = 0;
  offsetHeight = 0;
  private readonly attributes: Record<string, string> = {};
  private readonly handlers: Record<string, Array<() => void>> = {};
  private rect: Rect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };

  addEventListener(event: string, handler: () => void): void {
    this.handlers[event] ??= [];
    this.handlers[event].push(handler);
  }

  trigger(event: string): void {
    this.handlers[event]?.forEach((handler) => handler());
  }

  setBoundingClientRect(rect: Rect): void {
    this.rect = rect;
  }

  getBoundingClientRect(): Rect {
    return this.rect;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  set innerHTML(_value: string) {
    this.children = [];
  }

  appendChild(child: FakeElement): void {
    this.children.push(child);
  }
}

function createDocument(): Document {
  return {
    createElement: (tagName: string) => {
      const el = new FakeElement();
      el.tagName = tagName;
      return el as unknown as HTMLElement;
    },
  } as unknown as Document;
}

function createI18n(): I18n {
  return {
    current: () => "en",
    setLanguage: () => {},
    t: (key: string) => key,
    translateDocument: () => {},
  };
}

function createImageCatalog(): ImageCatalog {
  return {
    shipImageUrl: (shipName: string) => `images/ships/${shipName}.webp`,
    itemIconUrl: (itemName: string) => (itemName === "200mm AutoCannon I" ? "images/icons/1@1x.png" : undefined),
    droneIconUrl: () => "images/icons/1084@1x.png",
  };
}

const SUMMARY: FittingSummary = {
  hullName: "Rifter",
  fittingName: "Brawler",
  sections: [
    {
      kind: "high",
      rows: [{ name: "200mm AutoCannon I", charge: "Hail S" }],
    },
    {
      kind: "mid",
      rows: [{ name: "5MN Microwarpdrive I" }],
    },
    {
      kind: "low",
      rows: [{ name: "400mm Steel Plates II" }],
    },
    {
      kind: "cargo",
      rows: [{ name: "Hail S", quantity: 1000 }],
    },
  ],
};

describe("DomFittingPreview", () => {
  beforeEach(() => {
    globalThis.document = createDocument() as unknown as Document;
  });

  afterEach(() => {
    globalThis.document = undefined as unknown as Document;
  });

  function buildPreview(): { container: FakeElement; anchor: FakeElement; preview: DomFittingPreview } {
    const container = new FakeElement();
    container.offsetWidth = 300;
    container.offsetHeight = 200;
    const anchor = new FakeElement();
    anchor.setBoundingClientRect(rect(100, 100, 150, 130, 50, 30));
    const preview = new DomFittingPreview({
      container: container as unknown as HTMLElement,
      i18n: createI18n(),
      imageCatalog: createImageCatalog(),
      viewport: () => ({ innerWidth: 1024, innerHeight: 768 }),
    });
    return { container, anchor, preview };
  }

  test("show renders header and sections", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY, "images/ships/Rifter.webp");

    expect(container.hidden).toBe(false);
    expect(container.getAttribute("aria-hidden")).toBe("false");
    expect(container.children.length).toBe(1 + SUMMARY.sections.length);

    const header = container.children[0];
    expect(header.className).toBe("preview-header");
    const [image, titles, close] = header.children;
    expect(image.tagName).toBe("img");
    expect(image.src).toBe("images/ships/Rifter.webp");
    expect(titles.children[0].textContent).toBe("Rifter");
    expect(titles.children[1].textContent).toBe("Brawler");
    expect(close.tagName).toBe("button");
    expect(close.getAttribute("aria-label")).toBe("button.close");
  });

  test("close button invokes the onClose callback", () => {
    const { container, anchor, preview } = buildPreview();
    const onClose = vi.fn();
    preview.show(anchor as unknown as HTMLElement, SUMMARY, undefined, onClose);
    const close = container.children[0].children[2];
    close.trigger("click");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("show hides the header image when no ship url is provided", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    const image = container.children[0].children[0];
    expect(image.hidden).toBe(true);
  });

  test("show positions the container next to the anchor", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    expect(container.style.left).toBe("158px");
    expect(container.style.top).toBe("100px");
  });

  test("show clamps the preview inside the viewport", () => {
    const { container, anchor, preview } = buildPreview();
    anchor.setBoundingClientRect(rect(900, 600, 950, 630, 50, 30));
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    const left = Number.parseFloat(container.style.left);
    const top = Number.parseFloat(container.style.top);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 300).toBeLessThanOrEqual(1024 - 8);
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top + 200).toBeLessThanOrEqual(768 - 8);
  });

  test("show clamps the preview horizontally when it would overflow the anchor side", () => {
    const { container, anchor, preview } = buildPreview();
    container.offsetWidth = 800;
    anchor.setBoundingClientRect(rect(500, 100, 550, 130, 50, 30));
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    expect(container.style.left).toBe("8px");
  });

  test("show renders charges and quantities", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    const highSection = container.children[1];
    const row = highSection.children[1];
    expect(row.children[0].tagName).toBe("img");
    expect(row.children[0].src).toBe("images/icons/1@1x.png");
    expect(row.children[1].children[0].textContent).toBe("200mm AutoCannon I");
    expect(row.children[1].children[2].textContent).toBe(", Hail S");
    const cargoSection = container.children[4];
    const cargoRow = cargoSection.children[1];
    expect(cargoRow.children[2].textContent).toBe("x1000");
  });

  test("show renders a charge icon next to the charge name", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    const highRow = container.children[1].children[1];
    const main = highRow.children[1];
    expect(main.children[1].tagName).toBe("img");
    expect(main.children[1].className).toBe("preview-charge-icon");
    expect(main.children[2].textContent).toBe(", Hail S");
  });

  test("drone rows fall back to the generic drone icon", () => {
    const { container, anchor, preview } = buildPreview();
    const summary: FittingSummary = {
      hullName: "Rifter",
      fittingName: "Brawler",
      sections: [{ kind: "drones", rows: [{ name: "Hobgoblin II", quantity: 3 }] }],
    };
    preview.show(anchor as unknown as HTMLElement, summary);
    const droneRow = container.children[1].children[1];
    expect(droneRow.children[0].tagName).toBe("img");
    expect(droneRow.children[0].src).toBe("images/icons/1084@1x.png");
  });

  test("show hides the icon for items without an icon url", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    const midSection = container.children[2];
    const row = midSection.children[1];
    expect(row.children[0].src).toBe("");
  });

  test("hide clears and hides the container", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    preview.hide();
    expect(container.hidden).toBe(true);
    expect(container.getAttribute("aria-hidden")).toBe("true");
    expect(container.children.length).toBe(0);
  });
});
