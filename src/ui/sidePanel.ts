import type { FittedHull, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, Ships, SkillLevel } from "../ships";
import type { ImportedFitting } from "../fitting";
import { alignTime } from "../sim";
import { num, setText } from "./controlsDom";
import { formatNumber } from "./controlsFormat";
import type { I18n } from "./i18n";
import type { ImageCatalog } from "./imageCatalog";
import type { FittedHullSummary, ProfileParamOverrides, PropulsionSelection } from "./settings";
import type { SavedFitting } from "./savedFittings";

interface SidePanelElements {
  readonly hull: HTMLInputElement;
  readonly shipImage: HTMLImageElement;
  readonly fittingName: HTMLElement;
  readonly hullHint: HTMLElement;
  readonly speed: HTMLInputElement;
  readonly mass: HTMLInputElement;
  readonly inertia: HTMLInputElement;
  readonly alignTime: HTMLElement;
  readonly mode: HTMLSelectElement;
  readonly range: HTMLInputElement;
  readonly targetSig?: HTMLInputElement;
}

export interface SidePanelHost {
  currentPropulsionSelection(): PropulsionSelection | undefined;
  currentPropulsionId(): PropulsionId | undefined;
  currentPropulsionModule(): PropulsionModule | undefined;
  skillConditions(): { skillLevel: SkillLevel; overloaded: boolean };
  renderPropulsionOptions(selectedId?: string): void;
  updateFittingTrigger(enabled: boolean): void;
  isFittingPopupOpen(): boolean;
  renderFittingPopup(): void;
  closeFittingPopup(): void;
  hidePreview(): void;
  clearImportHint(): void;
  closeAttackerAmmoPopup(): void;
  onAttackerFittedHullCleared(): void;
  importEftFitting(text: string, persist: boolean): ImportedFitting | undefined;
  mostRecentFittingFor(hullName: string): SavedFitting | undefined;
  persistConfigChange(): void;
}

export class SidePanel {
  private readonly side: "attacker" | "target";
  private readonly host: SidePanelHost;
  private readonly els: SidePanelElements;
  private readonly i18n: I18n;
  private readonly ships: Ships;
  private readonly imageCatalog: ImageCatalog;
  private profileValue?: ShipProfile;
  private fittedHullValue?: FittedHullSummary;
  private fittingTextValue?: string;
  private overridesValue: Partial<ProfileParamOverrides> = {};
  private lastCommittedHullValue?: string;

  constructor({
    side,
    host,
    els,
    i18n,
    ships,
    imageCatalog,
  }: {
    side: "attacker" | "target";
    host: SidePanelHost;
    els: SidePanelElements;
    i18n: I18n;
    ships: Ships;
    imageCatalog: ImageCatalog;
  }) {
    this.side = side;
    this.host = host;
    this.els = els;
    this.i18n = i18n;
    this.ships = ships;
    this.imageCatalog = imageCatalog;
  }

  get profile(): ShipProfile | undefined {
    return this.profileValue;
  }

  get fittedHull(): FittedHullSummary | undefined {
    return this.fittedHullValue;
  }

  set fittedHull(value: FittedHullSummary | undefined) {
    this.fittedHullValue = value;
  }

  get fittingText(): string | undefined {
    return this.fittingTextValue;
  }

  set fittingText(value: string | undefined) {
    this.fittingTextValue = value;
  }

  get overrides(): Partial<ProfileParamOverrides> {
    return this.overridesValue;
  }

  set overrides(value: Partial<ProfileParamOverrides>) {
    this.overridesValue = value;
  }

  get lastCommittedHull(): string | undefined {
    return this.lastCommittedHullValue;
  }

  set lastCommittedHull(value: string | undefined) {
    this.lastCommittedHullValue = value;
  }

  loadHull(hullName?: string, propulsionId?: PropulsionSelection): void {
    if (!hullName) {
      this.clearHull(true, false);
      return;
    }
    const profile = this.ships.findHull(hullName);
    if (!profile) {
      this.clearHull(true, false);
      return;
    }
    this.applyHull(profile, propulsionId, false, false);
    this.lastCommittedHull = profile.name;
  }

  onHullInput(): void {
    const value = this.els.hull.value.trim();
    const profile = this.ships.findHull(value);
    if (profile) {
      this.applyProfile(profile, true, false);
    } else {
      this.setHullValidation(false);
    }
  }

  onHullChange(): void {
    const value = this.els.hull.value.trim();
    if (value === "") {
      this.setHullValidation(false);
      this.clearHull(false, true);
      return;
    }
    const profile = this.ships.findHull(value);
    if (profile) {
      this.applyProfile(profile, true, true);
      return;
    }
    this.setHullValidation(true);
    this.clearHull(false, false);
    this.host.persistConfigChange();
  }

  applyProfile(profile: ShipProfile, persist: boolean, autoSelect = false): void {
    const currentProfile = this.profile;
    const isSameAsCurrent = currentProfile?.name === profile.name;
    const isGenuineChange = this.lastCommittedHull !== profile.name;
    const propulsionId = isSameAsCurrent ? this.host.currentPropulsionSelection() : undefined;
    if (!isSameAsCurrent) this.clearFittedHull();
    this.applyHull(profile, propulsionId, false, !isSameAsCurrent);

    let imported: ImportedFitting | undefined;
    if (isGenuineChange && autoSelect) {
      const recent = this.host.mostRecentFittingFor(profile.name);
      if (recent) imported = this.host.importEftFitting(recent.text, false);
    }

    if (persist) {
      if (autoSelect) this.lastCommittedHull = imported?.profile.name ?? profile.name;
      this.host.persistConfigChange();
    }
  }

  applyImportedFitting(summary: FittedHullSummary): void {
    this.fittedHull = summary;
    this.host.renderPropulsionOptions(summary.propulsionId ?? "");
    this.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
  }

  restoreFittingSummary(summary: FittedHullSummary): void {
    this.fittedHull = summary;
    this.host.renderPropulsionOptions(this.host.currentPropulsionSelection() ?? "");
    this.host.clearImportHint();
    this.updateHullHint(this.currentFittedPropulsionModule(summary));
  }

  clearHull(resetInput: boolean, persist: boolean): void {
    this.profileValue = undefined;
    this.clearFittedHull();
    this.host.hidePreview();
    this.clearShipImage();
    this.lastCommittedHull = undefined;

    if (resetInput) {
      this.els.hull.value = "";
    }
    this.host.updateFittingTrigger(false);
    this.host.closeFittingPopup();
    if (this.side === "attacker") {
      this.host.closeAttackerAmmoPopup();
    }
    this.updateHullHint();
    this.host.renderPropulsionOptions();
    if (persist) {
      this.host.persistConfigChange();
    }
  }

  clearFittedHull(): void {
    this.fittedHull = undefined;
    this.fittingText = undefined;
    this.overrides = {};
    if (this.side === "attacker") {
      this.host.onAttackerFittedHullCleared();
    }
    this.host.hidePreview();
    this.host.clearImportHint();
  }

  updateShipImage(): void {
    if (this.profile) {
      this.els.shipImage.src = this.imageCatalog.shipImageUrl(this.profile.name);
      this.els.shipImage.hidden = false;
    } else {
      this.els.shipImage.hidden = true;
      this.els.shipImage.src = "";
    }
  }

  clearShipImage(): void {
    this.els.shipImage.hidden = true;
    this.els.shipImage.src = "";
  }

  updateShipStats({ updateInertia, updateMass, updateSig }: { updateInertia: boolean; updateMass: boolean; updateSig: boolean }): void {
    if (!this.profile) return;

    const fitted = this.fittedHull;
    const propulsion = fitted ? this.currentFittedPropulsion(fitted) : this.host.currentPropulsionModule();
    const hintModule = fitted ? this.currentFittedPropulsionModule(fitted) : this.host.currentPropulsionModule();
    const conditions = this.host.skillConditions();
    const massKey: keyof ProfileParamOverrides = this.side === "attacker" ? "attackerMass" : "targetMass";
    const inertiaKey: keyof ProfileParamOverrides = this.side === "attacker" ? "attackerInertia" : "targetInertia";
    const speedKey: keyof ProfileParamOverrides = this.side === "attacker" ? "attackerSpeed" : "targetSpeed";
    let mass = num(this.els.mass);

    if (updateMass || updateInertia || (this.side === "target" && updateSig)) {
      const stats = this.ships.fittedStats(this.profile, fitted?.fitted, propulsion, conditions);
      if (updateMass && !this.isOverridden(massKey)) {
        mass = stats.mass;
        this.els.mass.value = String(mass);
      }
      if (updateInertia && !this.isOverridden(inertiaKey)) {
        this.els.inertia.value = formatNumber(stats.inertiaModifier, 6);
      }
      if (this.side === "target" && updateSig && !this.isOverridden("targetSig")) {
        this.els.targetSig!.value = String(Math.max(1, stats.sigRadius));
      }
    }

    if (!this.isOverridden(speedKey)) {
      const speed = this.ships.maxSpeedForFittedMass(this.profile, fitted?.fitted, mass, propulsion, conditions);
      this.els.speed.value = formatNumber(speed);
    }
    this.updateHullHint(hintModule);
    this.updateAlignTime();
  }

  isOverridden(key: keyof ProfileParamOverrides): boolean {
    return this.overridesValue[key] !== undefined;
  }

  currentFittedPropulsion(fitted: FittedHullSummary): PropulsionStats | undefined {
    if (!fitted.propulsionId || !fitted.propulsion) return undefined;
    if (!this.profile) return undefined;
    const currentId = this.host.currentPropulsionId();
    if (currentId === undefined) return undefined;
    if (currentId === fitted.propulsionId) return fitted.propulsion;
    return this.ships.fittingOption(this.profile, currentId);
  }

  currentFittedPropulsionModule(fitted: FittedHullSummary): PropulsionModule | undefined {
    if (!this.profile || !fitted.propulsionId) return undefined;
    const currentId = this.host.currentPropulsionId();
    if (currentId === undefined) return undefined;
    return this.ships.fittingOption(this.profile, currentId);
  }

  updateSpeedFromMass(): void {
    const speedKey: keyof ProfileParamOverrides = this.side === "attacker" ? "attackerSpeed" : "targetSpeed";
    if (this.isOverridden(speedKey)) return;
    if (!this.profile) return;
    const fitted = this.fittedHull;
    const conditions = this.host.skillConditions();
    const mass = num(this.els.mass);
    const propulsion = fitted ? this.currentFittedPropulsion(fitted) : this.host.currentPropulsionModule();
    const speed = this.ships.maxSpeedForFittedMass(this.profile, fitted?.fitted, mass, propulsion, conditions);
    this.els.speed.value = formatNumber(speed);
    this.updateAlignTime();
  }

  updateAlignTime(): void {
    const mass = num(this.els.mass);
    const inertia = num(this.els.inertia);
    const t = alignTime(mass, inertia);
    const input = this.els.inertia;
    const suffix = this.els.alignTime;
    if (Number.isFinite(t) && t > 0) {
      const value = `${t.toFixed(1)}${this.i18n.t("unit.second")}`;
      suffix.textContent = value;
      input.title = `${this.i18n.t("label.alignTime")}: ${value}`;
    } else {
      suffix.textContent = "";
      input.title = "";
    }
  }

  setHullValidation(isInvalid: boolean): void {
    this.els.hull.classList.toggle("hull-invalid", isInvalid);
  }

  updateHullHint(module?: PropulsionModule): void {
    if (!this.profile) {
      setText(this.els.hullHint, "");
      return;
    }
    const view = this.ships.hullView(this.profile, this.i18n.current());
    let text = `${view.hullType} · ${view.faction}`;
    if (this.side === "target" && module?.kind === "microwarpdrive") {
      text += ` (sig ×${1 + module.sigBloom})`;
    }
    setText(this.els.hullHint, text);
  }

  refreshHullInputs(): void {
    const language = this.i18n.current();
    if (this.profile) {
      this.els.hull.value = this.ships.hullView(this.profile, language).name;
    }
  }

  recordOverride<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void {
    this.overridesValue[key] = value;
  }

  private applyHull(
    profile: ShipProfile,
    propulsionId?: PropulsionSelection,
    persist = false,
    updateStats = true,
  ): void {
    this.profileValue = profile;

    this.els.hull.value = this.ships.hullView(profile, this.i18n.current()).name;
    this.updateShipImage();
    this.setHullValidation(false);
    this.host.updateFittingTrigger(true);
    if (this.host.isFittingPopupOpen()) this.host.renderFittingPopup();
    this.host.renderPropulsionOptions(propulsionId ?? "");

    if (updateStats) {
      this.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    } else {
      this.updateHullHint(this.host.currentPropulsionModule());
    }
    if (persist) {
      this.host.persistConfigChange();
    }
  }
}
