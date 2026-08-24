import type { I18n, Language } from "../i18n";
import { USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore, type StartupState } from "../../appstate";
import type { ConfirmController } from "./confirmController";
import type { Popup, PopupGroup } from "./popup";
import type { Timer } from "../timer";
import { UiEventsImpl } from "../events";
import { ProfileControllerImpl, type ProfileController, type ProfileEls } from "./profileController";

const BASE_PROFILE: ProfileSettings = {
  version: USER_SETTINGS_VERSION,
  tracking: 0.32,
  sigRes: "S",
  optimal: 5000,
  falloff: 5000,
  attackerSpeed: 0,
  attackerMode: "keepAtRange",
  attackerRange: 5000,
  attackerMass: 1_200_000,
  attackerInertia: 3,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSig: 40,
  attackerAmmo: "Hail S",
};

class FakeElement {
  value = "";
  textContent = "";
  disabled = false;
  hidden = false;
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

  appendChild(child: unknown): void {
    this.children.push(child as FakeElement);
  }

  contains(target: unknown): boolean {
    return target === this || this.children.includes(target as FakeElement);
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
  onPointerDown = vi.fn((target: EventTarget | null) => {
    if (!target) return;
    for (const p of this.popups) if (p.isOpen() && !p.contains(target)) p.close();
  });
  onKeyDown = vi.fn((event: { readonly key: string }) => {
    if (event.key !== "Escape") return;
    for (const p of this.popups) if (p.isOpen()) { p.close(); p.focusTrigger(); }
  });
}

function fakeProfileEls(): ProfileEls {
  const newProfilePopup = new FakeElement() as unknown as HTMLElement;
  const newProfileName = new FakeElement() as unknown as HTMLInputElement;
  const newProfileConfirm = new FakeElement() as unknown as HTMLButtonElement;
  const newProfileCancel = new FakeElement() as unknown as HTMLButtonElement;
  newProfilePopup.appendChild(newProfileName);
  newProfilePopup.appendChild(newProfileConfirm);
  newProfilePopup.appendChild(newProfileCancel);
  return {
    profileSave: new FakeElement() as unknown as HTMLButtonElement,
    profileSelect: new FakeElement() as unknown as HTMLSelectElement,
    profileDelete: new FakeElement() as unknown as HTMLButtonElement,
    profileNew: new FakeElement() as unknown as HTMLButtonElement,
    newProfilePopup,
    newProfileName,
    newProfileConfirm,
    newProfileCancel,
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
  const settingsStore: SettingsStore = {
    loadStartupState: vi.fn(),
    listProfiles: vi.fn(() => options.list ?? Object.keys(options.profiles ?? {})),
    saveProfile: vi.fn(),
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
  const confirmController: ConfirmController = {
    confirm: vi.fn((key: string) => Promise.resolve(options.confirm ? options.confirm(key) : true)),
  };
  const popupGroup = new StubPopupGroup();
  const controller = new ProfileControllerImpl({ els, settingsStore, timer, i18n, events, confirmController, popupGroup });
  controller.setSnapshotSource(snapshotSource);
  controller.setOnProfileLoaded(onLoaded);
  controller.setOnNewProfile(onNewProfile);
  return { controller, els, settingsStore, timer, snapshotSource, onLoaded, onNewProfile, events, confirmController, popupGroup };
}

describe("ProfileController", () => {
  test("markLoaded clears the new-profile name popup and sets the baseline", () => {
    const { controller, els } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    els.newProfileName.value = "typed";
    controller.markLoaded("brawler");
    expect(els.newProfileName.value).toBe("");
    expect(els.profileSelect.value).toBe("brawler");
  });

  test("save writes to the selected profile only", async () => {
    const { controller, els, settingsStore } = build();
    await controller.saveProfile();
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();

    els.profileSelect.value = "brawler";
    await controller.saveProfile();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("brawler");
  });

  test("save never asks to overwrite", async () => {
    const { controller, els, settingsStore, confirmController } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    els.profileSelect.value = "brawler";
    await controller.saveProfile();
    expect(confirmController.confirm).not.toHaveBeenCalled();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
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

  test("confirm with an empty name clears ship state and saves nothing", async () => {
    const { controller, els, settingsStore, onNewProfile } = build();
    controller.toggleNewProfilePopup();
    els.newProfileName.value = "   ";
    (els.newProfileConfirm as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(onNewProfile).toHaveBeenCalledTimes(1);
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();
    expect(els.newProfilePopup.hidden).toBe(true);
  });

  test("confirm with a name clears ship state and saves the cleared snapshot under the name", async () => {
    const { controller, els, settingsStore, onNewProfile } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    controller.toggleNewProfilePopup();
    els.newProfileName.value = "brawler";
    (els.newProfileConfirm as unknown as FakeElement).trigger("click");
    await Promise.resolve();
    expect(onNewProfile).toHaveBeenCalledTimes(1);
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("brawler");
    expect(els.profileSelect.value).toBe("brawler");
    expect(els.shareStatus.textContent).toBe("status.profileSaved");
  });

  test("cancel closes the popup without action", async () => {
    const { controller, els, settingsStore, onNewProfile } = build();
    controller.toggleNewProfilePopup();
    els.newProfileName.value = "brawler";
    (els.newProfileCancel as unknown as FakeElement).trigger("click");
    expect(els.newProfilePopup.hidden).toBe(true);
    expect(onNewProfile).not.toHaveBeenCalled();
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();
  });

  test("outside pointer-down and Escape close the popup without action", () => {
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

  test("popup contains the new button and popup contents but not unrelated targets", () => {
    const { controller, els, popupGroup } = build();
    controller.toggleNewProfilePopup();
    popupGroup.onPointerDown(els.newProfileName as unknown as EventTarget);
    expect(els.newProfilePopup.hidden).toBe(false);
    popupGroup.onPointerDown(els.profileNew as unknown as EventTarget);
    expect(els.newProfilePopup.hidden).toBe(false);
    popupGroup.onPointerDown(els.shareStatus as unknown as EventTarget);
    expect(els.newProfilePopup.hidden).toBe(true);
  });

  test("load invokes onLoaded for a selected profile and does nothing when empty", async () => {
    const { controller, els, settingsStore, onLoaded } = build({ profiles: { brawler: BASE_PROFILE } });
    await controller.loadProfile();
    expect(settingsStore.selectProfile).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();

    els.profileSelect.value = "brawler";
    await controller.loadProfile();
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("brawler");
    expect(onLoaded).toHaveBeenLastCalledWith("brawler");
  });

  test("load confirms discarding unsaved changes", async () => {
    const { controller, els, settingsStore, onLoaded, confirmController } = build({
      profiles: { brawler: BASE_PROFILE, kiter: { ...BASE_PROFILE, optimal: 9999 } },
      list: ["brawler", "kiter"],
    });
    els.profileSelect.value = "brawler";
    await controller.loadProfile();
    controller.markLoaded("brawler");
    expect(confirmController.confirm).not.toHaveBeenCalled();

    snapshotSourceDiffers(controller);
    els.profileSelect.value = "kiter";
    vi.mocked(confirmController.confirm).mockResolvedValue(false);
    await controller.loadProfile();
    expect(confirmController.confirm).toHaveBeenLastCalledWith("confirm.discardChanges");
    expect(settingsStore.selectProfile).not.toHaveBeenLastCalledWith("kiter");
    expect(onLoaded).not.toHaveBeenLastCalledWith("kiter");
    expect(els.profileSelect.value).toBe("brawler");

    els.profileSelect.value = "kiter";
    vi.mocked(confirmController.confirm).mockResolvedValue(true);
    await controller.loadProfile();
    expect(onLoaded).toHaveBeenLastCalledWith("kiter");
  });

  test("delete removes the selected profile and clears the selection", async () => {
    const { controller, els, settingsStore } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    els.profileSelect.value = "brawler";
    await controller.deleteProfile();
    expect(settingsStore.deleteProfile).toHaveBeenCalledWith("brawler");
    expect(els.profileSelect.value).toBe("");
  });

  test("delete confirms before removing", async () => {
    const { controller, els, settingsStore, confirmController } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });
    els.profileSelect.value = "brawler";
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

  test("selectedName and refresh reflect stored profiles", () => {
    const { controller, els } = build({ profiles: { brawler: BASE_PROFILE, kiter: BASE_PROFILE }, list: ["brawler", "kiter"] });

    els.profileSelect.value = "brawler";
    expect(controller.selectedName()).toBe("brawler");

    controller.refresh("kiter");
    const options = Array.from(els.profileSelect.children as unknown as FakeElement[]).map((c) => c.value);
    expect(options).toEqual(["", "brawler", "kiter"]);
    expect(els.profileSelect.value).toBe("kiter");

    controller.refresh("missing");
    expect(els.profileSelect.value).toBe("");
  });

  test("updateDirtyState enables save only for a selected profile that differs from baseline", () => {
    const { controller, els, snapshotSource } = build({ profiles: { brawler: BASE_PROFILE }, list: ["brawler"] });

    controller.updateDirtyState();
    expect(els.profileSave.disabled).toBe(true);
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);

    els.profileSelect.value = "brawler";
    controller.markLoaded("brawler");
    vi.mocked(els.profileSave.classList.toggle).mockClear();
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
    expect(els.profileSave.disabled).toBe(true);

    snapshotSource.mockReturnValue({ ...BASE_PROFILE, optimal: 9999 });
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);
    expect(els.profileSave.disabled).toBe(false);

    els.profileSelect.value = "";
    controller.updateDirtyState();
    expect(els.profileSave.disabled).toBe(true);
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

    els.profileSelect.value = "brawler";
    await controller.loadProfile();
    expect(els.shareStatus.textContent).toBe("status.profileLoaded");

    els.profileSelect.value = "brawler";
    await controller.saveProfile();
    expect(els.shareStatus.textContent).toBe("status.profileSaved");

    els.profileSelect.value = "kiter";
    await controller.deleteProfile();
    expect(els.shareStatus.textContent).toBe("status.profileDeleted");
  });
});

function snapshotSourceDiffers(controller: ProfileControllerImpl): void {
  controller.setSnapshotSource(() => ({ ...BASE_PROFILE, optimal: 9999 }));
  controller.updateDirtyState();
}