import type { AttackAssessment, EngagementView, WeaponAttack, WeaponKind } from "../../../sim";
import type { ViewStream } from "../../viewStream";
import type { HintContentProvider } from "../hoverHint";
import type { AppliedDpsHintModel, AppliedDpsHintRenderer, AppliedDpsHintRow } from "./appliedDpsHintRenderer";

export type AppliedDpsHintProvider = HintContentProvider;

export interface AppliedDpsHintProviderDeps {
  readonly viewStream: ViewStream;
  readonly appliedDpsHintRenderer: AppliedDpsHintRenderer;
}

export class AppliedDpsHintProviderImpl implements HintContentProvider {
  private readonly viewStream: ViewStream;
  private readonly renderer: AppliedDpsHintRenderer;

  constructor(deps: AppliedDpsHintProviderDeps) {
    this.viewStream = deps.viewStream;
    this.renderer = deps.appliedDpsHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const side = sideFromAnchor(anchor);
    if (side === undefined) return;
    const view = this.viewStream.currentView();
    if (view === undefined) return;
    const model = this.buildModel(side, view);
    if (model.rows.length === 0) return;
    this.renderer.render(model, container);
  }

  private buildModel(side: "shipA" | "shipB", view: EngagementView): AppliedDpsHintModel {
    const weaponAttacks = view.weaponAttacks[side];
    const rows: AppliedDpsHintRow[] = [];
    if (weaponAttacks.length > 0) {
      for (const attack of weaponAttacks) {
        rows.push(buildRow(attack));
      }
    } else {
      const combined = view.attacks[side];
      if (combined) rows.push(rowFromCombined(combined));
    }
    const totalNominalDps = rows.reduce((sum, row) => sum + row.nominalDps, 0);
    const totalAppliedDps = rows.reduce((sum, row) => sum + row.appliedDps, 0);
    const totalApplication = totalNominalDps > 0 ? totalAppliedDps / totalNominalDps : 0;
    return { rows, totalNominalDps, totalAppliedDps, totalApplication };
  }
}

function sideFromAnchor(anchor: HTMLElement): "shipA" | "shipB" | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  if (side === "a") return "shipA";
  if (side === "b") return "shipB";
  return undefined;
}

function buildRow(weaponAttack: WeaponAttack): AppliedDpsHintRow {
  const weaponKind: WeaponKind = weaponAttack.weapon.kind;
  const damage = weaponAttack.assessment.damage;
  return { weaponKind, nominalDps: damage.nominalDps, appliedDps: damage.appliedDps, application: damage.application };
}

function rowFromCombined(assessment: AttackAssessment): AppliedDpsHintRow {
  const weaponKind: WeaponKind = assessment.effectiveWeapon.kind;
  const damage = assessment.damage;
  return { weaponKind, nominalDps: damage.nominalDps, appliedDps: damage.appliedDps, application: damage.application };
}
