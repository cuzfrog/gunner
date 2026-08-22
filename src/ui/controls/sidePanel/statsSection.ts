import type { PropulsionId, PropulsionModule, PropulsionStats, Ships } from "../../../ships";
import type { I18n } from "../../i18n";
import { type FittedHullSummary, type ProfileParamOverrides } from "../../settings";
import { num } from "../controlsDom";
import { formatNumber } from "../controlsFormat";
import type { Side } from "./side";
import type { ISidePanel } from "./sidePanelContract";
import type { IStatsSection } from "./sidePanelSections";

export interface StatsSectionEls {
  readonly speed: HTMLInputElement;
  readonly mass: HTMLInputElement;
  readonly inertia: HTMLInputElement;
  readonly alignTime: HTMLElement;
  readonly targetSig?: HTMLInputElement;
}

export class StatsSection implements IStatsSection {
  private readonly panel: ISidePanel;
  private readonly els: StatsSectionEls;
  private readonly ships: Ships;
  private readonly i18n: I18n;

  constructor({ panel, els, ships, i18n }: { panel: ISidePanel; els: StatsSectionEls; ships: Ships; i18n: I18n }) {
    this.panel = panel;
    this.els = els;
    this.ships = ships;
    this.i18n = i18n;
  }

  updateShipStats({ updateInertia, updateMass, updateSig }: { updateInertia: boolean; updateMass: boolean; updateSig: boolean }): void {
    if (!this.panel.profile) return;
    const fitted = this.panel.fittedHull;
    const propulsion = fitted ? this.currentFittedPropulsion(fitted) : this.panel.sections.propulsion.currentPropulsionModule();
    const hintModule = fitted ? this.currentFittedPropulsionModule(fitted) : this.panel.sections.propulsion.currentPropulsionModule();
    const conditions = this.panel.sections.skill.skillConditions();
    const massKey: keyof ProfileParamOverrides = this.panel.side === "attacker" ? "attackerMass" : "targetMass";
    const inertiaKey: keyof ProfileParamOverrides = this.panel.side === "attacker" ? "attackerInertia" : "targetInertia";
    const speedKey: keyof ProfileParamOverrides = this.panel.side === "attacker" ? "attackerSpeed" : "targetSpeed";
    let mass = num(this.els.mass);

    if (updateMass || updateInertia || (this.panel.side === "target" && updateSig)) {
      const stats = this.ships.fittedStats(this.panel.profile, fitted?.fitted, propulsion, conditions);
      if (updateMass && !this.isOverridden(massKey)) {
        mass = stats.mass;
        this.els.mass.value = String(mass);
      }
      if (updateInertia && !this.isOverridden(inertiaKey)) {
        this.els.inertia.value = formatNumber(stats.inertiaModifier, 6);
      }
      if (this.panel.side === "target" && updateSig && this.els.targetSig !== undefined && !this.isOverridden("targetSig")) {
        this.els.targetSig.value = String(Math.max(1, stats.sigRadius));
      }
    }

    if (!this.isOverridden(speedKey)) {
      const speed = this.ships.maxSpeedForFittedMass(this.panel.profile, fitted?.fitted, mass, propulsion, conditions);
      this.els.speed.value = formatNumber(speed);
    }
    this.panel.sections.hull.updateHullHint(hintModule);
    this.updateAlignTime();
  }

  updateSpeedFromMass(): void {
    const speedKey: keyof ProfileParamOverrides = this.panel.side === "attacker" ? "attackerSpeed" : "targetSpeed";
    if (this.isOverridden(speedKey)) return;
    if (!this.panel.profile) return;
    const fitted = this.panel.fittedHull;
    const conditions = this.panel.sections.skill.skillConditions();
    const mass = num(this.els.mass);
    const propulsion = fitted ? this.currentFittedPropulsion(fitted) : this.panel.sections.propulsion.currentPropulsionModule();
    const speed = this.ships.maxSpeedForFittedMass(this.panel.profile, fitted?.fitted, mass, propulsion, conditions);
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

  isOverridden(key: keyof ProfileParamOverrides): boolean {
    return this.panel.overrides[key] !== undefined;
  }

  currentFittedPropulsion(fitted: FittedHullSummary): PropulsionStats | undefined {
    if (!fitted.propulsionId || !fitted.propulsion) return undefined;
    if (!this.panel.profile) return undefined;
    const currentId = this.panel.sections.propulsion.currentPropulsionId();
    if (currentId === undefined) return undefined;
    if (currentId === fitted.propulsionId) return fitted.propulsion;
    return this.ships.fittingOption(this.panel.profile, currentId);
  }

  currentFittedPropulsionModule(fitted: FittedHullSummary | undefined): PropulsionModule | undefined {
    if (!this.panel.profile || !fitted?.propulsionId) return undefined;
    const currentId = this.panel.sections.propulsion.currentPropulsionId();
    if (currentId === undefined) return undefined;
    return this.ships.fittingOption(this.panel.profile, currentId);
  }
}
