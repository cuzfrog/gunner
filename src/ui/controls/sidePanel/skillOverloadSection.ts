import type { SkillLevel, StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import { isHtmlButtonElement } from "../controlsDom";
import { skillLevelFromString, skillOptionLabel } from "../controlsFormat";
import { ChoiceGroupImpl, type ChoiceGroupOption } from "../choiceGroup";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";
import type { SidePanel } from "./sidePanelContract";
import type { ISkillOverloadSection } from "./sidePanelSections";

export interface SkillOverloadSectionEls {
  readonly skills: HTMLSelectElement;
  readonly skillOptions: HTMLElement;
  readonly skillSummary: HTMLElement;
  readonly skillTrigger: HTMLButtonElement;
  readonly skillPopup: HTMLElement;
  readonly overload: HTMLInputElement;
  readonly overloadButton: HTMLButtonElement;
  readonly turretWeaponOverloadButton: HTMLButtonElement;
  readonly launcherWeaponOverloadButton: HTMLButtonElement;
}

export class SkillOverloadSection implements ISkillOverloadSection {
  private readonly panel: SidePanel;
  private readonly els: SkillOverloadSectionEls;
  private readonly i18n: I18n;
  private readonly popupGroup: PopupGroup;
  private skillPopupOpen = false;
  private readonly skillChoice: ChoiceGroupImpl;
  private weaponOverloaded = false;
  readonly popup: Popup;

  constructor({ panel, els, i18n, popupGroup }: { panel: SidePanel; els: SkillOverloadSectionEls; i18n: I18n; popupGroup: PopupGroup }) {
    this.panel = panel;
    this.els = els;
    this.i18n = i18n;
    this.popupGroup = popupGroup;
    this.skillChoice = new ChoiceGroupImpl({
      group: els.skillOptions,
      select: els.skills,
      shape: { buttonClass: "btn" },
    });
    this.popup = this.createSkillPopup();
    this.els.skills.addEventListener("input", () => {
      this.onSkillOrOverloadChange(true);
      this.onSkillChoiceInput();
    });
    this.els.overload.addEventListener("change", () => this.onSkillOrOverloadChange(false));
    this.els.overloadButton.addEventListener("click", () => this.onOverloadButtonClick());
    this.els.turretWeaponOverloadButton.addEventListener("click", () => this.onWeaponOverloadButtonClick());
    this.els.launcherWeaponOverloadButton.addEventListener("click", () => this.onWeaponOverloadButtonClick());
    this.els.skillTrigger.addEventListener("click", () => this.popupGroup.toggle(this.popup));
  }

  skillConditions(): StatConditions {
    return {
      skillLevel: skillLevelFromString(this.els.skills.value),
      overloaded: this.els.overload.checked,
      weaponOverloaded: this.weaponOverloaded,
    };
  }

  setWeaponOverloaded(overloaded: boolean): void {
    this.weaponOverloaded = overloaded;
    this.setWeaponOverloadActive(overloaded);
  }

  isWeaponOverloaded(): boolean {
    return this.weaponOverloaded;
  }

  setWeaponOverloadActive(active: boolean): void {
    this.els.turretWeaponOverloadButton.setAttribute("aria-pressed", String(active));
    this.els.launcherWeaponOverloadButton.setAttribute("aria-pressed", String(active));
  }

  onWeaponOverloadButtonClick(): void {
    this.setWeaponOverloaded(!this.weaponOverloaded);
    this.onSkillOrOverloadChange(false);
  }

  setOverloadDisabled(): void {
    const disabled = this.panel.sections.propulsion.currentPropulsionId() === undefined;
    const active = !disabled && this.els.overload.checked;
    this.els.overloadButton.setAttribute("aria-pressed", String(active));
    this.els.overload.disabled = disabled;
    this.els.overloadButton.disabled = disabled;
    this.els.overloadButton.setAttribute("aria-disabled", String(disabled));
  }

  setOverloadActive(active: boolean): void {
    this.els.overload.checked = active;
    this.els.overloadButton.setAttribute("aria-pressed", String(active));
  }

  onOverloadButtonClick(): void {
    const input = this.els.overload;
    this.setOverloadActive(!input.checked);
    input.dispatchEvent(new Event("change"));
  }

  onSkillOrOverloadChange(updateInertia: boolean): void {
    this.panel.sections.stats.updateShipStats({ updateInertia, updateMass: false, updateSig: false });
    if (this.panel.profile && this.panel.fittingText) {
      this.panel.restoreTurret();
      this.panel.restoreLauncher();
    }
    this.panel.host.persistConfigChange(this.panel.profile !== undefined);
  }

  currentSkillLevel(): SkillLevel | undefined {
    const value = this.els.skills.value;
    if (value === "") return undefined;
    const level = skillLevelFromString(value);
    if (level === 0 && value !== "0") return undefined;
    return level;
  }

  setSkillLevel(level: SkillLevel): void {
    this.els.skills.value = String(level);
    this.setSkillActive(level);
  }

  setSkillActive(level: SkillLevel): void {
    this.skillChoice.set(String(level));
    const summary = skillOptionLabel(this.i18n, level);
    this.els.skillSummary.textContent = summary;
  }

  renderSkillOptions(selectedValue: SkillLevel = this.currentSkillLevel() ?? 5): void {
    const group = this.els.skillOptions;
    group.setAttribute("aria-label", this.i18n.t("label.skillLevel"));
    const options: ChoiceGroupOption[] = [];
    for (let level = 0; level <= 5; level++) {
      const skill = skillLevelFromString(String(level));
      const label = skillOptionLabel(this.i18n, skill);
      options.push({ value: String(level), label: String(level), hint: label });
    }
    this.skillChoice.render(options, String(selectedValue));
    const summary = skillOptionLabel(this.i18n, selectedValue);
    this.els.skillSummary.textContent = summary;
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

  onSkillChoiceInput(): void {
    this.closeSkillPopup();
    this.els.skillTrigger.focus();
  }

  private createSkillPopup(): Popup {
    const id = sideId(this.panel.side);
    return {
      isOpen: () => this.isSkillPopupOpen(),
      open: () => this.openSkillPopup(),
      close: () => this.closeSkillPopup(),
      focusTrigger: () => this.els.skillTrigger.focus(),
      contains: (domTarget) => domTarget instanceof Element && domTarget.closest(`#${id}-skill-field`) !== null,
    };
  }
}

function sideId(side: Side): "ship-a" | "ship-b" {
  return side === "shipA" ? "ship-a" : "ship-b";
}
