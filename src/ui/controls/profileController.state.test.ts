import type { I18n, Language } from "../i18n";
import { USER_SETTINGS_VERSION, type ProfileSettings, type SettingsStore } from "../settings";
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
  get innerHTML(): string { return this._innerHTML; }
  set innerHTML(value: string) { this._innerHTML = value; this.children = []; }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  appendChild(child: unknown): void { this.children.push(child as FakeElement); }
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
    setTimeout: vi.fn((callback: () => void) => { nextId += 1; timeouts.set(nextId, callback); return nextId; }),
    clearTimeout: vi.fn((id: number) => { timeouts.delete(id); }),
    setInterval: vi.fn(),
    clearInterval: vi.fn(),
    fireLast() { const last = Array.from(timeouts.entries()).pop(); if (last) { timeouts.delete(last[0]); last[1](); } },
  };
}

function build(options: { profiles?: Record<string, ProfileSettings>; list?: string[] } = {}) {
  globalThis.document = new FakeDocument() as unknown as Document;
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

describe("ProfileController state and status", () => {
  test("updateDirtyState distinguishes new, equal, changed, and existing-different profiles", () => {
    const { controller, els, captureCurrent } = build({
      profiles: { brawler: BASE_PROFILE, kiter: { ...BASE_PROFILE, optimal: 9999 } },
      list: ["brawler", "kiter"],
    });
    els.profileName.value = "new";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);
    els.profileName.value = "";
    controller.markLoaded("brawler");
    vi.mocked(els.profileSave.classList.toggle).mockClear();
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
    els.profileName.value = "brawler";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
    els.profileName.value = "kiter";
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);
    els.profileName.value = "";
    captureCurrent.mockReturnValue({ ...BASE_PROFILE, optimal: 9999 });
    controller.updateDirtyState();
    expect(els.profileSave.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);
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
});
