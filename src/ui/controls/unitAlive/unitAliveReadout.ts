import type { EngineView } from "../../../sim";

export interface UnitAliveReadout {
  update(view: EngineView): void;
}

export interface UnitAliveEls {
  readonly droneAlive: HTMLElement;
  readonly fighterAlive: HTMLElement;
}

export interface UnitAliveSideEls {
  readonly shipA: UnitAliveEls;
  readonly shipB: UnitAliveEls;
}

export class UnitAliveReadoutImpl implements UnitAliveReadout {
  private readonly els: UnitAliveSideEls;

  constructor(els: UnitAliveSideEls) {
    this.els = els;
  }

  update(view: EngineView): void {
    this.updateSide(this.els.shipA, view.drones.shipA, view.droneSpecs.shipA, view.fighters.shipA, view.fighterSpecs.shipA);
    this.updateSide(this.els.shipB, view.drones.shipB, view.droneSpecs.shipB, view.fighters.shipB, view.fighterSpecs.shipB);
  }

  private updateSide(els: UnitAliveEls, droneStates: readonly { readonly aliveCount: number }[], droneSpecs: readonly { readonly droneCount: number }[], fighterStates: readonly { readonly aliveCount: number }[], fighterSpecs: readonly { readonly fighterCount: number }[]): void {
    setText(els.droneAlive, aliveText(droneStates, droneSpecs.map((spec) => spec.droneCount)));
    setText(els.fighterAlive, aliveText(fighterStates, fighterSpecs.map((spec) => spec.fighterCount)));
  }
}

/** "alive/total" per wing; "-" when the side fields no wing of that kind. */
function aliveText(states: readonly { readonly aliveCount: number }[], counts: readonly number[]): string {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return "-";
  const alive = states.reduce((sum, state) => sum + state.aliveCount, 0);
  return `${alive}/${total}`;
}

function setText(el: HTMLElement, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}
