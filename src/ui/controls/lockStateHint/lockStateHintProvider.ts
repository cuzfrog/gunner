import type { EngagementView, LockState } from "../../../sim";
import type { ViewStore } from "../controlsContract";
import type { HintContentProvider } from "../hoverHint";
import type { LockStateHintModel, LockStateHintRenderer } from "./lockStateHintRenderer";

export type LockStateHintProvider = HintContentProvider;

export interface LockStateHintProviderDeps {
  readonly viewStore: ViewStore;
  readonly lockStateHintRenderer: LockStateHintRenderer;
}

export class LockStateHintProviderImpl implements HintContentProvider {
  private readonly viewStore: ViewStore;
  private readonly renderer: LockStateHintRenderer;

  constructor(deps: LockStateHintProviderDeps) {
    this.viewStore = deps.viewStore;
    this.renderer = deps.lockStateHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const side = sideFromAnchor(anchor);
    if (side === undefined) return;
    const view = this.viewStore.currentView();
    if (view === undefined) return;
    const lock = view.locks[side];
    if (lock === undefined) return;
    const model = buildModel(side, view, lock);
    this.renderer.render(model, container);
  }
}

function sideFromAnchor(anchor: HTMLElement): "shipA" | "shipB" | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  if (side === "a") return "shipA";
  if (side === "b") return "shipB";
  return undefined;
}

function buildModel(side: "shipA" | "shipB", view: EngagementView, lock: LockState): LockStateHintModel {
  const shipState = side === "shipA" ? view.frame.shipA : view.frame.shipB;
  return {
    lock,
    effectiveRange: shipState.sensorSpec?.maxTargetingRange,
    maxLockedTargets: shipState.sensorSpec?.maxLockedTargets,
  };
}
