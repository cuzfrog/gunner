import type { ShipId, TypeId } from "../../../gamedata/ids";
import type { ActiveOffensiveModule, DefenseLayer, EwarEffectFamily, LockState, WeaponKind } from "../../../sim";
import type { HpValueDisplay } from "../../../appstate";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import type { CyclingEffectDescriptor, DefenseController } from "../defense";
import type { ViewStream } from "../../viewStream";
import type { Side } from "../side";
import type { CombatantProfiles, PortraitsEls, PortraitsController } from "./portraitsControllerContract";
import { html } from "../markup";
import { formatWithCommas } from "../controlsFormat";
import { setText } from "../controlsDom";

interface SideState {
  lastKey: string;
  lastId: ShipId | "";
}

/** Identifies one effect icon so the hint provider can resolve its live view data per frame. */
type PortraitEffect =
  | { readonly kind: "weapon"; readonly moduleId: TypeId; readonly weaponKind: WeaponKind }
  | { readonly kind: "ewar"; readonly moduleId: TypeId; readonly family: EwarEffectFamily }
  | { readonly kind: "repairer"; readonly moduleId: TypeId; readonly repairerIndex: number }
  | { readonly kind: "rah"; readonly moduleId: TypeId };

const HP_BAR_LAYERS: readonly DefenseLayer[] = ["shield", "armor", "hull"];
const FULL_POOL: Readonly<Record<DefenseLayer, number>> = { shield: 1, armor: 1, hull: 1 };
const SHIP_HINT_CONTENT_KEY = "shipProfile";
const EFFECT_HINT_CONTENT_KEY = "portraitEffect";

export class PortraitsControllerImpl implements PortraitsController {
  private readonly els: PortraitsEls;
  private readonly imageCatalog: ImageCatalog;
  private readonly defenseController: DefenseController;
  private readonly combatantProfiles: CombatantProfiles;
  private readonly events: UiEvents;
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
    viewStream: ViewStream;
  }) {
    this.els = deps.els;
    this.imageCatalog = deps.imageCatalog;
    this.defenseController = deps.defenseController;
    this.combatantProfiles = deps.combatantProfiles;
    this.events = deps.events;
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
    const wrap = side === "shipA" ? this.els.shipAWrap : this.els.shipBWrap;
    const effects = side === "shipA" ? this.els.shipAEffects : this.els.shipBEffects;
    const hpBars = side === "shipA" ? this.els.shipAHpBars : this.els.shipBHpBars;
    const lockBadge = side === "shipA" ? this.els.shipALockBadge : this.els.shipBLockBadge;
    const profile = this.combatantProfiles.profile(side);
    if (profile === undefined) {
      root.hidden = true;
      effects.hidden = true;
      hpBars.hidden = true;
      lockBadge.hidden = true;
      image.removeAttribute("data-hint-content");
      image.removeAttribute("data-value");
      wrap.removeAttribute("data-hint-content");
      wrap.removeAttribute("data-value");
      state.lastKey = "";
      state.lastId = "";
      return;
    }
    const offensiveModules = this.viewStream.currentView()?.incomingOffensiveModules[side] ?? [];
    const portraitEffects = offensiveModules.map((m) => offensiveModuleEffect(m));
    const defenseEffects = this.defenseController.cyclingEffects(side).map(defenseEffect);
    const allEffects = [...portraitEffects, ...defenseEffects];
    const defenseRuntime = this.viewStream.currentView()?.defenseRuntime;
    const hpPercentages = defenseRuntime?.poolPercentages[side] ?? FULL_POOL;
    updateHpBars(hpBars, hpPercentages);
    hpBars.hidden = false;
    const hpValueEls = side === "shipA" ? this.els.shipAHpValues : this.els.shipBHpValues;
    const hpValues = defenseRuntime ? { current: defenseRuntime.pools[side], max: defenseRuntime.poolMaxes[side] } : undefined;
    updateHpValues(hpValueEls, this.hpValueDisplay, hpValues, hpPercentages);
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
      wrap.setAttribute("data-hint-content", SHIP_HINT_CONTENT_KEY);
      wrap.setAttribute("data-value", profile.id);
    }
    effects.innerHTML = "";
    const icons = document.createDocumentFragment();
    for (const effect of allEffects) {
      const icon = this.createEffectIcon(effect, side);
      if (icon === undefined) continue;
      icons.appendChild(icon);
    }
    effects.appendChild(icons);
    if (effects.hidden !== (effects.childElementCount === 0)) effects.hidden = effects.childElementCount === 0;
  }

  private createEffectIcon(effect: PortraitEffect, side: Side): HTMLImageElement | undefined {
    const iconUrl = effect.kind === "weapon" && effect.weaponKind === "drone" ? this.imageCatalog.droneIconUrl() : this.imageCatalog.itemIconUrl(effect.moduleId);
    if (iconUrl === undefined) return undefined;
    if (effect.kind === "weapon") return html`<img class="portrait-effect-icon" src=${iconUrl} alt="" data-hint-content=${EFFECT_HINT_CONTENT_KEY} data-side=${side} data-effect-kind="weapon" data-weapon-kind=${effect.weaponKind} data-module-id=${effect.moduleId}>` as unknown as HTMLImageElement;
    if (effect.kind === "ewar") return html`<img class="portrait-effect-icon" src=${iconUrl} alt="" data-hint-content=${EFFECT_HINT_CONTENT_KEY} data-side=${side} data-effect-kind="ewar" data-ewar-family=${effect.family} data-module-id=${effect.moduleId}>` as unknown as HTMLImageElement;
    if (effect.kind === "repairer") return html`<img class="portrait-effect-icon" src=${iconUrl} alt="" data-hint-content=${EFFECT_HINT_CONTENT_KEY} data-side=${side} data-effect-kind="repairer" data-repairer-index=${String(effect.repairerIndex)} data-module-id=${effect.moduleId}>` as unknown as HTMLImageElement;
    return html`<img class="portrait-effect-icon" src=${iconUrl} alt="" data-hint-content=${EFFECT_HINT_CONTENT_KEY} data-side=${side} data-effect-kind="rah" data-module-id=${effect.moduleId}>` as unknown as HTMLImageElement;
  }
}

function sideStateFor(side: Side, shipAState: SideState, shipBState: SideState): SideState {
  return side === "shipA" ? shipAState : shipBState;
}

function buildDiffKey(id: ShipId, effects: readonly PortraitEffect[], lockBadge: boolean): string {
  return `${id}|${effects.map(effectKey).join(",")}|${lockBadge}`;
}

function effectKey(effect: PortraitEffect): string {
  if (effect.kind === "weapon") return `weapon:${effect.weaponKind}:${effect.moduleId}`;
  if (effect.kind === "ewar") return `ewar:${effect.family}:${effect.moduleId}`;
  if (effect.kind === "repairer") return `repairer:${effect.repairerIndex}:${effect.moduleId}`;
  return `rah:${effect.moduleId}`;
}

function offensiveModuleEffect(module: ActiveOffensiveModule): PortraitEffect {
  if (module.category === "weapon") return { kind: "weapon", moduleId: module.moduleId, weaponKind: module.weaponKind };
  return { kind: "ewar", moduleId: module.moduleId, family: module.family };
}

function defenseEffect(descriptor: CyclingEffectDescriptor): PortraitEffect {
  if (descriptor.kind === "repairer") return { kind: "repairer", moduleId: descriptor.moduleId, repairerIndex: descriptor.repairerIndex };
  return { kind: "rah", moduleId: descriptor.moduleId };
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
