import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { DefenseSkills, ShipProfile, Ships, SkillLevel, StatConditions, TargetingSkills } from "../../../ships";
import type { AutopilotMode, SensorBoostLoadout, SensorSpec, SimValueParser } from "../../../sim";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { FittedHullSummary, ProfileParamOverrides, PropulsionSelection, SavedFitting } from "../../../appstate";
import type { ShipId } from "../../../gamedata/ids";
import type { Popup, PopupGroup } from "../popup";
import type { Timer } from "../../timer";
import type { UiEvents } from "../../events";
import type { Side } from "../side";
import type { ISidePanelSections } from "./sidePanelSections";
import type { PanelOverrides } from "./overrides";
import type { PanelTurretLink } from "./turretLink";
import type { PanelLauncherLink } from "./launcherLink";
import type { PanelDroneLink } from "./droneLink";
import type { SidePanelElements } from "./elements";
import type { DimensionedSelection, SelectionSession, PropulsionDimension } from "../../selectionSession";

export interface SidePanel {
  readonly side: Side;
  readonly host: SidePanelHost;
  readonly els: SidePanelElements;
  readonly ships: Ships;
  readonly fittingImport: FittingImport;
  readonly i18n: I18n;
  readonly timer: Timer;
  readonly sections: ISidePanelSections;
  profile: ShipProfile | undefined;
  fittedHull: FittedHullSummary | undefined;
  fittingText: string | undefined;
  lastCommittedHull: ShipId | undefined;
  importer: SideImporter;
  getSkillPopup(): Popup;
  getPastePopup(): Popup;
  getPropulsionVariantPopup(): Popup;
  setHost(host: SidePanelHost): void;
  setFittingPopup(popup: FittingPopupControl): void;
  setFittingPreview(preview: FittingPreviewControl): void;
  setFittingEyeEnabled(enabled: boolean): void;
  setConfigInputsEnabled(enabled: boolean): void;
  setImporter(importer: SideImporter): void;
  isOverridden(key: keyof ProfileParamOverrides): boolean;
  recordOverride<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void;
  clearOverrides(): void;
  clearTurret(): void;
  restoreTurret(): void;
  setTurretProfile(profile: ShipProfile | undefined): void;
  clearLauncher(): void;
  restoreLauncher(): void;
  setLauncherProfile(profile: ShipProfile | undefined): void;
  clearDrone(): void;
  restoreDrone(): void;
  setSensorData(spec: SensorSpec | undefined, boosts: SensorBoostLoadout | undefined): void;
  renderFittingPopupIfOpen(): void;
  closeFittingPopupIfOpen(): void;
  hideFittingPreview(): void;
  capture(): SidePanelState;
  restore(state: SidePanelState): void;
  skillConditions(): StatConditions;
}

export interface SidePanelState {
  readonly speed: number;
  readonly baseMaxSpeed?: number;
  readonly mass: number;
  readonly inertia: number;
  readonly mode: AutopilotMode;
  readonly range: number;
  readonly aggressivity: number;
  readonly skillLevel: SkillLevel | undefined;
  readonly defenseSkills?: DefenseSkills;
  readonly targetingSkills?: TargetingSkills;
  readonly overload: boolean;
  readonly weaponOverload: boolean;
  readonly damageEnabled?: boolean;
  readonly hull: ShipId | undefined;
  readonly propulsion: PropulsionSelection | undefined;
  readonly fitting: string | undefined;
  readonly overrides: Partial<ProfileParamOverrides>;
  readonly fittedHull: FittedHullSummary | undefined;
  readonly sig?: number;
  readonly sensorSpec?: SensorSpec;
  readonly sensorBoosts?: SensorBoostLoadout;
}

export interface FittingPopupControl {
  readonly popup: Popup;
  setFittingEyeEnabled(enabled: boolean): void;
  renderIfOpen(): void;
  closeIfOpen(): void;
}

export interface FittingPreviewControl {
  hide(side: Side): void;
}

export interface SideImporter {
  autoLoadFittingTextFor(hullId: ShipId): string | undefined;
  importEftFitting(text: string, options?: { readonly persist?: boolean; readonly showImportedHint?: boolean }): ImportedFitting | undefined;
  importFromText(text: string): Promise<void>;
  importFromClipboard(): Promise<void>;
}

export interface SidePanelHost {
  persistConfigChange(notify?: boolean): void;
  onConfigChange(): void;
  onDisplayChange(): void;
}

export interface SidePanelDeps {
  side: Side;
  popupGroup: PopupGroup;
  els: SidePanelElements;
  i18n: I18n;
  ships: Ships;
  fittingImport: FittingImport;
  imageCatalog: ImageCatalog;
  timer: Timer;
  events: UiEvents;
  overrides: PanelOverrides;
  turretLink: PanelTurretLink;
  launcherLink: PanelLauncherLink;
  droneLink: PanelDroneLink;
  simValueParser: SimValueParser;
  propulsionSelection: DimensionedSelection<PropulsionDimension>;
  selectionSession: SelectionSession;
}
