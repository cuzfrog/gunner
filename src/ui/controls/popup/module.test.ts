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

    const shipAPreview = cradle.cradle.shipAFittingPreview;
    const shipBPreview = cradle.cradle.shipBFittingPreview;
    expect(shipAPreview).toBeDefined();
    expect(shipBPreview).toBeDefined();
    expect(shipAPreview).not.toBe(shipBPreview);
    expect(cradle.cradle.shipAFittingPreview).toBe(shipAPreview);
    expect(cradle.cradle.shipBFittingPreview).toBe(shipBPreview);

    const previewManager = cradle.cradle.previewManager;
    expect(previewManager).toBeDefined();
    expect(cradle.cradle.previewManager).toBe(previewManager);

    const shipAPopup = cradle.cradle.shipAFittingPopup;
    const shipBPopup = cradle.cradle.shipBFittingPopup;
    expect(shipAPopup).toBeDefined();
    expect(shipBPopup).toBeDefined();
    expect(shipAPopup).not.toBe(shipBPopup);
    expect(cradle.cradle.shipAFittingPopup).toBe(shipAPopup);
    expect(cradle.cradle.shipBFittingPopup).toBe(shipBPopup);
  });
});
