import type { FittingImport, ImportedFitting, PresetFitting, PresetFittings } from "../../../fitting";
import type { SavedFitting, SavedFittings } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { UiEventsImpl } from "../../events";
import type { PopupGroup } from "./popupGroup";
import { FittingPopupControllerImpl, type FittingPopupController, type FittingPopupEls } from "./fittingPopupController";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import { FakeElement, IMPORTED_RIFTER, RIFTER, fakeDocument, getFake } from "../testSupport";
import type { Side } from "../side";
import type { FittingPopupHost } from "./fittingPopupHost";

const SAVED_RIFTER: SavedFitting = {
  id: "Rifter::Brawler",
  hull: "Rifter",
  name: "Brawler",
  text: "[Rifter, Brawler]\n200mm AutoCannon I, Hail S",
  savedAt: 0,
};

const PRESETS: PresetFitting[] = [
  { name: "Brawler", body: "200mm AutoCannon I, Hail S" },
  { name: "Tackle", body: "150mm Light AutoCannon I, EMP S" },
];

function createI18n(): I18n {
  return {
    current: vi.fn((): ReturnType<I18n["current"]> => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  };
}

function makePopupGroup(): PopupGroup {
  return {
    register: vi.fn(),
    open: (popup) => { if (!popup.isOpen()) popup.open(); },
    toggle: (popup) => { if (popup.isOpen()) popup.close(); else popup.open(); },
    close: (popup) => { if (popup.isOpen()) popup.close(); },
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
  };
}

function createController(options: { panel?: Partial<FittingPopupHost>; applyFitting?: ImportedFitting | undefined; invalid?: boolean } = {}) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;

  const panel = vi.mocked<FittingPopupHost>({
    profile: options.panel?.profile ?? RIFTER,
    fittingText: options.panel?.fittingText,
    skillConditions: options.panel?.skillConditions ?? vi.fn((): ReturnType<FittingPopupHost["skillConditions"]> => ({ skillLevel: 5, overloaded: false })),
  });

  const savedFittings = vi.mocked<SavedFittings>({
    listForHull: vi.fn(() => [SAVED_RIFTER]),
    mostRecentFor: vi.fn(),
    record: vi.fn(),
    remove: vi.fn(),
  });

  const presetFittings = vi.mocked<PresetFittings>({
    listHulls: vi.fn(),
    fittingsFor: vi.fn(() => PRESETS),
    eftText: vi.fn((hull, fit) => `[${hull}, ${fit.name}]\n${fit.body}`),
  });

  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn(() => (options.invalid ? undefined : IMPORTED_RIFTER)),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    summarize: vi.fn(),
    canonicalEftText: vi.fn(),
    itemName: vi.fn((name: string) => name),
    canonicalName: vi.fn((name: string) => name),
  });

  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(), itemIconUrl: vi.fn(), droneIconUrl: vi.fn() });
  const i18n = createI18n();
  const popupGroup = makePopupGroup();
  const applyFitting = vi.fn(() => options.applyFitting ?? IMPORTED_RIFTER);
  const events = new UiEventsImpl();
  const previews = {
    toggle: vi.fn(),
    showInMenu: vi.fn(),
    hide: vi.fn(),
    openSide: vi.fn(),
    isMenuPreview: vi.fn(),
    refresh: vi.fn(),
    handlePointerDown: vi.fn(),
    handleEscape: vi.fn(),
  } as unknown as FittingPreviewManager;

  const els: FittingPopupEls = {
    trigger: getFake(document, "ship-a-ship-select-trigger") as unknown as HTMLButtonElement,
    eye: getFake(document, "ship-a-fitting-eye") as unknown as HTMLButtonElement,
    popup: getFake(document, "ship-a-ship-select-popup") as unknown as HTMLElement,
    savedList: getFake(document, "ship-a-fitting-saved-list") as unknown as HTMLElement,
    presetList: getFake(document, "ship-a-fitting-preset-list") as unknown as HTMLElement,
    savedLabel: getFake(document, "ship-a-fitting-saved-label") as unknown as HTMLElement,
    presetLabel: getFake(document, "ship-a-fitting-preset-label") as unknown as HTMLElement,
    empty: getFake(document, "ship-a-fitting-empty") as unknown as HTMLElement,
  };

  const controller = new FittingPopupControllerImpl({
    side: "shipA" as Side,
    popupGroup,
    savedFittings,
    presetFittings,
    fittingImport,
    imageCatalog,
    i18n,
    els,
    panel,
    applyFitting,
    previews,
    events,
  });
  popupGroup.register(controller.popup);

  return { controller, els, savedFittings, presetFittings, fittingImport, applyFitting, previews, popupGroup, i18n };
}

describe("FittingPopupController", () => {
  afterEach(() => {
    globalThis.document = undefined as unknown as Document;
    globalThis.Element = undefined as unknown as typeof Element;
  });

  test("open renders saved and preset fittings", () => {
    const { controller, els } = createController();
    controller.popup.open();
    expect(els.popup.hidden).toBe(false);
    expect(els.trigger.getAttribute("aria-expanded")).toBe("true");
    expect(els.savedList.children.length).toBe(1);
    expect(els.presetList.children.length).toBe(2);
    expect(els.empty.hidden).toBe(true);
  });

  test("invalid saved fittings are disabled and deletable", () => {
    const { controller, els, savedFittings } = createController({ invalid: true });
    controller.popup.open();
    const item = els.savedList.children[0].children[0] as unknown as FakeElement;
    expect(item.disabled).toBe(true);
    expect(item.title).toBe("fitting.invalid");
    expect(item.getAttribute("aria-disabled")).toBe("true");
    const del = els.savedList.children[0].children[2] as unknown as FakeElement;
    del.trigger("click");
    expect(savedFittings.remove).toHaveBeenCalledWith(SAVED_RIFTER.id);
  });

  test("delete flow focuses the trigger when no enabled items remain", () => {
    const { controller, els, savedFittings, presetFittings } = createController();
    presetFittings.fittingsFor.mockReturnValue([]);
    savedFittings.listForHull.mockReturnValueOnce([SAVED_RIFTER]).mockReturnValueOnce([]);
    controller.popup.open();
    const del = els.savedList.children[0].children[2] as unknown as FakeElement;
    del.trigger("click");
    expect(els.savedList.children.length).toBe(0);
    expect(els.trigger.focus).toHaveBeenCalled();
  });

  test("current fitting is marked with aria-current", () => {
    const { controller, els } = createController({ panel: { fittingText: SAVED_RIFTER.text } });
    controller.popup.open();
    const item = els.savedList.children[0].children[0] as unknown as FakeElement;
    expect(item.getAttribute("aria-current")).toBe("true");
  });

  test("canonical matching marks a saved item whose stored text normalizes to the current fitting", () => {
    const canonicalText = "[Rifter, Brawler]\n200mm AutoCannon I, Hail S";
    const rawText = "[rifter, brawler]\n200mm autocannon I, Hail S";
    const { controller, els, fittingImport, savedFittings } = createController({ panel: { fittingText: canonicalText } });
    fittingImport.canonicalEftText.mockImplementation((text) => (text === rawText || text === canonicalText ? canonicalText : undefined));
    savedFittings.listForHull.mockReturnValue([{ ...SAVED_RIFTER, text: rawText }]);
    controller.popup.open();
    const item = els.savedList.children[0].children[0] as unknown as FakeElement;
    expect(item.getAttribute("aria-current")).toBe("true");
  });

  test("no item is marked when the current fitting canonical form matches nothing", () => {
    const otherText = "[Rifter, Kiter]\n150mm Light AutoCannon I, EMP S";
    const { controller, els, fittingImport } = createController({ panel: { fittingText: otherText } });
    fittingImport.canonicalEftText.mockImplementation((text) => (text === otherText ? otherText : SAVED_RIFTER.text));
    controller.popup.open();
    const savedItem = els.savedList.children[0].children[0] as unknown as FakeElement;
    const presetItem = els.presetList.children[0].children[0] as unknown as FakeElement;
    expect(savedItem.getAttribute("aria-current")).toBeNull();
    expect(presetItem.getAttribute("aria-current")).toBeNull();
  });

  test("clicking a fitting applies it, closes the popup, and refreshes the ship preview", () => {
    const { controller, els, applyFitting, previews } = createController();
    vi.mocked(previews.openSide).mockReturnValue("shipA");
    vi.mocked(previews.isMenuPreview).mockReturnValue(false);
    controller.popup.open();
    const item = els.savedList.children[0].children[0] as unknown as FakeElement;
    item.trigger("click");
    expect(applyFitting).toHaveBeenCalledWith(SAVED_RIFTER.text);
    expect(els.popup.hidden).toBe(true);
    expect(els.trigger.focus).toHaveBeenCalled();
    expect(vi.mocked(previews.refresh)).toHaveBeenCalled();
  });

  test("clicking a fitting does not refresh a menu preview", () => {
    const { controller, els, applyFitting, previews } = createController();
    vi.mocked(previews.openSide).mockReturnValue("shipA");
    vi.mocked(previews.isMenuPreview).mockReturnValue(true);
    controller.popup.open();
    const item = els.savedList.children[0].children[0] as unknown as FakeElement;
    item.trigger("click");
    expect(applyFitting).toHaveBeenCalledWith(SAVED_RIFTER.text);
    expect(vi.mocked(previews.refresh)).not.toHaveBeenCalled();
  });

  test("renderIfOpen re-renders the popup when it is open", () => {
    const { controller, els, presetFittings } = createController();
    controller.popup.open();
    presetFittings.fittingsFor.mockReturnValue([]);
    controller.renderIfOpen();
    expect(els.presetList.children.length).toBe(0);
  });

  test("closeIfOpen hides the popup and a menu-sourced preview", () => {
    const { controller, els, previews } = createController();
    controller.popup.open();
    vi.mocked(previews.openSide).mockReturnValue("shipA");
    vi.mocked(previews.isMenuPreview).mockReturnValue(true);
    controller.closeIfOpen();
    expect(els.popup.hidden).toBe(true);
    expect(vi.mocked(previews.hide)).toHaveBeenCalledWith("shipA");
  });
});
