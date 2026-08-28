import { type ClipboardProvider, type ProfileTextCodec, USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore, type UserSettings } from "../../../appstate";
import type { ShipId, TypeId } from "../../../gamedata/ids";
import { FakeElement, fakeDocument, getFake } from "../testSupport";
import type { Popup, PopupGroup } from "../popup";
import type { ProfileController } from "../profile";
import type { SessionCodec } from "../session";
import { ShareControllerImpl } from "./shareController";

function makeUserSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    version: USER_SETTINGS_VERSION,
    shipATrackingUnit: "rad",
    shipBTrackingUnit: "rad",
    weaponRangeVisibility: "both",
    shipATracking: 0.32,
    shipASigRes: "S",
    shipAOptimal: 5000,
    shipAFalloff: 5000,
    shipBTracking: 0.32,
    shipBSigRes: "S",
    shipBOptimal: 5000,
    shipBFalloff: 5000,
    shipASpeed: 1000,
    shipAMode: "keepAtRange",
    shipARange: 5000,
    shipAAggressivity: 1,
    shipBAggressivity: 1,
    gridBrightness: 0.2,
    shipAMass: 1_200_000,
    shipAInertia: 3,
    shipASkillLevel: 5,
    shipAOverload: true,
    initialDistance: 5000,
    shipBSpeed: 1000,
    shipBMode: "orbit",
    shipBRange: 5000,
    shipBMass: 10_000_000,
    shipBInertia: 0.45,
    shipBSkillLevel: 5,
    shipBOverload: true,
    shipBSig: 40,
    shipAHullId: "587" as ShipId,
    shipAPropulsion: undefined,
    shipBHullId: "16242" as ShipId,
    shipBPropulsion: undefined,
    shipAFitting: undefined,
    shipAOverrides: {},
    shipBFitting: undefined,
    shipBOverrides: {},
    shipAFittedHull: undefined,
    shipBFittedHull: undefined,
    shipAAmmo: "12608" as TypeId,
    shipBAmmo: "12608" as TypeId,
    simSpeed: 4,
    language: "en",
    ...overrides,
  };
}

interface ShareControllerOverrides {
  settingsStore?: Partial<SettingsStore>;
  sessionCodec?: Partial<SessionCodec>;
  clipboard?: Partial<ClipboardProvider>;
  popupGroup?: Partial<PopupGroup>;
  profileController?: Partial<ProfileController>;
  profileTextCodec?: Partial<ProfileTextCodec>;
}

function makeShareController(document: Document, overrides: ShareControllerOverrides = {}) {
  globalThis.Element = FakeElement as unknown as typeof Element;
  const captured = makeUserSettings();
  const settingsStore = vi.mocked<SettingsStore>({
    loadStartupState: vi.fn(),
    listProfiles: vi.fn(),
    saveProfile: vi.fn(),
    loadProfile: vi.fn(),
    deleteProfile: vi.fn(),
    selectProfile: vi.fn(),
    clearSelectedProfile: vi.fn(),
    encodeUrl: vi.fn(() => "http://localhost/?c=shared"),
    loadPreferences: vi.fn(),
    savePreferences: vi.fn(),
    ...overrides.settingsStore,
  });
  const sessionCodec = vi.mocked<SessionCodec>({
    capture: vi.fn(() => captured),
    captureProfile: vi.fn((): ProfileSettings => {
      const { language: _l, shipATrackingUnit: _tu, shipBTrackingUnit: _tbu, weaponRangeVisibility: _wrv, simSpeed: _s, gridBrightness: _g, ...profile } = captured;
      return profile;
    }),
    getInitialDistance: vi.fn(),
    restore: vi.fn(),
    fromProfile: vi.fn(),
    restoreStartup: vi.fn(),
    resetToDefaults: vi.fn(),
    ...overrides.sessionCodec,
  });
  const clipboard = vi.mocked<ClipboardProvider>({
    readText: vi.fn(),
    writeText: vi.fn(async () => {}),
    ...overrides.clipboard,
  });
  const popupGroup = vi.mocked<PopupGroup>({
    register: vi.fn(),
    open: vi.fn(),
    toggle: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
    ...overrides.popupGroup,
  });
  const profileController = vi.mocked<ProfileController>({
    selectedName: vi.fn(),
    restoreFromStartup: vi.fn(),
    refresh: vi.fn(),
    markLoaded: vi.fn(),
    updateActionBarState: vi.fn(),
    toggleProfileSelector: vi.fn(),
    toggleNewProfilePopup: vi.fn(),
    saveProfile: vi.fn(),
    loadProfile: vi.fn(),
    deleteProfile: vi.fn(),
    showStatus: vi.fn(),
    ...overrides.profileController,
  });
  const profileTextCodec = vi.mocked<ProfileTextCodec>({
    parse: vi.fn(),
    serialize: vi.fn(() => "serialized profile text"),
    hasHeader: vi.fn(),
    ...overrides.profileTextCodec,
  });
  const controller = new ShareControllerImpl({
    clipboard,
    settingsStore,
    sessionCodec,
    popupGroup,
    profileController,
    profileTextCodec,
    els: {
      shareLink: getFake(document, "share-link") as unknown as HTMLButtonElement,
      sharePopup: getFake(document, "share-popup") as unknown as HTMLElement,
      shareCopyUrl: getFake(document, "share-copy-url") as unknown as HTMLButtonElement,
      shareCopyText: getFake(document, "share-copy-text") as unknown as HTMLButtonElement,
    },
  });
  return { controller, settingsStore, sessionCodec, clipboard, popupGroup, profileController, profileTextCodec, captured };
}

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

afterEach(() => {
  globalThis.document = undefined as unknown as Document;
  globalThis.Element = undefined as unknown as typeof Element;
});

describe("ShareController", () => {
  test("copy URL writes the encoded profile URL and shows copied", async () => {
    const { controller, settingsStore, clipboard, profileController, popupGroup, captured } = makeShareController(globalThis.document);
    await controller.onCopyUrlClicked();
    expect(settingsStore.encodeUrl).toHaveBeenCalledWith(expectedProfileFor(captured));
    expect(clipboard.writeText).toHaveBeenCalledWith("http://localhost/?c=shared");
    expect(profileController.showStatus).toHaveBeenCalledWith("status.copied");
    expect(popupGroup.close).toHaveBeenCalledWith(controller.popup);
  });

  test("copy text writes the serialized profile text and shows copied", async () => {
    const { controller, clipboard, profileController, popupGroup, profileTextCodec, captured } = makeShareController(globalThis.document);
    await controller.onCopyTextClicked();
    expect(profileTextCodec.serialize).toHaveBeenCalledWith(expectedProfileFor(captured));
    expect(clipboard.writeText).toHaveBeenCalledWith("serialized profile text");
    expect(profileController.showStatus).toHaveBeenCalledWith("status.copied");
    expect(popupGroup.close).toHaveBeenCalledWith(controller.popup);
  });

  test("clipboard failure shows failed and closes the popup", async () => {
    const { controller, clipboard, profileController, popupGroup } = makeShareController(globalThis.document, {
      clipboard: { writeText: vi.fn(async () => { throw new Error("denied"); }) },
    });
    await controller.onCopyUrlClicked();
    expect(profileController.showStatus).toHaveBeenCalledWith("status.failed");
    expect(popupGroup.close).toHaveBeenCalledWith(controller.popup);
    expect(clipboard.writeText).toHaveBeenCalled();
  });

  test("popup opens and closes", () => {
    const { controller } = makeShareController(globalThis.document);
    const popup = controller.popup;
    expect(popup.isOpen()).toBe(false);
    popup.open();
    expect(getFake(globalThis.document, "share-popup").hidden).toBe(false);
    expect(getFake(globalThis.document, "share-link").getAttribute("aria-expanded")).toBe("true");
    expect(popup.isOpen()).toBe(true);
    popup.close();
    expect(getFake(globalThis.document, "share-popup").hidden).toBe(true);
    expect(getFake(globalThis.document, "share-link").getAttribute("aria-expanded")).toBe("false");
    expect(popup.isOpen()).toBe(false);
  });

  test("popup contains the trigger and popup", () => {
    const { controller } = makeShareController(globalThis.document);
    const domTarget = getFake(globalThis.document, "share-popup");
    domTarget.closest = vi.fn(() => domTarget) as unknown as typeof domTarget.closest;
    expect(controller.popup.contains(domTarget as unknown as EventTarget)).toBe(true);
  });

  test("popup does not contain an outside shipB", () => {
    const { controller } = makeShareController(globalThis.document);
    const domTarget = getFake(globalThis.document, "tracking");
    expect(controller.popup.contains(domTarget as unknown as EventTarget)).toBe(false);
  });
});

function expectedProfileFor(captured: UserSettings): ProfileSettings {
  const { language: _, shipATrackingUnit: __, shipBTrackingUnit: ___, weaponRangeVisibility: ____, simSpeed: _____, gridBrightness: ______, ...rest } = captured;
  return rest;
}
