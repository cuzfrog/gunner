import type { EwarActivation, EwarLoadout, EwarProjection, StasisGrapplerSpec, StasisWebSpec, TrackingDisruptorSpec, WarpScramblerSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import type { RangeOverlay, RangeOverlayKind } from "../../renderer";
import type { EwarEffectDescriber } from "../ewar";
import type { RangeOverlayController, RangeOverlayEls, RangeOverlayHost } from "./rangeOverlayControllerContract";

const ALL_KINDS: readonly RangeOverlayKind[] = ["web", "grappler", "scrambler", "disruptor"];
const TITLE_REFRESH_INTERVAL_MS = 250;

export class RangeOverlayControllerImpl implements RangeOverlayController {
  private readonly els: RangeOverlayEls;
  private readonly i18n: I18n;
  private readonly ewarEffectDescriber: EwarEffectDescriber;
  private readonly now: () => number;
  private host?: RangeOverlayHost;
  private readonly hiddenSet = new Set<RangeOverlayKind>();
  private readonly chips = new Map<RangeOverlayKind, HTMLButtonElement>();
  private lastTitleRefresh = 0;
  private lastDescriptors: readonly RangeOverlayKind[] = [];

  constructor(deps: { els: RangeOverlayEls; i18n: I18n; ewarEffectDescriber: EwarEffectDescriber; now: () => number }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.ewarEffectDescriber = deps.ewarEffectDescriber;
    this.now = deps.now;
  }

  setHost(host: RangeOverlayHost): void {
    this.host = host;
    this.render();
  }

  descriptors(): readonly RangeOverlayKind[] {
    const attacker = this.host?.projection("attacker");
    const target = this.host?.projection("target");
    const out: RangeOverlayKind[] = [];
    for (const kind of ALL_KINDS) {
      if (hasKind(attacker, kind) || hasKind(target, kind)) out.push(kind);
    }
    return out;
  }

  overlays(): readonly RangeOverlay[] {
    const out: RangeOverlay[] = [];
    for (const side of ["attacker", "target"] as const) {
      const projection = this.host?.projection(side);
      if (!projection) continue;
      for (const kind of this.descriptors()) {
        if (!this.isVisible(kind)) continue;
        const overlay = this.overlayFor(side, kind, projection);
        if (overlay) out.push(overlay);
      }
    }
    return out;
  }

  toggle(kind: RangeOverlayKind): void {
    if (this.hiddenSet.has(kind)) this.hiddenSet.delete(kind);
    else this.hiddenSet.add(kind);
    this.updateChipState(kind);
    this.host?.onDisplayChange();
  }

  isVisible(kind: RangeOverlayKind): boolean {
    return !this.hiddenSet.has(kind);
  }

  describe(kind: RangeOverlayKind): string {
    const projection = this.mergedProjection();
    if (!projection) return "";
    const distance = this.host?.currentDistance() ?? 0;
    switch (kind) {
      case "web": return this.ewarEffectDescriber.webDescription(projection, distance);
      case "grappler": return this.ewarEffectDescriber.grapplerDescription(projection, distance);
      case "scrambler": return this.ewarEffectDescriber.scramblerDescription(projection, distance);
      case "disruptor": return this.ewarEffectDescriber.disruptorDescription(projection, distance);
    }
  }

  hiddenKinds(): readonly RangeOverlayKind[] {
    return [...this.hiddenSet];
  }

  restoreHidden(kinds?: readonly string[]): void {
    if (kinds) {
      this.hiddenSet.clear();
      for (const kind of kinds) {
        if (isRangeOverlayKind(kind)) this.hiddenSet.add(kind);
      }
    }
    if (this.host) this.render();
  }

  render(): void {
    const now = this.now();
    const current = this.descriptors();
    this.lastDescriptors = current;
    this.els.legend.hidden = current.length === 0;
    if (current.length === 0) {
      this.els.legend.innerHTML = "";
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
      chip.setAttribute("aria-pressed", String(this.isVisible(kind)));
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

  private overlayFor(side: "attacker" | "target", kind: RangeOverlayKind, projection: EwarProjection): RangeOverlay | undefined {
    switch (kind) {
      case "web": return this.webOverlay(side, projection);
      case "grappler": return this.grapplerOverlay(side, projection);
      case "scrambler": return this.scramblerOverlay(side, projection);
      case "disruptor": return this.disruptorOverlay(side, projection);
    }
  }

  private webOverlay(side: "attacker" | "target", projection: EwarProjection): RangeOverlay | undefined {
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

  private scramblerOverlay(side: "attacker" | "target", projection: EwarProjection): RangeOverlay | undefined {
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

  private grapplerOverlay(side: "attacker" | "target", projection: EwarProjection): RangeOverlay | undefined {
    return this.falloffOverlay(side, "grappler", projection, projection.loadout.grapplers, (spec, activation) => {
      const scale = activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1;
      return { optimal: spec.optimal * scale, falloff: spec.falloff };
    });
  }

  private disruptorOverlay(side: "attacker" | "target", projection: EwarProjection): RangeOverlay | undefined {
    return this.falloffOverlay(side, "disruptor", projection, projection.loadout.disruptors, (spec) => ({
      optimal: spec.optimal,
      falloff: spec.falloff,
    }));
  }

  private falloffOverlay<T extends StasisGrapplerSpec | TrackingDisruptorSpec>(
    side: "attacker" | "target",
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
    if (chip) chip.setAttribute("aria-pressed", String(this.isVisible(kind)));
  }

  private refreshTitles(): void {
    for (const kind of this.chips.keys()) {
      const chip = this.chips.get(kind);
      if (chip) chip.title = this.describe(kind);
    }
  }

  private mergedProjection(): EwarProjection | undefined {
    const attacker = this.host?.projection("attacker");
    const target = this.host?.projection("target");
    if (!attacker && !target) return undefined;
    const loadout: EwarLoadout = {
      webs: [...(attacker?.loadout.webs ?? []), ...(target?.loadout.webs ?? [])],
      grapplers: [...(attacker?.loadout.grapplers ?? []), ...(target?.loadout.grapplers ?? [])],
      disruptors: [...(attacker?.loadout.disruptors ?? []), ...(target?.loadout.disruptors ?? [])],
      scramblers: [...(attacker?.loadout.scramblers ?? []), ...(target?.loadout.scramblers ?? [])],
      scripts: [...(attacker?.loadout.scripts ?? []), ...(target?.loadout.scripts ?? [])],
    };
    const activation: EwarActivation | undefined = (attacker?.activation || target?.activation) ? {
      webs: [...(attacker?.activation?.webs ?? []), ...(target?.activation?.webs ?? [])],
      grapplers: [...(attacker?.activation?.grapplers ?? []), ...(target?.activation?.grapplers ?? [])],
      disruptors: [...(attacker?.activation?.disruptors ?? []), ...(target?.activation?.disruptors ?? [])],
      scramblers: [...(attacker?.activation?.scramblers ?? []), ...(target?.activation?.scramblers ?? [])],
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

function isRangeOverlayKind(value: string): value is RangeOverlayKind {
  return value === "web" || value === "grappler" || value === "scrambler" || value === "disruptor";
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
