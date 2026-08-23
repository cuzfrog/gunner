import { buildDomControls } from "../testSupport";
import { registerPopupModule } from "./module";

describe("registerPopupModule", () => {
  test("registers popup group, previews, and fitting popups", () => {
    const parent = buildDomControls().cradle;
    const cradle = parent.createScope();
    registerPopupModule(cradle);

    const popupGroup = cradle.cradle.popupGroup;
    expect(popupGroup).toBeDefined();
    expect(cradle.cradle.popupGroup).toBe(popupGroup);

    const attackerPreview = cradle.cradle.attackerFittingPreview;
    const targetPreview = cradle.cradle.targetFittingPreview;
    expect(attackerPreview).toBeDefined();
    expect(targetPreview).toBeDefined();
    expect(attackerPreview).not.toBe(targetPreview);
    expect(cradle.cradle.attackerFittingPreview).toBe(attackerPreview);
    expect(cradle.cradle.targetFittingPreview).toBe(targetPreview);

    const previewManager = cradle.cradle.previewManager;
    expect(previewManager).toBeDefined();
    expect(cradle.cradle.previewManager).toBe(previewManager);

    const attackerPopup = cradle.cradle.attackerFittingPopup;
    const targetPopup = cradle.cradle.targetFittingPopup;
    expect(attackerPopup).toBeDefined();
    expect(targetPopup).toBeDefined();
    expect(attackerPopup).not.toBe(targetPopup);
    expect(cradle.cradle.attackerFittingPopup).toBe(attackerPopup);
    expect(cradle.cradle.targetFittingPopup).toBe(targetPopup);
  });
});
