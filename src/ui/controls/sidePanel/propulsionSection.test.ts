import type { FittingImport } from "../../../fitting";
import type { PropulsionId, PropulsionModule, ShipProfile, Ships } from "../../../ships";
import type { I18n, Language } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { fakeDocument, getFake, FakeElement, mockFittingImport, mockShips, RIFTER } from "../testSupport";
import type { Popup, PopupGroup } from "../popup";
import { PropulsionSection, type PropulsionSectionEls } from "./propulsionSection";
import type { SidePanel } from "./sidePanelContract";
import type { ISidePanelSections } from "./sidePanelSections";

const AB_1MN = "ab-1mn" as const;

const AB_MODULE: PropulsionModule = {
  id: AB_1MN,
  kind: "afterburner",
  sizeTier: "small",
  label: "1MN Afterburner I",
  thrust: 150,
  speedBonus: 1.5,
  massAddition: 0,
  sigBloom: 0,
};

function fittingForPropulsion(): FittingImport {
  const fitting = vi.mocked<FittingImport>(mockFittingImport());
  fitting.propulsionVariantNames = vi.fn(() => ["1MN Afterburner I"]);
  fitting.propulsionStats = vi.fn(() => AB_MODULE);
  return fitting;
}

function shipsWithPropulsion(): Ships {
  const ships = vi.mocked<Ships>(mockShips());
  ships.findHull = vi.fn(() => RIFTER);
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
  ships.fittingOptions = vi.fn(() => [AB_MODULE]);
  ships.allFittingOptions = vi.fn(() => [AB_MODULE]);
  ships.fittingOption = vi.fn((_profile: ShipProfile, id: PropulsionId) => (id === AB_1MN ? AB_MODULE : undefined));
  ships.parsePropulsionId = vi.fn((id: string) => (id === AB_1MN ? id : undefined));
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
    shipImageUrl: vi.fn(),
    itemIconUrl: vi.fn(),
    droneIconUrl: vi.fn(),
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
  const section = new PropulsionSection({ panel, els, ships, fittingImport, imageCatalog, i18n, popupGroup });
  (panel.sections as unknown as { propulsion: typeof section }).propulsion = section;
  return { document, panel, section, host, imageCatalog, popupGroup };
}

describe("PropulsionSection", () => {
  test("renderPropulsionOptions creates options and buttons", () => {
    const { document, panel, section } = buildPropulsionSection();
    panel.profile = RIFTER;
    section.renderPropulsionOptions();
    expect(getFake(document, "ship-a-propulsion").children.length).toBeGreaterThan(0);
    expect(getFake(document, "ship-a-propulsion-options").children.length).toBeGreaterThan(0);
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
    fitting.itemName = vi.fn(() => "1MN加力燃烧器 I");
    const { document, panel, section, imageCatalog } = buildPropulsionSection(undefined, fitting);
    panel.profile = RIFTER;
    imageCatalog.itemIconUrl = vi.fn((name: string) => `icons/${name.replaceAll(" ", "_")}.png`);
    section.renderPropulsionOptions();
    section.popup.open();

    const variants = getFake(document, "ship-a-propulsion-variants");
    const button = variants.children[0] as unknown as HTMLElement;
    expect(button.getAttribute("data-value")).toBe("1MN Afterburner I");
    expect(button.getAttribute("title")).toBe("1MN加力燃烧器 I");
    expect(button.children[1].textContent).toBe("1MN加力燃烧器 I");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith("1MN Afterburner I");
    expect(imageCatalog.itemIconUrl).not.toHaveBeenCalledWith("1MN加力燃烧器 I");
  });
});
