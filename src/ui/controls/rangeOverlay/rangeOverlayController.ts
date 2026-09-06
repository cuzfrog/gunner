import type { WeaponRangeVisibility } from "../../../appstate";
import type { EwarActivation, EwarLoadout, EwarProjection, EwarResolver } from "../../../sim";
import type { I18n } from "../../i18n";
import type { RangeOverlay, RangeOverlayKind } from "../../renderer";
import type { EwarController, EwarEffectDescriber } from "../ewar";
import type { Side } from "../side";
import type { UiEvents } from "../../events";
import type { ViewStream } from "../../viewStream";
import type { RangeOverlayController, RangeOverlayEls } from "./rangeOverlayControllerContract";
import { html } from "../markup";

const ALL_KINDS: readonly RangeOverlayKind[] = ["web", "grappler", "scrambler", "disruptor"];
const SIDES: readonly Side[] = ["shipA", "shipB"];
const TITLE_REFRESH_INTERVAL_MS = 250;

export class RangeOverlayControllerImpl implements RangeOverlayController {
  private readonly els: RangeOverlayEls;
  private readonly i18n: I18n;
  private readonly ewarEffectDescriber: EwarEffectDescriber;
  private readonly now: () => number;
  private readonly ewarController: EwarController;
  private readonly ewarResolver: EwarResolver;
  private readonly events: UiEvents;
  private distance = 0;
  private readonly visibilityMap = new Map<RangeOverlayKind, WeaponRangeVisibility>();
  private readonly chips = new Map<RangeOverlayKind, HTMLButtonElement>();
  private lastTitleRefresh = 0;
  private lastDescriptors: readonly RangeOverlayKind[] = [];

  constructor(deps: { els: RangeOverlayEls; i18n: I18n; ewarEffectDescriber: EwarEffectDescriber; ewarController: EwarController; ewarResolver: EwarResolver; events: UiEvents; viewStream: ViewStream; now: () => number }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.ewarEffectDescriber = deps.ewarEffectDescriber;
    this.ewarController = deps.ewarController;
    this.ewarResolver = deps.ewarResolver;
    this.events = deps.events;
    this.now = deps.now;
    for (const kind of ALL_KINDS) this.visibilityMap.set(kind, "none");
    this.events.onLanguageChanged(() => this.render());
    deps.viewStream.onViewUpdated((view) => { this.distance = view.frame.distance; this.update(); });
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
    this.refreshHints();
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
    this.refreshHints();
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
    const reach = this.ewarResolver.reach(projection);
    switch (kind) {
      case "web": {
        const radius = reach.web;
        return radius > 0 ? { side, kind: "web", radius } : undefined;
      }
      case "scrambler": {
        const radius = reach.scrambler;
        return radius > 0 ? { side, kind: "scrambler", radius } : undefined;
      }
      case "grappler":
        return reach.grappler > 0 ? this.grapplerFalloffOverlay(side, projection) : undefined;
      case "disruptor":
        return reach.disruptor > 0 ? this.disruptorFalloffOverlay(side, projection) : undefined;
    }
  }

  private grapplerFalloffOverlay(side: Side, projection: EwarProjection): RangeOverlay | undefined {
    let bestOptimal = 0;
    let bestFalloff = 0;
    for (let i = 0; i < projection.loadout.grapplers.length; i++) {
      const spec = projection.loadout.grapplers[i];
      const activation = projection.activation?.grapplers[i];
      if (activation && !activation.active) continue;
      const optimal = spec.optimal * (activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1);
      if (optimal + spec.falloff > bestOptimal + bestFalloff) { bestOptimal = optimal; bestFalloff = spec.falloff; }
    }
    if (bestOptimal <= 0) return undefined;
    return { side, kind: "grappler", radius: bestOptimal, falloffRadius: bestFalloff };
  }

  private disruptorFalloffOverlay(side: Side, projection: EwarProjection): RangeOverlay | undefined {
    let bestOptimal = 0;
    let bestFalloff = 0;
    for (let i = 0; i < projection.loadout.disruptors.length; i++) {
      const spec = projection.loadout.disruptors[i];
      const activation = projection.activation?.disruptors[i];
      if (activation && !activation.active) continue;
      if (spec.optimal + spec.falloff > bestOptimal + bestFalloff) { bestOptimal = spec.optimal; bestFalloff = spec.falloff; }
    }
    if (bestOptimal <= 0) return undefined;
    return { side, kind: "disruptor", radius: bestOptimal, falloffRadius: bestFalloff };
  }

  private createChip(kind: RangeOverlayKind): HTMLButtonElement {
    const chip = html`<button type="button" class=${`range-overlay-chip range-overlay-${kind}`}>${this.i18n.t(`label.ewar.${kind}`)}</button>` as unknown as HTMLButtonElement;
    chip.addEventListener("click", () => this.toggle(kind));
    return chip;
  }

  private updateChipState(kind: RangeOverlayKind): void {
    const chip = this.chips.get(kind);
    if (chip) chip.setAttribute("aria-pressed", String(this.visibilityFor(kind) !== "none"));
  }

  private refreshHints(): void {
    for (const kind of this.chips.keys()) {
      const chip = this.chips.get(kind);
      if (chip) chip.setAttribute("data-hint", this.describe(kind));
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
      painters: [...(shipA?.loadout.painters ?? []), ...(shipB?.loadout.painters ?? [])],
      dampeners: [...(shipA?.loadout.dampeners ?? []), ...(shipB?.loadout.dampeners ?? [])],
      scripts: [...(shipA?.loadout.scripts ?? []), ...(shipB?.loadout.scripts ?? [])],
      dampenerScripts: [],
    };
    const activation: EwarActivation | undefined = (shipA?.activation || shipB?.activation) ? {
      webs: [...(shipA?.activation?.webs ?? []), ...(shipB?.activation?.webs ?? [])],
      grapplers: [...(shipA?.activation?.grapplers ?? []), ...(shipB?.activation?.grapplers ?? [])],
      disruptors: [...(shipA?.activation?.disruptors ?? []), ...(shipB?.activation?.disruptors ?? [])],
      scramblers: [...(shipA?.activation?.scramblers ?? []), ...(shipB?.activation?.scramblers ?? [])],
      painters: [...(shipA?.activation?.painters ?? []), ...(shipB?.activation?.painters ?? [])],
      dampeners: [...(shipA?.activation?.dampeners ?? []), ...(shipB?.activation?.dampeners ?? [])],
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
