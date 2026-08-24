import type { Ships } from "../../../ships";
import type { I18n, Language } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { fakeDocument, getFake, FakeElement, mockShips, RIFTER } from "../testSupport";
import { HullSection, type HullSectionEls } from "./hullSection";
import type { Popup } from "./popup";
import type { SidePanel } from "./sidePanelContract";
import type { ISidePanelSections } from "./sidePanelSections";

function shipsWithHull(): Ships {
  const ships = vi.mocked<Ships>(mockShips());
  ships.findHull = vi.fn((name: string) => (name === "Rifter" ? RIFTER : undefined));
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
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
    shipImageUrl: vi.fn(() => "ship.png"),
    itemIconUrl: vi.fn(),
    droneIconUrl: vi.fn(),
  });
}

function buildHullSection(ships: Ships = shipsWithHull()) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;

  const els: HullSectionEls = {
    hull: getFake(document, "attacker-hull") as unknown as HTMLInputElement,
    shipImage: getFake(document, "attacker-ship-image") as unknown as HTMLImageElement,
    hullHint: getFake(document, "attacker-hull-hint") as unknown as HTMLElement,
  };

  const host = vi.mocked<SidePanel["host"]>({
    persistConfigChange: vi.fn(),
  });
  const importer = {
    mostRecentFittingFor: vi.fn(),
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
      skillConditions: vi.fn(),
      setOverloadDisabled: vi.fn(),
      setOverloadActive: vi.fn(),
      onOverloadButtonClick: vi.fn(),
      onSkillOrOverloadChange: vi.fn(),
      currentSkillLevel: vi.fn(),
      setSkillLevel: vi.fn(),
      setSkillActive: vi.fn(),
      renderSkillOptions: vi.fn(),
      openSkillPopup: vi.fn(),
      closeSkillPopup: vi.fn(),
      isSkillPopupOpen: vi.fn(),
      onSkillButtonClick: vi.fn(),
      popup: {} as unknown as Popup,
    } as unknown as ISidePanelSections["skill"],
    propulsion: {
      currentPropulsionSelection: vi.fn(),
      currentPropulsionId: vi.fn(),
      currentPropulsionModule: vi.fn(),
      renderPropulsionOptions: vi.fn(),
      onPropulsionChange: vi.fn(),
      setPropulsionActive: vi.fn(),
      defaultPropulsionName: vi.fn(),
      nakedFitted: vi.fn(),
      popup: {} as unknown as Popup,
    } as unknown as ISidePanelSections["propulsion"],
    paste: {
      onImportFittingClick: vi.fn(),
      onPastePopupPaste: vi.fn(),
      showImportHint: vi.fn(),
      clearImportHint: vi.fn(),
      clearImportHintTimeout: vi.fn(),
      openPastePopup: vi.fn(),
      closePastePopup: vi.fn(),
      isPastePopupOpen: vi.fn(),
      popup: {} as unknown as Popup,
    } as unknown as ISidePanelSections["paste"],
  } as unknown as ISidePanelSections);

  const panel = vi.mocked<SidePanel>({
    side: "attacker",
    host,
    sections,
    profile: undefined,
    fittedHull: undefined,
    fittingText: undefined,
    lastCommittedHull: undefined,
    importer,
    setFittingTriggerEnabled: vi.fn(),
    setConfigInputsEnabled: vi.fn(),
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
  const section = new HullSection({ panel, els, ships, i18n, imageCatalog });
  return { document, panel, section, host };
}

describe("HullSection", () => {
  test("onHullInput applies a valid hull while typing", () => {
    const { document, panel, section } = buildHullSection();
    getFake(document, "attacker-hull").value = "Rifter";
    section.onHullInput();
    expect(panel.profile).toBe(RIFTER);
    expect(getFake(document, "attacker-hull").classList.toggle).toHaveBeenCalledWith("hull-invalid", false);
  });

  test("onHullChange commits a valid hull", () => {
    const { document, panel, section, host } = buildHullSection();
    getFake(document, "attacker-hull").value = "Rifter";
    section.onHullChange();
    expect(panel.profile).toBe(RIFTER);
    expect(panel.lastCommittedHull).toBe("Rifter");
    expect(host.persistConfigChange).toHaveBeenCalled();
  });

  test("onHullChange marks an unknown hull invalid", () => {
    const { document, panel, section } = buildHullSection();
    getFake(document, "attacker-hull").value = "Unknown";
    section.onHullChange();
    expect(panel.profile).toBeUndefined();
    expect(getFake(document, "attacker-hull").classList.toggle).toHaveBeenCalledWith("hull-invalid", true);
  });

  test("clearHull resets the hull and image", () => {
    const { document, panel, section } = buildHullSection();
    section.applyProfile(RIFTER, false);
    section.clearHull(true, true);
    expect(panel.profile).toBeUndefined();
    expect(getFake(document, "attacker-hull").value).toBe("");
    expect(getFake(document, "attacker-ship-image").hidden).toBe(true);
  });

  test("applyHull enables the ship configuration controls", () => {
    const { panel, section } = buildHullSection();
    section.applyHull(RIFTER);
    expect(panel.setConfigInputsEnabled).toHaveBeenCalledWith(true);
  });

  test("clearHull disables the ship configuration controls", () => {
    const { panel, section } = buildHullSection();
    section.applyHull(RIFTER);
    panel.setConfigInputsEnabled.mockClear();
    section.clearHull(true, false);
    expect(panel.setConfigInputsEnabled).toHaveBeenCalledWith(false);
  });

  test("updateHullHint renders the hull type and faction", () => {
    const { document, panel, section } = buildHullSection();
    panel.profile = RIFTER;
    section.updateHullHint();
    expect(getFake(document, "attacker-hull-hint").textContent).toBe("Frigate · Minmatar Republic");
  });

  test("refreshHullInputs rewrites the input from the current profile", () => {
    const { document, panel, section } = buildHullSection();
    panel.profile = RIFTER;
    getFake(document, "attacker-hull").value = "typed";
    section.refreshHullInputs();
    expect(getFake(document, "attacker-hull").value).toBe("Rifter");
  });
});
