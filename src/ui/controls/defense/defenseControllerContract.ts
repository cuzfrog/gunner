import type { DefenseAssessment, DefenseSpec, DefenseView, EngagementView } from "../../../sim";
import type { TypeId } from "../../../gamedata/ids";
import type { StoredRahActivation, StoredRepairMode, StoredRepairerActivation } from "../../../appstate";
import type { Side } from "../side";

export interface DefenseEls {
  readonly shipADefenseField: HTMLElement;
  readonly shipADefenseTrigger: HTMLButtonElement;
  readonly shipADefensePopup: HTMLElement;
  readonly shipADefenseSection: HTMLElement;
  readonly shipADefenseSummary: HTMLElement;
  readonly shipAEffectiveSig: HTMLElement;
  readonly shipBDefenseField: HTMLElement;
  readonly shipBDefenseTrigger: HTMLButtonElement;
  readonly shipBDefensePopup: HTMLElement;
  readonly shipBDefenseSection: HTMLElement;
  readonly shipBDefenseSummary: HTMLElement;
  readonly shipBEffectiveSig: HTMLElement;
}

export interface DefenseController {
  setDefenseSpec(side: Side, spec: DefenseSpec): void;
  spec(side: Side): DefenseSpec | undefined;
  updateAssessments(view: EngagementView): void;
  updateDefenseView(view: DefenseView): void;
  updateSummaries(): void;
  render(): void;
  signaturePenalty(side: Side): number;
  updateEffectiveSig(side: Side, baseSig: number): void;
  damageEnabled(side: Side): boolean;
  setDamageEnabled(side: Side, enabled: boolean): void;
  repairMode(side: Side): StoredRepairMode;
  setRepairMode(side: Side, mode: StoredRepairMode): void;
  repairerActivation(side: Side): readonly StoredRepairerActivation[];
  setRepairerActivation(side: Side, index: number, active: boolean, overloaded: boolean): void;
  rahActivation(side: Side): StoredRahActivation | undefined;
  setRahActivation(side: Side, active: boolean, overloaded: boolean): void;
  restore(side: Side, enabled: boolean, repMode?: StoredRepairMode, repairerActivation?: readonly StoredRepairerActivation[], rahActivation?: StoredRahActivation): void;
  cyclingEffects(side: Side): readonly { readonly moduleId: TypeId; readonly hint: string }[];
}
