import type { EngagementView, WeaponAttack, WeaponKind } from "../../../sim";
import type { I18n } from "../../i18n";
import type { ViewStore } from "../controlsContract";
import type { HintContentProvider } from "../hoverHint";
import type { AppliedDpsHintModel, AppliedDpsHintRenderer, AppliedDpsHintRow } from "./appliedDpsHintRenderer";

export type AppliedDpsHintProvider = HintContentProvider;

export interface AppliedDpsHintProviderDeps {
  readonly i18n: I18n;
  readonly viewStore: ViewStore;
  readonly appliedDpsHintRenderer: AppliedDpsHintRenderer;
}

export class AppliedDpsHintProviderImpl implements HintContentProvider {
  private readonly i18n: I18n;
  private readonly viewStore: ViewStore;
  private readonly renderer: AppliedDpsHintRenderer;

  constructor(deps: AppliedDpsHintProviderDeps) {
    this.i18n = deps.i18n;
    this.viewStore = deps.viewStore;
    this.renderer = deps.appliedDpsHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const side = sideFromAnchor(anchor);
    if (side === undefined) return;
    const view = this.viewStore.currentView();
    if (view === undefined) return;
    const model = this.buildModel(side, view);
    if (model.rows.length === 0) return;
    this.renderer.render(model, container);
  }

  private buildModel(side: "shipA" | "shipB", view: EngagementView): AppliedDpsHintModel {
    const attacks = view.weaponAttacks[side];
    const rows: AppliedDpsHintRow[] = [];
    for (const attack of attacks) {
      rows.push(buildRow(attack, this.i18n));
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

function buildRow(weaponAttack: WeaponAttack, i18n: I18n): AppliedDpsHintRow {
  const weaponKind: WeaponKind = weaponAttack.weapon.kind;
  const name = i18n.t(`dpsHint.${weaponKind}Dps`);
  const damage = weaponAttack.assessment.damage;
  return { name, weaponKind, nominalDps: damage.nominalDps, appliedDps: damage.appliedDps, application: damage.application };
}
