import type { ShipId } from "../../../gamedata/ids";
import type { AppliedEwarEffect, EwarResolver } from "../../../sim";
import type { ImageCatalog } from "../../icons";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import type { EwarController } from "../ewar";
import type { Side } from "../side";
import type { CombatantProfiles, PortraitsEls, PortraitsController } from "./portraitsControllerContract";

interface SideState {
  lastKey: string;
  lastId: ShipId | "";
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
    const applied = this.ewarResolver.appliedEffects(projection, this.distance);
    const key = buildDiffKey(profile.id, applied);
    if (state.lastKey === key) return;
    state.lastKey = key;
    if (root.hidden) root.hidden = false;
    if (state.lastId !== profile.id) {
      state.lastId = profile.id;
      image.src = this.imageCatalog.shipImageUrl(profile.id, profile.name);
    }
    effects.innerHTML = "";
    const icons = document.createDocumentFragment();
    for (const effect of applied) {
      const iconUrl = this.imageCatalog.itemIconUrl(effect.moduleName);
      if (iconUrl === undefined) continue;
      const img = document.createElement("img");
      img.className = "portrait-effect-icon";
      img.alt = "";
      img.src = iconUrl;
      img.title = buildEffectTitle(effect, this.i18n);
      icons.appendChild(img);
    }
    effects.appendChild(icons);
    if (effects.hidden !== (effects.childElementCount === 0)) effects.hidden = effects.childElementCount === 0;
  }
}

function sideStateFor(side: Side, shipAState: SideState, shipBState: SideState): SideState {
  return side === "shipA" ? shipAState : shipBState;
}

function buildDiffKey(id: ShipId, effects: readonly AppliedEwarEffect[]): string {
  return `${id}|${effects.map((e) => `${e.family}:${e.moduleName}`).join(",")}`;
}

function buildEffectTitle(effect: AppliedEwarEffect, i18n: I18n): string {
  return `${i18n.t(`label.ewar.${effect.family}`)}: ${effect.moduleName}`;
}
