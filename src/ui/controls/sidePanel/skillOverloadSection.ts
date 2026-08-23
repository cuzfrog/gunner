import type { SkillLevel, StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import { isHtmlButtonElement } from "../controlsDom";
import { skillLevelFromString, skillOptionLabel } from "../controlsFormat";
import type { Popup } from "./popup";
import type { Side } from "./side";
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
}

export class SkillOverloadSection implements ISkillOverloadSection {
  private readonly panel: SidePanel;
  private readonly els: SkillOverloadSectionEls;
  private readonly i18n: I18n;
  private skillPopupOpen = false;
  readonly popup: Popup;

  constructor({ panel, els, i18n }: { panel: SidePanel; els: SkillOverloadSectionEls; i18n: I18n }) {
    this.panel = panel;
    this.els = els;
    this.i18n = i18n;
    this.popup = this.createSkillPopup();
  }

  skillConditions(): StatConditions {
    return {
      skillLevel: skillLevelFromString(this.els.skills.value),
      overloaded: this.els.overload.checked,
    };
  }

  setOverloadDisabled(): void {
    const disabled = this.panel.sections.propulsion.currentPropulsionId() === undefined;
    const active = !disabled && this.els.overload.checked;
    this.els.overloadButton.classList.toggle("active", active);
    this.els.overloadButton.setAttribute("aria-pressed", String(active));
    this.els.overload.disabled = disabled;
    this.els.overloadButton.disabled = disabled;
    this.els.overloadButton.setAttribute("aria-disabled", String(disabled));
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

  onSkillOrOverloadChange(updateInertia: boolean): void {
    this.panel.sections.stats.updateShipStats({ updateInertia, updateMass: false, updateSig: false });
    if (this.panel.side === "attacker" && this.panel.profile && this.panel.fittingText) {
      this.panel.restoreTurret();
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
    const group = this.els.skillOptions;
    const value = String(level);
    for (const button of group.children) {
      const active = button.getAttribute("data-value") === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    const summary = skillOptionLabel(this.i18n, level);
    this.els.skillSummary.textContent = summary;
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
      const button = this.createSkillButton(group, String(level), String(level), () => this.onSkillButtonClick(skill));
      button.title = skillOptionLabel(this.i18n, skill);
    }
    select.value = selected;
    this.setSkillActive(skillLevelFromString(selected));
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

  onSkillButtonClick(level: SkillLevel): void {
    this.setSkillActive(level);
    this.els.skills.value = String(level);
    this.els.skills.dispatchEvent(new Event("change"));
    this.closeSkillPopup();
    this.els.skillTrigger.focus();
  }

  private createSkillButton(container: HTMLElement, value: string, text: string, onClick: () => void): HTMLButtonElement {
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

  private createSkillPopup(): Popup {
    return {
      isOpen: () => this.isSkillPopupOpen(),
      open: () => this.openSkillPopup(),
      close: () => this.closeSkillPopup(),
      focusTrigger: () => this.els.skillTrigger.focus(),
      contains: (target) => target instanceof Element && target.closest(`#${this.panel.side}-skill-field`) !== null,
    };
  }
}
