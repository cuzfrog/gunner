import { type ClipboardProvider, type ProfileTextCodec, USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore, type UserSettings } from "../../../appstate";
import { FakeElement, fakeDocument, getFake } from "../testSupport";
import type { Popup, PopupGroup } from "../popup";
import type { ProfileController } from "../profile";
import type { SessionCodec } from "../session";
import { ShareControllerImpl } from "./shareController";

function makeUserSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    version: USER_SETTINGS_VERSION,
    tracking: 0.32,
    trackingUnit: "rad",
    sigRes: "S",
    optimal: 5000,
    falloff: 5000,
    attackerSpeed: 1000,
    attackerMode: "keepAtRange",
    attackerRange: 5000,
    maneuverAggressivity: 1,
    gridBrightness: 0.2,
    attackerMass: 1_200_000,
    attackerInertia: 3,
    attackerSkillLevel: 5,
    attackerOverload: true,
    initialDistance: 5000,
    targetSpeed: 1000,
    targetMode: "orbit",
    targetRange: 5000,
    targetMass: 10_000_000,
    targetInertia: 0.45,
    targetSkillLevel: 5,
    targetOverload: true,
    targetSig: 40,
    attackerHull: "Rifter",
    attackerPropulsion: undefined,
    targetHull: "Thrasher",
    targetPropulsion: undefined,
    attackerFitting: undefined,
    attackerOverrides: {},
    targetFitting: undefined,
    targetOverrides: {},
    attackerFittedHull: undefined,
    targetFittedHull: undefined,
    attackerAmmo: "Hail S",
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
      const { language: _l, trackingUnit: _t, simSpeed: _s, gridBrightness: _g, ...profile } = captured;
      return profile;
    }),
    getInitialDistance: vi.fn(),
    restore: vi.fn(),
    fromProfile: vi.fn(),
    restoreStartup: vi.fn(),
    resetToDefaults: vi.fn(),
    setSessionControl: vi.fn(),
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
    const target = getFake(globalThis.document, "share-popup");
    target.closest = vi.fn(() => target) as unknown as typeof target.closest;
    expect(controller.popup.contains(target as unknown as EventTarget)).toBe(true);
  });

  test("popup does not contain an outside target", () => {
    const { controller } = makeShareController(globalThis.document);
    const target = getFake(globalThis.document, "tracking");
    expect(controller.popup.contains(target as unknown as EventTarget)).toBe(false);
  });
});

function expectedProfileFor(captured: UserSettings): ProfileSettings {
  const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, ...rest } = captured;
  return rest;
}
