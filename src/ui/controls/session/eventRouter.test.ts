import { EventRouter, type EventRouterHost } from "./eventRouter";
import { createControlsEls, fakeDocument, fakeTrackingInput, getFake, FakeElement } from "../testSupport";
import type { Popup, PopupGroup } from "../popup";
import type { FittingPopupController } from "../popup";
import type { FittingPreviewManager } from "../popup";
import type { ImportController } from "../import";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { ShareController } from "../share";
import type { SidePanel } from "../sidePanel";
import type { TurretController } from "../turret";
import type { EwarController } from "../ewar";

function makeEls() {
  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  return createControlsEls();
}

function makePopup(): Popup {
  return {
    isOpen: vi.fn(() => false),
    open: vi.fn(),
    close: vi.fn(),
    focusTrigger: vi.fn(),
    contains: vi.fn(() => false),
  };
}

function makeFittingPopup(): FittingPopupController {
  return { popup: makePopup(), setTriggerEnabled: vi.fn(), renderIfOpen: vi.fn(), closeIfOpen: vi.fn() } as unknown as FittingPopupController;
}

function makeEwarController(): EwarController {
  const attackerPopup = makePopup();
  const targetPopup = makePopup();
  return { setHost: vi.fn(), setLoadout: vi.fn(), restore: vi.fn(), projection: vi.fn(), capture: vi.fn(), fittedCount: vi.fn(() => 0), popup: (side: "attacker" | "target") => side === "attacker" ? attackerPopup : targetPopup, render: vi.fn() } as unknown as EwarController;
}

function makePopupGroup(): PopupGroup {
  return vi.mocked<PopupGroup>({
    register: vi.fn(),
    open: vi.fn(),
    toggle: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
  });
}

function makeShareController(): ShareController {
  return {
    popup: makePopup(),
    onCopyUrlClicked: vi.fn(),
    onCopyTextClicked: vi.fn(),
  } as unknown as ShareController;
}

describe("EventRouter", () => {
  test("play, reset and speed input route to the host callbacks", () => {
    const els = makeEls();
    const host = {
      onPlayPause: vi.fn(),
      onReset: vi.fn(),
      onSpeedChange: vi.fn(),
      onConfigChange: vi.fn(),
      onDisplayChange: vi.fn(),
    } as unknown as EventRouterHost;
    const preferences = {
      getSpeed: vi.fn(() => Number(els.simSpeed.value)),
      trackingInput: { rad: 0.32 },
    } as unknown as PreferencesController;
    const popupGroup = makePopupGroup();
    const router = new EventRouter({
      els,
      preferences,
      profile: {} as ProfileController,
      import: {} as ImportController,
      share: makeShareController(),
      attackerSide: {} as SidePanel,
      targetSide: {} as SidePanel,
      turret: {} as TurretController,
      trackingInput: fakeTrackingInput(),
      popupGroup,
      previewManager: {} as FittingPreviewManager,
      attackerFittingPopup: makeFittingPopup(),
      targetFittingPopup: makeFittingPopup(),
      ewarController: makeEwarController(),
    });
    router.setHost(host);

    getFake(globalThis.document, "play").trigger("click");
    expect(host.onPlayPause).toHaveBeenCalled();

    getFake(globalThis.document, "reset").trigger("click");
    expect(host.onReset).toHaveBeenCalled();

    getFake(globalThis.document, "sim-speed").value = "2";
    getFake(globalThis.document, "sim-speed").trigger("change");
    expect(preferences.getSpeed).toHaveBeenCalled();
    expect(host.onSpeedChange).toHaveBeenCalledWith(2);
  });

  test("Escape routes to popupGroup", () => {
    const els = makeEls();
    const popupGroup = makePopupGroup();
    vi.mocked(popupGroup.hasOpen).mockReturnValue(true);
    const attackerFittingPopup = makeFittingPopup();
    const targetFittingPopup = makeFittingPopup();
    const router = new EventRouter({
      els,
      preferences: {} as PreferencesController,
      profile: {} as ProfileController,
      import: {} as ImportController,
      share: makeShareController(),
      attackerSide: {} as SidePanel,
      targetSide: {} as SidePanel,
      turret: {} as TurretController,
      trackingInput: fakeTrackingInput(),
      popupGroup,
      previewManager: { openSide: vi.fn(() => undefined) } as unknown as FittingPreviewManager,
      attackerFittingPopup,
      targetFittingPopup,
      ewarController: makeEwarController(),
    });
    router.setHost({} as EventRouterHost);

    const escape = { type: "keydown", key: "Escape" } as unknown as KeyboardEvent;
    (globalThis.document as unknown as { dispatchEvent(event: Event): void }).dispatchEvent(escape as unknown as Event);

    expect(popupGroup.onKeyDown).toHaveBeenCalledWith(escape);
  });

  test("display and ship inputs dispatch to the right controller methods", () => {
    const els = makeEls();
    const host = {
      onConfigChange: vi.fn(),
      onDisplayChange: vi.fn(),
    } as unknown as EventRouterHost;
    const trackingInput = fakeTrackingInput(0.42);
    const preferences = {
      updateTrackingFromInput: vi.fn(),
      updateTrackingForSigResolution: vi.fn(),
      updateManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const turret = {
      currentSigResClass: vi.fn(() => "M" as const),
      currentTurretSpec: vi.fn(() => ({
        optimal: Number.parseFloat(els.optimal.value),
        falloff: Number.parseFloat(els.falloff.value),
      })),
    } as unknown as TurretController;
    const attackerSide = {
      capture: vi.fn(() => ({
        speed: Number.parseFloat(els.attackerSpeed.value),
        mass: Number.parseFloat(els.attackerMass.value),
        inertia: Number.parseFloat(els.attackerInertia.value),
      })),
      recordOverride: vi.fn(),
      sections: {
        stats: { updateSpeedFromMass: vi.fn(), updateAlignTime: vi.fn() },
      },
    } as unknown as SidePanel;
    const targetSide = {
      capture: vi.fn(() => ({
        speed: Number.parseFloat(els.targetSpeed.value),
        mass: Number.parseFloat(els.targetMass.value),
        inertia: Number.parseFloat(els.targetInertia.value),
        sig: Number.parseFloat(els.targetSig.value),
      })),
      recordOverride: vi.fn(),
      sections: {
        stats: { updateSpeedFromMass: vi.fn(), updateAlignTime: vi.fn() },
      },
    } as unknown as SidePanel;
    const router = new EventRouter({
      els,
      preferences,
      profile: {} as ProfileController,
      import: {} as ImportController,
      share: makeShareController(),
      attackerSide,
      targetSide,
      turret,
      trackingInput,
      popupGroup: makePopupGroup(),
      previewManager: {} as FittingPreviewManager,
      attackerFittingPopup: makeFittingPopup(),
      targetFittingPopup: makeFittingPopup(),
      ewarController: makeEwarController(),
    });
    router.setHost(host);

    const tracking = getFake(globalThis.document, "tracking");
    tracking.value = "0.42";
    tracking.trigger("input");
    expect(preferences.updateTrackingFromInput).toHaveBeenCalled();
    expect(attackerSide.recordOverride).toHaveBeenCalledWith("tracking", 0.42);

    const sigRes = getFake(globalThis.document, "sigRes");
    sigRes.value = "M";
    sigRes.trigger("input");
    expect(preferences.updateTrackingForSigResolution).toHaveBeenCalled();
    expect(turret.currentSigResClass).toHaveBeenCalled();
    expect(attackerSide.recordOverride).toHaveBeenCalledWith("sigRes", "M");

    const optimal = getFake(globalThis.document, "optimal");
    optimal.value = "2500";
    optimal.trigger("input");
    expect(attackerSide.recordOverride).toHaveBeenCalledWith("optimal", 2500);

    const targetSig = getFake(globalThis.document, "target-sig");
    targetSig.value = "40";
    targetSig.trigger("input");
    expect(targetSide.recordOverride).toHaveBeenCalledWith("targetSig", 40);
    expect(host.onDisplayChange).toHaveBeenCalled();

    const attackerMode = getFake(globalThis.document, "attacker-mode");
    attackerMode.value = "keepAtRange";
    attackerMode.trigger("input");
    expect(preferences.updateManeuverAggressivityEnabled).toHaveBeenCalledWith(false);

    const attackerMass = getFake(globalThis.document, "attacker-mass");
    attackerMass.value = "1200000";
    attackerMass.trigger("input");
    expect(attackerSide.sections.stats.updateSpeedFromMass).toHaveBeenCalled();
    expect(attackerSide.sections.stats.updateAlignTime).toHaveBeenCalled();
    expect(attackerSide.recordOverride).toHaveBeenCalledWith("attackerMass", 1_200_000);

    const targetMass = getFake(globalThis.document, "target-mass");
    targetMass.value = "1100000";
    targetMass.trigger("input");
    expect(targetSide.sections.stats.updateSpeedFromMass).toHaveBeenCalled();
    expect(targetSide.sections.stats.updateAlignTime).toHaveBeenCalled();
    expect(targetSide.recordOverride).toHaveBeenCalledWith("targetMass", 1_100_000);

    expect(host.onConfigChange).toHaveBeenCalled();
  });

  test("share link toggles the popup and copy buttons call the share controller", () => {
    const els = makeEls();
    const popupGroup = makePopupGroup();
    const shareController = makeShareController();
    const router = new EventRouter({
      els,
      preferences: {} as PreferencesController,
      profile: {} as ProfileController,
      import: {} as ImportController,
      share: shareController,
      attackerSide: {} as SidePanel,
      targetSide: {} as SidePanel,
      turret: {} as TurretController,
      trackingInput: fakeTrackingInput(),
      popupGroup,
      previewManager: {} as FittingPreviewManager,
      attackerFittingPopup: makeFittingPopup(),
      targetFittingPopup: makeFittingPopup(),
      ewarController: makeEwarController(),
    });
    router.setHost({} as EventRouterHost);

    getFake(globalThis.document, "share-link").trigger("click");
    expect(popupGroup.toggle).toHaveBeenCalledWith(shareController.popup);

    getFake(globalThis.document, "share-copy-url").trigger("click");
    expect(shareController.onCopyUrlClicked).toHaveBeenCalled();

    getFake(globalThis.document, "share-copy-text").trigger("click");
    expect(shareController.onCopyTextClicked).toHaveBeenCalled();
  });

  test("ewar triggers toggle the ewar popups", () => {
    const els = makeEls();
    const popupGroup = makePopupGroup();
    const ewarController = makeEwarController();
    const router = new EventRouter({
      els,
      preferences: {} as PreferencesController,
      profile: {} as ProfileController,
      import: {} as ImportController,
      share: makeShareController(),
      attackerSide: {} as SidePanel,
      targetSide: {} as SidePanel,
      turret: {} as TurretController,
      trackingInput: fakeTrackingInput(),
      popupGroup,
      previewManager: {} as FittingPreviewManager,
      attackerFittingPopup: makeFittingPopup(),
      targetFittingPopup: makeFittingPopup(),
      ewarController,
    });
    router.setHost({} as EventRouterHost);

    getFake(globalThis.document, "attacker-ewar-trigger").trigger("click");
    getFake(globalThis.document, "target-ewar-trigger").trigger("click");
    expect(popupGroup.toggle).toHaveBeenCalledWith(ewarController.popup("attacker"));
    expect(popupGroup.toggle).toHaveBeenCalledWith(ewarController.popup("target"));
  });

  test("pointerdown outside routes to popupGroup and previewManager", () => {
    const els = makeEls();
    const popupGroup = makePopupGroup();
    vi.mocked(popupGroup.hasOpen).mockReturnValue(true);
    const attackerFittingPopup = makeFittingPopup();
    const targetFittingPopup = makeFittingPopup();
    const previewManager = { openSide: vi.fn(() => undefined), handlePointerDown: vi.fn() } as unknown as FittingPreviewManager;
    const router = new EventRouter({
      els,
      preferences: {} as PreferencesController,
      profile: {} as ProfileController,
      import: {} as ImportController,
      share: makeShareController(),
      attackerSide: {} as SidePanel,
      targetSide: {} as SidePanel,
      turret: {} as TurretController,
      trackingInput: fakeTrackingInput(),
      popupGroup,
      previewManager,
      attackerFittingPopup,
      targetFittingPopup,
      ewarController: makeEwarController(),
    });
    router.setHost({} as EventRouterHost);

    const target = getFake(globalThis.document, "target-hull");
    const pointer = { type: "pointerdown", target } as unknown as PointerEvent;
    (globalThis.document as unknown as { dispatchEvent(event: Event): void }).dispatchEvent(pointer as unknown as Event);

    expect(popupGroup.onPointerDown).toHaveBeenCalledWith(target);
    expect(previewManager.handlePointerDown).toHaveBeenCalledWith(target);
  });
});
