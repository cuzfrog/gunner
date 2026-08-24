import type { I18n, Language } from "../i18n";
import { USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore, type StartupState } from "../../appstate";
import type { ConfirmController } from "./confirmController";
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
  tagName = "";
  private _innerHTML = "";
  children: FakeElement[] = [];
  classList = { toggle: vi.fn() };
  private attributes: Record<string, string | null> = {};

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
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    const el = new FakeElement();
    el.tagName = tagName.toUpperCase();
    return el;
  }
}

function fakeProfileEls(): ProfileEls {
  return {
    profileName: new FakeElement() as unknown as HTMLInputElement,
    profileSave: new FakeElement() as unknown as HTMLButtonElement,
    profileSelect: new FakeElement() as unknown as HTMLSelectElement,
    profileDelete: new FakeElement() as unknown as HTMLButtonElement,
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
  const events = new UiEventsImpl();
  const confirmController: ConfirmController = {
    confirm: vi.fn((key: string) => Promise.resolve(options.confirm ? options.confirm(key) : true)),
  };
  const controller = new ProfileControllerImpl({ els, settingsStore, timer, i18n, events, confirmController });
  controller.setSnapshotSource(snapshotSource);
  controller.setOnProfileLoaded(onLoaded);
  return { controller, els, settingsStore, timer, snapshotSource, onLoaded, events, confirmController };
}

describe("ProfileController", () => {
  test("markLoaded clears the name input and sets the baseline", () => {
    const { controller, els } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    els.profileName.value = "typed";
    controller.markLoaded("brawler");
    expect(els.profileName.value).toBe("");
    expect(els.profileSelect.value).toBe("brawler");
  });

  test("save uses the name input when present, otherwise the selected profile", async () => {
    const { controller, els, settingsStore } = build();
    await controller.saveProfile();
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();

    els.profileSelect.value = "brawler";
    await controller.saveProfile();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("brawler");

    els.profileName.value = "kiter";
    await controller.saveProfile();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("kiter", expect.any(Object));
    expect(els.profileName.value).toBe("");
  });

  test("save confirms overwrite when saving onto an existing different profile", async () => {
    const { controller, els, settingsStore, confirmController } = build({
      profiles: { brawler: BASE_PROFILE, kiter: { ...BASE_PROFILE, optimal: 9999 } },
      list: ["brawler", "kiter"],
    });
    vi.mocked(confirmController.confirm).mockResolvedValue(false);
    els.profileSelect.value = "brawler";
    controller.markLoaded("brawler");
    els.profileName.value = "kiter";
    await controller.saveProfile();
    expect(confirmController.confirm).toHaveBeenCalledWith("confirm.overwriteProfile");
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();

    vi.mocked(confirmController.confirm).mockResolvedValue(true);
    await controller.saveProfile();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("kiter", expect.any(Object));
  });

  test("save does not confirm when overwriting the currently loaded profile", async () => {
    const { controller, els, settingsStore, confirmController } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    els.profileSelect.value = "brawler";
    controller.markLoaded("brawler");
    snapshotSourceDiffers(controller);
    await controller.saveProfile();
    expect(confirmController.confirm).not.toHaveBeenCalled();
    expect(settingsStore.saveProfile).toHaveBeenLastCalledWith("brawler", expect.any(Object));
  });

  test("load invokes onLoaded for a selected profile and does nothing when empty", async () => {
    const { controller, els, settingsStore, onLoaded } = build({
      profiles: { brawler: BASE_PROFILE },
    });
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
    const { controller, els, settingsStore } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    els.profileSelect.value = "brawler";
    await controller.deleteProfile();
    expect(settingsStore.deleteProfile).toHaveBeenCalledWith("brawler");
    expect(els.profileSelect.value).toBe("");
  });

  test("delete confirms before removing", async () => {
    const { controller, els, settingsStore, confirmController } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
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
    const { controller, settingsStore, onLoaded } = build({
      profiles: { brawler: BASE_PROFILE },
    });

    expect(controller.restoreFromStartup({ settings: null, selectedProfileName: null })).toBe(false);
    expect(controller.restoreFromStartup({ settings: null, selectedProfileName: "missing" })).toBe(false);
    expect(settingsStore.clearSelectedProfile).toHaveBeenCalled();

    expect(controller.restoreFromStartup({ settings: null, selectedProfileName: "brawler" })).toBe(true);
    expect(settingsStore.selectProfile).toHaveBeenLastCalledWith("brawler");
    expect(onLoaded).toHaveBeenLastCalledWith("brawler");
  });

  test("selectedName and refresh reflect stored profiles", () => {
    const { controller, els } = build({
      profiles: { brawler: BASE_PROFILE, kiter: BASE_PROFILE },
      list: ["brawler", "kiter"],
    });

    els.profileSelect.value = "brawler";
    expect(controller.selectedName()).toBe("brawler");

    controller.refresh("kiter");
    const options = Array.from(els.profileSelect.children as unknown as FakeElement[]).map((c) => c.value);
    expect(options).toEqual(["", "brawler", "kiter"]);
    expect(els.profileSelect.value).toBe("kiter");

    controller.refresh("missing");
    expect(els.profileSelect.value).toBe("");
  });

  test("updateDirtyState distinguishes new, equal, changed, and existing-different profiles", () => {
    const { controller, els, snapshotSource } = build({
      profiles: { brawler: BASE_PROFILE, kiter: { ...BASE_PROFILE, optimal: 9999 } },
      list: ["brawler", "kiter"],
    });
    els.profileName.value = "new";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);
    expect(els.profileSave.disabled).toBe(false);

    els.profileName.value = "";
    controller.markLoaded();
    vi.mocked(els.profileSave.classList.toggle).mockClear();
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
    expect(els.profileSave.disabled).toBe(true);

    els.profileName.value = "brawler";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
    expect(els.profileSave.disabled).toBe(false);

    els.profileName.value = "kiter";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);
    expect(els.profileSave.disabled).toBe(false);

    els.profileName.value = "";
    snapshotSource.mockReturnValue({ ...BASE_PROFILE, optimal: 9999 });
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);
    expect(els.profileSave.disabled).toBe(true);
  });

  test("updateDirtyState enables save for typed names even when matching the current state", () => {
    const { controller, els } = build({
      profiles: { kiter: BASE_PROFILE, brawler: BASE_PROFILE },
      list: ["kiter", "brawler"],
    });
    els.profileSelect.value = "kiter";
    controller.markLoaded("kiter");
    els.profileName.value = "brawler";
    controller.updateDirtyState();
    expect(els.profileSave.disabled).toBe(false);
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
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
    const { controller, els, settingsStore } = build({
      profiles: { brawler: BASE_PROFILE, kiter: BASE_PROFILE },
      list: ["brawler", "kiter"],
    });

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
