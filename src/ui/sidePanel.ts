import type { FittedHull, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, Ships, SkillLevel, StatConditions } from "../ships";
import type { FittingImport, ImportedFitting } from "../fitting";
import { isHtmlButtonElement, num, setText } from "./controlsDom";
import { escapeHtml, formatNumber, propulsionOptionLabel, skillLevelFromString, skillOptionLabel } from "./controlsFormat";
import type { I18n } from "./i18n";
import type { ImageCatalog } from "./imageCatalog";
import { PROPULSION_NONE, type FittedHullSummary, type ProfileParamOverrides, type PropulsionSelection } from "./settings";
import type { SavedFitting } from "./savedFittings";
import type { TimeoutId, Timer } from "./timer";
import { PopupGroup, type Popup } from "./popupGroup";

export type Side = "attacker" | "target";

export interface PanelView {
  readonly profile: ShipProfile | undefined;
  readonly fittingText: string | undefined;
  skillConditions(): StatConditions;
}

export interface FittingPopupControl {
  readonly popup: Popup;
  renderIfOpen(): void;
  closeIfOpen(): void;
}

export interface FittingPreviewControl {
  hide(side: Side): void;
}

export interface SidePanelHost {
  updateFittingTrigger(enabled: boolean): void;
  onAttackerFittedHullCleared(): void;
  importEftFitting(text: string, persist: boolean): ImportedFitting | undefined;
  mostRecentFittingFor(hullName: string): SavedFitting | undefined;
  persistConfigChange(notify?: boolean): void;
  restoreAttackerTurret(): void;
  importFittingFromText(text: string): Promise<void>;
  importFitting(): Promise<void>;
}

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
  readonly skills: HTMLSelectElement;
  readonly skillOptions: HTMLElement;
  readonly skillSummary: HTMLElement;
  readonly skillTrigger: HTMLButtonElement;
  readonly skillPopup: HTMLElement;
  readonly overload: HTMLInputElement;
  readonly overloadButton: HTMLButtonElement;
  readonly pastePopup: HTMLElement;
  readonly pasteInput: HTMLTextAreaElement;
  readonly importFitting: HTMLButtonElement;
  readonly propulsion: HTMLSelectElement;
  readonly propulsionOptions: HTMLElement;
  readonly propulsionGear: HTMLButtonElement;
  readonly propulsionVariants: HTMLElement;
}

export class SidePanel implements PanelView {
  private readonly side: Side;
  private readonly host: SidePanelHost;
  private readonly els: SidePanelElements;
  private readonly i18n: I18n;
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly imageCatalog: ImageCatalog;
  private readonly timer: Timer;
  private profileValue?: ShipProfile;
  private fittedHullValue?: FittedHullSummary;
  private fittingTextValue?: string;
  private overridesValue: Partial<ProfileParamOverrides> = {};
  private lastCommittedHullValue?: string;
  private skillPopupOpen = false;
  private pastePopupOpen = false;
  private propulsionVariantPopupOpen = false;
  private importHintTimeout?: TimeoutId;
  private fittingPopup?: FittingPopupControl;
  private fittingPreview?: FittingPreviewControl;
  private readonly popupGroup: PopupGroup;
  private readonly skillPopup: Popup;
  private readonly pastePopup: Popup;
  private readonly propulsionVariantPopup: Popup;

  constructor({
    side,
    host,
    popupGroup,
    els,
    i18n,
    ships,
    fittingImport,
    imageCatalog,
    timer,
  }: {
    side: Side;
    host: SidePanelHost;
    popupGroup: PopupGroup;
    els: SidePanelElements;
    i18n: I18n;
    ships: Ships;
    fittingImport: FittingImport;
    imageCatalog: ImageCatalog;
    timer: Timer;
  }) {
    this.side = side;
    this.host = host;
    this.popupGroup = popupGroup;
    this.els = els;
    this.i18n = i18n;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.imageCatalog = imageCatalog;
    this.timer = timer;
    this.skillPopup = this.createSkillPopup();
    this.pastePopup = this.createPastePopup();
    this.propulsionVariantPopup = this.createPropulsionVariantPopup();
    this.popupGroup.register(this.skillPopup);
    this.popupGroup.register(this.pastePopup);
    this.popupGroup.register(this.propulsionVariantPopup);
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

  getSkillPopup(): Popup {
    return this.skillPopup;
  }

  getPastePopup(): Popup {
    return this.pastePopup;
  }

  getPropulsionVariantPopup(): Popup {
    return this.propulsionVariantPopup;
  }

  setFittingPopup(popup: FittingPopupControl): void {
    this.fittingPopup = popup;
  }

  setFittingPreview(preview: FittingPreviewControl): void {
    this.fittingPreview = preview;
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
    const propulsionId = isSameAsCurrent ? this.currentPropulsionSelection() : undefined;
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
    this.renderPropulsionOptions(summary.propulsionId ?? "");
    this.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
  }

  restoreFittingSummary(summary: FittedHullSummary): void {
    this.fittedHull = summary;
    this.renderPropulsionOptions();
    this.clearImportHint();
    this.updateHullHint(this.currentFittedPropulsionModule(summary));
  }

  clearHull(resetInput: boolean, persist: boolean): void {
    this.profileValue = undefined;
    this.clearFittedHull();
    this.fittingPreview?.hide(this.side);
    this.clearShipImage();
    this.lastCommittedHull = undefined;

    if (resetInput) {
      this.els.hull.value = "";
    }
    this.host.updateFittingTrigger(false);
    this.fittingPopup?.closeIfOpen();
    this.updateHullHint();
    this.renderPropulsionOptions();
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
    this.fittingPreview?.hide(this.side);
    this.clearImportHint();
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
    const propulsion = fitted ? this.currentFittedPropulsion(fitted) : this.currentPropulsionModule();
    const hintModule = fitted ? this.currentFittedPropulsionModule(fitted) : this.currentPropulsionModule();
    const conditions = this.skillConditions();
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
    const currentId = this.currentPropulsionId();
    if (currentId === undefined) return undefined;
    if (currentId === fitted.propulsionId) return fitted.propulsion;
    return this.ships.fittingOption(this.profile, currentId);
  }

  currentFittedPropulsionModule(fitted: FittedHullSummary): PropulsionModule | undefined {
    if (!this.profile || !fitted.propulsionId) return undefined;
    const currentId = this.currentPropulsionId();
    if (currentId === undefined) return undefined;
    return this.ships.fittingOption(this.profile, currentId);
  }

  updateSpeedFromMass(): void {
    const speedKey: keyof ProfileParamOverrides = this.side === "attacker" ? "attackerSpeed" : "targetSpeed";
    if (this.isOverridden(speedKey)) return;
    if (!this.profile) return;
    const fitted = this.fittedHull;
    const conditions = this.skillConditions();
    const mass = num(this.els.mass);
    const propulsion = fitted ? this.currentFittedPropulsion(fitted) : this.currentPropulsionModule();
    const speed = this.ships.maxSpeedForFittedMass(this.profile, fitted?.fitted, mass, propulsion, conditions);
    this.els.speed.value = formatNumber(speed);
    this.updateAlignTime();
  }

  updateAlignTime(): void {
    const mass = num(this.els.mass);
    const inertia = num(this.els.inertia);
    const t = this.ships.alignTime(mass, inertia);
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

  updateHullHint(module: PropulsionModule | undefined = this.currentPropulsionModule()): void {
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

  skillConditions(): StatConditions {
    return {
      skillLevel: skillLevelFromString(this.els.skills.value),
      overloaded: this.els.overload.checked,
    };
  }

  setOverloadDisabled(): void {
    const disabled = this.currentPropulsionId() === undefined;
    const active = !disabled && this.els.overload.checked;
    this.els.overloadButton.classList.toggle("active", active);
    this.els.overloadButton.setAttribute("aria-pressed", String(active));
    this.els.overload.disabled = disabled;
    this.els.overloadButton.disabled = disabled;
    this.els.overloadButton.setAttribute("aria-disabled", String(disabled));
  }

  currentPropulsionSelection(): PropulsionSelection | undefined {
    const value = this.els.propulsion.value;
    if (value === PROPULSION_NONE) return PROPULSION_NONE;
    return this.ships.parsePropulsionId(value);
  }

  renderPropulsionOptions(selectedId: string = this.currentPropulsionSelection() ?? ""): void {
    const profile = this.profile;
    const select = this.els.propulsion;
    const group = this.els.propulsionOptions;
    const gear = this.els.propulsionGear;
    select.innerHTML = "";
    group.innerHTML = "";
    group.setAttribute("aria-label", this.i18n.t("label.propulsion"));
    select.disabled = !profile;

    const all = this.ships.allFittingOptions();
    const modules = profile ? this.ships.fittingOptions(profile) : all.slice(0, 3);
    const moduleSet = new Set(modules.map((module) => module.id));
    const selectedPropulsionId = this.ships.parsePropulsionId(selectedId);
    const noneRequested = selectedId === PROPULSION_NONE;
    let selected = "";

    for (const module of modules) {
      const option = document.createElement("option");
      option.value = module.id;
      option.textContent = propulsionOptionLabel(module);
      select.appendChild(option);
      const button = this.createPropulsionButton(group, module, () => this.onPropulsionButtonClick(module.id));
      button.disabled = !profile;
      button.setAttribute("aria-disabled", String(!profile));
    }

    const noneOption = document.createElement("option");
    noneOption.value = PROPULSION_NONE;
    noneOption.hidden = true;
    select.appendChild(noneOption);

    if (profile) {
      selected = noneRequested
        ? PROPULSION_NONE
        : selectedPropulsionId && moduleSet.has(selectedPropulsionId)
          ? selectedPropulsionId
          : (modules[0]?.id ?? "");
    }

    select.value = selected;
    this.setPropulsionActive(selected);
    gear.disabled = !profile || selected === PROPULSION_NONE || selected === "";
    this.renderPropulsionVariants();
    this.setOverloadDisabled();
    const popup = this.els.propulsionVariants;
    popup.hidden = true;
    gear.setAttribute("aria-expanded", "false");
    this.propulsionVariantPopupOpen = false;
  }

  onPropulsionChange(): void {
    const profile = this.profile;
    if (!profile) return;
    const propulsionId = this.currentPropulsionId();
    const fitted = this.fittedHull;
    let updated: FittedHullSummary | undefined;
    if (propulsionId) {
      const module = this.ships.fittingOption(profile, propulsionId);
      if (module) {
        const propulsionName = this.defaultPropulsionName(module);
        const propulsion = this.fittingImport.propulsionStats(propulsionName) ?? module;
        updated = {
          fittingName: fitted?.fittingName ?? "",
          fitted: fitted?.fitted ?? this.nakedFitted(profile),
          propulsionId,
          propulsionName,
          propulsion,
        };
      }
    } else if (fitted) {
      updated = fitted.fittingName ? { ...fitted, propulsionId: undefined, propulsionName: undefined, propulsion: undefined } : undefined;
    }
    if (updated) {
      this.fittedHull = updated;
    } else if (!propulsionId && fitted && !fitted.fittingName) {
      this.fittedHull = undefined;
    }
    this.updateShipStats({ updateInertia: false, updateMass: true, updateSig: true });
    this.setOverloadDisabled();
    this.updatePropulsionVariantUI();
    this.host.persistConfigChange();
  }

  closePropulsionVariantPopup(): void {
    this.els.propulsionVariants.hidden = true;
    this.els.propulsionGear.setAttribute("aria-expanded", "false");
    this.propulsionVariantPopupOpen = false;
  }

  isPropulsionVariantPopupOpen(): boolean {
    return this.propulsionVariantPopupOpen;
  }

  onSkillOrOverloadChange(updateInertia: boolean): void {
    this.updateShipStats({ updateInertia, updateMass: false, updateSig: false });
    if (this.side === "attacker" && this.profile && this.fittingText) {
      this.host.restoreAttackerTurret();
    }
    this.host.persistConfigChange(this.profile !== undefined);
  }

  setSkillLevel(level: SkillLevel): void {
    this.els.skills.value = String(level);
    this.setSkillActive(level);
  }

  setSkillActive(level: SkillLevel): void {
    const group = this.els.skillOptions;
    const value = String(level);
    for (const button of group.children) {
      const active = button.getAttribute("data-value") === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    const summary = skillOptionLabel(this.i18n, level);
    setText(this.els.skillSummary, summary);
  }

  openSkillPopup(): void {
    const popup = this.els.skillPopup;
    const trigger = this.els.skillTrigger;
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.skillPopupOpen = true;
    const active = Array.from(this.els.skillOptions.children).find((button) => button.getAttribute("aria-pressed") === "true");
    const activeButton = active && isHtmlButtonElement(active) ? active : undefined;
    activeButton?.focus();
  }

  closeSkillPopup(): void {
    this.els.skillPopup.hidden = true;
    this.els.skillTrigger.setAttribute("aria-expanded", "false");
    this.skillPopupOpen = false;
  }

  isSkillPopupOpen(): boolean {
    return this.skillPopupOpen;
  }

  openPastePopup(): void {
    this.els.pastePopup.hidden = false;
    this.els.pasteInput.focus();
    this.pastePopupOpen = true;
  }

  closePastePopup(): void {
    this.els.pastePopup.hidden = true;
    this.els.pasteInput.blur();
    this.pastePopupOpen = false;
  }

  isPastePopupOpen(): boolean {
    return this.pastePopupOpen;
  }

  onPastePopupPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    this.closePastePopup();
    void this.host.importFittingFromText(text);
  }

  setOverloadActive(active: boolean): void {
    this.els.overload.checked = active;
    this.els.overloadButton.classList.toggle("active", active);
    this.els.overloadButton.setAttribute("aria-pressed", String(active));
  }

  onOverloadButtonClick(): void {
    const input = this.els.overload;
    this.setOverloadActive(!input.checked);
    input.dispatchEvent(new Event("change"));
  }

  onSkillButtonClick(level: SkillLevel): void {
    this.setSkillActive(level);
    this.els.skills.value = String(level);
    this.els.skills.dispatchEvent(new Event("change"));
    this.closeSkillPopup();
    this.els.skillTrigger.focus();
  }

  onImportFittingClick(): void {
    void this.host.importFitting();
  }

  currentSkillLevel(): SkillLevel | undefined {
    const value = this.els.skills.value;
    if (value === "") return undefined;
    const level = skillLevelFromString(value);
    if (level === 0 && value !== "0") return undefined;
    return level;
  }

  renderSkillOptions(selectedValue: SkillLevel = this.currentSkillLevel() ?? 5): void {
    const select = this.els.skills;
    const group = this.els.skillOptions;
    const selected = String(selectedValue);
    select.innerHTML = "";
    group.innerHTML = "";
    group.setAttribute("aria-label", this.i18n.t("label.skillLevel"));
    for (let level = 0; level <= 5; level++) {
      const skill = skillLevelFromString(String(level));
      const option = document.createElement("option");
      option.value = String(level);
      option.textContent = skillOptionLabel(this.i18n, skill);
      select.appendChild(option);
      const button = this.createButton(group, String(level), String(level), () => this.onSkillButtonClick(skill));
      button.title = skillOptionLabel(this.i18n, skill);
    }
    select.value = selected;
    this.setSkillActive(skillLevelFromString(selected));
  }

  showImportHint(key: string, isError = false): void {
    this.clearImportHintTimeout();
    const element = this.els.fittingName;
    element.classList.toggle("error", isError);
    element.innerHTML = `<span class="fitting-name-value">${escapeHtml(this.i18n.t(key))}</span>`;
    element.hidden = false;
    this.importHintTimeout = this.timer.setTimeout(() => {
      this.importHintTimeout = undefined;
      this.clearImportHint();
    }, 5000);
  }

  clearImportHint(): void {
    this.clearImportHintTimeout();
    const element = this.els.fittingName;
    element.classList.toggle("error", false);
    element.innerHTML = "";
    element.hidden = true;
  }

  clearImportHintTimeout(): void {
    if (this.importHintTimeout) {
      this.timer.clearTimeout(this.importHintTimeout);
      this.importHintTimeout = undefined;
    }
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
    this.fittingPopup?.renderIfOpen();
    this.renderPropulsionOptions(propulsionId ?? "");

    if (updateStats) {
      this.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    } else {
      this.updateHullHint();
    }
    if (persist) {
      this.host.persistConfigChange();
    }
  }

  private currentPropulsionId(): PropulsionId | undefined {
    const selection = this.currentPropulsionSelection();
    return selection === PROPULSION_NONE ? undefined : selection;
  }

  private currentPropulsionModule(): PropulsionModule | undefined {
    if (!this.profile) return undefined;
    const id = this.currentPropulsionId();
    if (!id) return undefined;
    return this.ships.fittingOption(this.profile, id);
  }

  private setPropulsionActive(propulsionId: string): void {
    const select = this.els.propulsion;
    const group = this.els.propulsionOptions;
    select.value = propulsionId;
    for (const button of group.children) {
      const active = button.getAttribute("data-value") === propulsionId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }

  private onPropulsionButtonClick(propulsionId: string): void {
    const profile = this.profile;
    if (!profile) return;
    const id = this.ships.parsePropulsionId(propulsionId);
    if (!id || !this.ships.fittingOption(profile, id)) return;
    const currentId = this.currentPropulsionId();
    const next = currentId === id ? PROPULSION_NONE : id;
    this.setPropulsionActive(next);
    this.els.propulsion.dispatchEvent(new Event("change"));
  }

  private createPropulsionButton(container: HTMLElement, module: PropulsionModule, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-value", module.id);
    button.setAttribute("aria-pressed", "false");
    const text = propulsionOptionLabel(module);
    button.setAttribute("title", text);
    const iconUrl = this.imageCatalog.itemIconUrl(module.label);
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "propulsion-icon";
      icon.src = iconUrl;
      icon.alt = "";
      button.appendChild(icon);
    }
    const label = document.createElement("span");
    label.textContent = text;
    button.appendChild(label);
    button.addEventListener("click", onClick);
    container.appendChild(button);
    return button;
  }

  private updatePropulsionVariantUI(): void {
    const gear = this.els.propulsionGear;
    const id = this.currentPropulsionId();
    gear.disabled = !id;
    this.renderPropulsionVariants();
  }

  private renderPropulsionVariants(): void {
    const popup = this.els.propulsionVariants;
    const module = this.currentPropulsionModule();
    popup.innerHTML = "";
    if (!module) return;
    const fitted = this.fittedHull;
    const currentName = fitted?.propulsionName ?? this.defaultPropulsionName(module);
    for (const name of this.fittingImport.propulsionVariantNames(module)) {
      const iconUrl = this.imageCatalog.itemIconUrl(name);
      const item = this.createVariantButton(name, currentName, iconUrl, () => this.onPropulsionVariantClick(name));
      item.setAttribute("data-value", name);
      item.setAttribute("title", name);
      popup.appendChild(item);
    }
  }

  private onPropulsionVariantClick(name: string): void {
    const profile = this.profile;
    const propulsion = this.fittingImport.propulsionStats(name);
    const propulsionId = this.currentPropulsionId();
    if (!profile || !propulsion || !propulsionId) return;
    const fitted = this.fittedHull;
    const updated: FittedHullSummary = {
      fittingName: fitted?.fittingName ?? "",
      fitted: fitted?.fitted ?? this.nakedFitted(profile),
      propulsionId,
      propulsionName: name,
      propulsion,
    };
    this.fittedHull = updated;
    this.updateShipStats({ updateInertia: false, updateMass: true, updateSig: true });
    this.setOverloadDisabled();
    this.renderPropulsionVariants();
    this.host.persistConfigChange();
  }

  private openPropulsionVariantPopup(): void {
    const popup = this.els.propulsionVariants;
    const gear = this.els.propulsionGear;
    this.renderPropulsionVariants();
    popup.hidden = false;
    gear.setAttribute("aria-expanded", "true");
    this.propulsionVariantPopupOpen = true;
    const active = Array.from(popup.children).find((child) => child.getAttribute("aria-current") === "true");
    const activeButton = active && isHtmlButtonElement(active) ? active : null;
    const firstChild = popup.firstElementChild;
    const firstButton = firstChild && isHtmlButtonElement(firstChild) ? firstChild : null;
    (activeButton ?? firstButton)?.focus();
  }

  private defaultPropulsionName(module: PropulsionModule): string {
    const names = this.fittingImport.propulsionVariantNames(module);
    return names.find((name) => name === module.label) ?? names[0] ?? module.label;
  }

  private nakedFitted(profile: ShipProfile): FittedHull {
    return { mass: profile.mass, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };
  }

  private createVariantButton(name: string, currentName: string, iconUrl: string | undefined, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fitting-item";
    button.setAttribute("role", "menuitem");
    if (currentName === name) button.setAttribute("aria-current", "true");
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "propulsion-icon";
      icon.src = iconUrl;
      icon.alt = "";
      button.appendChild(icon);
    }
    const span = document.createElement("span");
    span.className = "fitting-item-name";
    span.textContent = name;
    span.title = name;
    button.appendChild(span);
    button.addEventListener("click", onClick);
    return button;
  }

  private createSkillPopup(): Popup {
    return {
      isOpen: () => this.isSkillPopupOpen(),
      open: () => this.openSkillPopup(),
      close: () => this.closeSkillPopup(),
      focusTrigger: () => this.els.skillTrigger.focus(),
      contains: (target) => target instanceof Element && target.closest(`#${this.side}-skill-field`) !== null,
    };
  }

  private createPastePopup(): Popup {
    return {
      isOpen: () => this.isPastePopupOpen(),
      open: () => this.openPastePopup(),
      close: () => this.closePastePopup(),
      focusTrigger: () => this.els.importFitting.focus(),
      contains: (target) => target instanceof Element && target.closest(`#${this.side}-paste-popup, #${this.side}-import-fitting`) !== null,
    };
  }

  private createPropulsionVariantPopup(): Popup {
    return {
      isOpen: () => this.isPropulsionVariantPopupOpen(),
      open: () => this.openPropulsionVariantPopup(),
      close: () => this.closePropulsionVariantPopup(),
      focusTrigger: () => this.els.propulsionGear.focus(),
      contains: (target) =>
        target instanceof Element && target.closest(`#${this.side}-propulsion-variants, #${this.side}-propulsion-gear`) !== null,
    };
  }
}
