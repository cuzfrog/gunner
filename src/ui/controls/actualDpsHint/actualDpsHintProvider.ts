import type { DamageType, EngagementView } from "../../../sim";
import { DAMAGE_TYPES } from "../../../sim";
import type { ViewStore } from "../controlsContract";
import type { HintContentProvider } from "../hoverHint";
import { DAMAGE_ICON_URLS } from "../damageTypeIcons";
import type { ActualDpsHintModel, ActualDpsHintRenderer, ActualDpsHintTypeRow } from "./actualDpsHintRenderer";

export type ActualDpsHintProvider = HintContentProvider;

export interface ActualDpsHintProviderDeps {
  readonly viewStore: ViewStore;
  readonly actualDpsHintRenderer: ActualDpsHintRenderer;
}

export class ActualDpsHintProviderImpl implements HintContentProvider {
  private readonly viewStore: ViewStore;
  private readonly renderer: ActualDpsHintRenderer;

  constructor(deps: ActualDpsHintProviderDeps) {
    this.viewStore = deps.viewStore;
    this.renderer = deps.actualDpsHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const side = sideFromAnchor(anchor);
    if (side === undefined) return;
    const view = this.viewStore.currentView();
    if (view === undefined) return;
    const model = this.buildModel(side, view);
    if (model.types.length === 0) return;
    this.renderer.render(model, container);
  }

  private buildModel(side: "shipA" | "shipB", view: EngagementView): ActualDpsHintModel {
    const opponent = side === "shipA" ? "shipB" : "shipA";
    const attack = view.attacks[side];
    const defense = view.defenses[opponent];
    if (attack === undefined || defense === undefined) return { types: [], totalAppliedDps: 0, totalActualDps: 0 };
    const appliedByType = attack.damage.appliedByType;
    const effectiveResists = defense.effectiveResists;
    const actualByType = defense.actualIncomingByType;
    const types: ActualDpsHintTypeRow[] = [];
    for (const type of DAMAGE_TYPES) {
      if (appliedByType[type] <= 0) continue;
      types.push(buildTypeRow(type, appliedByType[type], effectiveResists[type], actualByType[type]));
    }
    const totalAppliedDps = attack.damage.appliedDps;
    const totalActualDps = defense.actualIncomingDps;
    return { types, totalAppliedDps, totalActualDps };
  }
}

function sideFromAnchor(anchor: HTMLElement): "shipA" | "shipB" | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  if (side === "a") return "shipA";
  if (side === "b") return "shipB";
  return undefined;
}

function buildTypeRow(type: DamageType, appliedDps: number, resist: number, actualDps: number): ActualDpsHintTypeRow {
  return { type, iconUrl: DAMAGE_ICON_URLS[type], appliedDps, resist, actualDps };
}
