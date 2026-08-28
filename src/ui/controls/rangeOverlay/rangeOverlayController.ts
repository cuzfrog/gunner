import type { WeaponRangeVisibility } from "../../../appstate";
import type { EwarActivation, EwarLoadout, EwarProjection, StasisGrapplerSpec, StasisWebSpec, TrackingDisruptorSpec, WarpScramblerSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import type { RangeOverlay, RangeOverlayKind } from "../../renderer";
import type { EwarController, EwarEffectDescriber } from "../ewar";
import type { Side } from "../side";
import type { UiEvents } from "../../events";
import type { RangeOverlayController, RangeOverlayEls } from "./rangeOverlayControllerContract";

const ALL_KINDS: readonly RangeOverlayKind[] = ["web", "grappler", "scrambler", "disruptor"];
const SIDES: readonly Side[] = ["shipA", "shipB"];
const TITLE_REFRESH_INTERVAL_MS = 250;

export class RangeOverlayControllerImpl implements RangeOverlayController {
  private readonly els: RangeOverlayEls;
  private readonly i18n: I18n;
  private readonly ewarEffectDescriber: EwarEffectDescriber;
  private readonly now: () => number;
  private readonly ewarController: EwarController;
  private readonly events: UiEvents;
  private distance = 0;
  private readonly visibilityMap = new Map<RangeOverlayKind, WeaponRangeVisibility>();
  private readonly chips = new Map<RangeOverlayKind, HTMLButtonElement>();
  private lastTitleRefresh = 0;
  private lastDescriptors: readonly RangeOverlayKind[] = [];

  constructor(deps: { els: RangeOverlayEls; i18n: I18n; ewarEffectDescriber: EwarEffectDescriber; ewarController: EwarController; events: UiEvents; now: () => number }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.ewarEffectDescriber = deps.ewarEffectDescriber;
    this.ewarController = deps.ewarController;
    this.events = deps.events;
    this.now = deps.now;
    for (const kind of ALL_KINDS) this.visibilityMap.set(kind, "none");
    this.events.onDistanceChanged((d) => { this.distance = d; });
    this.render();
  }

  descriptors(): readonly RangeOverlayKind[] {
    const shipA = this.ewarController.projection("shipA");
    const shipB = this.ewarController.projection("shipB");
    const out: RangeOverlayKind[] = [];
    for (const kind of ALL_KINDS) {
      if (hasKind(shipA, kind) || hasKind(shipB, kind)) out.push(kind);
    }
    return out;
  }

  overlays(): readonly RangeOverlay[] {
    const out: RangeOverlay[] = [];
    for (const side of SIDES) {
      const projection = this.ewarController.projection(side);
      if (!projection) continue;
      for (const kind of this.descriptors()) {
        if (!this.isSideVisible(kind, side)) continue;
        const overlay = this.overlayFor(side, kind, projection);
        if (overlay) out.push(overlay);
      }
    }
    return out;
  }

  toggle(kind: RangeOverlayKind): void {
    const cycle = this.cycleFor(kind);
    const current = this.visibilityFor(kind);
    const index = cycle.indexOf(current);
    const next = index >= 0 ? cycle[(index + 1) % cycle.length] : cycle[0];
    this.visibilityMap.set(kind, next);
    this.updateChipState(kind);
    this.events.emitDisplayInvalidated();
  }

  visibilityFor(kind: RangeOverlayKind): WeaponRangeVisibility {
    return this.visibilityMap.get(kind) ?? "none";
  }

  describe(kind: RangeOverlayKind): string {
    const projection = this.mergedProjection();
    if (!projection) return "";
    const distance = this.distance;
    switch (kind) {
      case "web": return this.ewarEffectDescriber.webDescription(projection, distance);
      case "grappler": return this.ewarEffectDescriber.grapplerDescription(projection, distance);
      case "scrambler": return this.ewarEffectDescriber.scramblerDescription(projection, distance);
      case "disruptor": return this.ewarEffectDescriber.disruptorDescription(projection, distance);
    }
  }

  overlayVisibility(): Record<string, WeaponRangeVisibility> {
    const out: Record<string, WeaponRangeVisibility> = {};
    for (const kind of ALL_KINDS) out[kind] = this.visibilityFor(kind);
    return out;
  }

  restoreVisibility(entries?: Record<string, WeaponRangeVisibility>): void {
    if (entries) {
      for (const kind of ALL_KINDS) {
        const value = entries[kind];
        this.visibilityMap.set(kind, isWeaponRangeVisibility(value) ? value : "none");
      }
    }
    this.render();
  }

  render(): void {
    const now = this.now();
    const current = this.descriptors();
    this.lastDescriptors = current;
    if (current.length === 0) {
      for (const chip of this.chips.values()) chip.remove();
      this.chips.clear();
      this.lastTitleRefresh = now;
      return;
    }
    for (const kind of current) {
      let chip = this.chips.get(kind);
      if (!chip) {
        chip = this.createChip(kind);
        this.chips.set(kind, chip);
        this.els.legend.appendChild(chip);
      }
      chip.textContent = this.i18n.t(`label.ewar.${kind}`);
      chip.setAttribute("aria-pressed", String(this.visibilityFor(kind) !== "none"));
    }
    for (const [kind, chip] of this.chips) {
      if (!current.includes(kind)) {
        chip.remove();
        this.chips.delete(kind);
      }
    }
    this.refreshTitles();
    this.lastTitleRefresh = now;
  }

  update(): void {
    const now = this.now();
    const current = this.descriptors();
    if (!arraysEqual(current, this.lastDescriptors)) {
      this.render();
      return;
    }
    if (now - this.lastTitleRefresh < TITLE_REFRESH_INTERVAL_MS) return;
    this.lastTitleRefresh = now;
    this.refreshTitles();
  }

  private isSideVisible(kind: RangeOverlayKind, side: Side): boolean {
    const visibility = this.visibilityFor(kind);
    return visibility === "both" || visibility === side;
  }

  private cycleFor(kind: RangeOverlayKind): readonly WeaponRangeVisibility[] {
    const shipAHas = hasKind(this.ewarController.projection("shipA"), kind);
    const shipBHas = hasKind(this.ewarController.projection("shipB"), kind);
    if (shipAHas && shipBHas) return ["both", "shipA", "shipB", "none"];
    if (shipAHas) return ["both", "none"];
    if (shipBHas) return ["both", "none"];
    return ["none"];
  }

  private overlayFor(side: Side, kind: RangeOverlayKind, projection: EwarProjection): RangeOverlay | undefined {
    switch (kind) {
      case "web": return this.webOverlay(side, projection);
      case "grappler": return this.grapplerOverlay(side, projection);
      case "scrambler": return this.scramblerOverlay(side, projection);
      case "disruptor": return this.disruptorOverlay(side, projection);
    }
  }

  private webOverlay(side: Side, projection: EwarProjection): RangeOverlay | undefined {
    let maxRange = 0;
    for (let i = 0; i < projection.loadout.webs.length; i++) {
      const activation = projection.activation?.webs[i];
      if (activation && !activation.active) continue;
      const spec = projection.loadout.webs[i];
      const scale = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * scale;
      if (range > maxRange) maxRange = range;
    }
    if (maxRange <= 0) return undefined;
    return { side, kind: "web", radius: maxRange };
  }

  private scramblerOverlay(side: Side, projection: EwarProjection): RangeOverlay | undefined {
    let maxRange = 0;
    for (let i = 0; i < projection.loadout.scramblers.length; i++) {
      const activation = projection.activation?.scramblers[i];
      if (activation && !activation.active) continue;
      const spec = projection.loadout.scramblers[i];
      const scale = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * scale;
      if (range > maxRange) maxRange = range;
    }
    if (maxRange <= 0) return undefined;
    return { side, kind: "scrambler", radius: maxRange };
  }

  private grapplerOverlay(side: Side, projection: EwarProjection): RangeOverlay | undefined {
    return this.falloffOverlay(side, "grappler", projection, projection.loadout.grapplers, (spec, activation) => {
      const scale = activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1;
      return { optimal: spec.optimal * scale, falloff: spec.falloff };
    });
  }

  private disruptorOverlay(side: Side, projection: EwarProjection): RangeOverlay | undefined {
    return this.falloffOverlay(side, "disruptor", projection, projection.loadout.disruptors, (spec) => ({
      optimal: spec.optimal,
      falloff: spec.falloff,
    }));
  }

  private falloffOverlay<T extends StasisGrapplerSpec | TrackingDisruptorSpec>(
    side: Side,
    kind: "grappler" | "disruptor",
    projection: EwarProjection,
    specs: readonly T[],
    rangeOf: (spec: T, activation: { readonly active: boolean; readonly overloaded: boolean } | undefined) => { optimal: number; falloff: number },
  ): RangeOverlay | undefined {
    let best: { optimal: number; falloff: number } | undefined;
    for (let i = 0; i < specs.length; i++) {
      const activation = this.activationFor(projection.activation, kind, i);
      if (activation && !activation.active) continue;
      const ranges = rangeOf(specs[i], activation);
      const reach = ranges.optimal + ranges.falloff;
      if (!best || reach > best.optimal + best.falloff) best = ranges;
    }
    if (!best || best.optimal <= 0) return undefined;
    return { side, kind, radius: best.optimal, falloffRadius: best.falloff };
  }

  private activationFor(activation: EwarActivation | undefined, kind: RangeOverlayKind, index: number): { readonly active: boolean; readonly overloaded: boolean } | undefined {
    if (!activation) return undefined;
    switch (kind) {
      case "grappler": return activation.grapplers[index];
      case "disruptor": return activation.disruptors[index];
      default: return undefined;
    }
  }

  private createChip(kind: RangeOverlayKind): HTMLButtonElement {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `range-overlay-chip range-overlay-${kind}`;
    chip.textContent = this.i18n.t(`label.ewar.${kind}`);
    chip.addEventListener("click", () => this.toggle(kind));
    return chip;
  }

  private updateChipState(kind: RangeOverlayKind): void {
    const chip = this.chips.get(kind);
    if (chip) chip.setAttribute("aria-pressed", String(this.visibilityFor(kind) !== "none"));
  }

  private refreshTitles(): void {
    for (const kind of this.chips.keys()) {
      const chip = this.chips.get(kind);
      if (chip) chip.title = this.describe(kind);
    }
  }

  private mergedProjection(): EwarProjection | undefined {
    const shipA = this.ewarController.projection("shipA");
    const shipB = this.ewarController.projection("shipB");
    if (!shipA && !shipB) return undefined;
    const loadout: EwarLoadout = {
      webs: [...(shipA?.loadout.webs ?? []), ...(shipB?.loadout.webs ?? [])],
      grapplers: [...(shipA?.loadout.grapplers ?? []), ...(shipB?.loadout.grapplers ?? [])],
      disruptors: [...(shipA?.loadout.disruptors ?? []), ...(shipB?.loadout.disruptors ?? [])],
      scramblers: [...(shipA?.loadout.scramblers ?? []), ...(shipB?.loadout.scramblers ?? [])],
      scripts: [...(shipA?.loadout.scripts ?? []), ...(shipB?.loadout.scripts ?? [])],
    };
    const activation: EwarActivation | undefined = (shipA?.activation || shipB?.activation) ? {
      webs: [...(shipA?.activation?.webs ?? []), ...(shipB?.activation?.webs ?? [])],
      grapplers: [...(shipA?.activation?.grapplers ?? []), ...(shipB?.activation?.grapplers ?? [])],
      disruptors: [...(shipA?.activation?.disruptors ?? []), ...(shipB?.activation?.disruptors ?? [])],
      scramblers: [...(shipA?.activation?.scramblers ?? []), ...(shipB?.activation?.scramblers ?? [])],
    } : undefined;
    return { loadout, activation };
  }
}

function hasKind(projection: EwarProjection | undefined, kind: RangeOverlayKind): boolean {
  if (!projection) return false;
  switch (kind) {
    case "web": return projection.loadout.webs.length > 0;
    case "grappler": return projection.loadout.grapplers.length > 0;
    case "scrambler": return projection.loadout.scramblers.length > 0;
    case "disruptor": return projection.loadout.disruptors.length > 0;
  }
}

function isWeaponRangeVisibility(value: unknown): value is WeaponRangeVisibility {
  return value === "shipA" || value === "shipB" || value === "both" || value === "none";
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
