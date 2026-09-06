import type { ShipId, TypeId } from "../../../gamedata/ids";
import type { ActiveOffensiveModule, DefenseLayer, LockState } from "../../../sim";
import type { HpValueDisplay } from "../../../appstate";
import type { ImageCatalog } from "../../icons";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import type { DefenseController } from "../defense";
import type { ViewStream } from "../../viewStream";
import type { Side } from "../side";
import type { CombatantProfiles, PortraitsEls, PortraitsController } from "./portraitsControllerContract";
import { html } from "../markup";
import { percentFromMultiplier, signedPercentFromMultiplier } from "../../format";
import { formatWithCommas } from "../controlsFormat";
import { setText } from "../controlsDom";

interface SideState {
  lastKey: string;
  lastId: ShipId | "";
}

interface PortraitEffect {
  readonly moduleId: TypeId;
  readonly hint: string;
}

const HP_BAR_LAYERS: readonly DefenseLayer[] = ["shield", "armor", "hull"];

export class PortraitsControllerImpl implements PortraitsController {
  private readonly els: PortraitsEls;
  private readonly imageCatalog: ImageCatalog;
  private readonly defenseController: DefenseController;
  private readonly combatantProfiles: CombatantProfiles;
  private readonly events: UiEvents;
  private readonly i18n: I18n;
  private readonly viewStream: ViewStream;
  private readonly shipAState: SideState = { lastKey: "", lastId: "" };
  private readonly shipBState: SideState = { lastKey: "", lastId: "" };
  private hpValueDisplay: HpValueDisplay = "none";

  constructor(deps: {
    els: PortraitsEls;
    imageCatalog: ImageCatalog;
    defenseController: DefenseController;
    combatantProfiles: CombatantProfiles;
    events: UiEvents;
    i18n: I18n;
    viewStream: ViewStream;
  }) {
    this.els = deps.els;
    this.imageCatalog = deps.imageCatalog;
    this.defenseController = deps.defenseController;
    this.combatantProfiles = deps.combatantProfiles;
    this.events = deps.events;
    this.i18n = deps.i18n;
    this.viewStream = deps.viewStream;
    deps.viewStream.onViewUpdated(() => this.update());
    deps.events.onLanguageChanged(() => this.update());
    this.update();
  }

  update(): void {
    this.updateSide("shipA");
    this.updateSide("shipB");
  }

  setHpValueDisplay(mode: HpValueDisplay): void {
    this.hpValueDisplay = mode;
    this.update();
  }

  private updateSide(side: Side): void {
    const state = sideStateFor(side, this.shipAState, this.shipBState);
    const root = side === "shipA" ? this.els.shipA : this.els.shipB;
    const image = side === "shipA" ? this.els.shipAImage : this.els.shipBImage;
    const effects = side === "shipA" ? this.els.shipAEffects : this.els.shipBEffects;
    const hpBars = side === "shipA" ? this.els.shipAHpBars : this.els.shipBHpBars;
    const lockBadge = side === "shipA" ? this.els.shipALockBadge : this.els.shipBLockBadge;
    const profile = this.combatantProfiles.profile(side);
    if (profile === undefined) {
      root.hidden = true;
      effects.hidden = true;
      hpBars.hidden = true;
      lockBadge.hidden = true;
      state.lastKey = "";
      state.lastId = "";
      return;
    }
    const offensiveModules = this.viewStream.currentView()?.incomingOffensiveModules[side] ?? [];
    const portraitEffects = offensiveModules.map((m) => offensiveModuleEffect(m, this.i18n));
    const defenseEffects = this.defenseController.cyclingEffects(side);
    const allEffects = [...portraitEffects, ...defenseEffects];
    const hpPercentages = this.defenseController.hpPercentages(side);
    updateHpBars(hpBars, hpPercentages);
    hpBars.hidden = hpPercentages === undefined;
    const hpValueEls = side === "shipA" ? this.els.shipAHpValues : this.els.shipBHpValues;
    updateHpValues(hpValueEls, this.hpValueDisplay, this.defenseController.hpValues(side), hpPercentages);
    const lock = this.viewStream.currentView()?.locks[side];
    const lockBadgeVisible = lock !== undefined && lock.status === "locked" && lock.lockTime > 0;
    if (lockBadge.hidden !== !lockBadgeVisible) lockBadge.hidden = !lockBadgeVisible;
    const key = buildDiffKey(profile.id, allEffects, lockBadgeVisible);
    if (state.lastKey === key) return;
    state.lastKey = key;
    if (root.hidden) root.hidden = false;
    if (state.lastId !== profile.id) {
      state.lastId = profile.id;
      image.src = this.imageCatalog.shipImageUrl(profile.id) ?? "";
    }
    effects.innerHTML = "";
    const icons = document.createDocumentFragment();
    for (const effect of allEffects) {
      const iconUrl = this.imageCatalog.itemIconUrl(effect.moduleId);
      if (iconUrl === undefined) continue;
      const img = html`<img class="portrait-effect-icon" src=${iconUrl} alt="" data-hint=${effect.hint}>` as unknown as HTMLImageElement;
      icons.appendChild(img);
    }
    effects.appendChild(icons);
    if (effects.hidden !== (effects.childElementCount === 0)) effects.hidden = effects.childElementCount === 0;
  }
}

function sideStateFor(side: Side, shipAState: SideState, shipBState: SideState): SideState {
  return side === "shipA" ? shipAState : shipBState;
}

function buildDiffKey(id: ShipId, effects: readonly PortraitEffect[], lockBadge: boolean): string {
  return `${id}|${effects.map((e) => `${e.moduleId}:${e.hint}`).join(",")}|${lockBadge}`;
}

function offensiveModuleEffect(module: ActiveOffensiveModule, i18n: I18n): PortraitEffect {
  if (module.category === "weapon") return { moduleId: module.moduleId, hint: i18n.t(`portrait.weapon.${module.weaponKind}`) };
  return ewarEffectHint(module, i18n);
}

function ewarEffectHint(effect: ActiveOffensiveModule & { category: "ewar" }, i18n: I18n): PortraitEffect {
  switch (effect.family) {
    case "web":
      return { moduleId: effect.moduleId, hint: `${i18n.t("ewar.hover.web")} ${percentFromMultiplier(effect.speedMultiplier)}%` };
    case "grappler":
      return { moduleId: effect.moduleId, hint: `${i18n.t("ewar.hover.web")} ${percentFromMultiplier(effect.speedMultiplier)}%` };
    case "scrambler":
      return { moduleId: effect.moduleId, hint: i18n.t("ewar.hover.scrambler") };
    case "disruptor": {
      const parts: string[] = [];
      if (effect.trackingMultiplier < 1) parts.push(`${i18n.t("ewar.hover.tracking")} -${percentFromMultiplier(effect.trackingMultiplier)}%`);
      if (effect.optimalMultiplier < 1) parts.push(`${i18n.t("ewar.hover.optimal")} -${percentFromMultiplier(effect.optimalMultiplier)}%`);
      if (effect.falloffMultiplier < 1) parts.push(`${i18n.t("ewar.hover.falloff")} -${percentFromMultiplier(effect.falloffMultiplier)}%`);
      return { moduleId: effect.moduleId, hint: parts.join(" · ") };
    }
    case "dampener": {
      const parts: string[] = [];
      if (effect.scanResolutionMultiplier < 1) parts.push(`${i18n.t("ewar.hover.scanResolution")} -${percentFromMultiplier(effect.scanResolutionMultiplier)}%`);
      if (effect.maxTargetRangeMultiplier < 1) parts.push(`${i18n.t("ewar.hover.targetingRange")} -${percentFromMultiplier(effect.maxTargetRangeMultiplier)}%`);
      return { moduleId: effect.moduleId, hint: parts.join(" · ") };
    }
    case "painter": {
      const percent = signedPercentFromMultiplier(effect.signatureMultiplier);
      return { moduleId: effect.moduleId, hint: `${i18n.t("ewar.hover.sigRadius")} ${percent > 0 ? "+" : ""}${percent}%` };
    }
  }
}

function updateHpBars(container: HTMLElement, percentages: Readonly<Record<DefenseLayer, number>> | undefined): void {
  const bars = container.querySelectorAll<HTMLElement>(".portrait-hp-bar");
  for (let i = 0; i < HP_BAR_LAYERS.length && i < bars.length; i++) {
    const fill = bars[i].querySelector<HTMLElement>(".portrait-hp-fill");
    if (!fill) continue;
    const pct = percentages ? percentages[HP_BAR_LAYERS[i]] : 1;
    const lost = Math.max(0, Math.min(1, 1 - pct));
    fill.style.width = `${lost * 100}%`;
  }
}

function updateHpValues(els: { readonly shield: HTMLElement; readonly armor: HTMLElement; readonly hull: HTMLElement }, mode: HpValueDisplay, values: { readonly current: Readonly<Record<DefenseLayer, number>>; readonly max: Readonly<Record<DefenseLayer, number>> } | undefined, percentages: Readonly<Record<DefenseLayer, number>> | undefined): void {
  if (mode === "none" || percentages === undefined || values === undefined) {
    els.shield.hidden = true;
    els.armor.hidden = true;
    els.hull.hidden = true;
    return;
  }
  for (const layer of HP_BAR_LAYERS) {
    const el = els[layer];
    if (mode === "percentage") {
      const pct = Math.round(Math.max(0, Math.min(1, percentages[layer])) * 100);
      setText(el, `${pct}%`);
    } else {
      setText(el, `${formatWithCommas(Math.round(values.current[layer]))} / ${formatWithCommas(values.max[layer])}`);
    }
    el.hidden = false;
  }
}
