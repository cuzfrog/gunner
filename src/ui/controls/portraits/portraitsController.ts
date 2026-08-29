import type { ShipId, TypeId } from "../../../gamedata/ids";
import type { DisruptionBreakdown, EwarResolver, SpeedBreakdown, StatEffectAttribution } from "../../../sim";
import type { ImageCatalog } from "../../icons";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import type { EwarController } from "../ewar";
import type { Side } from "../side";
import type { CombatantProfiles, PortraitsEls, PortraitsController } from "./portraitsControllerContract";
import { html } from "../markup";

interface SideState {
  lastKey: string;
  lastId: ShipId | "";
}

interface PortraitEffect {
  readonly moduleId: TypeId;
  readonly title: string;
}

export class PortraitsControllerImpl implements PortraitsController {
  private readonly els: PortraitsEls;
  private readonly imageCatalog: ImageCatalog;
  private readonly ewarController: EwarController;
  private readonly ewarResolver: EwarResolver;
  private readonly combatantProfiles: CombatantProfiles;
  private readonly events: UiEvents;
  private readonly i18n: I18n;
  private distance = 0;
  private readonly shipAState: SideState = { lastKey: "", lastId: "" };
  private readonly shipBState: SideState = { lastKey: "", lastId: "" };

  constructor(deps: {
    els: PortraitsEls;
    imageCatalog: ImageCatalog;
    ewarController: EwarController;
    ewarResolver: EwarResolver;
    combatantProfiles: CombatantProfiles;
    events: UiEvents;
    i18n: I18n;
  }) {
    this.els = deps.els;
    this.imageCatalog = deps.imageCatalog;
    this.ewarController = deps.ewarController;
    this.ewarResolver = deps.ewarResolver;
    this.combatantProfiles = deps.combatantProfiles;
    this.events = deps.events;
    this.i18n = deps.i18n;
    this.events.onDistanceChanged((d) => { this.distance = d; });
    this.update();
  }

  update(): void {
    this.updateSide("shipA");
    this.updateSide("shipB");
  }

  private updateSide(side: Side): void {
    const state = sideStateFor(side, this.shipAState, this.shipBState);
    const root = side === "shipA" ? this.els.shipA : this.els.shipB;
    const image = side === "shipA" ? this.els.shipAImage : this.els.shipBImage;
    const effects = side === "shipA" ? this.els.shipAEffects : this.els.shipBEffects;
    const profile = this.combatantProfiles.profile(side);
    if (profile === undefined) {
      root.hidden = true;
      effects.hidden = true;
      state.lastKey = "";
      state.lastId = "";
      return;
    }
    const enemySide: Side = side === "shipA" ? "shipB" : "shipA";
    const projection = this.ewarController.projection(enemySide);
    const speedBreakdown = this.ewarResolver.speedBreakdown(projection, this.distance);
    const disruptionBreakdown = this.ewarResolver.disruptionBreakdown(projection, this.distance);
    const portraitEffects = buildPortraitEffects(speedBreakdown, disruptionBreakdown, this.i18n);
    const key = buildDiffKey(profile.id, portraitEffects);
    if (state.lastKey === key) return;
    state.lastKey = key;
    if (root.hidden) root.hidden = false;
    if (state.lastId !== profile.id) {
      state.lastId = profile.id;
      image.src = this.imageCatalog.shipImageUrl(profile.id) ?? "";
    }
    effects.innerHTML = "";
    const icons = document.createDocumentFragment();
    for (const effect of portraitEffects) {
      const iconUrl = this.imageCatalog.itemIconUrl(effect.moduleId);
      if (iconUrl === undefined) continue;
      const img = html`<img class="portrait-effect-icon" src=${iconUrl} alt="" title=${effect.title}>` as unknown as HTMLImageElement;
      icons.appendChild(img);
    }
    effects.appendChild(icons);
    if (effects.hidden !== (effects.childElementCount === 0)) effects.hidden = effects.childElementCount === 0;
  }
}

function sideStateFor(side: Side, shipAState: SideState, shipBState: SideState): SideState {
  return side === "shipA" ? shipAState : shipBState;
}

function buildDiffKey(id: ShipId, effects: readonly PortraitEffect[]): string {
  return `${id}|${effects.map((e) => `${e.moduleId}:${e.title}`).join(",")}`;
}

function buildPortraitEffects(speed: SpeedBreakdown, disruption: DisruptionBreakdown, i18n: I18n): PortraitEffect[] {
  const effects: PortraitEffect[] = [];
  for (const effect of speed.effects) {
    if (effect.family === "scrambler") {
      effects.push({ moduleId: effect.moduleId, title: i18n.t("ewar.hover.scrambler") });
    } else {
      const percent = Math.round((1 - effect.multiplier) * 100);
      effects.push({ moduleId: effect.moduleId, title: `${i18n.t("ewar.hover.web")} ${percent}%` });
    }
  }
  const disruptorMap = new Map<TypeId, { tracking: number; optimal: number; falloff: number }>();
  for (const entry of disruption.tracking) accumulateDisruption(disruptorMap, entry, "tracking");
  for (const entry of disruption.optimal) accumulateDisruption(disruptorMap, entry, "optimal");
  for (const entry of disruption.falloff) accumulateDisruption(disruptorMap, entry, "falloff");
  for (const [moduleId, channels] of disruptorMap) {
    const parts: string[] = [];
    if (channels.tracking < 1) parts.push(`${i18n.t("ewar.hover.tracking")} -${Math.round((1 - channels.tracking) * 100)}%`);
    if (channels.optimal < 1) parts.push(`${i18n.t("ewar.hover.optimal")} -${Math.round((1 - channels.optimal) * 100)}%`);
    if (channels.falloff < 1) parts.push(`${i18n.t("ewar.hover.falloff")} -${Math.round((1 - channels.falloff) * 100)}%`);
    if (parts.length > 0) effects.push({ moduleId, title: parts.join(" · ") });
  }
  return effects;
}

function accumulateDisruption(map: Map<TypeId, { tracking: number; optimal: number; falloff: number }>, entry: StatEffectAttribution, channel: "tracking" | "optimal" | "falloff"): void {
  let existing = map.get(entry.moduleId);
  if (!existing) {
    existing = { tracking: 1, optimal: 1, falloff: 1 };
    map.set(entry.moduleId, existing);
  }
  existing[channel] = entry.multiplier;
}
