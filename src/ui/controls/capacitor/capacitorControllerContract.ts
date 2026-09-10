import type { CapBoosterMode, CapBoosterSimSpec, CapacitorView } from "../../../sim";
import type { TypeId } from "../../../gamedata/ids";
import type { CapacitorStats } from "../../../fitting";
import type { StoredCapBoosterCharge, StoredCapBoosterMode } from "../../../appstate";
import type { Side, Sided } from "../side";
import type { PopupFieldEls } from "../shared";

export interface CapacitorFieldEls extends PopupFieldEls {
  readonly section: HTMLElement;
  readonly summary: HTMLElement;
}

export type CapacitorEls = Sided<CapacitorFieldEls>;

/** Per-frame runtime consumer for the readout presenter; no config-capable members. */
export interface CapacitorReadout {
  updateRuntime(view: Record<Side, CapacitorView>): void;
  setPlaying(playing: boolean): void;
}

export interface CapacitorController extends CapacitorReadout {
  setCapacitorStats(side: Side, stats: CapacitorStats): void;
  render(): void;
  infiniteCapacitor(side: Side): boolean;
  setInfiniteCapacitor(side: Side, infinite: boolean): void;
  capBoosterMode(side: Side, moduleId: TypeId): CapBoosterMode;
  setCapBoosterMode(side: Side, moduleId: TypeId, mode: CapBoosterMode): void;
  capBoosterCharge(side: Side, moduleId: TypeId): TypeId | undefined;
  setCapBoosterCharge(side: Side, moduleId: TypeId, chargeId: TypeId): void;
  capBoosterSpecs(side: Side): readonly CapBoosterSimSpec[];
  restore(side: Side, infinite: boolean, modes?: readonly StoredCapBoosterMode[], charges?: readonly StoredCapBoosterCharge[]): void;
  capture(side: Side): { infinite: boolean; modes: readonly StoredCapBoosterMode[]; charges: readonly StoredCapBoosterCharge[] };
}
