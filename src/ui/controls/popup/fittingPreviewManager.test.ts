import type { FittingSummary } from "../../../fitting";
import { FakeElement, RIFTER } from "../testSupport";
import { FittingPreviewManagerImpl, type FittingPreviewManager } from "./fittingPreviewManager";
import type { FittingPreview } from "./fittingPreview";
import { UiEventsImpl } from "../../events";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { FittingImport } from "../../../fitting";
import type { ShipProfile } from "../../../ships";
import type { Side } from "../sidePanel";
import type { FittingPopupHost } from "./fittingPopupHost";

const PREVIEW_SUMMARY: FittingSummary = {
  hullName: "Rifter",
  fittingName: "Brawler",
  sections: [
    { kind: "high", rows: [{ name: "200mm AutoCannon I", charge: "Hail S" }] },
    { kind: "mid", rows: [{ name: "5MN Microwarpdrive I" }] },
  ],
};

function createPreview(): FittingPreview {
  return vi.mocked<FittingPreview>({ show: vi.fn(), hide: vi.fn() });
}

function createManager(options: {
  fittingTextOf?: (side: Side) => string | undefined;
  summarize?: FittingSummary | undefined;
  preview?: FittingPreview;
} = {}) {
  const preview = options.preview ?? createPreview();
  const attackerPreview = preview;
  const targetPreview = createPreview();
  const shipImage = new FakeElement();
  const eye = new FakeElement();
  eye.tagName = "BUTTON";
  const events = new UiEventsImpl();
  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn(),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    summarize: vi.fn(() => options.summarize ?? PREVIEW_SUMMARY),
    canonicalEftText: vi.fn(() => undefined),
    itemName: vi.fn((name: string) => name),
    canonicalName: vi.fn((name: string) => name),
  });
  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(() => "images/ships/Rifter.webp"), itemIconUrl: vi.fn(), droneIconUrl: vi.fn() });
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): ReturnType<I18n["current"]> => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const attackerSide = {
    profile: RIFTER,
    get fittingText() { return options.fittingTextOf ? options.fittingTextOf("attacker") : "[Rifter, Brawler]\n200mm AutoCannon I"; },
    skillConditions: () => ({ skillLevel: 5 as const, overloaded: true }),
  } as unknown as FittingPopupHost;
  const targetSide = { profile: undefined, fittingText: undefined, skillConditions: () => ({ skillLevel: 5 as const, overloaded: true }) } as unknown as FittingPopupHost;
  return {
    manager: new FittingPreviewManagerImpl({
      fittingImport,
      imageCatalog,
      i18n,
      attackerSide,
      targetSide,
      previewsBySide: { attacker: attackerPreview, target: targetPreview } as const,
      shipImageBySide: { attacker: shipImage as unknown as HTMLImageElement, target: shipImage as unknown as HTMLImageElement } as const,
      eyeBySide: { attacker: eye as unknown as HTMLButtonElement, target: eye as unknown as HTMLButtonElement } as const,
      events,
    }),
    preview,
    shipImage,
    eye,
  };
}

describe("FittingPreviewManager", () => {
  beforeEach(() => {
    globalThis.document = { createElement: (tag: string) => new FakeElement() } as unknown as Document;
    globalThis.Element = FakeElement as unknown as typeof Element;
  });

  afterEach(() => {
    globalThis.document = undefined as unknown as Document;
    globalThis.Element = undefined as unknown as typeof Element;
  });

  test("toggle shows the current fitting at the ship image and hides on second toggle", () => {
    const { manager, preview } = createManager();
    manager.toggle("attacker");
    expect(preview.show).toHaveBeenCalled();
    manager.toggle("attacker");
    expect(preview.hide).toHaveBeenCalled();
  });

  test("toggle is a no-op when the side has no fitting text", () => {
    const { manager, preview } = createManager({ fittingTextOf: () => undefined });
    manager.toggle("attacker");
    expect(preview.show).not.toHaveBeenCalled();
  });

  test("showInMenu opens a preview at the entry eye and toggles the same eye off", () => {
    const { manager, preview } = createManager();
    const anchor = new FakeElement();
    const eye = new FakeElement();
    eye.tagName = "BUTTON";
    manager.showInMenu("attacker", "eft", anchor as unknown as HTMLElement, eye as unknown as HTMLButtonElement);
    expect(preview.show).toHaveBeenCalledWith(anchor, PREVIEW_SUMMARY, "images/ships/Rifter.webp", expect.any(Function));
    expect(eye.getAttribute("aria-pressed")).toBe("true");
    manager.showInMenu("attacker", "eft", anchor as unknown as HTMLElement, eye as unknown as HTMLButtonElement);
    expect(eye.getAttribute("aria-pressed")).toBe("false");
  });

  test("menu eye is unpressed when the ship image eye is toggled", () => {
    const { manager, eye } = createManager();
    const menuEye = new FakeElement();
    menuEye.tagName = "BUTTON";
    manager.showInMenu("attacker", "eft", menuEye as unknown as HTMLElement, menuEye as unknown as HTMLButtonElement);
    manager.toggle("attacker");
    expect(menuEye.getAttribute("aria-pressed")).toBe("false");
    expect(eye.getAttribute("aria-pressed")).toBe("true");
  });

  test("pointerdown outside the fitting area hides the preview", () => {
    const { manager, preview } = createManager();
    manager.toggle("attacker");
    const outside = new FakeElement();
    manager.handlePointerDown(outside as unknown as EventTarget);
    expect(preview.hide).toHaveBeenCalled();
  });

  test("pointerdown inside the fitting area keeps the preview", () => {
    const { manager, preview, shipImage } = createManager();
    manager.toggle("attacker");
    const inside = new FakeElement();
    inside.closest = () => shipImage;
    manager.handlePointerDown(inside as unknown as EventTarget);
    expect(preview.hide).not.toHaveBeenCalled();
  });

  test("Escape hides the preview and focuses the eye", () => {
    const { manager, preview, eye } = createManager();
    manager.toggle("attacker");
    manager.handleEscape();
    expect(preview.hide).toHaveBeenCalled();
    expect(eye.focus).toHaveBeenCalled();
  });

  test("refresh re-renders an open preview when the fitting text changes", () => {
    const { manager, preview } = createManager({ fittingTextOf: () => "first" });
    manager.toggle("attacker");
    manager.refresh();
    expect(preview.show).toHaveBeenCalledTimes(2);
  });

  test("refresh hides the preview when the anchor is no longer connected", () => {
    const { manager, preview, shipImage } = createManager();
    manager.toggle("attacker");
    shipImage.isConnected = false;
    manager.refresh();
    expect(preview.hide).toHaveBeenCalled();
  });
});
