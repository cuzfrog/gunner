import type { DefenseAssessment, DefenseLayer, DefenseSpec, DefenseView, EngagementView } from "../../../sim";
import type { TypeId } from "../../../gamedata/ids";
import type { StoredRahActivation, StoredRepairMode, StoredRepairerActivation } from "../../../appstate";
import type { Side, Sided } from "../side";
import type { PopupFieldEls } from "../shared";

export interface DefenseFieldEls extends PopupFieldEls {
  readonly section: HTMLElement;
  readonly summary: HTMLElement;
  readonly effectiveSig: HTMLElement;
}

export type DefenseEls = Sided<DefenseFieldEls>;

export interface DefenseController {
  setDefenseSpec(side: Side, spec: DefenseSpec): void;
  spec(side: Side): DefenseSpec | undefined;
  updateAssessments(view: EngagementView): void;
  updateDefenseView(view: DefenseView): void;
  updateSummaries(): void;
  render(): void;
  signaturePenalty(side: Side): number;
  updateEffectiveSig(side: Side, sig: number): void;
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
  hpPercentages(side: Side): Readonly<Record<DefenseLayer, number>> | undefined;
}
