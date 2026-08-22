import type { I18n, Language } from "../i18n";
import { USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore, type StartupState } from "../settings";
import type { Timer } from "../timer";
import { ProfileController, type ProfileEls } from "./profileController";

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

function build(options: { profiles?: Record<string, ProfileSettings>; list?: string[] } = {}) {
  const els = fakeProfileEls();
  const i18n: I18n = { current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key) => key), translateDocument: vi.fn() };
  const settingsStore: SettingsStore = {
    loadStartupState: vi.fn(),
    listProfiles: vi.fn(() => options.list ?? Object.keys(options.profiles ?? {})),
    saveProfile: vi.fn(),
    loadProfile: vi.fn((name) => options.profiles?.[name] ?? null),
    deleteProfile: vi.fn(),
    selectProfile: vi.fn(),
    encodeUrl: vi.fn(),
    loadPreferences: vi.fn(),
    savePreferences: vi.fn(),
  };
  const timer = createNoOpTimer();
  const captureCurrent = vi.fn(() => ({ ...BASE_PROFILE }));
  const onLoaded = vi.fn();
  const controller = new ProfileController({ els, settingsStore, timer, i18n, captureCurrent, onLoaded });
  return { controller, els, settingsStore, timer, captureCurrent, onLoaded };
}

describe("ProfileController", () => {
  beforeEach(() => {
    globalThis.document = new FakeDocument() as unknown as Document;
  });

  afterEach(() => {
    globalThis.document = undefined as unknown as Document;
  });

  test("save stores a new profile from the name input and selects it", () => {
    const { controller, els, settingsStore } = build();
    els.profileName.value = "brawler";
    controller.saveProfile();
    expect(settingsStore.saveProfile).toHaveBeenCalledWith("brawler", expect.objectContaining({ tracking: 0.32 }));
    expect(settingsStore.selectProfile).toHaveBeenCalledWith("brawler");
    expect(els.profileName.value).toBe("");
    expect(els.profileSelect.value).toBe("brawler");
  });

  test("save uses the selected profile name when the name input is empty", () => {
    const { controller, els, settingsStore } = build();
    els.profileSelect.value = "brawler";
    controller.saveProfile();
    expect(settingsStore.saveProfile).toHaveBeenCalledWith("brawler", expect.any(Object));
    expect(settingsStore.selectProfile).toHaveBeenCalledWith("brawler");
  });

  test("save does nothing when there is no name and no selection", () => {
    const { controller, settingsStore } = build();
    controller.saveProfile();
    expect(settingsStore.saveProfile).not.toHaveBeenCalled();
    expect(settingsStore.selectProfile).not.toHaveBeenCalled();
  });

  test("load invokes onLoaded for the selected profile", () => {
    const { controller, els, settingsStore, onLoaded } = build({
      profiles: { brawler: BASE_PROFILE },
    });
    els.profileSelect.value = "brawler";
    controller.loadProfile();
    expect(settingsStore.selectProfile).toHaveBeenCalledWith("brawler");
    expect(onLoaded).toHaveBeenCalledWith("brawler");
  });

  test("load does nothing when the selected option is empty", () => {
    const { controller, settingsStore, onLoaded } = build({
      profiles: { brawler: BASE_PROFILE },
    });
    controller.loadProfile();
    expect(settingsStore.selectProfile).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();
  });

  test("delete removes the selected profile and clears the selection", () => {
    const { controller, els, settingsStore } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    els.profileSelect.value = "brawler";
    controller.deleteProfile();
    expect(settingsStore.deleteProfile).toHaveBeenCalledWith("brawler");
    expect(els.profileSelect.value).toBe("");
  });

  test("updateDirtyState highlights when a new profile name is typed", () => {
    const { controller, els } = build();
    els.profileName.value = "new";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenCalledWith("unsaved", true);
  });

  test("updateDirtyState does not highlight for a freshly loaded profile", () => {
    const { controller, els } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    controller.markLoaded("brawler");
    vi.mocked(els.profileSave.classList.toggle).mockClear();
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenCalledWith("unsaved", false);
  });

  test("updateDirtyState highlights when the current profile changes", () => {
    const { controller, els, captureCurrent } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    controller.markLoaded("brawler");
    captureCurrent.mockReturnValue({ ...BASE_PROFILE, optimal: 9999 });
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenCalledWith("unsaved", true);
  });

  test("updateDirtyState highlights when typing an existing different profile name", () => {
    const { controller, els } = build({
      profiles: {
        brawler: BASE_PROFILE,
        kiter: { ...BASE_PROFILE, optimal: 9999 },
      },
      list: ["brawler", "kiter"],
    });
    controller.markLoaded("brawler");
    els.profileName.value = "kiter";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenCalledWith("unsaved", true);
  });

  test("updateDirtyState does not highlight when typing the name of the selected profile", () => {
    const { controller, els } = build({
      profiles: { brawler: BASE_PROFILE },
      list: ["brawler"],
    });
    controller.markLoaded("brawler");
    els.profileName.value = "brawler";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenCalledWith("unsaved", false);
  });

  test("showStatus displays translated text and clears after the timeout", () => {
    const { controller, els, timer } = build();
    controller.showStatus("status.copied");
    expect(els.shareStatus.textContent).toBe("status.copied");
    timer.fireLast();
    expect(els.shareStatus.textContent).toBe("");
  });

  test("showStatus clears the previous timeout before scheduling a new one", () => {
    const { controller, timer } = build();
    controller.showStatus("status.copied");
    controller.showStatus("status.failed");
    expect(timer.clearTimeout).toHaveBeenCalled();
  });

  test("restoreFromStartup loads the selected profile and invokes onLoaded", () => {
    const { controller, settingsStore, onLoaded } = build({
      profiles: { brawler: BASE_PROFILE },
    });
    const startup: StartupState = { settings: null, selectedProfileName: "brawler" };
    expect(controller.restoreFromStartup(startup)).toBe(true);
    expect(settingsStore.selectProfile).toHaveBeenCalledWith("brawler");
    expect(onLoaded).toHaveBeenCalledWith("brawler");
  });

  test("restoreFromStartup returns false when no profile is selected", () => {
    const { controller, onLoaded } = build();
    const startup: StartupState = { settings: null, selectedProfileName: null };
    expect(controller.restoreFromStartup(startup)).toBe(false);
    expect(onLoaded).not.toHaveBeenCalled();
  });

  test("restoreFromStartup returns false when the selected profile is missing", () => {
    const { controller, onLoaded } = build();
    const startup: StartupState = { settings: null, selectedProfileName: "missing" };
    expect(controller.restoreFromStartup(startup)).toBe(false);
    expect(onLoaded).not.toHaveBeenCalled();
  });

  test("selectedName returns the current select value", () => {
    const { controller, els } = build();
    els.profileSelect.value = "brawler";
    expect(controller.selectedName()).toBe("brawler");
  });

  test("refresh populates the select with stored profile names", () => {
    const { controller, els } = build({
      profiles: { brawler: BASE_PROFILE, kiter: BASE_PROFILE },
      list: ["brawler", "kiter"],
    });
    controller.refresh("kiter");
    const options = Array.from(els.profileSelect.children as unknown as FakeElement[]).map((c) => c.value);
    expect(options).toEqual(["", "brawler", "kiter"]);
    expect(els.profileSelect.value).toBe("kiter");
  });
});
