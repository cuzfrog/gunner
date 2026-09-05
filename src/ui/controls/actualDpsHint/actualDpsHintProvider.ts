import type { DefenseLayer, EngagementView } from "../../../sim";
import { DEFENSE_LAYERS } from "../../../sim";
import type { ViewStore } from "../controlsContract";
import type { HintContentProvider } from "../hoverHint";
import type { ActualDpsHintLayerRow, ActualDpsHintModel, ActualDpsHintRenderer } from "./actualDpsHintRenderer";

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
    if (view.attacks[side] === undefined) return;
    const model = this.buildModel(side, view);
    this.renderer.render(model, container);
  }

  private buildModel(side: "shipA" | "shipB", view: EngagementView): ActualDpsHintModel {
    const opponent = side === "shipA" ? "shipB" : "shipA";
    const attack = view.attacks[side];
    if (attack === undefined) return { layers: [], totalAppliedDps: 0, totalActualDps: 0 };
    const projection = view.projection[opponent];
    const totalAppliedDps = attack.damage.appliedDps;
    const totalActualDps = projection.totalHpLost;
    const byLayer = projection.byLayer;
    const layers: ActualDpsHintLayerRow[] = [];
    for (const layer of DEFENSE_LAYERS) {
      const hpLost = byLayer[layer];
      if (hpLost <= 0) continue;
      layers.push({ layer, hpLost });
    }
    return { layers, totalAppliedDps, totalActualDps };
  }
}

function sideFromAnchor(anchor: HTMLElement): "shipA" | "shipB" | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  if (side === "a") return "shipA";
  if (side === "b") return "shipB";
  return undefined;
}
