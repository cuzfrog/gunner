import type { UserSettings, SavedFittings, SavedFitting } from "../../appstate";
import type { FittingImport } from "../../fitting";
import type { EwarLoadout } from "../../sim";
import type { Ships } from "../../ships";
import { USER_SETTINGS_VERSION } from "../../appstate";
import {
  buildDomControls,
  getFake,
  mockFittingImport,
  mockSavedFittings,
  mockShips,
  RIFTER,
  IMPORTED_RIFTER,
  FakeElement,
} from "./testSupport";

const SAVED_RIFTER: SavedFitting = {
  id: "Rifter::Brawler",
  hull: "Rifter",
  name: "Brawler",
  text: "[Rifter, Brawler]\n200mm AutoCannon I, Hail S",
  savedAt: 0,
};

function mockCallbacks() {
  return {
    onPlayPause: vi.fn(),
    onReset: vi.fn(),
    onConfigChange: vi.fn(),
    onDisplayChange: vi.fn(),
    onSpeedChange: vi.fn(),
  };
}

function baseSettings(): UserSettings {
  return {
    version: USER_SETTINGS_VERSION,
    tracking: 0.32,
    trackingUnit: "rad",
    sigRes: "S",
    optimal: 1000,
    falloff: 3000,
    attackerSpeed: 400,
    attackerMode: "orbit",
    attackerRange: 5000,
    maneuverAggressivity: 1,
    gridBrightness: 0.5,
    attackerMass: 1_000_000,
    attackerInertia: 3,
    attackerSkillLevel: 5,
    attackerOverload: true,
    initialDistance: 6000,
    targetSpeed: 250,
    targetMode: "orbit",
    targetRange: 6000,
    targetMass: 1_000_000,
    targetInertia: 3,
    targetSig: 40,
    targetSkillLevel: 5,
    targetOverload: true,
    attackerHull: undefined,
    attackerPropulsion: undefined,
    targetHull: undefined,
    targetPropulsion: undefined,
    attackerFitting: undefined,
    attackerOverrides: {},
    targetFitting: undefined,
    targetOverrides: {},
    attackerFittedHull: undefined,
    targetFittedHull: undefined,
    attackerAmmo: "Hail S",
    simSpeed: 2,
    language: "en",
  };
}

describe("DomControls", () => {
  test("facade reads turret, target sig, speed, grid brightness and config", () => {
    const { document, controls } = buildDomControls();
    const turret = controls.getTurret();
    expect(turret.optimal).toBe(1000);
    expect(turret.falloff).toBe(3000);
    expect(controls.getTargetSig()).toBe(36);
    expect(controls.getSpeed()).toBe(4);
    expect(controls.getGridBrightness()).toBe(0.2);
    const config = controls.getConfig();
    expect(config.attacker.maxSpeed).toBe(300);
    expect(config.target.maxSpeed).toBe(300);
    expect(config.initialDistance).toBe(5000);
    controls.setPlaying(true);
    expect(getFake(document, "play").textContent).toBe("button.pause");
  });

  test("callback routing", () => {
    const { document, controls } = buildDomControls();
    const callbacks = mockCallbacks();
    controls.setCallbacks(callbacks);
    getFake(document, "play").trigger("click");
    expect(callbacks.onPlayPause).toHaveBeenCalled();
    getFake(document, "reset").trigger("click");
    expect(callbacks.onReset).toHaveBeenCalled();
    getFake(document, "sim-speed").value = "2";
    getFake(document, "sim-speed").trigger("change");
    expect(callbacks.onSpeedChange).toHaveBeenCalledWith(2);
    getFake(document, "attacker-speed").value = "400";
    getFake(document, "attacker-speed").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalled();
    getFake(document, "tracking").value = "0.5";
    getFake(document, "tracking").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalled();
  });

  test("global pointerdown and Escape handling", () => {
    const { document } = buildDomControls();
    const fake = getFake(document, "target-hull");
    const pointer = { type: "pointerdown", target: fake as unknown as HTMLElement } as unknown as PointerEvent;
    (document as unknown as { dispatchEvent(event: Event): void }).dispatchEvent(pointer as unknown as Event);
    const escape = { type: "keydown", key: "Escape" } as unknown as KeyboardEvent;
    (document as unknown as { dispatchEvent(event: Event): void }).dispatchEvent(escape as unknown as Event);
    expect(document).toBeDefined();
  });

  test("restoreStartup round-trips stored settings through SessionCodec", () => {
    const settings = baseSettings();
    const loadStartupState = vi.fn(() => ({ settings, selectedProfileName: "brawler" }));
    const { controls } = buildDomControls({ settingsStore: { loadStartupState } });
    const config = controls.getConfig();
    expect(config.attacker.maxSpeed).toBe(400);
    expect(config.target.maxSpeed).toBe(250);
    expect(config.initialDistance).toBe(6000);
    expect(controls.getGridBrightness()).toBe(0.5);
  });

  test("profile save, load and share-text round-trip", async () => {
    const saveProfile = vi.fn();
    const loadProfile = vi.fn(() => null);
    const { document, controls, clipboard } = buildDomControls({ settingsStore: { saveProfile, loadProfile, listProfiles: vi.fn(() => ["brawler"]) } });
    const callbacks = mockCallbacks();
    controls.setCallbacks(callbacks);
    getFake(document, "profile-new").trigger("click");
    getFake(document, "new-profile-name").value = "kappa";
    getFake(document, "new-profile-confirm").trigger("click");
    await Promise.resolve();
    expect(saveProfile).toHaveBeenCalledWith("kappa", expect.any(Object));
    const saved = saveProfile.mock.calls[0][1];
    loadProfile.mockReturnValue(saved);
    getFake(document, "profile-select-trigger").trigger("click");
    await Promise.resolve();
    getFake(document, "profile-popup").children[0].trigger("click");
    await Promise.resolve();
    expect(loadProfile).toHaveBeenCalledWith("brawler");
    expect(callbacks.onReset).toHaveBeenCalled();
    getFake(document, "share-link").trigger("click");
    getFake(document, "share-copy-text").trigger("click");
    await Promise.resolve();
    await Promise.resolve();
    expect(clipboard.writeText).toHaveBeenCalled();
  });

  test("getConfig includes per-side ewar projections without the old global overload flag", () => {
    const { controls, cradle } = buildDomControls();
    const attackerEwar: EwarLoadout = {
      webs: [{ moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 15 }],
      disruptors: [],
      scripts: [],
    };
    cradle.cradle.ewarController.setLoadout("attacker", attackerEwar);
    const config = controls.getConfig();
    expect(config.attacker.ewar?.loadout.webs).toHaveLength(1);
    expect(config.attacker.ewar).not.toHaveProperty("overloaded");
    expect(config.target.ewar).toBeUndefined();
  });

  test("getConfig includes ewar projection for the target side", () => {
    const { controls, cradle } = buildDomControls();
    const targetEwar: EwarLoadout = {
      webs: [],
      disruptors: [{
        moduleName: "Tracking Disruptor I", optimal: 1, falloff: 1, disruption: 0.2,
        defaultScript: undefined, overloadStrengthBonusPercent: 0,
      }],
      scripts: [],
    };
    cradle.cradle.ewarController.setLoadout("target", targetEwar);
    const config = controls.getConfig();
    expect(config.target.ewar?.loadout.disruptors).toHaveLength(1);
    expect(config.target.ewar).not.toHaveProperty("overloaded");
  });

  test("target fitting popup applies fitting to the target side", () => {
    const savedFittings = vi.mocked<SavedFittings>({ ...mockSavedFittings(), listForHull: vi.fn(() => [SAVED_RIFTER]) });
    const fittingImport = vi.mocked<FittingImport>({ ...mockFittingImport(), importFitting: vi.fn(() => IMPORTED_RIFTER) });
    const ships = vi.mocked<Ships>({ ...mockShips(), findHull: vi.fn(() => RIFTER) });
    const { document, controls } = buildDomControls({ savedFittings, fittingImport, ships });
    controls["attackerSide"].profile = RIFTER;
    controls["targetSide"].profile = RIFTER;
    getFake(document, "target-fitting-trigger").trigger("click");
    const item = getFake(document, "target-fitting-saved-list").children[0].children[0] as unknown as FakeElement;
    item.trigger("click");
    expect(controls["targetSide"].fittingText).toBe(SAVED_RIFTER.text);
    expect(controls["attackerSide"].fittingText).toBeUndefined();
  });
});
