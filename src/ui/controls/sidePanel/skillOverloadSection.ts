import { type DefenseSkills, type SkillLevel, type StatConditions, defaultDefenseSkills } from "../../../ships";
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
  readonly defenseSkills: HTMLElement;
}

export class SkillOverloadSection implements ISkillOverloadSection {
  private readonly panel: SidePanel;
  private readonly els: SkillOverloadSectionEls;
  private readonly i18n: I18n;
  private readonly popupGroup: PopupGroup;
  private skillPopupOpen = false;
  private readonly skillChoice: ChoiceGroupImpl;
  private readonly defenseSkillChoices: ReadonlyMap<DefenseSkillKey, ChoiceGroupImpl>;
  private defenseSkillLevels: DefenseSkills | undefined;
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
    this.defenseSkillChoices = createDefenseSkillChoices(els.defenseSkills, (key, level) => this.onDefenseSkillChange(key, level));
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
    const skillLevel = skillLevelFromString(this.els.skills.value);
    return {
      skillLevel,
      overloaded: this.els.overload.checked,
      weaponOverloaded: this.weaponOverloaded,
      defenseSkills: this.defenseSkillLevels ?? defaultDefenseSkills(skillLevel),
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
      this.panel.restoreDrone();
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

  currentDefenseSkills(): DefenseSkills | undefined {
    return this.defenseSkillLevels;
  }

  setDefenseSkills(skills: DefenseSkills): void {
    this.defenseSkillLevels = skills;
    for (const [key, choice] of this.defenseSkillChoices) {
      const level = skills[key];
      choice.set(String(level));
    }
  }

  resetDefenseSkills(): void {
    this.defenseSkillLevels = undefined;
    const level = this.currentSkillLevel() ?? 5;
    const defaults = defaultDefenseSkills(level);
    for (const [key, choice] of this.defenseSkillChoices) {
      choice.set(String(defaults[key]));
    }
  }

  renderDefenseSkills(): void {
    const container = this.els.defenseSkills;
    container.setAttribute("aria-label", this.i18n.t("label.defenseSkills"));
    for (const { key, labelKey } of DEFENSE_SKILL_KEYS) {
      const label = container.querySelector(`.defense-skill-label[data-skill-key="${key}"]`);
      if (label) label.textContent = this.i18n.t(labelKey);
      const choice = this.defenseSkillChoices.get(key);
      if (!choice) continue;
      const level = this.defenseSkillLevels?.[key] ?? defaultDefenseSkills(this.currentSkillLevel() ?? 5)[key];
      const options: ChoiceGroupOption[] = [];
      for (let lv = 0; lv <= 5; lv++) {
        const skill = skillLevelFromString(String(lv));
        options.push({ value: String(lv), label: String(lv), hint: skillOptionLabel(this.i18n, skill) });
      }
      choice.render(options, String(level));
    }
  }

  private onDefenseSkillChange(key: DefenseSkillKey, level: SkillLevel): void {
    const current = this.defenseSkillLevels ?? defaultDefenseSkills(skillLevelFromString(this.els.skills.value));
    this.defenseSkillLevels = { ...current, [key]: level };
    this.onSkillOrOverloadChange(false);
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

type DefenseSkillKey = keyof DefenseSkills;

const DEFENSE_SKILL_KEYS: readonly { readonly key: DefenseSkillKey; readonly labelKey: string }[] = [
  { key: "shieldManagement", labelKey: "skill.shieldManagement" },
  { key: "shieldOperation", labelKey: "skill.shieldOperation" },
  { key: "hullUpgrades", labelKey: "skill.hullUpgrades" },
  { key: "mechanics", labelKey: "skill.mechanics" },
  { key: "shieldCompensationEm", labelKey: "skill.shieldCompensationEm" },
  { key: "shieldCompensationThermal", labelKey: "skill.shieldCompensationThermal" },
  { key: "shieldCompensationKinetic", labelKey: "skill.shieldCompensationKinetic" },
  { key: "shieldCompensationExplosive", labelKey: "skill.shieldCompensationExplosive" },
  { key: "armorCompensationEm", labelKey: "skill.armorCompensationEm" },
  { key: "armorCompensationThermal", labelKey: "skill.armorCompensationThermal" },
  { key: "armorCompensationKinetic", labelKey: "skill.armorCompensationKinetic" },
  { key: "armorCompensationExplosive", labelKey: "skill.armorCompensationExplosive" },
];

function createDefenseSkillChoices(container: HTMLElement, onChange: (key: DefenseSkillKey, level: SkillLevel) => void): ReadonlyMap<DefenseSkillKey, ChoiceGroupImpl> {
  const choices = new Map<DefenseSkillKey, ChoiceGroupImpl>();
  for (const { key } of DEFENSE_SKILL_KEYS) {
    const row = document.createElement("div");
    row.className = "defense-skill-row";
    row.dataset.skillKey = key;
    const label = document.createElement("span");
    label.className = "defense-skill-label";
    label.dataset.skillKey = key;
    row.appendChild(label);
    const options = document.createElement("div");
    options.className = "defense-skill-options";
    row.appendChild(options);
    container.appendChild(row);
    const choice = new ChoiceGroupImpl({ group: options, shape: { buttonClass: "btn" } });
    options.addEventListener("input", () => {
      const activeValue = Array.from(options.children).find((b) => b.getAttribute("aria-pressed") === "true")?.getAttribute("data-value") ?? "";
      onChange(key, skillLevelFromString(activeValue));
    });
    choices.set(key, choice);
  }
  return choices;
}
