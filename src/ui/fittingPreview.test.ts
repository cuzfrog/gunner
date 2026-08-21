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

class FakeElement {
  tagName = "div";
  className = "";
  textContent = "";
  hidden = false;
  src = "";
  alt = "";
  style: Record<string, string> = {};
  children: FakeElement[] = [];
  offsetParent: FakeElement | null = null;
  offsetWidth = 0;
  offsetHeight = 0;
  private readonly attributes: Record<string, string> = {};
  private rect: Rect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };

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
    (globalThis as unknown as Record<string, unknown>).window = { innerWidth: 1024, innerHeight: 768 };
  });

  afterEach(() => {
    globalThis.document = undefined as unknown as Document;
  });

  function buildPreview(): { container: FakeElement; anchor: FakeElement; preview: DomFittingPreview } {
    const container = new FakeElement();
    container.offsetWidth = 300;
    container.offsetHeight = 200;
    const anchor = new FakeElement();
    anchor.setBoundingClientRect({ left: 100, top: 100, right: 150, bottom: 130, width: 50, height: 30 });
    const preview = new DomFittingPreview({
      container: container as unknown as HTMLElement,
      i18n: createI18n(),
      imageCatalog: createImageCatalog(),
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
    const [image, titles] = header.children;
    expect(image.tagName).toBe("img");
    expect(image.src).toBe("images/ships/Rifter.webp");
    expect(titles.children[0].textContent).toBe("Rifter");
    expect(titles.children[1].textContent).toBe("Brawler");
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
    expect(container.style.left).not.toBe("");
    expect(container.style.top).not.toBe("");
  });

  test("show renders charges and quantities", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    const highSection = container.children[1];
    const row = highSection.children[1];
    expect(row.children[0].tagName).toBe("img");
    expect(row.children[0].src).toBe("images/icons/1@1x.png");
    expect(row.children[1].children[0].textContent).toBe("200mm AutoCannon I");
    expect(row.children[1].children[1].textContent).toBe(", Hail S");
    const cargoSection = container.children[4];
    const cargoRow = cargoSection.children[1];
    expect(cargoRow.children[2].textContent).toBe("x1000");
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
