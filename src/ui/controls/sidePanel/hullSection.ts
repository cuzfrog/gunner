import type { ImportedFitting } from "../../../fitting";
import type { ShipProfile, PropulsionModule, Ships } from "../../../ships";
import type { I18n } from "../../i18n";
import type { FittedHullSummary, PropulsionSelection } from "../../../appstate";
import { setText } from "../controlsDom";
import type { Side } from "../side";
import type { SidePanel } from "./sidePanelContract";
import type { IHullSection } from "./sidePanelSections";

export interface HullSectionEls {
  readonly hull: HTMLInputElement;
  readonly hullHint: HTMLElement;
}

export class HullSection implements IHullSection {
  private readonly panel: SidePanel;
  private readonly els: HullSectionEls;
  private readonly ships: Ships;
  private readonly i18n: I18n;

  constructor({
    panel, els, ships, i18n,
  }: { panel: SidePanel; els: HullSectionEls; ships: Ships; i18n: I18n }) {
    this.panel = panel;
    this.els = els;
    this.ships = ships;
    this.i18n = i18n;
    this.els.hull.addEventListener("input", () => this.onHullInput());
    this.els.hull.addEventListener("change", () => this.onHullChange());
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
    this.panel.host.persistConfigChange();
  }

  applyProfile(profile: ShipProfile, persist: boolean, autoSelect = false): void {
    const currentProfile = this.panel.profile;
    const isSameAsCurrent = currentProfile?.name === profile.name;
    const isGenuineChange = this.panel.lastCommittedHull !== profile.name;
    const propulsionId = isSameAsCurrent ? this.panel.sections.propulsion.currentPropulsionSelection() : undefined;
    if (!isSameAsCurrent) this.clearFittedHull();
    this.applyHull(profile, propulsionId, false, !isSameAsCurrent);

    let imported: ImportedFitting | undefined;
    if (isGenuineChange && autoSelect) {
      const text = this.panel.importer.autoLoadFittingTextFor(profile.name);
      if (text) imported = this.panel.importer.importEftFitting(text, { persist: false, showImportedHint: false });
    }

    if (persist) {
      if (autoSelect) this.panel.lastCommittedHull = imported?.profile.name ?? profile.name;
      this.panel.host.persistConfigChange();
    }
  }

  applyHull(profile: ShipProfile, propulsionId?: PropulsionSelection, persist = false, updateStats = true): void {
    this.panel.profile = profile;
    this.els.hull.value = this.ships.hullView(profile, this.i18n.current()).name;
    this.setHullValidation(false);
    this.panel.setFittingEyeEnabled(true);
    this.panel.setConfigInputsEnabled(true);
    this.panel.setTurretProfile(profile);
    this.panel.renderFittingPopupIfOpen();
    this.panel.sections.propulsion.renderPropulsionOptions(propulsionId ?? "");
    if (updateStats) {
      this.panel.sections.stats.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    } else {
      this.updateHullHint();
    }
    if (persist) this.panel.host.persistConfigChange();
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
    this.panel.lastCommittedHull = profile.name;
  }

  clearHull(resetInput: boolean, persist: boolean): void {
    this.panel.profile = undefined;
    this.clearFittedHull();
    this.panel.hideFittingPreview();
    this.panel.lastCommittedHull = undefined;
    if (resetInput) this.els.hull.value = "";
    this.panel.setFittingEyeEnabled(false);
    this.panel.setConfigInputsEnabled(false);
    this.panel.setTurretProfile(undefined);
    this.panel.closeFittingPopupIfOpen();
    this.updateHullHint();
    this.panel.sections.propulsion.renderPropulsionOptions();
    if (persist) this.panel.host.persistConfigChange();
  }

  clearFittedHull(): void {
    this.panel.fittedHull = undefined;
    this.panel.fittingText = undefined;
    this.panel.clearOverrides();
    this.panel.clearTurret();
    this.panel.hideFittingPreview();
    this.panel.sections.paste.clearImportHint();
  }

  setHullValidation(isInvalid: boolean): void {
    this.els.hull.classList.toggle("hull-invalid", isInvalid);
  }

  updateHullHint(
    module: PropulsionModule | undefined = this.panel.sections.stats.currentFittedPropulsionModule(this.panel.fittedHull),
  ): void {
    if (!this.panel.profile) {
      setText(this.els.hullHint, "");
      return;
    }
    const view = this.ships.hullView(this.panel.profile, this.i18n.current());
    let text = `${view.hullType} · ${view.faction}`;
    if (this.panel.side === "shipB" && module?.kind === "microwarpdrive") text += ` (sig ×${1 + module.sigBloom})`;
    setText(this.els.hullHint, text);
  }

  refreshHullInputs(): void {
    if (this.panel.profile) this.els.hull.value = this.ships.hullView(this.panel.profile, this.i18n.current()).name;
  }

  applyImportedFitting(summary: FittedHullSummary): void {
    this.panel.fittedHull = summary;
    this.panel.sections.propulsion.renderPropulsionOptions(summary.propulsionId ?? "");
    this.panel.sections.stats.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
  }

  restoreFittingSummary(summary: FittedHullSummary): void {
    this.panel.fittedHull = summary;
    this.panel.sections.propulsion.renderPropulsionOptions();
    this.panel.sections.paste.clearImportHint();
    this.updateHullHint(this.panel.sections.stats.currentFittedPropulsionModule(summary));
  }
}
