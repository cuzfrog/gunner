import {
  effectiveStats,
  fittedMassFactor,
  fittingOptions,
  isPropulsionId,
  SHIP_PROFILES,
  type PropulsionId,
  type PropulsionModule,
  type ShipProfile,
  type SkillLevel,
} from "../ships";
import {
  SIG_RESOLUTIONS,
  type EngagementFrame,
  type HitChance,
  type HitChanceBreakdown,
  type ShipConfig,
  type SigResolutionClass,
  type SimConfig,
  type TurretSpec,
} from "../sim";
import type { I18n, Language } from "./i18n";
import { USER_SETTINGS_VERSION, type ClipboardProvider, type LocationProvider, type SettingsStore, type UserSettings } from "./settings";
import { TrackingInput } from "./trackingInput";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onDisplayChange: () => void;
  readonly onPlayPause: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface Controls {
  getTurret(): TurretSpec;
  getTargetSig(): number;
  getConfig(): SimConfig;
  getSpeed(): number;
  getGridBrightness(): number;
  update(frame: EngagementFrame, hit: HitChanceBreakdown): void;
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}

export class DomControls implements Controls {
  private readonly els: Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLElement>;
  private readonly hitChance: HitChance;
  private readonly i18n: I18n;
  private readonly settingsStore: SettingsStore;
  private readonly clipboard: ClipboardProvider;
  private readonly location: LocationProvider;
  private readonly trackingInput: TrackingInput;
  private callbacks?: ControlsCallbacks;
  private playing = false;
  private shareStatusTimeout?: ReturnType<typeof setTimeout>;
  private attackerProfile?: ShipProfile;
  private targetProfile?: ShipProfile;
  private selectedProfile: UserSettings | null = null;

  constructor({
    hitChance,
    i18n,
    settingsStore,
    clipboard,
    location,
  }: {
    hitChance: HitChance;
    i18n: I18n;
    settingsStore: SettingsStore;
    clipboard: ClipboardProvider;
    location: LocationProvider;
  }) {
    this.hitChance = hitChance;
    this.i18n = i18n;
    this.settingsStore = settingsStore;
    this.clipboard = clipboard;
    this.location = location;
    this.trackingInput = new TrackingInput();
    this.els = {
      tracking: el("tracking"),
      trackingUnitRad: el("tracking-unit-rad"),
      trackingUnitScore: el("tracking-unit-score"),
      sigRes: el("sigRes"),
      sigResOptions: el("sig-res-options"),
      optimal: el("optimal"),
      falloff: el("falloff"),
      hullOptions: el("hull-options"),
      attackerHull: el("attacker-hull"),
      attackerHullHint: el("attacker-hull-hint"),
      attackerPropulsion: el("attacker-propulsion"),
      attackerPropulsionOptions: el("attacker-propulsion-options"),
      attackerSkills: el("attacker-skills"),
      attackerSkillOptions: el("attacker-skill-options"),
      attackerSkillSummary: el("attacker-skill-summary"),
      attackerOverload: el("attacker-overload"),
      attackerOverloadButton: el("attacker-overload-button"),
      attackerSpeed: el("attacker-speed"),
      attackerMass: el("attacker-mass"),
      attackerInertia: el("attacker-inertia"),
      attackerMode: el("attacker-mode"),
      attackerModeOptions: el("attacker-mode-options"),
      attackerRange: el("attacker-range"),
      maneuverAggressivity: el("maneuver-aggressivity"),
      maneuverAggressivitySlider: el("maneuver-aggressivity-slider"),
      maneuverAggressivityValue: el("maneuver-aggressivity-value"),
      initialDistance: el("initial-distance"),
      targetHull: el("target-hull"),
      targetHullHint: el("target-hull-hint"),
      targetPropulsion: el("target-propulsion"),
      targetPropulsionOptions: el("target-propulsion-options"),
      targetSkills: el("target-skills"),
      targetSkillOptions: el("target-skill-options"),
      targetSkillSummary: el("target-skill-summary"),
      targetOverload: el("target-overload"),
      targetOverloadButton: el("target-overload-button"),
      targetSpeed: el("target-speed"),
      targetMass: el("target-mass"),
      targetInertia: el("target-inertia"),
      targetMode: el("target-mode"),
      targetModeOptions: el("target-mode-options"),
      targetRange: el("target-range"),
      targetSig: el("target-sig"),
      simSpeed: el("sim-speed"),
      profileName: el("profile-name"),
      profileSave: el("profile-save"),
      profileSelect: el("profile-select"),
      profileDelete: el("profile-delete"),
      shareLink: el("share-link"),
      shareStatus: el("share-status"),
      langEn: el("lang-en"),
      langZh: el("lang-zh"),
      langJa: el("lang-ja"),
      play: el("play"),
      reset: el("reset"),
      resDistance: el("res-distance"),
      resTransversal: el("res-transversal"),
      resAngular: el("res-angular"),
      resRadial: el("res-radial"),
      resTrackPen: el("res-track-pen"),
      resRangePen: el("res-range-pen"),
      resHit: el("res-hit"),
      gridBrightnessSlider: el("grid-brightness-slider"),
      gridBrightnessValue: el("grid-brightness-value"),
    };

    this.populateHullDatalist();
    this.renderSkillOptions("attacker");
    this.renderSkillOptions("target");

    this.restoreSavedState();
    this.bind();
  }

  private restoreSavedState(): void {
    const fromUrl = this.settingsStore.hasForeignUrlSettings();
    if (fromUrl) {
      this.settingsStore.clearSelectedProfile();
    }
    const saved = this.settingsStore.load();
    if (saved) {
      const selected = fromUrl ? null : this.settingsStore.loadSelectedProfile();
      const selectedName = selected && this.settingsStore.listProfiles().includes(selected.name) ? selected.name : "";
      this.loadSettings(saved, selectedName);
      if (selectedName && selected) {
        this.selectedProfile = selected.baseline;
      }
      this.updateSaveButtonState();
    } else {
      this.i18n.translateDocument();
      this.setDefaultSkillAndOverload();
      this.setOverloadDisabled("attacker");
      this.setOverloadDisabled("target");
      this.updateUnitToggle();
      this.updateLanguageToggle();
      this.setBestInitialDistance();
      this.updateManeuverAggressivityDisplay();
      this.updateGridBrightnessDisplay(DEFAULT_GRID_BRIGHTNESS);
      this.setPlaying(false);
    }
  }

  getTurret(): TurretSpec {
    return {
      tracking: this.trackingInput.rad,
      sigResolution: SIG_RESOLUTIONS[(this.els.sigRes as HTMLSelectElement).value as SigResolutionClass],
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
    };
  }

  getTargetSig(): number {
    return num(this.els.targetSig);
  }

  getConfig(): SimConfig {
    const initialDistance = Math.max(num(this.els.initialDistance), 1);
    const aggressivity = parseManeuverAggressivity(this.els.maneuverAggressivity as HTMLInputElement);
    const attacker: ShipConfig = {
      id: "attacker",
      maxSpeed: num(this.els.attackerSpeed),
      mass: num(this.els.attackerMass),
      inertiaModifier: num(this.els.attackerInertia),
      mode: (this.els.attackerMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.attackerRange),
      rangeWeight: REFERENCE_RANGE_WEIGHT / aggressivity,
      orbitDirection: "cw",
    };
    const target: ShipConfig = {
      id: "target",
      maxSpeed: num(this.els.targetSpeed),
      mass: num(this.els.targetMass),
      inertiaModifier: num(this.els.targetInertia),
      mode: (this.els.targetMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.targetRange),
      rangeWeight: REFERENCE_RANGE_WEIGHT,
      orbitDirection: "cw",
    };
    return { attacker, target, initialDistance };
  }

  getSpeed(): number {
    return num(this.els.simSpeed);
  }

  getGridBrightness(): number {
    const value = Number.parseFloat((this.els.gridBrightnessSlider as HTMLInputElement).value);
    if (!Number.isFinite(value)) return DEFAULT_GRID_BRIGHTNESS;
    return Math.max(0, Math.min(1, value));
  }

  update(frame: EngagementFrame, hit: HitChanceBreakdown): void {
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;

    setText(this.els.resDistance, this.formatDistance(frame.distance));
    setText(this.els.resTransversal, `${formatWithCommas(frame.transversalSpeed, 1)} m/s`);
    setText(this.els.resAngular, `${formatWithCommas(frame.angularVelocity, 4)} rad/s`);
    setText(this.els.resRadial, `${formatWithCommas(frame.radialVelocity, 1)} m/s`);
    setText(this.els.resTrackPen, `${formatWithCommas(trackPenalty, 1)}%`);
    setText(this.els.resRangePen, `${formatWithCommas(rangePenalty, 1)}%`);
    setText(this.els.resHit, `${formatWithCommas(hit.chance * 100, 1)}%`);

    (this.els.resHit as HTMLElement).style.color = hitChanceColor(hit.chance);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    (this.els.play as HTMLButtonElement).textContent = this.i18n.t(
      playing ? "button.pause" : "button.play",
    );
  }

  private onManeuverAggressivityChange(): void {
    const slider = this.els.maneuverAggressivitySlider as HTMLInputElement;
    const pos = Number.parseFloat(slider.value);
    const value = Math.round(aggressivityFromPosition(pos) * 100) / 100;
    this.updateManeuverAggressivityDisplay(value);
    this.updateSaveButtonState();
    this.persist();
    this.callbacks?.onConfigChange();
  }

  private updateManeuverAggressivityDisplay(value?: number): void {
    const input = this.els.maneuverAggressivity as HTMLInputElement;
    const slider = this.els.maneuverAggressivitySlider as HTMLInputElement;
    const output = this.els.maneuverAggressivityValue;
    const current = value ?? parseManeuverAggressivity(input);
    input.value = String(current);
    setText(output, current.toFixed(2));
    const pos = positionFromAggressivity(current);
    slider.value = String(pos);
    if ("setProperty" in slider.style) {
      slider.style.setProperty("--fill", `${pos * 100}%`);
    }
  }

  private onGridBrightnessChange(): void {
    this.updateGridBrightnessDisplay();
    this.updateSaveButtonState();
    this.persist();
    this.callbacks?.onDisplayChange();
  }

  private updateGridBrightnessDisplay(value?: number): void {
    const slider = this.els.gridBrightnessSlider as HTMLInputElement;
    const output = this.els.gridBrightnessValue;
    const current = value ?? this.getGridBrightness();
    slider.value = String(current);
    setText(output, `${Math.round(current * 100)}%`);
    if ("setProperty" in slider.style) {
      slider.style.setProperty("--fill", `${current * 100}%`);
    }
  }

  setCallbacks(callbacks: ControlsCallbacks): void {
    this.callbacks = callbacks;
  }

  private getSettings(): UserSettings {
    return {
      version: USER_SETTINGS_VERSION,
      tracking: this.trackingInput.rad,
      trackingUnit: this.trackingInput.unit,
      sigRes: (this.els.sigRes as HTMLSelectElement).value as SigResolutionClass,
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
      attackerSpeed: num(this.els.attackerSpeed),
      attackerMode: (this.els.attackerMode as HTMLSelectElement).value as ShipConfig["mode"],
      attackerRange: num(this.els.attackerRange),
      maneuverAggressivity: parseManeuverAggressivity(this.els.maneuverAggressivity as HTMLInputElement),
      gridBrightness: this.getGridBrightness(),
      attackerMass: num(this.els.attackerMass),
      attackerInertia: num(this.els.attackerInertia),
      attackerSkillLevel: skillLevelFromString((this.els.attackerSkills as HTMLSelectElement).value),
      attackerOverload: (this.els.attackerOverload as HTMLInputElement).checked,
      attackerHull: this.attackerProfile?.name,
      attackerPropulsion: this.propulsionSetting("attacker"),
      initialDistance: Math.max(num(this.els.initialDistance), 1),
      targetSpeed: num(this.els.targetSpeed),
      targetMode: (this.els.targetMode as HTMLSelectElement).value as ShipConfig["mode"],
      targetRange: num(this.els.targetRange),
      targetMass: num(this.els.targetMass),
      targetInertia: num(this.els.targetInertia),
      targetSkillLevel: skillLevelFromString((this.els.targetSkills as HTMLSelectElement).value),
      targetOverload: (this.els.targetOverload as HTMLInputElement).checked,
      targetSig: Math.max(num(this.els.targetSig), 1),
      targetHull: this.targetProfile?.name,
      targetPropulsion: this.propulsionSetting("target"),
      simSpeed: num(this.els.simSpeed),
      language: this.i18n.current(),
    };
  }

  private propulsionSetting(side: "attacker" | "target"): PropulsionId | undefined {
    const value = (this.els[`${side}Propulsion`] as HTMLSelectElement).value;
    return isPropulsionId(value) ? value : undefined;
  }

  private loadSettings(settings: UserSettings, selectedName = ""): void {
    this.i18n.setLanguage(settings.language);

    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.trackingInput.setRadValue(settings.tracking, sigResolution);
    this.trackingInput.setUnit(settings.trackingUnit, sigResolution);

    (this.els.sigRes as HTMLSelectElement).value = settings.sigRes;
    this.setChoiceGroup(this.els.sigResOptions, settings.sigRes);
    (this.els.optimal as HTMLInputElement).value = String(settings.optimal);
    (this.els.falloff as HTMLInputElement).value = String(settings.falloff);
    (this.els.attackerSpeed as HTMLInputElement).value = formatNumber(settings.attackerSpeed);
    (this.els.attackerMass as HTMLInputElement).value = String(settings.attackerMass);
    (this.els.attackerInertia as HTMLInputElement).value = String(settings.attackerInertia);
    (this.els.attackerMode as HTMLSelectElement).value = settings.attackerMode;
    this.setChoiceGroup(this.els.attackerModeOptions, settings.attackerMode);
    (this.els.attackerRange as HTMLInputElement).value = String(settings.attackerRange);
    (this.els.maneuverAggressivity as HTMLInputElement).value = String(settings.maneuverAggressivity ?? 1);
    (this.els.gridBrightnessSlider as HTMLInputElement).value = String(settings.gridBrightness ?? DEFAULT_GRID_BRIGHTNESS);
    (this.els.initialDistance as HTMLInputElement).value = String(settings.initialDistance);
    (this.els.targetSpeed as HTMLInputElement).value = formatNumber(settings.targetSpeed);
    (this.els.targetMass as HTMLInputElement).value = String(settings.targetMass);
    (this.els.targetInertia as HTMLInputElement).value = String(settings.targetInertia);
    (this.els.targetMode as HTMLSelectElement).value = settings.targetMode;
    this.setChoiceGroup(this.els.targetModeOptions, settings.targetMode);
    (this.els.targetRange as HTMLInputElement).value = String(settings.targetRange);
    (this.els.targetSig as HTMLInputElement).value = String(settings.targetSig);
    (this.els.simSpeed as HTMLSelectElement).value = String(settings.simSpeed);

    this.loadHull("attacker", settings.attackerHull, settings.attackerPropulsion);
    this.loadHull("target", settings.targetHull, settings.targetPropulsion);

    this.i18n.translateDocument();
    this.renderSkillOptions("attacker", settings.attackerSkillLevel ?? 5);
    this.renderSkillOptions("target", settings.targetSkillLevel ?? 5);
    this.setOverloadActive("attacker", settings.attackerOverload ?? true);
    this.setOverloadActive("target", settings.targetOverload ?? true);
    this.setOverloadDisabled("attacker");
    this.setOverloadDisabled("target");
    this.displayTrackingInput();
    this.updateUnitToggle();
    this.updateLanguageToggle();
    this.renderProfiles(selectedName);
    this.setPlaying(this.playing);
    this.updateManeuverAggressivityDisplay();
    this.updateGridBrightnessDisplay();
    this.persist();
  }

  private setBestInitialDistance(): void {
    const turret = this.getTurret();
    const targetSig = this.getTargetSig();
    const targetSpeed = num(this.els.targetSpeed);
    const best = this.hitChance.findBestDistance(targetSpeed, turret, targetSig);
    if (!Number.isFinite(best) || best <= 0) return;

    (this.els.initialDistance as HTMLInputElement).value = String(Math.round(best));

    // Make the target's desired orbit range match the starting distance by default.
    (this.els.targetRange as HTMLInputElement).value = String(Math.round(best));
  }

  private currentSigResolution(): number {
    return SIG_RESOLUTIONS[(this.els.sigRes as HTMLSelectElement).value as SigResolutionClass];
  }

  private setTrackingUnit(unit: "rad" | "score"): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.setUnit(unit, sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
    this.updateUnitToggle();
    this.persist();
    this.updateSaveButtonState();
  }

  private updateTrackingFromInput(): void {
    const value = num(this.els.tracking);
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.setDisplayValue(value, sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
  }

  private updateTrackingForSigResolution(): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.displayValue(sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
  }

  private displayTrackingInput(): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.displayValue(sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
  }

  private updateUnitToggle(): void {
    const radActive = this.trackingInput.unit === "rad";
    const scoreActive = this.trackingInput.unit === "score";
    (this.els.trackingUnitRad as HTMLButtonElement).classList.toggle("active", radActive);
    (this.els.trackingUnitRad as HTMLButtonElement).setAttribute("aria-pressed", String(radActive));
    (this.els.trackingUnitScore as HTMLButtonElement).classList.toggle("active", scoreActive);
    (this.els.trackingUnitScore as HTMLButtonElement).setAttribute("aria-pressed", String(scoreActive));
  }

  private setLanguage(language: Language): void {
    const selected = (this.els.profileSelect as HTMLSelectElement).value;
    this.i18n.setLanguage(language);
    this.i18n.translateDocument();
    this.updateLanguageToggle();
    this.renderProfiles(selected);
    this.renderAllPropulsionOptions();
    this.renderSkillOptions("attacker");
    this.renderSkillOptions("target");
    this.setPlaying(this.playing);
    this.persist();
    this.updateSaveButtonState();
    this.callbacks?.onConfigChange();
  }

  private updateLanguageToggle(): void {
    const current = this.i18n.current();
    (this.els.langEn as HTMLButtonElement).classList.toggle("active", current === "en");
    (this.els.langEn as HTMLButtonElement).setAttribute("aria-pressed", String(current === "en"));
    (this.els.langZh as HTMLButtonElement).classList.toggle("active", current === "zh");
    (this.els.langZh as HTMLButtonElement).setAttribute("aria-pressed", String(current === "zh"));
    (this.els.langJa as HTMLButtonElement).classList.toggle("active", current === "ja");
    (this.els.langJa as HTMLButtonElement).setAttribute("aria-pressed", String(current === "ja"));
  }

  private persist(): void {
    const settings = this.getSettings();
    this.settingsStore.save(settings);
    this.syncUrl(settings);
  }

  private syncUrl(settings = this.getSettings()): void {
    this.location.replace(this.settingsStore.encodeUrl(settings));
  }

  private renderProfiles(selected = ""): void {
    const names = this.settingsStore.listProfiles();
    const select = this.els.profileSelect as HTMLSelectElement;
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = this.i18n.t("select.profile");
    select.appendChild(placeholder);
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }
    select.value = selected;
  }

  private saveProfile(): void {
    const selected = (this.els.profileSelect as HTMLSelectElement).value;
    const name = (this.els.profileName as HTMLInputElement).value.trim();
    const profileName = name || selected;
    if (!profileName) return;
    const settings = this.getSettings();
    this.settingsStore.saveProfile(profileName, settings);
    this.settingsStore.saveSelectedProfile(profileName, settings);
    (this.els.profileName as HTMLInputElement).value = "";
    this.renderProfiles(profileName);
    this.selectedProfile = settings;
    this.updateSaveButtonState();
  }

  private loadProfile(): void {
    const name = (this.els.profileSelect as HTMLSelectElement).value;
    if (!name) return;
    const profile = this.settingsStore.loadProfile(name);
    if (!profile) return;
    this.loadSettings(profile, name);
    this.selectedProfile = this.getSettings();
    this.settingsStore.saveSelectedProfile(name, this.selectedProfile);
    this.updateSaveButtonState();
    this.callbacks?.onConfigChange();
  }

  private deleteProfile(): void {
    const name = (this.els.profileSelect as HTMLSelectElement).value;
    if (!name) return;
    this.settingsStore.deleteProfile(name);
    this.renderProfiles();
    this.selectedProfile = null;
    this.updateSaveButtonState();
  }

  private updateSaveButtonState(): void {
    const selected = (this.els.profileSelect as HTMLSelectElement).value;
    const name = (this.els.profileName as HTMLInputElement).value.trim();
    let saved: UserSettings | null = null;
    if (name && name !== selected) {
      saved = this.settingsStore.loadProfile(name);
    } else if (selected) {
      saved = this.selectedProfile;
    }
    const current = this.getSettings();
    const pending = saved ? !settingsEqual(saved, current) : name.length > 0;
    (this.els.profileSave as HTMLButtonElement).classList.toggle("unsaved", pending);
  }

  private async shareLink(): Promise<void> {
    const ok = await this.settingsStore.writeUrlToClipboard(this.getSettings(), this.clipboard);
    setText(this.els.shareStatus, this.i18n.t(ok ? "status.copied" : "status.failed"));
    if (this.shareStatusTimeout) clearTimeout(this.shareStatusTimeout);
    this.shareStatusTimeout = setTimeout(() => setText(this.els.shareStatus, ""), 2000);
  }

  private bind(): void {
    (this.els.play as HTMLButtonElement).addEventListener("click", () => this.callbacks?.onPlayPause());
    (this.els.reset as HTMLButtonElement).addEventListener("click", () => this.callbacks?.onReset());
    (this.els.simSpeed as HTMLSelectElement).addEventListener("change", () => {
      this.callbacks?.onSpeedChange(this.getSpeed());
    });
    (this.els.trackingUnitRad as HTMLButtonElement).addEventListener("click", () => this.setTrackingUnit("rad"));
    (this.els.trackingUnitScore as HTMLButtonElement).addEventListener("click", () => this.setTrackingUnit("score"));
    (this.els.langEn as HTMLButtonElement).addEventListener("click", () => this.setLanguage("en"));
    (this.els.langZh as HTMLButtonElement).addEventListener("click", () => this.setLanguage("zh"));
    (this.els.langJa as HTMLButtonElement).addEventListener("click", () => this.setLanguage("ja"));
    (this.els.profileSave as HTMLButtonElement).addEventListener("click", () => this.saveProfile());
    (this.els.profileSelect as HTMLSelectElement).addEventListener("change", () => this.loadProfile());
    (this.els.profileDelete as HTMLButtonElement).addEventListener("click", () => this.deleteProfile());
    (this.els.shareLink as HTMLButtonElement).addEventListener("click", () => this.shareLink());
    (this.els.profileName as HTMLInputElement).addEventListener("input", () => this.updateSaveButtonState());

    (this.els.attackerHull as HTMLInputElement).addEventListener("input", () => this.onHullInput("attacker"));
    (this.els.attackerHull as HTMLInputElement).addEventListener("change", () => this.onHullChange("attacker"));
    (this.els.attackerPropulsion as HTMLSelectElement).addEventListener("change", () => this.onPropulsionChange("attacker"));
    (this.els.attackerSkills as HTMLSelectElement).addEventListener("change", () => this.onSkillOrOverloadChange("attacker", true));
    (this.els.attackerOverload as HTMLInputElement).addEventListener("change", () => this.onSkillOrOverloadChange("attacker", false));
    (this.els.attackerOverloadButton as HTMLButtonElement).addEventListener("click", () => this.onOverloadButtonClick("attacker"));
    (this.els.targetHull as HTMLInputElement).addEventListener("input", () => this.onHullInput("target"));
    (this.els.targetHull as HTMLInputElement).addEventListener("change", () => this.onHullChange("target"));
    (this.els.targetPropulsion as HTMLSelectElement).addEventListener("change", () => this.onPropulsionChange("target"));
    (this.els.targetSkills as HTMLSelectElement).addEventListener("change", () => this.onSkillOrOverloadChange("target", true));
    (this.els.targetOverload as HTMLInputElement).addEventListener("change", () => this.onSkillOrOverloadChange("target", false));
    (this.els.targetOverloadButton as HTMLButtonElement).addEventListener("click", () => this.onOverloadButtonClick("target"));

    this.bindChoiceGroup(this.els.sigResOptions, this.els.sigRes as HTMLSelectElement, ["S", "M", "L", "XL"]);
    this.bindChoiceGroup(this.els.attackerModeOptions, this.els.attackerMode as HTMLSelectElement, ["keepAtRange", "orbit"]);
    this.bindChoiceGroup(this.els.targetModeOptions, this.els.targetMode as HTMLSelectElement, ["orbit", "keepAtRange"]);

    const inputs: (keyof typeof this.els)[] = [
      "tracking",
      "sigRes",
      "optimal",
      "falloff",
      "attackerSpeed",
      "attackerMass",
      "attackerInertia",
      "attackerMode",
      "attackerRange",
      "initialDistance",
      "targetSpeed",
      "targetMass",
      "targetInertia",
      "targetMode",
      "targetRange",
      "targetSig",
    ];
    for (const id of inputs) {
      this.els[id].addEventListener("input", () => {
        if (id === "tracking") this.updateTrackingFromInput();
        if (id === "sigRes") this.updateTrackingForSigResolution();
        if (id === "attackerMass") this.updateSpeedFromMass("attacker");
        if (id === "targetMass") this.updateSpeedFromMass("target");
        this.updateSaveButtonState();
        this.persist();
        this.callbacks?.onConfigChange();
      });
    }

    (this.els.maneuverAggressivitySlider as HTMLInputElement).addEventListener("input", () => this.onManeuverAggressivityChange());
    (this.els.gridBrightnessSlider as HTMLInputElement).addEventListener("input", () => this.onGridBrightnessChange());
  }

  private formatDistance(m: number): string {
    if (m >= 10000) return `${formatWithCommas(m / 1000, 1)} ${this.i18n.t("unit.kilometer")}`;
    return `${formatWithCommas(Math.round(m))} ${this.i18n.t("unit.meter")}`;
  }

  private populateHullDatalist(): void {
    const datalist = this.els.hullOptions as HTMLDataListElement;
    datalist.innerHTML = "";
    for (const profile of SHIP_PROFILES) {
      const option = document.createElement("option");
      option.value = profile.name;
      option.label = `${profile.hullType} · ${profile.faction}`;
      datalist.appendChild(option);
    }
  }

  private findProfileByName(name: string): ShipProfile | undefined {
    const normalized = name.trim().toLowerCase();
    return SHIP_PROFILES.find((p) => p.name.toLowerCase() === normalized);
  }

  private findPropulsionModule(profile: ShipProfile, id: string): PropulsionModule | undefined {
    if (!isPropulsionId(id)) return undefined;
    return fittingOptions(profile).find((m) => m.id === id);
  }

  private applyHull(
    side: "attacker" | "target",
    profile: ShipProfile,
    propulsionId?: PropulsionId,
    persist = false,
    updateStats = true,
  ): void {
    if (side === "attacker") this.attackerProfile = profile;
    else this.targetProfile = profile;

    (this.els[`${side}Hull`] as HTMLInputElement).value = profile.name;
    this.setHullValidation(side, false);
    this.renderPropulsionOptions(side, propulsionId);

    if (updateStats) {
      this.updatePropulsionStats(side, { updateInertia: true, updateMass: true, updateSig: true });
    } else {
      this.updateHullHint(side, this.currentPropulsionModule(side));
    }
    if (persist) {
      this.persist();
      this.updateSaveButtonState();
      this.callbacks?.onConfigChange();
    }
  }

  private clearHull(side: "attacker" | "target", resetInput: boolean, persist: boolean): void {
    if (side === "attacker") this.attackerProfile = undefined;
    else this.targetProfile = undefined;

    if (resetInput) {
      (this.els[`${side}Hull`] as HTMLInputElement).value = "";
    }
    this.updateHullHint(side);
    this.renderPropulsionOptions(side);
    if (persist) {
      this.persist();
      this.updateSaveButtonState();
      this.callbacks?.onConfigChange();
    }
  }

  private loadHull(
    side: "attacker" | "target",
    hullName?: string,
    propulsionId?: PropulsionId,
  ): void {
    if (!hullName) {
      this.clearHull(side, true, false);
      return;
    }
    const profile = this.findProfileByName(hullName);
    if (!profile) {
      this.clearHull(side, true, false);
      return;
    }
    this.applyHull(side, profile, propulsionId, false, false);
  }

  private onHullInput(side: "attacker" | "target"): void {
    const value = (this.els[`${side}Hull`] as HTMLInputElement).value.trim();
    const profile = this.findProfileByName(value);
    if (profile) {
      this.applyProfile(side, profile, true);
    } else {
      this.setHullValidation(side, false);
    }
  }

  private onHullChange(side: "attacker" | "target"): void {
    const value = (this.els[`${side}Hull`] as HTMLInputElement).value.trim();
    if (value === "") {
      this.setHullValidation(side, false);
      this.clearHull(side, false, true);
      return;
    }
    const profile = this.findProfileByName(value);
    if (profile) {
      this.applyProfile(side, profile, true);
      return;
    }
    this.setHullValidation(side, true);
    this.clearHull(side, false, false);
    this.persist();
    this.updateSaveButtonState();
    this.callbacks?.onConfigChange();
  }

  private applyProfile(
    side: "attacker" | "target",
    profile: ShipProfile,
    persist: boolean,
  ): void {
    const currentProfile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const isSameHull = currentProfile?.name === profile.name;
    const propulsionId = isSameHull ? this.currentPropulsionId(side) : undefined;
    this.applyHull(side, profile, propulsionId, persist, !isSameHull);
  }

  private currentPropulsionId(side: "attacker" | "target"): PropulsionId | undefined {
    const value = (this.els[`${side}Propulsion`] as HTMLSelectElement).value;
    return isPropulsionId(value) ? value : undefined;
  }

  private currentPropulsionModule(side: "attacker" | "target"): PropulsionModule | undefined {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const id = this.currentPropulsionId(side);
    if (!profile || !id) return undefined;
    return this.findPropulsionModule(profile, id);
  }

  private onPropulsionChange(side: "attacker" | "target"): void {
    if (side === "attacker" && !this.attackerProfile) return;
    if (side === "target" && !this.targetProfile) return;
    this.updatePropulsionStats(side, { updateInertia: false, updateMass: true, updateSig: true });
    this.setOverloadDisabled(side);
    this.updateSaveButtonState();
    this.persist();
    this.callbacks?.onConfigChange();
  }

  private setHullValidation(side: "attacker" | "target", isInvalid: boolean): void {
    (this.els[`${side}Hull`] as HTMLInputElement).classList.toggle("hull-invalid", isInvalid);
  }

  private updateHullHint(side: "attacker" | "target", module?: PropulsionModule): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) {
      setText(this.els[`${side}HullHint`], "");
      return;
    }
    let text = `${profile.hullType} · ${profile.faction}`;
    if (side === "target" && module?.kind === "microwarpdrive") {
      text += ` (sig ×${1 + module.sigBloom})`;
    }
    setText(this.els[`${side}HullHint`], text);
  }

  private renderAllPropulsionOptions(): void {
    this.renderPropulsionOptions("attacker", this.currentPropulsionId("attacker") ?? "");
    this.renderPropulsionOptions("target", this.currentPropulsionId("target") ?? "");
  }

  private renderPropulsionOptions(side: "attacker" | "target", selectedId = ""): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    const select = this.els[`${side}Propulsion`] as HTMLSelectElement;
    const group = this.els[`${side}PropulsionOptions`] as HTMLElement;
    select.innerHTML = "";
    group.innerHTML = "";
    group.setAttribute("aria-label", this.i18n.t("label.propulsion"));

    const disabled = !profile;
    select.disabled = disabled;
    group.classList.toggle("disabled", disabled);

    let selected = "";
    if (profile) {
      const modules = fittingOptions(profile);
      select.disabled = modules.length === 0;
      group.classList.toggle("disabled", modules.length === 0);
      const moduleDisabled = modules.length === 0;
      if (modules.length === 0) {
        this.createPlaceholderButton(group);
      } else {
        for (const module of modules) {
          const option = document.createElement("option");
          option.value = module.id;
          option.textContent = propulsionOptionLabel(module);
          select.appendChild(option);
          const button = this.createButton(group, module.id, propulsionOptionLabel(module), () => this.onPropulsionButtonClick(side, module.id));
          button.disabled = moduleDisabled;
          button.setAttribute("aria-disabled", "false");
        }
      }
      selected = modules.some((m) => m.id === selectedId) ? selectedId : (modules[0]?.id ?? "");
    } else {
      this.createPlaceholderButton(group);
    }

    select.value = selected;
    this.setPropulsionActive(side, selected);
    this.setOverloadDisabled(side);
  }

  private updatePropulsionStats(
    side: "attacker" | "target",
    { updateInertia, updateMass, updateSig }: { updateInertia: boolean; updateMass: boolean; updateSig: boolean },
  ): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) return;

    const select = this.els[`${side}Propulsion`] as HTMLSelectElement;
    const module = this.findPropulsionModule(profile, select.value);
    const conditions = this.skillConditions(side);

    if (updateMass || updateInertia || (side === "target" && updateSig)) {
      const stats = effectiveStats(profile, module, conditions);
      if (updateMass) {
        (this.els[`${side}Mass`] as HTMLInputElement).value = String(stats.mass);
      }
      if (updateInertia) {
        (this.els[`${side}Inertia`] as HTMLInputElement).value = String(stats.inertiaModifier);
      }
      if (side === "target" && updateSig) {
        (this.els.targetSig as HTMLInputElement).value = String(Math.max(1, stats.sigRadius));
      }
    }

    const speed = this.computeSpeedFromMass(side);
    (this.els[`${side}Speed`] as HTMLInputElement).value = formatNumber(speed);
    this.updateHullHint(side, module);
  }

  private updateSpeedFromMass(side: "attacker" | "target"): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile || !this.currentPropulsionModule(side)) return;
    (this.els[`${side}Speed`] as HTMLInputElement).value = formatNumber(this.computeSpeedFromMass(side));
  }

  private computeSpeedFromMass(side: "attacker" | "target"): number {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) return 0;
    const activeMass = num(this.els[`${side}Mass`]);
    const conditions = this.skillConditions(side);
    const module = this.currentPropulsionModule(side);
    if (!module) return effectiveStats(profile, undefined, conditions).maxSpeed;
    const factor = fittedMassFactor(profile.hullType);
    const shipMass = Math.max(0, (activeMass - module.massAddition * module.activeMassMultiplier) / factor);
    const adjustedProfile: ShipProfile = { ...profile, mass: shipMass };
    return effectiveStats(adjustedProfile, module, conditions).maxSpeed;
  }

  private skillConditions(side: "attacker" | "target"): { skillLevel: SkillLevel; overloaded: boolean } {
    const skill = side === "attacker" ? this.els.attackerSkills : this.els.targetSkills;
    const overload = side === "attacker" ? this.els.attackerOverload : this.els.targetOverload;
    return {
      skillLevel: skillLevelFromString((skill as HTMLSelectElement).value),
      overloaded: (overload as HTMLInputElement).checked,
    };
  }

  private setOverloadDisabled(side: "attacker" | "target"): void {
    const propulsion = this.els[`${side}Propulsion`] as HTMLSelectElement;
    const overload = this.els[`${side}Overload`] as HTMLInputElement;
    const button = this.els[`${side}OverloadButton`] as HTMLButtonElement;
    const disabled = propulsion.value === "" || propulsion.disabled;
    const active = !disabled && overload.checked;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    overload.disabled = disabled;
    button.disabled = disabled;
    button.setAttribute("aria-disabled", String(disabled));
  }

  private onSkillOrOverloadChange(side: "attacker" | "target", updateInertia: boolean): void {
    this.updatePropulsionStats(side, { updateInertia, updateMass: false, updateSig: false });
    this.updateSaveButtonState();
    this.persist();
    if (side === "attacker" && !this.attackerProfile) return;
    if (side === "target" && !this.targetProfile) return;
    this.callbacks?.onConfigChange();
  }

  private setDefaultSkillAndOverload(): void {
    this.setSkillLevel("attacker", 5);
    this.setSkillLevel("target", 5);
    this.setOverloadActive("attacker", true);
    this.setOverloadActive("target", true);
  }

  private setSkillLevel(side: "attacker" | "target", level: SkillLevel): void {
    (this.els[`${side}Skills`] as HTMLSelectElement).value = String(level);
    this.setSkillActive(side, level);
  }

  private setSkillActive(side: "attacker" | "target", level: SkillLevel): void {
    const group = this.els[`${side}SkillOptions`] as HTMLElement;
    const value = String(level);
    for (const button of group.children) {
      const active = button.getAttribute("data-value") === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    setText(this.els[`${side}SkillSummary`], skillOptionLabel(this.i18n, level));
  }

  private setOverloadActive(side: "attacker" | "target", active: boolean): void {
    const input = this.els[`${side}Overload`] as HTMLInputElement;
    const button = this.els[`${side}OverloadButton`] as HTMLButtonElement;
    input.checked = active;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  private setPropulsionActive(side: "attacker" | "target", propulsionId: string): void {
    const select = this.els[`${side}Propulsion`] as HTMLSelectElement;
    const group = this.els[`${side}PropulsionOptions`] as HTMLElement;
    select.value = propulsionId;
    for (const button of group.children) {
      const active = button.getAttribute("data-value") === propulsionId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }

  private currentSkillLevel(side: "attacker" | "target"): SkillLevel | undefined {
    const value = (this.els[`${side}Skills`] as HTMLSelectElement).value;
    if (value === "") return undefined;
    const level = skillLevelFromString(value);
    if (level === 0 && value !== "0") return undefined;
    return level;
  }

  private onPropulsionButtonClick(side: "attacker" | "target", propulsionId: string): void {
    if (side === "attacker" && !this.attackerProfile) return;
    if (side === "target" && !this.targetProfile) return;
    this.setPropulsionActive(side, propulsionId);
    this.els[`${side}Propulsion`].dispatchEvent(new Event("change"));
  }

  private onSkillButtonClick(side: "attacker" | "target", level: SkillLevel): void {
    this.setSkillActive(side, level);
    (this.els[`${side}Skills`] as HTMLSelectElement).value = String(level);
    this.els[`${side}Skills`].dispatchEvent(new Event("change"));
  }

  private onOverloadButtonClick(side: "attacker" | "target"): void {
    const input = this.els[`${side}Overload`] as HTMLInputElement;
    this.setOverloadActive(side, !input.checked);
    input.dispatchEvent(new Event("change"));
  }

  private createButton(container: HTMLElement, value: string, text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-value", value);
    button.setAttribute("aria-pressed", "false");
    button.textContent = text;
    button.setAttribute("title", text);
    button.addEventListener("click", onClick);
    container.appendChild(button);
    return button;
  }

  private createPlaceholderButton(container: HTMLElement): HTMLButtonElement {
    const button = this.createButton(container, "placeholder", "—", () => {});
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    return button;
  }

  private renderSkillOptions(side: "attacker" | "target", selectedValue: SkillLevel = this.currentSkillLevel(side) ?? 5): void {
    const select = this.els[`${side}Skills`] as HTMLSelectElement;
    const group = this.els[`${side}SkillOptions`] as HTMLElement;
    const selected = String(selectedValue);
    select.innerHTML = "";
    group.innerHTML = "";
    group.setAttribute("aria-label", this.i18n.t("label.skillLevel"));
    for (let level = 0; level <= 5; level++) {
      const skill = level as SkillLevel;
      const option = document.createElement("option");
      option.value = String(level);
      option.textContent = skillOptionLabel(this.i18n, skill);
      select.appendChild(option);
      const button = this.createButton(group, String(level), String(level), () => this.onSkillButtonClick(side, skill));
      button.title = skillOptionLabel(this.i18n, skill);
    }
    select.value = selected;
    this.setSkillActive(side, skillLevelFromString(selected));
  }

  private bindChoiceGroup(group: HTMLElement, select: HTMLSelectElement, values: readonly string[]): void {
    for (const button of Array.from(group.children)) {
      button.addEventListener("click", () => this.onChoiceButtonClick(group, select, button, values));
    }
  }

  private onChoiceButtonClick(
    group: HTMLElement,
    select: HTMLSelectElement,
    button: Element,
    values: readonly string[],
  ): void {
    const value = button.getAttribute("data-value") ?? "";
    if (!values.includes(value)) return;
    select.value = value;
    this.setChoiceGroup(group, value);
    select.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private setChoiceGroup(group: HTMLElement, value: string): void {
    for (const button of Array.from(group.children)) {
      const active = button.getAttribute("data-value") === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }
}

const REFERENCE_RANGE_WEIGHT = 0.003;
const AGGRESSIVITY_MIN = 0.01;
const AGGRESSIVITY_MAX = 100;
const DEFAULT_GRID_BRIGHTNESS = 0.2;

function aggressivityFromPosition(pos: number): number {
  const clamped = Math.max(0, Math.min(1, pos));
  return AGGRESSIVITY_MIN * (AGGRESSIVITY_MAX / AGGRESSIVITY_MIN) ** clamped;
}

function positionFromAggressivity(value: number): number {
  const clamped = Math.max(AGGRESSIVITY_MIN, Math.min(AGGRESSIVITY_MAX, value));
  return Math.log(clamped / AGGRESSIVITY_MIN) / Math.log(AGGRESSIVITY_MAX / AGGRESSIVITY_MIN);
}

function parseManeuverAggressivity(input: HTMLInputElement): number {
  const value = Number.parseFloat(input.value);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(AGGRESSIVITY_MIN, Math.min(AGGRESSIVITY_MAX, value));
}

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing DOM element #${id}`);
  return e as HTMLElement;
}

function num(input: HTMLInputElement | HTMLSelectElement | HTMLElement): number {
  const value = (input as HTMLInputElement).value;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

function settingsEqual(a: UserSettings, b: UserSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatWithCommas(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function hitChanceColor(chance: number): string {
  if (chance >= 0.9) return "#9cc954";
  if (chance >= 0.5) return "#5ccbcb";
  if (chance >= 0.25) return "#fce447";
  if (chance >= 0.05) return "#f67c0f";
  return "#d81f27";
}

function propulsionOptionLabel(module: PropulsionModule): string {
  return module.id.replace(/^.*-/, "").toUpperCase();
}

function skillLevelFromString(value: string): SkillLevel {
  const level = Number.parseInt(value, 10);
  if (level === 0 || level === 1 || level === 2 || level === 3 || level === 4 || level === 5) return level;
  return 0;
}

function skillOptionLabel(i18n: I18n, level: SkillLevel): string {
  return `${i18n.t("skill.level")} ${level}`;
}

function formatNumber(value: number, decimals = 2): string {
  return String(Number(value.toFixed(decimals)));
}
