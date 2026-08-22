import { LanguageRefreshImpl } from "./languageRefresh";
import type { FittingPopupController } from "./fittingPopupController";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import type { HintRotator } from "./hintRotator";
import type { HullDatalist } from "./hullDatalist";
import type { I18n } from "../i18n";
import type { ProfileController } from "./profileController";
import type { SidePanel } from "./sidePanel";
import type { TurretController } from "./turretController";

function mockSidePanel(): SidePanel {
  return {
    renderPropulsionOptions: vi.fn(),
    refreshHullInputs: vi.fn(),
    clearImportHint: vi.fn(),
    updateHullHint: vi.fn(),
    renderSkillOptions: vi.fn(),
  } as unknown as SidePanel;
}

describe("LanguageRefresh", () => {
  test("refresh re-renders localized text across sides, popups, and hints", () => {
    const i18n = {
      current: vi.fn(() => "en"),
      setLanguage: vi.fn(),
      t: vi.fn((key: string) => key),
      translateDocument: vi.fn(),
    } as unknown as I18n;
    const hullDatalist = { populate: vi.fn() } as unknown as HullDatalist;
    const profileController = { selectedName: vi.fn(() => "profile1"), refresh: vi.fn(), updateDirtyState: vi.fn() } as unknown as ProfileController;
    const attackerSide = mockSidePanel();
    const targetSide = mockSidePanel();
    const turretController = { render: vi.fn() } as unknown as TurretController;
    const attackerFittingPopup = { popup: {} as unknown as FittingPopupController["popup"], setTriggerEnabled: vi.fn(), renderIfOpen: vi.fn(), closeIfOpen: vi.fn() } as unknown as FittingPopupController;
    const targetFittingPopup = { popup: {} as unknown as FittingPopupController["popup"], setTriggerEnabled: vi.fn(), renderIfOpen: vi.fn(), closeIfOpen: vi.fn() } as unknown as FittingPopupController;
    const previewManager = { refresh: vi.fn() } as unknown as FittingPreviewManager;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    let playText = "";
    const setPlaying = (playing: boolean) => { playText = i18n.t(playing ? "button.pause" : "button.play"); };
    const onDisplayChange = vi.fn();

    const languageRefresh = new LanguageRefreshImpl({
      i18n, hullDatalist, profileController,
      attackerSide, targetSide, turretController,
      attackerFittingPopup, targetFittingPopup,
      previewManager, hintRotator,
      setPlaying, onDisplayChange,
    });

    languageRefresh.refresh(true);

    expect(i18n.translateDocument).toHaveBeenCalled();
    expect(profileController.refresh).toHaveBeenCalledWith("profile1");
    expect(attackerSide.renderPropulsionOptions).toHaveBeenCalled();
    expect(targetSide.renderPropulsionOptions).toHaveBeenCalled();
    expect(turretController.render).toHaveBeenCalled();
    expect(attackerSide.clearImportHint).toHaveBeenCalled();
    expect(targetSide.clearImportHint).toHaveBeenCalled();
    expect(hullDatalist.populate).toHaveBeenCalled();
    expect(attackerSide.refreshHullInputs).toHaveBeenCalled();
    expect(targetSide.refreshHullInputs).toHaveBeenCalled();
    expect(attackerFittingPopup.renderIfOpen).toHaveBeenCalled();
    expect(targetFittingPopup.renderIfOpen).toHaveBeenCalled();
    expect(previewManager.refresh).toHaveBeenCalled();
    expect(attackerSide.updateHullHint).toHaveBeenCalled();
    expect(targetSide.updateHullHint).toHaveBeenCalled();
    expect(attackerSide.renderSkillOptions).toHaveBeenCalled();
    expect(targetSide.renderSkillOptions).toHaveBeenCalled();
    expect(hintRotator.refresh).toHaveBeenCalled();
    expect(playText).toBe("button.pause");
    expect(profileController.updateDirtyState).toHaveBeenCalled();
    expect(onDisplayChange).toHaveBeenCalled();

    languageRefresh.refresh(false);

    expect(playText).toBe("button.play");
  });
});
