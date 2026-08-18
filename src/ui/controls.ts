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
import type { SettingsStore, UserSettings } from "./settings";
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
  private readonly trackingInput: TrackingInput;
  private callbacks?: ControlsCallbacks;
  private playing = false;
  private shareStatusTimeout?: ReturnType<typeof setTimeout>;

  constructor({
    hitChance,
    i18n,
    settingsStore,
  }: {
    hitChance: HitChance;
    i18n: I18n;
    settingsStore: SettingsStore;
  }) {
    this.hitChance = hitChance;
    this.i18n = i18n;
    this.settingsStore = settingsStore;
    this.trackingInput = new TrackingInput();
    this.els = {
      tracking: el("tracking"),
      trackingUnitRad: el("tracking-unit-rad"),
      trackingUnitScore: el("tracking-unit-score"),
      sigRes: el("sigRes"),
      optimal: el("optimal"),
      falloff: el("falloff"),
      attackerSpeed: el("attacker-speed"),
      attackerMode: el("attacker-mode"),
      attackerRange: el("attacker-range"),
      initialDistance: el("initial-distance"),
      targetSpeed: el("target-speed"),
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

    const saved = this.settingsStore.load();
    if (saved) {
      this.loadSettings(saved);
    } else {
      this.i18n.translateDocument();
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
      mode: (this.els.attackerMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.attackerRange),
      orbitDirection: "cw",
    };
    const target: ShipConfig = {
      id: "target",
      maxSpeed: num(this.els.targetSpeed),
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

    setText(this.els.resDistance, formatDistance(frame.distance));
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
      initialDistance: num(this.els.initialDistance),
      targetSpeed: num(this.els.targetSpeed),
      targetMode: (this.els.targetMode as HTMLSelectElement).value as ShipConfig["mode"],
      targetRange: num(this.els.targetRange),
      targetSig: num(this.els.targetSig),
      simSpeed: num(this.els.simSpeed),
      language: this.i18n.current(),
    };
  }

  private loadSettings(settings: UserSettings): void {
    const sigResolution = SIG_RESOLUTIONS[settings.sigRes];
    this.trackingInput.setRadValue(settings.tracking, sigResolution);
    this.trackingInput.setUnit(settings.trackingUnit, sigResolution);

    (this.els.sigRes as HTMLSelectElement).value = settings.sigRes;
    (this.els.optimal as HTMLInputElement).value = String(settings.optimal);
    (this.els.falloff as HTMLInputElement).value = String(settings.falloff);
    (this.els.attackerSpeed as HTMLInputElement).value = String(settings.attackerSpeed);
    (this.els.attackerMode as HTMLSelectElement).value = settings.attackerMode;
    (this.els.attackerRange as HTMLInputElement).value = String(settings.attackerRange);
    (this.els.initialDistance as HTMLInputElement).value = String(settings.initialDistance);
    (this.els.targetSpeed as HTMLInputElement).value = String(settings.targetSpeed);
    (this.els.targetMode as HTMLSelectElement).value = settings.targetMode;
    (this.els.targetRange as HTMLInputElement).value = String(settings.targetRange);
    (this.els.targetSig as HTMLInputElement).value = String(settings.targetSig);
    (this.els.simSpeed as HTMLSelectElement).value = String(settings.simSpeed);

    this.i18n.setLanguage(settings.language);
    this.i18n.translateDocument();
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
    this.setPlaying(this.playing);
    this.persist();
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
    const ok = await this.settingsStore.writeUrlToClipboard(this.getSettings(), navigator.clipboard);
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

    const inputs: (keyof typeof this.els)[] = [
      "tracking",
      "sigRes",
      "optimal",
      "falloff",
      "attackerSpeed",
      "attackerMode",
      "attackerRange",
      "initialDistance",
      "targetSpeed",
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

function formatDistance(m: number): string {
  if (m >= 10000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function hitChanceColor(chance: number): string {
  if (chance >= 0.9) return "#9cc954";
  if (chance >= 0.5) return "#5ccbcb";
  if (chance >= 0.25) return "#fce447";
  if (chance >= 0.05) return "#f67c0f";
  return "#d81f27";
}
