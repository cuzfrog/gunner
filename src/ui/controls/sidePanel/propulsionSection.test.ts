import type { FittingImport } from "../../../fitting";
import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { PropulsionId, PropulsionModule, ShipProfile, Ships } from "../../../ships";
import type { I18n, Language } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { PROPULSION_NONE, type FittedHullSummary } from "../../../appstate";
import { fakeDocument, getFake, FakeElement, mockFittingImport, mockShips, RIFTER } from "../testSupport";
import type { Popup, PopupGroup } from "../popup";
import { PropulsionSection, type PropulsionSectionEls } from "./propulsionSection";
import type { SidePanel } from "./sidePanelContract";
import type { ISidePanelSections } from "./sidePanelSections";
import { createSelectionSession, createPropulsionSelection } from "../../selectionSession";

const AB_1MN = "ab-1mn" as const;
const MWD_5MN = "mwd-5mn" as const;

const AB_DEFAULT_ID = toTypeId("439");
const AB_VARIANT_II_ID = toTypeId("440");
const MWD_DEFAULT_ID = toTypeId("434");

const AB_MODULE: PropulsionModule = {
  id: AB_1MN,
  kind: "afterburner",
  sizeTier: "small",
  label: "1MN Afterburner I",
  iconId: AB_DEFAULT_ID,
  defaultModuleId: AB_DEFAULT_ID,
  thrust: 150,
  speedBonus: 1.5,
  massAddition: 0,
  sigBloom: 0,
};

const MWD_MODULE: PropulsionModule = {
  id: MWD_5MN,
  kind: "microwarpdrive",
  sizeTier: "small",
  label: "5MN Microwarpdrive I",
  iconId: MWD_DEFAULT_ID,
  defaultModuleId: MWD_DEFAULT_ID,
  thrust: 1_500_000,
  speedBonus: 5,
  massAddition: 500_000,
  sigBloom: 5,
};

function fittingForPropulsion(): FittingImport {
  const fitting = vi.mocked<FittingImport>(mockFittingImport());
  fitting.propulsionVariantNames = vi.fn((module: PropulsionModule) => {
    if (module.id === AB_1MN) return [{ id: AB_DEFAULT_ID, name: "1MN Afterburner I" }, { id: AB_VARIANT_II_ID, name: "1MN Afterburner II" }];
    if (module.id === MWD_5MN) return [{ id: MWD_DEFAULT_ID, name: "5MN Microwarpdrive I" }];
    return [];
  });
  fitting.propulsionStats = vi.fn(() => AB_MODULE);
  fitting.propulsionStatsById = vi.fn((id: TypeId) => {
    if (id === AB_VARIANT_II_ID) return { thrust: 150, speedBonus: 1.675, massAddition: 0, sigBloom: 0 };
    if (id === AB_DEFAULT_ID) return { thrust: 150, speedBonus: 1.5, massAddition: 0, sigBloom: 0 };
    if (id === MWD_DEFAULT_ID) return { thrust: 1_500_000, speedBonus: 5, massAddition: 500_000, sigBloom: 5 };
    return undefined;
  });
  fitting.itemNameForId = vi.fn(() => "1MN加力燃烧器 I");
  return fitting;
}

function shipsWithPropulsion(): Ships {
  const ships = vi.mocked<Ships>(mockShips());
  ships.findHull = vi.fn(() => RIFTER);
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
  ships.fittingOptions = vi.fn(() => [AB_MODULE, MWD_MODULE]);
  ships.allFittingOptions = vi.fn(() => [AB_MODULE, MWD_MODULE]);
  ships.fittingOption = vi.fn((_profile: ShipProfile, id: PropulsionId) => (id === AB_1MN ? AB_MODULE : id === MWD_5MN ? MWD_MODULE : undefined));
  ships.parsePropulsionId = vi.fn((id: string) => (id === AB_1MN || id === MWD_5MN ? id as PropulsionId : undefined));
  return ships;
}

function mockI18n(): I18n {
  return vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
    translateDocument: vi.fn(),
  });
}

function mockImageCatalog(): ImageCatalog {
  return vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn((_shipId) => ""),
    itemIconUrl: vi.fn(),
  });
}

function buildPropulsionSection(ships: Ships = shipsWithPropulsion(), fittingImport: FittingImport = fittingForPropulsion()) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;

  const els: PropulsionSectionEls = {
    propulsion: getFake(document, "ship-a-propulsion") as unknown as HTMLSelectElement,
    propulsionOptions: getFake(document, "ship-a-propulsion-options") as unknown as HTMLElement,
    propulsionGear: getFake(document, "ship-a-propulsion-gear") as unknown as HTMLButtonElement,
    propulsionVariants: getFake(document, "ship-a-propulsion-variants") as unknown as HTMLElement,
  };

  const host = vi.mocked<SidePanel["host"]>({
    persistConfigChange: vi.fn(),
    onConfigChange: vi.fn(),
    onDisplayChange: vi.fn(),
  });
  const importer = {
    autoLoadFittingTextFor: vi.fn(),
    importEftFitting: vi.fn(),
    importFromText: vi.fn(() => Promise.resolve()),
    importFromClipboard: vi.fn(() => Promise.resolve()),
  };

  const sections = vi.mocked<ISidePanelSections>({
    hull: {} as unknown as ISidePanelSections["hull"],
    stats: {
      updateShipStats: vi.fn(),
      updateSpeedFromMass: vi.fn(),
      updateAlignTime: vi.fn(),
      isOverridden: vi.fn(),
      currentFittedPropulsion: vi.fn(),
      currentFittedPropulsionModule: vi.fn(),
    } as unknown as ISidePanelSections["stats"],
    skill: {
      setOverloadDisabled: vi.fn(),
    } as unknown as ISidePanelSections["skill"],
    paste: {
      popup: {} as unknown as Popup,
    } as unknown as ISidePanelSections["paste"],
    propulsion: {} as unknown as ISidePanelSections["propulsion"],
  } as unknown as ISidePanelSections);

  const panel = vi.mocked<SidePanel>({
    side: "shipA",
    host,
    sections,
    profile: undefined,
    fittedHull: undefined,
    fittingText: undefined,
    lastCommittedHull: undefined,
    importer,
    setFittingEyeEnabled: vi.fn(),
    renderFittingPopupIfOpen: vi.fn(),
    closeFittingPopupIfOpen: vi.fn(),
    hideFittingPreview: vi.fn(),
    getSkillPopup: vi.fn(),
    getPastePopup: vi.fn(),
    getPropulsionVariantPopup: vi.fn(),
    isOverridden: vi.fn(),
    recordOverride: vi.fn(),
    clearOverrides: vi.fn(),
    clearTurret: vi.fn(),
    restoreTurret: vi.fn(),
    clearLauncher: vi.fn(),
    restoreLauncher: vi.fn(),
    clearDrone: vi.fn(),
    restoreDrone: vi.fn(),
    clearSelectionSession: vi.fn(),
  } as unknown as SidePanel);

  const i18n = mockI18n();
  const imageCatalog = mockImageCatalog();
  const popupGroup = vi.mocked<PopupGroup>({
    register: vi.fn(),
    open: vi.fn(),
    toggle: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
  });
  const selectionSession = createSelectionSession();
  const propulsionSelection = createPropulsionSelection(selectionSession);
  const section = new PropulsionSection({ panel, els, ships, fittingImport, imageCatalog, i18n, popupGroup, propulsionSelection });
  (panel.sections as unknown as { propulsion: typeof section }).propulsion = section;
  return { document, panel, section, host, imageCatalog, popupGroup, selectionSession };
}

describe("PropulsionSection", () => {
  test("renderPropulsionOptions creates options and buttons", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    section.renderPropulsionOptions();
    expect(getFake(document, "ship-a-propulsion").children.length).toBeGreaterThan(0);
    expect(getFake(document, "ship-a-propulsion-options").children.length).toBeGreaterThan(0);
  });

  test("renderPropulsionOptions with PROPULSION_NONE deactivates all buttons and disables gear", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    section.renderPropulsionOptions(PROPULSION_NONE);
    const select = getFake(document, "ship-a-propulsion") as unknown as HTMLSelectElement;
    expect(select.value).toBe(PROPULSION_NONE);
    const group = getFake(document, "ship-a-propulsion-options");
    for (const button of group.children) {
      expect(button.getAttribute("aria-pressed")).toBe("false");
    }
    const gear = getFake(document, "ship-a-propulsion-gear") as unknown as HTMLButtonElement;
    expect(gear.disabled).toBe(true);
  });

  test("renderPropulsionOptions with undefined auto-selects the first module", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    section.renderPropulsionOptions(undefined);
    const select = getFake(document, "ship-a-propulsion") as unknown as HTMLSelectElement;
    expect(select.value).toBe(AB_1MN);
    const group = getFake(document, "ship-a-propulsion-options");
    const firstButton = group.children[0];
    expect(firstButton.getAttribute("aria-pressed")).toBe("true");
  });

  test("onPropulsionChange fits a propulsion to the hull", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionId).toBe(AB_1MN);
    expect(panel.fittedHull?.propulsionName).toBe("1MN Afterburner I");
  });

  test("variant popup renders variant buttons", () => {
    const { document, panel, section, imageCatalog } = buildPropulsionSection();
    panel.profile = RIFTER;
    imageCatalog.itemIconUrl = vi.fn(() => "icon.png");
    section.renderPropulsionOptions();
    section.popup.open();
    const variants = getFake(document, "ship-a-propulsion-variants");
    expect(variants.hidden).toBe(false);
    expect(variants.children.length).toBeGreaterThan(0);
    const button = variants.children[0];
    expect(button.children[0]?.src).toBe("icon.png");
  });

  test("variant button label and title are translated while data-value stays canonical", () => {
    const fitting = vi.mocked<FittingImport>(fittingForPropulsion());
    const { document, panel, section, imageCatalog } = buildPropulsionSection(undefined, fitting);
    panel.profile = RIFTER;
    imageCatalog.itemIconUrl = vi.fn((id: TypeId) => `icons/${id}.png`);
    section.renderPropulsionOptions();
    section.popup.open();

    const variants = getFake(document, "ship-a-propulsion-variants");
    const button = variants.children[0] as unknown as HTMLElement;
    expect(button.getAttribute("data-value")).toBe(AB_DEFAULT_ID);
    expect(button.getAttribute("data-hint")).toBe("1MN加力燃烧器 I");
    expect(button.children[1].textContent).toBe("1MN加力燃烧器 I");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(AB_DEFAULT_ID);
  });

  test("popup contains returns true for the variant popup element", () => {
    const { document, section } = buildPropulsionSection();
    const popupEl = getFake(document, "ship-a-propulsion-variants");
    expect(section.popup.contains(popupEl as unknown as EventTarget)).toBe(true);
  });

  test("popup contains returns true for the gear button", () => {
    const { document, section } = buildPropulsionSection();
    const gearEl = getFake(document, "ship-a-propulsion-gear");
    expect(section.popup.contains(gearEl as unknown as EventTarget)).toBe(true);
  });

  test("popup contains returns true for a child inside the variant popup", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    section.renderPropulsionOptions();
    section.popup.open();
    const variants = getFake(document, "ship-a-propulsion-variants");
    const child = variants.children[0] as unknown as EventTarget;
    expect(section.popup.contains(child)).toBe(true);
  });

  test("popup contains returns false for an outside element", () => {
    const { document, section } = buildPropulsionSection();
    const outside = getFake(document, "ship-a-propulsion");
    expect(section.popup.contains(outside as unknown as EventTarget)).toBe(false);
  });

  test("toggle off preserves propulsionModuleId and propulsionName for reactivation", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionModuleId).toBe(AB_DEFAULT_ID);
    // Simulate user selecting variant II via the variant popup
    panel.fittedHull = { ...panel.fittedHull!, propulsionModuleId: AB_VARIANT_II_ID, propulsionName: "1MN Afterburner II" };
    // Toggle off
    getFake(document, "ship-a-propulsion").value = PROPULSION_NONE;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionId).toBeUndefined();
    expect(panel.fittedHull?.propulsion).toBeUndefined();
    expect(panel.fittedHull?.propulsionKind).toBeUndefined();
    expect(panel.fittedHull?.propulsionModuleId).toBe(AB_VARIANT_II_ID);
    expect(panel.fittedHull?.propulsionName).toBe("1MN Afterburner II");
  });

  test("toggle off then on restores the previously selected variant", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    panel.fittedHull = { ...panel.fittedHull!, propulsionModuleId: AB_VARIANT_II_ID, propulsionName: "1MN Afterburner II" };
    // Toggle off
    getFake(document, "ship-a-propulsion").value = PROPULSION_NONE;
    section.onPropulsionChange();
    // Toggle back on
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionId).toBe(AB_1MN);
    expect(panel.fittedHull?.propulsionModuleId).toBe(AB_VARIANT_II_ID);
    expect(panel.fittedHull?.propulsionName).toBe("1MN Afterburner II");
  });

  test("toggle off then on restores variant even with empty fittingName (manual hull)", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    panel.fittedHull = { ...panel.fittedHull!, fittingName: "", propulsionModuleId: AB_VARIANT_II_ID, propulsionName: "1MN Afterburner II" };
    // Toggle off
    getFake(document, "ship-a-propulsion").value = PROPULSION_NONE;
    section.onPropulsionChange();
    expect(panel.fittedHull).toBeDefined();
    expect(panel.fittedHull?.propulsionModuleId).toBe(AB_VARIANT_II_ID);
    // Toggle back on
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionId).toBe(AB_1MN);
    expect(panel.fittedHull?.propulsionModuleId).toBe(AB_VARIANT_II_ID);
  });

  test("switching from AB to MWD does not preserve the stale AB variant", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    panel.fittedHull = { ...panel.fittedHull!, propulsionModuleId: AB_VARIANT_II_ID, propulsionName: "1MN Afterburner II" };
    // Switch to MWD
    getFake(document, "ship-a-propulsion").value = MWD_5MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionId).toBe(MWD_5MN);
    expect(panel.fittedHull?.propulsionModuleId).toBe(MWD_DEFAULT_ID);
    expect(panel.fittedHull?.propulsionName).toBe("5MN Microwarpdrive I");
  });

  test("AB -> MWD -> AB restores the previously selected AB variant from memory", () => {
    const { document, panel, section, selectionSession } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    // User selects AB Variant II
    panel.fittedHull = { ...panel.fittedHull!, propulsionModuleId: AB_VARIANT_II_ID, propulsionName: "1MN Afterburner II" };
    section.notePropulsionVariant(AB_MODULE.kind, AB_VARIANT_II_ID);
    // Switch to MWD
    getFake(document, "ship-a-propulsion").value = MWD_5MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionModuleId).toBe(MWD_DEFAULT_ID);
    // Switch back to AB
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionId).toBe(AB_1MN);
    expect(panel.fittedHull?.propulsionModuleId).toBe(AB_VARIANT_II_ID);
    expect(panel.fittedHull?.propulsionName).toBe("1MN Afterburner II");
    expect(selectionSession.recall("propulsion:afterburner")?.moduleId).toBe(AB_VARIANT_II_ID);
  });

  test("selecting MWD variant then AB then MWD restores the MWD variant from memory", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    // Start with MWD
    getFake(document, "ship-a-propulsion").value = MWD_5MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionModuleId).toBe(MWD_DEFAULT_ID);
    // Switch to AB
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionModuleId).toBe(AB_DEFAULT_ID);
    // Switch back to MWD — should restore MWD_DEFAULT_ID from memory
    getFake(document, "ship-a-propulsion").value = MWD_5MN;
    section.onPropulsionChange();
    expect(panel.fittedHull?.propulsionId).toBe(MWD_5MN);
    expect(panel.fittedHull?.propulsionModuleId).toBe(MWD_DEFAULT_ID);
  });

  test("clearing session resets propulsion memory", () => {
    const { document, panel, section, selectionSession } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    panel.fittedHull = { ...panel.fittedHull!, propulsionModuleId: AB_VARIANT_II_ID, propulsionName: "1MN Afterburner II" };
    section.notePropulsionVariant(AB_MODULE.kind, AB_VARIANT_II_ID);
    expect(selectionSession.recall("propulsion:afterburner")?.moduleId).toBe(AB_VARIANT_II_ID);
    selectionSession.clear();
    expect(selectionSession.recall("propulsion:afterburner")).toBeUndefined();
  });

  test("seedPropulsionMemory seeds from the fitted hull summary", () => {
    const { document, panel, section, selectionSession } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    selectionSession.clear();
    expect(selectionSession.recall("propulsion:afterburner")).toBeUndefined();
    panel.fittedHull = { ...panel.fittedHull!, propulsionModuleId: AB_VARIANT_II_ID, propulsionName: "1MN Afterburner II", propulsionKind: "afterburner" };
    section.seedPropulsionMemory();
    expect(selectionSession.recall("propulsion:afterburner")?.moduleId).toBe(AB_VARIANT_II_ID);
  });

  test("seedPropulsionMemory does not seed when variant is invalid for current module", () => {
    const { document, panel, section, selectionSession } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = MWD_5MN;
    section.onPropulsionChange();
    selectionSession.clear();
    panel.fittedHull = { ...panel.fittedHull!, propulsionModuleId: AB_VARIANT_II_ID, propulsionName: "1MN Afterburner II", propulsionKind: "afterburner" };
    section.seedPropulsionMemory();
    expect(selectionSession.recall("propulsion:microwarpdrive")).toBeUndefined();
    expect(selectionSession.recall("propulsion:afterburner")).toBeUndefined();
  });

  test("seedPropulsionMemory does not seed when fitted has no propulsion module", () => {
    const { document, panel, section, selectionSession } = buildPropulsionSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-propulsion").value = AB_1MN;
    section.onPropulsionChange();
    selectionSession.clear();
    panel.fittedHull = { ...panel.fittedHull!, propulsionModuleId: undefined, propulsionName: undefined, propulsionKind: undefined };
    section.seedPropulsionMemory();
    expect(selectionSession.recall("propulsion:afterburner")).toBeUndefined();
  });

  test("resolvePropulsionVariant falls back to default when fitted has no variant", () => {
    const { panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    const variant = section.resolvePropulsionVariant(AB_MODULE, undefined);
    expect(variant?.id).toBe(AB_DEFAULT_ID);
  });

  test("resolvePropulsionVariant preserves fitted variant id", () => {
    const { panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    const fitted: FittedHullSummary = { fittingName: "Test", propulsionModuleId: AB_VARIANT_II_ID, fitted: { mass: 1, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 } };
    const variant = section.resolvePropulsionVariant(AB_MODULE, fitted);
    expect(variant?.id).toBe(AB_VARIANT_II_ID);
  });

  test("resolvePropulsionVariant falls back to name when module id is stale", () => {
    const { panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    const fitted: FittedHullSummary = { fittingName: "Test", propulsionModuleId: toTypeId("999"), propulsionName: "1MN Afterburner II", fitted: { mass: 1, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 } };
    const variant = section.resolvePropulsionVariant(AB_MODULE, fitted);
    expect(variant?.id).toBe(AB_VARIANT_II_ID);
  });
});
