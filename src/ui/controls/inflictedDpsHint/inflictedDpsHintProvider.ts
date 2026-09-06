import type { DefenseLayer, EngagementView } from "../../../sim";
import { DEFENSE_LAYERS } from "../../../sim";
import type { ViewStream } from "../../viewStream";
import type { HintContentProvider } from "../hoverHint";
import type { InflictedDpsHintLayerRow, InflictedDpsHintModel, InflictedDpsHintRenderer } from "./inflictedDpsHintRenderer";

export type InflictedDpsHintProvider = HintContentProvider;

export interface InflictedDpsHintProviderDeps {
  readonly viewStream: ViewStream;
  readonly inflictedDpsHintRenderer: InflictedDpsHintRenderer;
}

export class InflictedDpsHintProviderImpl implements HintContentProvider {
  private readonly viewStream: ViewStream;
  private readonly renderer: InflictedDpsHintRenderer;

  constructor(deps: InflictedDpsHintProviderDeps) {
    this.viewStream = deps.viewStream;
    this.renderer = deps.inflictedDpsHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const side = sideFromAnchor(anchor);
    if (side === undefined) return;
    const view = this.viewStream.currentView();
    if (view === undefined) return;
    if (view.attacks[side] === undefined) return;
    const model = this.buildModel(side, view);
    this.renderer.render(model, container);
  }

  private buildModel(side: "shipA" | "shipB", view: EngagementView): InflictedDpsHintModel {
    const opponent = side === "shipA" ? "shipB" : "shipA";
    const attack = view.attacks[side];
    if (attack === undefined) return { layers: [], totalAppliedDps: 0, totalInflictedDps: 0 };
    const projection = view.projection[opponent];
    const totalAppliedDps = attack.damage.appliedDps;
    const totalInflictedDps = projection.totalInflicted;
    const byLayer = projection.byLayer;
    const layers: InflictedDpsHintLayerRow[] = [];
    for (const layer of DEFENSE_LAYERS) {
      const inflicted = byLayer[layer];
      if (inflicted <= 0) continue;
      layers.push({ layer, inflicted });
    }
    return { layers, totalAppliedDps, totalInflictedDps };
  }
}

function sideFromAnchor(anchor: HTMLElement): "shipA" | "shipB" | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  if (side === "a") return "shipA";
  if (side === "b") return "shipB";
  return undefined;
}
