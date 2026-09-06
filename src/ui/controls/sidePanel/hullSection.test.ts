import type { Ships } from "../../../ships";
import type { I18n, Language } from "../../i18n";
import type { ShipId } from "../../../gamedata/ids";
import { PROPULSION_NONE, type FittedHullSummary } from "../../../appstate";
import { fakeDocument, getFake, FakeElement, mockShips, RIFTER } from "../testSupport";
import { HullSection, type HullSectionEls } from "./hullSection";
import type { Popup } from "../popup";
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

function buildHullSection(ships: Ships = shipsWithHull()) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;

  const els: HullSectionEls = {
    hull: getFake(document, "ship-a-hull") as unknown as HTMLInputElement,
    hullHint: getFake(document, "ship-a-hull-hint") as unknown as HTMLElement,
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

  const i18n = mockI18n();

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
      onSkillChoiceInput: vi.fn(),
      popup: {} as unknown as Popup,
    } as unknown as ISidePanelSections["skill"],
    propulsion: {
      currentPropulsionSelection: vi.fn(),
      currentPropulsionId: vi.fn(),
      currentPropulsionModule: vi.fn(),
      renderPropulsionOptions: vi.fn(),
      onPropulsionChange: vi.fn(),
      setPropulsionActive: vi.fn(),
      resolvePropulsionVariant: vi.fn(),
      notePropulsionVariant: vi.fn(),
      seedPropulsionMemory: vi.fn(),
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
    side: "shipA",
    host,
    sections,
    profile: undefined,
    fittedHull: undefined,
    fittingText: undefined,
    lastCommittedHull: undefined,
    importer,
    setFittingEyeEnabled: vi.fn(),
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
    setTurretProfile: vi.fn(),
    clearLauncher: vi.fn(),
    restoreLauncher: vi.fn(),
    setLauncherProfile: vi.fn(),
    clearDrone: vi.fn(),
    restoreDrone: vi.fn(),
    clearSelectionSession: vi.fn(),
  } as unknown as SidePanel);

  const section = new HullSection({ panel, els, ships, i18n });
  return { document, panel, section, host, i18n };
}

describe("HullSection", () => {
  test("onHullInput applies a valid hull while typing", () => {
    const { document, panel, section } = buildHullSection();
    getFake(document, "ship-a-hull").value = "Rifter";
    section.onHullInput();
    expect(panel.profile).toBe(RIFTER);
    expect(getFake(document, "ship-a-hull").classList.toggle).toHaveBeenCalledWith("hull-invalid", false);
  });

  test("onHullChange commits a valid hull", () => {
    const { document, panel, section, host } = buildHullSection();
    getFake(document, "ship-a-hull").value = "Rifter";
    section.onHullChange();
    expect(panel.profile).toBe(RIFTER);
    expect(panel.lastCommittedHull).toBe(RIFTER.id);
    expect(host.persistConfigChange).toHaveBeenCalled();
  });

  test("onHullChange marks an unknown hull invalid", () => {
    const { document, panel, section } = buildHullSection();
    getFake(document, "ship-a-hull").value = "Unknown";
    section.onHullChange();
    expect(panel.profile).toBeUndefined();
    expect(getFake(document, "ship-a-hull").classList.toggle).toHaveBeenCalledWith("hull-invalid", true);
  });

  test("clearHull resets the hull", () => {
    const { document, panel, section } = buildHullSection();
    section.applyProfile(RIFTER, false);
    section.clearHull(true, true);
    expect(panel.profile).toBeUndefined();
    expect(getFake(document, "ship-a-hull").value).toBe("");
  });

  test("applyHull enables the ship configuration controls and forwards the hull profile to the turret", () => {
    const { panel, section } = buildHullSection();
    section.applyHull(RIFTER);
    expect(panel.setFittingEyeEnabled).toHaveBeenCalledWith(true);
    expect(panel.setConfigInputsEnabled).toHaveBeenCalledWith(true);
    expect(panel.setTurretProfile).toHaveBeenCalledWith(RIFTER);
  });

  test("applyProfile auto-loads the most recent fitting text and falls back to the first preset", () => {
    const { panel, section, host } = buildHullSection();
    const importer = panel.importer;
    importer.autoLoadFittingTextFor = vi.fn((hullId: ShipId) => (hullId === RIFTER.id ? "[Rifter, Recent]" : undefined));
    section.applyProfile(RIFTER, true, true);
    expect(importer.autoLoadFittingTextFor).toHaveBeenCalledWith(RIFTER.id);
    expect(importer.importEftFitting).toHaveBeenCalledWith("[Rifter, Recent]", { persist: false, showImportedHint: false });
    expect(panel.lastCommittedHull).toBe(RIFTER.id);
    expect(host.persistConfigChange).toHaveBeenCalled();
  });

  test("clearHull disables the ship configuration controls and clears the turret profile", () => {
    const { panel, section } = buildHullSection();
    section.applyHull(RIFTER);
    panel.setConfigInputsEnabled.mockClear();
    panel.setTurretProfile.mockClear();
    section.clearHull(true, false);
    expect(panel.setFittingEyeEnabled).toHaveBeenCalledWith(false);
    expect(panel.setConfigInputsEnabled).toHaveBeenCalledWith(false);
    expect(panel.setTurretProfile).toHaveBeenCalledWith(undefined);
  });

  test("updateHullHint renders the hull type and faction", () => {
    const { document, panel, section } = buildHullSection();
    panel.profile = RIFTER;
    section.updateHullHint();
    expect(getFake(document, "ship-a-hull-hint").textContent).toBe("Frigate · Minmatar Republic");
  });

  test("refreshHullInputs rewrites the input from the current profile", () => {
    const { document, panel, section } = buildHullSection();
    panel.profile = RIFTER;
    getFake(document, "ship-a-hull").value = "typed";
    section.refreshHullInputs();
    expect(getFake(document, "ship-a-hull").value).toBe("Rifter");
  });

  test("selecting a hull in English then switching language keeps the ShipId and shows the localized name", () => {
    const ships = shipsWithHull();
    ships.hullView = vi.fn((profile, language) => ({
      name: language === "zh" ? "裂谷级" : profile.name,
      hullType: "Frigate",
      faction: "Minmatar Republic",
    }));
    const { document, panel, section, host, i18n } = buildHullSection(ships);
    const input = getFake(document, "ship-a-hull") as unknown as HTMLInputElement;
    input.value = "Rifter";
    section.onHullChange();
    expect(panel.profile).toBe(RIFTER);
    expect(panel.lastCommittedHull).toBe(RIFTER.id);
    expect(input.value).toBe("Rifter");
    expect(host.persistConfigChange).toHaveBeenCalled();

    i18n.current = vi.fn((): Language => "zh");
    section.refreshHullInputs();
    expect(input.value).toBe("裂谷级");
    expect(panel.lastCommittedHull).toBe(RIFTER.id);
  });

  test("applyImportedFitting with no propulsion passes PROPULSION_NONE to renderPropulsionOptions", () => {
    const { panel, section } = buildHullSection();
    const summary: FittedHullSummary = { fittingName: "Brawler", fitted: { mass: 1, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 } };
    section.applyImportedFitting(summary);
    expect(panel.sections.propulsion.renderPropulsionOptions).toHaveBeenCalledWith(PROPULSION_NONE);
  });

  test("applyImportedFitting with propulsion passes the propulsionId to renderPropulsionOptions", () => {
    const { panel, section } = buildHullSection();
    const summary: FittedHullSummary = { fittingName: "Brawler", propulsionId: "ab-1mn", fitted: { mass: 1, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 } };
    section.applyImportedFitting(summary);
    expect(panel.sections.propulsion.renderPropulsionOptions).toHaveBeenCalledWith("ab-1mn");
  });
});
