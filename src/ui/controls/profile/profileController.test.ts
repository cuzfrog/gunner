import type { I18n, Language } from "../../i18n";
import type { TypeId } from "../../../gamedata/ids";
import { USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore, type StartupState } from "../../../appstate";
import type { ConfirmController } from "../confirm";
import type { Popup, PopupGroup } from "../popup";
import type { Timer } from "../../timer";
import { UiEventsImpl } from "../../events";
import { ProfileControllerImpl, type ProfileController, type ProfileEls } from "./profileController";
import type { ProfileChangeTracker } from "./profileChangeTracker";

const BASE_PROFILE: ProfileSettings = {
  version: USER_SETTINGS_VERSION,
  shipATracking: 0.32,
  shipASigRes: "S",
  shipAOptimal: 5000,
  shipAFalloff: 5000,
  shipBTracking: 0.32,
  shipBSigRes: "S",
  shipBOptimal: 5000,
  shipBFalloff: 5000,
  shipASpeed: 0,
  shipAMode: "keepAtRange",
  shipARange: 5000,
  shipAMass: 1_200_000,
  shipAInertia: 3,
  initialDistance: 5000,
  shipBSpeed: 1000,
  shipBMode: "orbit",
  shipBRange: 5000,
  shipBMass: 10_000_000,
  shipBInertia: 0.45,
  shipBSig: 40,
  shipAAmmo: "12608" as TypeId,
};

class FakeElement {
  value = "";
  textContent = "";
  disabled = false;
  hidden = false;
  className = "";
  type = "";
  tagName = "";
  focus = vi.fn();
  private _innerHTML = "";
  children: FakeElement[] = [];
  classList = { toggle: vi.fn() };
  private attributes: Record<string, string | null> = {};
  private handlers: Record<string, Array<(event?: unknown) => void>> = {};

  get innerHTML(): string {
    return this._innerHTML;
  }

  set innerHTML(value: string) {
    this._innerHTML = value;
    this.children = [];
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  removeAttribute(name: string): void {
    delete this.attributes[name];
  }

  appendChild(child: unknown): void {
    this.children.push(child as FakeElement);
  }

  contains(domTarget: unknown): boolean {
    return domTarget === this || this.children.includes(domTarget as FakeElement);
  }

  addEventListener(event: string, handler: (event?: unknown) => void): void {
    this.handlers[event] ??= [];
    this.handlers[event].push(handler);
  }

  trigger(event: string, data?: unknown): void {
    this.handlers[event]?.forEach((h) => h(data));
  }
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    const el = new FakeElement();
    el.tagName = tagName.toUpperCase();
    return el;
  }
}

class StubPopupGroup implements PopupGroup {
  private readonly popups: Popup[] = [];
  register = vi.fn((popup: Popup) => { this.popups.push(popup); });
  open = vi.fn((popup: Popup) => {
    for (const p of this.popups) if (p !== popup && p.isOpen()) p.close();
    if (!popup.isOpen()) popup.open();
  });
  toggle = vi.fn();
  close = vi.fn();
  closeAll = vi.fn();
  hasOpen = vi.fn(() => this.popups.some((p) => p.isOpen()));
  onPointerDown = vi.fn((domTarget: EventTarget | null) => {
    if (!domTarget) return;
    for (const p of this.popups) if (p.isOpen() && !p.contains(domTarget)) p.close();
  });
  onKeyDown = vi.fn((event: { readonly key: string }) => {
    if (event.key !== "Escape") return;
    for (const p of this.popups) if (p.isOpen()) { p.close(); p.focusTrigger(); }
  });
}

class StubProfileChangeTracker implements ProfileChangeTracker {
  setBaseline = vi.fn();
  clearBaseline = vi.fn();
  hasUnsavedChanges = vi.fn(() => false);
}

function fakeProfileEls(): ProfileEls {
  const profilePopup = new FakeElement() as unknown as HTMLElement;
  const newProfilePopup = new FakeElement() as unknown as HTMLElement;
  const newProfileDirtyNote = new FakeElement() as unknown as HTMLElement;
  const newProfileCurrentSection = new FakeElement() as unknown as HTMLElement;
  const newProfileSaveCurrent = new FakeElement() as unknown as HTMLButtonElement;
  const newProfileCurrentName = new FakeElement() as unknown as HTMLElement;
  const newProfileName = new FakeElement() as unknown as HTMLInputElement;
  const newProfileConfirm = new FakeElement() as unknown as HTMLButtonElement;
  const newProfileClearSession = new FakeElement() as unknown as HTMLButtonElement;
  newProfilePopup.appendChild(newProfileDirtyNote);
  newProfilePopup.appendChild(newProfileCurrentSection);
  newProfileCurrentSection.appendChild(newProfileSaveCurrent);
  newProfileSaveCurrent.appendChild(newProfileCurrentName);
  newProfilePopup.appendChild(newProfileName);
  newProfilePopup.appendChild(newProfileConfirm);
  newProfilePopup.appendChild(newProfileClearSession);
  return {
    profileSave: new FakeElement() as unknown as HTMLButtonElement,
    profileSelectTrigger: new FakeElement() as unknown as HTMLButtonElement,
    profileSelectLabel: new FakeElement() as unknown as HTMLElement,
    profilePopup,
    profileDelete: new FakeElement() as unknown as HTMLButtonElement,
    profileNew: new FakeElement() as unknown as HTMLButtonElement,
    newProfilePopup,
    newProfileDirtyNote,
    newProfileCurrentSection,
    newProfileSaveCurrent,
    newProfileCurrentName,
    newProfileName,
    newProfileConfirm,
    newProfileClearSession,
    shareStatus: new FakeElement() as unknown as HTMLElement,
  };
}

function createNoOpTimer(): Timer & { fireLast: () => void } {
  let nextId = 0;
  const timeouts = new Map<number, () => void>();
  return {
    setTimeout: vi.fn((callback: () => void) => {
      nextId += 1;
      timeouts.set(nextId, callback);
      return nextId;
    }),
    clearTimeout: vi.fn((id: number) => {
      timeouts.delete(id);
    }),
    setInterval: vi.fn(),
    clearInterval: vi.fn(),
    fireLast() {
      const last = Array.from(timeouts.entries()).pop();
      if (last) {
        timeouts.delete(last[0]);
        last[1]();
      }
    },
  };
}

function build(options: { profiles?: Record<string, ProfileSettings>; list?: string[]; confirm?: (key: string) => boolean } = {}) {
  globalThis.document = new FakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = fakeProfileEls();
  const i18n: I18n = {
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  };
  const profileNames = new Set(options.list ?? Object.keys(options.profiles ?? {}));
  const settingsStore: SettingsStore = {
    loadStartupState: vi.fn(),
    listProfiles: vi.fn(() => Array.from(profileNames)),
    saveProfile: vi.fn((name: string) => { profileNames.add(name); }),
    loadProfile: vi.fn((name) => options.profiles?.[name] ?? null),
    deleteProfile: vi.fn(),
    selectProfile: vi.fn(),
    clearSelectedProfile: vi.fn(),
    encodeUrl: vi.fn(),
    loadPreferences: vi.fn(),
    savePreferences: vi.fn(),
  };
  const timer = createNoOpTimer();
  const snapshotSource = vi.fn(() => ({ ...BASE_PROFILE }));
  const onLoaded = vi.fn();
  const onNewProfile = vi.fn();
  const events = new UiEventsImpl();
  events.onProfileLoaded(onLoaded);
  events.onNewProfile(onNewProfile);
  const confirmController: ConfirmController = {
    confirm: vi.fn((key: string) => Promise.resolve(options.confirm ? options.confirm(key) : true)),
  };
  const popupGroup = new StubPopupGroup();
  const changeTracker = new StubProfileChangeTracker();
  const controller = new ProfileControllerImpl({
    els, settingsStore, timer, i18n, events, confirmController, popupGroup, changeTracker, snapshotSource,
  });
  return { controller, els, settingsStore, timer, snapshotSource, onLoaded, onNewProfile, events, confirmController, popupGroup, changeTracker };
}

function menuLabels(els: ProfileEls): string[] {
  return (els.profilePopup.children as unknown as FakeElement[]).map((c) => c.textContent);
}

describe("ProfileController", () => {
  test("markLoaded clears the new-profile name popup and sets the baseline", () => {
    const { controller, els, changeTracker } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    els.newProfileName.value = "typed";
    controller.markLoaded("brawler");
    expect(els.newProfileName.value).toBe("");
    expect(controller.selectedName()).toBe("brawler");
    expect(els.profileSelectLabel.textContent).toBe("brawler");
    expect(changeTracker.setBaseline).toHaveBeenCalledWith(expect.any(Object));
  });

  test("save with no selection opens the new-profile popup instead of saving", async () => {
    const { controller, els, settingsStore } = build({ list: ["brawler"] });
    await controller.saveProfile();
    expect(els.newProfilePopup.hidden).toBe(false);
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();
  });

  test("save with a selection quick-saves to the selected profile", async () => {
    const { controller, els, settingsStore } = build({ list: ["brawler"] });
    controller.markLoaded("brawler");
    await controller.saveProfile();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("brawler");
  });

  test("save never asks to overwrite", async () => {
    const { controller, settingsStore, confirmController } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    await controller.saveProfile();
    expect(confirmController.confirm).not.toHaveBeenCalled();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
  });

  test("refresh rebuilds the selector menu and upsets the trigger label", () => {
    const { controller, els } = build({ profiles: { brawler: BASE_PROFILE, kiter: BASE_PROFILE }, list: ["brawler", "kiter"] });

    controller.refresh("kiter");
    expect(menuLabels(els)).toEqual(["brawler", "kiter"]);
    expect(controller.selectedName()).toBe("kiter");
    expect(els.profileSelectLabel.textContent).toBe("kiter");

    controller.refresh();
    expect(els.profileSelectLabel.textContent).toBe("select.profile");
    expect(controller.selectedName()).toBe("");
  });

  test("toggle opens the selector, focuses the current item and syncs aria-expanded", () => {
    const { controller, els, popupGroup } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    const item = els.profilePopup.children[0] as unknown as FakeElement;

    controller.toggleProfileSelector();
    expect(els.profilePopup.hidden).toBe(false);
    expect(els.profileSelectTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(item.focus).toHaveBeenCalled();

    controller.toggleProfileSelector();
    expect(els.profilePopup.hidden).toBe(true);
    expect(els.profileSelectTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(popupGroup.open).toHaveBeenCalled();
  });

  test("clicking a menu item loads that profile and closes the popup", async () => {
    const { controller, els, settingsStore, onLoaded } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    controller.toggleProfileSelector();
    const item = els.profilePopup.children[0] as unknown as FakeElement;

    item.trigger("click");
    await Promise.resolve();
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("brawler");
    expect(onLoaded).toHaveBeenLastCalledWith("brawler");
    expect(controller.selectedName()).toBe("brawler");
    expect(els.profilePopup.hidden).toBe(true);
  });

  test("load does nothing for an empty name", async () => {
    const { controller, settingsStore, onLoaded } = build({ profiles: { brawler: BASE_PROFILE } });
    await controller.loadProfile("");
    expect(settingsStore.selectProfile).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();
  });

  test("selector menu and popup keep the trigger and menu items contained, not unrelated elements", () => {
    const { controller, els, popupGroup } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.toggleProfileSelector();
    const item = els.profilePopup.children[0] as unknown as EventTarget;
    popupGroup.onPointerDown(item);
    expect(els.profilePopup.hidden).toBe(false);
    popupGroup.onPointerDown(els.profileSelectTrigger as unknown as EventTarget);
    expect(els.profilePopup.hidden).toBe(false);
    popupGroup.onPointerDown(els.profileDelete as unknown as EventTarget);
    expect(els.profilePopup.hidden).toBe(true);
  });

  test("Escape closes the selector and refocuses the trigger", () => {
    const { controller, els, popupGroup } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.toggleProfileSelector();
    popupGroup.onKeyDown({ key: "Escape" });
    expect(els.profilePopup.hidden).toBe(true);
    expect(els.profileSelectTrigger.focus).toHaveBeenCalled();
  });

  test("load confirms discarding unsaved changes and reverts the selection", async () => {
    const { controller, els, settingsStore, onLoaded, confirmController, changeTracker } = build({
      profiles: { brawler: BASE_PROFILE, kiter: { ...BASE_PROFILE, shipAOptimal: 9999 } },
      list: ["brawler", "kiter"],
    });
    await controller.loadProfile("brawler");
    controller.markLoaded("brawler");
    expect(confirmController.confirm).not.toHaveBeenCalled();

    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(true);
    vi.mocked(confirmController.confirm).mockResolvedValue(false);
    await controller.loadProfile("kiter");
    expect(confirmController.confirm).toHaveBeenLastCalledWith("confirm.discardChanges");
    expect(settingsStore.selectProfile).not.toHaveBeenLastCalledWith("kiter");
    expect(onLoaded).not.toHaveBeenLastCalledWith("kiter");
    expect(controller.selectedName()).toBe("brawler");
    expect(els.profileSelectLabel.textContent).toBe("brawler");

    vi.mocked(confirmController.confirm).mockResolvedValue(true);
    await controller.loadProfile("kiter");
    expect(onLoaded).toHaveBeenLastCalledWith("kiter");
    expect(controller.selectedName()).toBe("kiter");
  });

  test("delete removes the selected profile and emits profileDeleted", async () => {
    const { controller, els, settingsStore, events, changeTracker } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    const onProfileDeleted = vi.fn();
    const refresh = vi.spyOn(controller, "refresh");
    events.onProfileDeleted(onProfileDeleted);
    controller.markLoaded("brawler");
    vi.mocked(changeTracker.clearBaseline).mockClear();
    refresh.mockClear();
    await controller.deleteProfile();
    expect(settingsStore.deleteProfile).toHaveBeenCalledWith("brawler");
    expect(onProfileDeleted).toHaveBeenCalled();
    expect(changeTracker.clearBaseline).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(els.shareStatus.textContent).toBe("status.profileDeleted");
  });

  test("delete confirms before removing", async () => {
    const { controller, settingsStore, confirmController } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    vi.mocked(confirmController.confirm).mockResolvedValue(false);
    await controller.deleteProfile();
    expect(confirmController.confirm).toHaveBeenCalledWith("confirm.deleteProfile");
    expect(settingsStore.deleteProfile).not.toHaveBeenCalled();

    vi.mocked(confirmController.confirm).mockResolvedValue(true);
    await controller.deleteProfile();
    expect(settingsStore.deleteProfile).toHaveBeenCalledWith("brawler");
  });

  test("restoreFromStartup loads the selected profile and reports missing selections", () => {
    const { controller, settingsStore, onLoaded } = build({ profiles: { brawler: BASE_PROFILE } });

    expect(controller.restoreFromStartup({ settings: null, selectedProfileName: null })).toBe(false);
    expect(controller.restoreFromStartup({ settings: null, selectedProfileName: "missing" })).toBe(false);
    expect(settingsStore.clearSelectedProfile).toHaveBeenCalled();

    expect(controller.restoreFromStartup({ settings: null, selectedProfileName: "brawler" })).toBe(true);
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("brawler");
    expect(onLoaded).toHaveBeenLastCalledWith("brawler");
  });

  test("updateActionBarState drives save from dirty only and delete from selection", () => {
    const { controller, els, changeTracker } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });

    controller.updateActionBarState();
    expect(els.profileSave.disabled).toBe(true);
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("is-unsaved", false);
    expect(els.profileDelete.disabled).toBe(true);
    expect(els.newProfileSaveCurrent.disabled).toBe(true);

    controller.markLoaded("brawler");
    vi.mocked(els.profileSave.classList.toggle).mockClear();
    controller.updateActionBarState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("is-unsaved", false);
    expect(els.profileSave.disabled).toBe(true);
    expect(els.profileDelete.disabled).toBe(false);
    expect(els.newProfileSaveCurrent.disabled).toBe(true);

    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(true);
    controller.updateActionBarState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("is-unsaved", true);
    expect(els.profileSave.disabled).toBe(false);
    expect(els.newProfileSaveCurrent.disabled).toBe(false);

    controller.refresh();
    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(true);
    controller.updateActionBarState();
    expect(els.profileSave.disabled).toBe(false);
    expect(els.profileDelete.disabled).toBe(true);
    expect(els.newProfileSaveCurrent.disabled).toBe(true);

    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(false);
    controller.updateActionBarState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("is-unsaved", false);
    expect(els.profileSave.disabled).toBe(true);
    expect(els.profileDelete.disabled).toBe(true);
  });

  test("toggle opens the new-profile popup, empties it and focuses the input", () => {
    const { controller, els, popupGroup } = build();
    controller.toggleNewProfilePopup();
    expect(els.newProfilePopup.hidden).toBe(false);
    expect(els.newProfileName.focus).toHaveBeenCalled();

    controller.toggleNewProfilePopup();
    expect(els.newProfilePopup.hidden).toBe(true);
    expect(popupGroup.open).toHaveBeenCalled();
  });

  test("confirm with an empty name saves nothing and does not reset", async () => {
    const { controller, els, settingsStore, onNewProfile } = build();
    controller.toggleNewProfilePopup();
    els.newProfileName.value = "   ";
    (els.newProfileConfirm as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(onNewProfile).not.toHaveBeenCalled();
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();
  });

  test("confirm with a name saves the current snapshot under the name without resetting", async () => {
    const { controller, els, settingsStore, onNewProfile, snapshotSource } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.toggleNewProfilePopup();
    els.newProfileName.value = "kappa";
    (els.newProfileName as unknown as FakeElement).trigger("input");
    (els.newProfileConfirm as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(onNewProfile).not.toHaveBeenCalled();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("kappa", snapshotSource());
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("kappa");
    expect(controller.selectedName()).toBe("kappa");
    expect(els.shareStatus.textContent).toBe("status.profileSaved");
  });

  test("new-profile confirm is disabled for empty or whitespace and enabled for any non-empty name", () => {
    const { controller, els } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.toggleNewProfilePopup();

    expect(els.newProfileConfirm.disabled).toBe(true);

    els.newProfileName.value = "kappa";
    (els.newProfileName as unknown as FakeElement).trigger("input");
    expect(els.newProfileConfirm.disabled).toBe(false);

    els.newProfileName.value = "brawler";
    (els.newProfileName as unknown as FakeElement).trigger("input");
    expect(els.newProfileConfirm.disabled).toBe(false);

    els.newProfileName.value = "   ";
    (els.newProfileName as unknown as FakeElement).trigger("input");
    expect(els.newProfileConfirm.disabled).toBe(true);
  });

  test("Enter in the name input confirms when valid and does nothing when disabled", async () => {
    const { controller, els, settingsStore } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.toggleNewProfilePopup();

    els.newProfileName.value = "   ";
    (els.newProfileName as unknown as FakeElement).trigger("input");
    (els.newProfileName as unknown as FakeElement).trigger("keydown", { key: "Enter", preventDefault: vi.fn() });
    await Promise.resolve();
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();
    expect(els.newProfilePopup.hidden).toBe(false);

    els.newProfileName.value = "kappa";
    (els.newProfileName as unknown as FakeElement).trigger("input");
    (els.newProfileName as unknown as FakeElement).trigger("keydown", { key: "Enter", preventDefault: vi.fn() });
    await Promise.resolve();
    expect(settingsStore.saveProfile).toHaveBeenCalledWith("kappa", expect.any(Object));
    expect(els.newProfilePopup.hidden).toBe(true);
  });

  test("save-as with a duplicate name asks confirm.overwriteProfile and aborts on cancel", async () => {
    const { controller, els, settingsStore, confirmController } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.toggleNewProfilePopup();
    vi.mocked(confirmController.confirm).mockResolvedValue(false);
    els.newProfileName.value = "brawler";
    (els.newProfileName as unknown as FakeElement).trigger("input");
    (els.newProfileConfirm as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(confirmController.confirm).toHaveBeenLastCalledWith("confirm.overwriteProfile");
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();
    expect(els.newProfilePopup.hidden).toBe(false);
    expect(els.newProfileName.value).toBe("brawler");

    vi.mocked(confirmController.confirm).mockResolvedValue(true);
    (els.newProfileConfirm as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
  });

  test("outside pointer-down and Escape close the new profile popup without action", () => {
    const { controller, els, popupGroup, onNewProfile } = build();
    controller.toggleNewProfilePopup();
    popupGroup.onPointerDown(els.shareStatus as unknown as EventTarget);
    expect(els.newProfilePopup.hidden).toBe(true);
    expect(els.profileNew.focus).toHaveBeenCalledTimes(0);
    expect(onNewProfile).not.toHaveBeenCalled();

    controller.toggleNewProfilePopup();
    popupGroup.onKeyDown({ key: "Escape" });
    expect(els.newProfilePopup.hidden).toBe(true);
    expect(els.profileNew.focus).toHaveBeenCalled();
  });

  test("popup open with no profile and clean hides current section, disables clear-session", () => {
    const { controller, els, changeTracker } = build();
    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(false);
    controller.toggleNewProfilePopup();
    expect(els.newProfileDirtyNote.hidden).toBe(true);
    expect(els.newProfileCurrentSection.hidden).toBe(true);
    expect(els.newProfileSaveCurrent.disabled).toBe(true);
    expect(els.newProfileClearSession.disabled).toBe(true);
  });

  test("popup open with no profile and dirty shows dirty note, hides current section, enables clear-session", () => {
    const { controller, els, changeTracker } = build();
    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(true);
    controller.toggleNewProfilePopup();
    expect(els.newProfileDirtyNote.hidden).toBe(false);
    expect(els.newProfileCurrentSection.hidden).toBe(true);
    expect(els.newProfileSaveCurrent.disabled).toBe(true);
    expect(els.newProfileClearSession.disabled).toBe(false);
  });

  test("popup open with profile and clean shows current section, disables save-current and clear-session stays enabled", () => {
    const { controller, els, changeTracker } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(false);
    controller.toggleNewProfilePopup();
    expect(els.newProfileDirtyNote.hidden).toBe(true);
    expect(els.newProfileCurrentSection.hidden).toBe(false);
    expect(els.newProfileCurrentName.textContent).toBe("brawler");
    expect(els.newProfileSaveCurrent.disabled).toBe(true);
    expect(els.newProfileClearSession.disabled).toBe(false);
  });

  test("popup open with profile and dirty shows dirty note, current section, enables save-current", () => {
    const { controller, els, changeTracker } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(true);
    controller.toggleNewProfilePopup();
    expect(els.newProfileDirtyNote.hidden).toBe(false);
    expect(els.newProfileCurrentSection.hidden).toBe(false);
    expect(els.newProfileCurrentName.textContent).toBe("brawler");
    expect(els.newProfileSaveCurrent.disabled).toBe(false);
    expect(els.newProfileClearSession.disabled).toBe(false);
  });

  test("save-current from popup quick-saves to the selected profile and closes", async () => {
    const { controller, els, settingsStore, changeTracker } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(true);
    controller.toggleNewProfilePopup();
    (els.newProfileSaveCurrent as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(els.newProfilePopup.hidden).toBe(true);
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
    expect(els.shareStatus.textContent).toBe("status.profileSaved");
  });

  test("clear-session emits newProfile without confirm when clean", async () => {
    const { controller, els, onNewProfile, confirmController, changeTracker } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(false);
    controller.toggleNewProfilePopup();
    (els.newProfileClearSession as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(confirmController.confirm).not.toHaveBeenCalled();
    expect(onNewProfile).toHaveBeenCalledTimes(1);
    expect(els.newProfilePopup.hidden).toBe(true);
  });

  test("clear-session asks confirm.discardChanges when dirty; cancel aborts and preserves popup, accept emits", async () => {
    const { controller, els, onNewProfile, confirmController, changeTracker } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    controller.markLoaded("brawler");
    vi.mocked(changeTracker.hasUnsavedChanges).mockReturnValue(true);
    controller.toggleNewProfilePopup();
    els.newProfileName.value = "kappa";
    vi.mocked(confirmController.confirm).mockResolvedValue(false);
    (els.newProfileClearSession as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(confirmController.confirm).toHaveBeenLastCalledWith("confirm.discardChanges");
    expect(onNewProfile).not.toHaveBeenCalled();
    expect(els.newProfilePopup.hidden).toBe(false);
    expect(els.newProfileName.value).toBe("kappa");

    vi.mocked(confirmController.confirm).mockResolvedValue(true);
    (els.newProfileClearSession as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(onNewProfile).toHaveBeenCalledTimes(1);
    expect(els.newProfilePopup.hidden).toBe(true);
  });

  test("save icon with no selection opens popup and returns focus to save icon on Escape", () => {
    const { controller, els, popupGroup } = build();
    void controller.saveProfile();
    expect(els.newProfilePopup.hidden).toBe(false);
    popupGroup.onKeyDown({ key: "Escape" });
    expect(els.newProfilePopup.hidden).toBe(true);
    expect(els.profileSave.focus).toHaveBeenCalled();
  });

  test("showStatus displays translated text, clears after the timeout, and cancels previous timeouts", () => {
    const { controller, els, timer } = build();
    controller.showStatus("status.copied");
    expect(els.shareStatus.textContent).toBe("status.copied");
    controller.showStatus("status.failed");
    expect(timer.clearTimeout).toHaveBeenCalled();
    timer.fireLast();
    expect(els.shareStatus.textContent).toBe("");
  });

  test("save, load and delete trigger status feedback", async () => {
    const { controller, els, settingsStore } = build({ profiles: { brawler: BASE_PROFILE, kiter: BASE_PROFILE }, list: ["brawler", "kiter"] });

    await controller.loadProfile("brawler");
    expect(els.shareStatus.textContent).toBe("status.profileLoaded");

    await controller.saveProfile();
    expect(els.shareStatus.textContent).toBe("status.profileSaved");

    controller.markLoaded("kiter");
    await controller.deleteProfile();
    expect(els.shareStatus.textContent).toBe("status.profileDeleted");
  });
});