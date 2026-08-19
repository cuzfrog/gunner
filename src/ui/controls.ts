import {
  effectiveStats,
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
import type { ClipboardProvider, SettingsStore, UserSettings } from "./settings";
import { USER_SETTINGS_VERSION } from "./settings";
import { TrackingInput } from "./trackingInput";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onPlayPause: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface Controls {
  getTurret(): TurretSpec;
  getTargetSig(): number;
  getConfig(): SimConfig;
  getSpeed(): number;
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
  private readonly trackingInput: TrackingInput;
  private callbacks?: ControlsCallbacks;
  private playing = false;
  private shareStatusTimeout?: ReturnType<typeof setTimeout>;
  private attackerProfile?: ShipProfile;
  private targetProfile?: ShipProfile;

  constructor({
    hitChance,
    i18n,
    settingsStore,
    clipboard,
  }: {
    hitChance: HitChance;
    i18n: I18n;
    settingsStore: SettingsStore;
    clipboard: ClipboardProvider;
  }) {
    this.hitChance = hitChance;
    this.i18n = i18n;
    this.settingsStore = settingsStore;
    this.clipboard = clipboard;
    this.trackingInput = new TrackingInput();
    this.els = {
      tracking: el("tracking"),
      trackingUnitRad: el("tracking-unit-rad"),
      trackingUnitScore: el("tracking-unit-score"),
      sigRes: el("sigRes"),
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
      attackerRange: el("attacker-range"),
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
      resHitCard: el("res-hit-card"),
    };

    this.populateHullDatalist();
    this.renderSkillOptions("attacker");
    this.renderSkillOptions("target");

    const saved = this.settingsStore.load();
    if (saved) {
      this.loadSettings(saved);
    } else {
      this.i18n.translateDocument();
      this.setDefaultSkillAndOverload();
      this.setOverloadDisabled("attacker");
      this.setOverloadDisabled("target");
      this.setBestInitialDistance();
      this.setPlaying(false);
    }
    this.bind();
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
    const attacker: ShipConfig = {
      id: "attacker",
      maxSpeed: num(this.els.attackerSpeed),
      mass: num(this.els.attackerMass),
      inertiaModifier: num(this.els.attackerInertia),
      mode: (this.els.attackerMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.attackerRange),
      orbitDirection: "cw",
    };
    const target: ShipConfig = {
      id: "target",
      maxSpeed: num(this.els.targetSpeed),
      mass: num(this.els.targetMass),
      inertiaModifier: num(this.els.targetInertia),
      mode: (this.els.targetMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.targetRange),
      orbitDirection: "cw",
    };
    return { attacker, target, initialDistance };
  }

  getSpeed(): number {
    return num(this.els.simSpeed);
  }

  update(frame: EngagementFrame, hit: HitChanceBreakdown): void {
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;

    setText(this.els.resDistance, this.formatDistance(frame.distance));
    setText(this.els.resTransversal, `${frame.transversalSpeed.toFixed(1)} m/s`);
    setText(this.els.resAngular, `${frame.angularVelocity.toFixed(4)} rad/s`);
    setText(this.els.resRadial, `${frame.radialVelocity.toFixed(1)} m/s`);
    setText(this.els.resTrackPen, `${trackPenalty.toFixed(1)}%`);
    setText(this.els.resRangePen, `${rangePenalty.toFixed(1)}%`);
    setText(this.els.resHit, `${(hit.chance * 100).toFixed(1)}%`);

    (this.els.resHitCard as HTMLElement).style.borderColor = hitChanceColor(hit.chance);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    (this.els.play as HTMLButtonElement).textContent = this.i18n.t(
      playing ? "button.pause" : "button.play",
    );
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

  private loadSettings(settings: UserSettings): void {
    this.i18n.setLanguage(settings.language);

    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.trackingInput.setRadValue(settings.tracking, sigResolution);
    this.trackingInput.setUnit(settings.trackingUnit, sigResolution);

    (this.els.sigRes as HTMLSelectElement).value = settings.sigRes;
    (this.els.optimal as HTMLInputElement).value = String(settings.optimal);
    (this.els.falloff as HTMLInputElement).value = String(settings.falloff);
    (this.els.attackerSpeed as HTMLInputElement).value = formatNumber(settings.attackerSpeed);
    (this.els.attackerMass as HTMLInputElement).value = String(settings.attackerMass);
    (this.els.attackerInertia as HTMLInputElement).value = String(settings.attackerInertia);
    (this.els.attackerMode as HTMLSelectElement).value = settings.attackerMode;
    (this.els.attackerRange as HTMLInputElement).value = String(settings.attackerRange);
    (this.els.initialDistance as HTMLInputElement).value = String(settings.initialDistance);
    (this.els.targetSpeed as HTMLInputElement).value = formatNumber(settings.targetSpeed);
    (this.els.targetMass as HTMLInputElement).value = String(settings.targetMass);
    (this.els.targetInertia as HTMLInputElement).value = String(settings.targetInertia);
    (this.els.targetMode as HTMLSelectElement).value = settings.targetMode;
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
    this.renderProfiles();
    this.setPlaying(this.playing);
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
    (this.els.trackingUnitRad as HTMLButtonElement).classList.toggle("active", this.trackingInput.unit === "rad");
    (this.els.trackingUnitScore as HTMLButtonElement).classList.toggle("active", this.trackingInput.unit === "score");
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
    this.callbacks?.onConfigChange();
  }

  private updateLanguageToggle(): void {
    (this.els.langEn as HTMLButtonElement).classList.toggle("active", this.i18n.current() === "en");
    (this.els.langZh as HTMLButtonElement).classList.toggle("active", this.i18n.current() === "zh");
    (this.els.langJa as HTMLButtonElement).classList.toggle("active", this.i18n.current() === "ja");
  }

  private persist(): void {
    this.settingsStore.save(this.getSettings());
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
    const name = (this.els.profileName as HTMLInputElement).value.trim();
    if (!name) return;
    this.settingsStore.saveProfile(name, this.getSettings());
    (this.els.profileName as HTMLInputElement).value = "";
    this.renderProfiles();
    (this.els.profileSelect as HTMLSelectElement).value = name;
  }

  private loadProfile(): void {
    const name = (this.els.profileSelect as HTMLSelectElement).value;
    if (!name) return;
    const profile = this.settingsStore.loadProfile(name);
    if (!profile) return;
    this.loadSettings(profile);
    (this.els.profileSelect as HTMLSelectElement).value = name;
    this.callbacks?.onConfigChange();
  }

  private deleteProfile(): void {
    const name = (this.els.profileSelect as HTMLSelectElement).value;
    if (!name) return;
    this.settingsStore.deleteProfile(name);
    this.renderProfiles();
    (this.els.profileSelect as HTMLSelectElement).value = "";
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
        this.persist();
        this.callbacks?.onConfigChange();
      });
    }
  }

  private formatDistance(m: number): string {
    if (m >= 10000) return `${(m / 1000).toFixed(1)} ${this.i18n.t("unit.kilometer")}`;
    return `${Math.round(m)} ${this.i18n.t("unit.meter")}`;
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
      this.updatePropulsionStats(side, true);
    } else {
      this.updateHullHint(side, this.currentPropulsionModule(side));
    }
    if (persist) {
      this.persist();
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
    this.updatePropulsionStats(side);
    this.setOverloadDisabled(side);
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
      for (const module of modules) {
        const option = document.createElement("option");
        option.value = module.id;
        option.textContent = propulsionOptionLabel(module);
        select.appendChild(option);
        const button = this.createButton(group, module.id, propulsionOptionLabel(module), () => this.onPropulsionButtonClick(side, module.id));
        button.disabled = moduleDisabled;
        button.setAttribute("aria-disabled", "false");
      }
      selected = modules.some((m) => m.id === selectedId) ? selectedId : (modules[0]?.id ?? "");
    }

    select.value = selected;
    this.setPropulsionActive(side, selected);
    this.setOverloadDisabled(side);
  }

  private updatePropulsionStats(side: "attacker" | "target", updateInertia = false): void {
    const profile = side === "attacker" ? this.attackerProfile : this.targetProfile;
    if (!profile) return;

    const select = this.els[`${side}Propulsion`] as HTMLSelectElement;
    const module = this.findPropulsionModule(profile, select.value);
    const conditions = this.skillConditions(side);
    const stats = effectiveStats(profile, module, conditions);

    (this.els[`${side}Speed`] as HTMLInputElement).value = formatNumber(stats.maxSpeed);
    (this.els[`${side}Mass`] as HTMLInputElement).value = String(stats.mass);
    if (updateInertia) {
      (this.els[`${side}Inertia`] as HTMLInputElement).value = String(stats.inertiaModifier);
    }
    if (side === "target") {
      (this.els.targetSig as HTMLInputElement).value = String(Math.max(1, stats.sigRadius));
    }
    this.updateHullHint(side, module);
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
    overload.disabled = disabled;
    button.disabled = disabled;
    button.setAttribute("aria-disabled", String(disabled));
  }

  private onSkillOrOverloadChange(side: "attacker" | "target", updateInertia: boolean): void {
    this.updatePropulsionStats(side, updateInertia);
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
