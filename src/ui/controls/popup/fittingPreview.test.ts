import type { FittingSummary } from "../../../fitting";
import type { Language } from "../../../appstate";
import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { mockFittingImport } from "../testSupport";
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
  title = "";
  hidden = false;
  src = "";
  alt = "";
  type = "";
  nodeType = 1;
  style: Record<string, string> = {};
  children: FakeElement[] = [];
  offsetParent: FakeElement | null = null;
  offsetWidth = 0;
  offsetHeight = 0;
  classList = {
    add: (...tokens: string[]) => {
      for (const token of tokens) {
        const current = this.className.split(/\s+/).filter(Boolean);
        if (!current.includes(token)) current.push(token);
        this.className = current.join(" ");
      }
    },
    remove: (...tokens: string[]) => {
      for (const token of tokens) {
        const current = this.className.split(/\s+/).filter(Boolean);
        this.className = current.filter((c) => c !== token).join(" ");
      }
    },
    toggle: (token: string, force?: boolean) => {
      const current = this.className.split(/\s+/).filter(Boolean);
      const has = current.includes(token);
      const should = force ?? !has;
      if (should && !has) current.push(token);
      else if (!should && has) current.splice(current.indexOf(token), 1);
      this.className = current.join(" ");
      return should;
    },
    contains: (token: string) => this.className.split(/\s+/).includes(token),
  };
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
    if (name === "class") this.className = value;
    else if (name === "hidden") this.hidden = true;
    else if (name === "title") this.title = value;
    else if (name === "src") this.src = value;
  }

  set innerHTML(_value: string) {
    this.children = [];
  }

  appendChild(child: FakeElement): void {
    if (child.nodeType === 11) {
      for (const fragmentChild of child.children) {
        this.children.push(fragmentChild);
      }
      child.children = [];
      return;
    }
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
    createDocumentFragment: () => {
      const frag = new FakeElement();
      frag.nodeType = 11;
      return frag as unknown as DocumentFragment;
    },
    createTextNode: (text: string) => {
      const node = new FakeElement();
      node.textContent = text;
      node.nodeType = 3;
      return node as unknown as Text;
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
    shipImageUrl: (_shipId) => "images/ships/Rifter.webp",
    itemIconUrl: vi.fn((id: TypeId) => {
      if (id === AC_ID) return "images/icons/1@1x.png";
      if (id === HAIL_ID) return "images/icons/hail_s.png";
      if (id === DRONE_ID) return "images/type-icons/2456@1x.png";
      if (id === SCRIPT_ID) return "images/icons/3344@1x.png";
      return undefined;
    }),
  };
}

const AC_ID: TypeId = toTypeId("486");
const MWD_ID: TypeId = toTypeId("434");
const PLATES_ID: TypeId = toTypeId("20349");
const HAIL_ID: TypeId = toTypeId("12608");
const DRONE_ID: TypeId = toTypeId("2456");
const SCRIPT_ID: TypeId = toTypeId("29005");

const SUMMARY: FittingSummary = {
  hullName: "Rifter",
  fittingName: "Brawler",
  sections: [
    {
      kind: "high",
      rows: [{ name: "200mm AutoCannon I", id: AC_ID, charge: "Hail S", chargeId: HAIL_ID }],
    },
    {
      kind: "mid",
      rows: [{ name: "5MN Microwarpdrive I", id: MWD_ID }],
    },
    {
      kind: "low",
      rows: [{ name: "400mm Steel Plates II", id: PLATES_ID }],
    },
    {
      kind: "cargo",
      rows: [{ name: "Hail S", id: HAIL_ID, quantity: 1000 }],
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

  function buildPreview(language: Language = "en"): {
    container: FakeElement;
    anchor: FakeElement;
    preview: DomFittingPreview;
    fittingImport: ReturnType<typeof mockFittingImport>;
    imageCatalog: ImageCatalog;
  } {
    const container = new FakeElement();
    container.offsetWidth = 300;
    container.offsetHeight = 200;
    const anchor = new FakeElement();
    anchor.setBoundingClientRect(rect(100, 100, 150, 130, 50, 30));
    const NAME_FOR_ID: Record<string, string> = {
      "486": "200mm AutoCannon I",
      "434": "5MN Microwarpdrive I",
      "20349": "400mm Steel Plates II",
      "12608": "Hail S",
      "2456": "Hobgoblin II",
      "29005": "Optimal Range Disruption Script",
    };
    const fittingImport = vi.mocked(mockFittingImport());
    fittingImport.itemNameForId = vi.fn((id: TypeId, lang: string) => {
      const name = NAME_FOR_ID[id] ?? id;
      return lang === "en" ? name : `${name} (${lang})`;
    });
    const imageCatalog = createImageCatalog();
    const preview = new DomFittingPreview({
      container: container as unknown as HTMLElement,
      i18n: { ...createI18n(), current: () => language },
      imageCatalog,
      fittingImport,
      viewport: () => ({ innerWidth: 1024, innerHeight: 768 }),
    });
    return { container, anchor, preview, fittingImport, imageCatalog };
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

  test("drone rows use the actual drone icon when available", () => {
    const { container, anchor, preview } = buildPreview();
    const summary: FittingSummary = {
      hullName: "Rifter",
      fittingName: "Brawler",
      sections: [{ kind: "drones", rows: [{ name: "Hobgoblin II", id: DRONE_ID, quantity: 3 }] }],
    };
    preview.show(anchor as unknown as HTMLElement, summary);
    const droneRow = container.children[1].children[1];
    expect(droneRow.children[0].tagName).toBe("img");
    expect(droneRow.children[0].src).toBe("images/type-icons/2456@1x.png");
  });

  test("non-drone items in the drones section resolve icons through itemIconUrl", () => {
    const { container, anchor, preview, imageCatalog } = buildPreview();
    const summary: FittingSummary = {
      hullName: "Rifter",
      fittingName: "Brawler",
      sections: [{ kind: "drones", rows: [{ name: "Optimal Range Disruption Script", id: SCRIPT_ID, quantity: 2 }] }],
    };
    preview.show(anchor as unknown as HTMLElement, summary);
    const row = container.children[1].children[1];
    expect(row.children[0].tagName).toBe("img");
    expect(row.children[0].src).toBe("images/icons/3344@1x.png");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(SCRIPT_ID);
  });

  test("drone rows have no icon for unknown drones", () => {
    const { container, anchor, preview } = buildPreview();
    const summary: FittingSummary = {
      hullName: "Rifter",
      fittingName: "Brawler",
      sections: [{ kind: "drones", rows: [{ name: "Unknown Drone", quantity: 3 }] }],
    };
    preview.show(anchor as unknown as HTMLElement, summary);
    const droneRow = container.children[1].children[1];
    expect(droneRow.children[0].tagName).toBe("img");
    expect(droneRow.children[0].src).toBe("");
  });

  test("show hides the icon for items without an icon url", () => {
    const { container, anchor, preview } = buildPreview();
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    const midSection = container.children[2];
    const row = midSection.children[1];
    expect(row.children[0].src).toBe("");
  });

  test("empty rows render with a muted style and no icon and do not call catalog", () => {
    const { container, anchor, preview, fittingImport } = buildPreview();
    const summary: FittingSummary = {
      hullName: "Rifter",
      fittingName: "Brawler",
      sections: [{ kind: "high", rows: [{ name: "[Empty High slot]", empty: true }] }],
    };
    preview.show(anchor as unknown as HTMLElement, summary);
    const row = container.children[1].children[1];
    expect(row.className).toBe("preview-row preview-row-empty");
    expect(row.children[0].src).toBe("");
    expect(row.children[1].children[0].textContent).toBe("[Empty High slot]");
    expect(fittingImport.itemNameForId).not.toHaveBeenCalled();
  });

  test("show translates item and charge names and keeps icon inputs canonical", () => {
    const { container, anchor, preview, fittingImport, imageCatalog } = buildPreview("zh");
    preview.show(anchor as unknown as HTMLElement, SUMMARY);
    const highSection = container.children[1];
    const row = highSection.children[1];
    expect(row.children[1].children[0].textContent).toBe("200mm AutoCannon I (zh)");
    expect(row.children[1].children[0].title).toBe("200mm AutoCannon I (zh)");
    expect(row.children[1].children[2].textContent).toBe(", Hail S (zh)");
    expect(fittingImport.itemNameForId).toHaveBeenCalledWith(AC_ID, "zh");
    expect(fittingImport.itemNameForId).toHaveBeenCalledWith(HAIL_ID, "zh");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(AC_ID);
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(HAIL_ID);
    expect(imageCatalog.itemIconUrl).not.toHaveBeenCalledWith("200mm AutoCannon I (zh)");
    expect(imageCatalog.itemIconUrl).not.toHaveBeenCalledWith("Hail S (zh)");
  });

  test("rows without ids render raw names and do not call catalog", () => {
    const { container, anchor, preview, fittingImport } = buildPreview("zh");
    const summary: FittingSummary = {
      hullName: "Rifter",
      fittingName: "Brawler",
      sections: [{ kind: "high", rows: [{ name: "Unknown Module", charge: "Unknown Charge" }] }],
    };
    preview.show(anchor as unknown as HTMLElement, summary);
    const highSection = container.children[1];
    const row = highSection.children[1];
    expect(row.children[1].children[0].textContent).toBe("Unknown Module");
    expect(row.children[1].children[2].textContent).toBe(", Unknown Charge");
    expect(fittingImport.itemNameForId).not.toHaveBeenCalled();
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
