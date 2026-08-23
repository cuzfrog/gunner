import { buildDomControls } from "./testSupport";
import { DomControls } from "./domControls";

describe("registerControlsModule", () => {
  test("composes the controls graph through typed cradle keys", () => {
    const { cradle, controls } = buildDomControls();
    expect(controls).toBeInstanceOf(DomControls);
    expect(cradle.cradle.turretController).toBeDefined();
    expect(cradle.cradle.attackerSide).toBeDefined();
    expect(cradle.cradle.targetSide).toBeDefined();
    expect(cradle.cradle.sessionCodec).toBeDefined();
    expect(cradle.cradle.importController).toBeDefined();
    expect(cradle.cradle.eventRouter).toBeDefined();
  });

  test("does not register old Create* factory keys", () => {
    const { cradle } = buildDomControls();
    expect(cradle.hasRegistration("createTurretController")).toBe(false);
    expect(cradle.hasRegistration("createSidePanel")).toBe(false);
    expect(cradle.hasRegistration("createSidePanelEls")).toBe(false);
    expect(cradle.hasRegistration("createFittingPreview")).toBe(false);
    expect(cradle.hasRegistration("createFittingPreviewManager")).toBe(false);
    expect(cradle.hasRegistration("createFittingPopupController")).toBe(false);
    expect(cradle.hasRegistration("createSessionCodec")).toBe(false);
    expect(cradle.hasRegistration("createEventRouter")).toBe(false);
    expect(cradle.hasRegistration("createHullDatalist")).toBe(false);
    expect(cradle.hasRegistration("createHintRotator")).toBe(false);
    expect(cradle.hasRegistration("createPreferencesController")).toBe(false);
    expect(cradle.hasRegistration("createProfileController")).toBe(false);
    expect(cradle.hasRegistration("createImportController")).toBe(false);
    expect(cradle.hasRegistration("domControlsFactory")).toBe(false);
  });
});
