import type { AppliedEwarEffect, EwarResolver } from "../../../sim";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import type { EwarController } from "../ewar";
import type { Side } from "../side";
import type { CombatantProfiles, PortraitsEls, PortraitsController } from "./portraitsControllerContract";

interface SideState {
  lastKey: string;
  lastName: string;
}

export class PortraitsControllerImpl implements PortraitsController {
  private readonly els: PortraitsEls;
  private readonly imageCatalog: ImageCatalog;
  private readonly ewarController: EwarController;
  private readonly ewarResolver: EwarResolver;
  private readonly combatantProfiles: CombatantProfiles;
  private readonly events: UiEvents;
  private distance = 0;
  private readonly attackerState: SideState = { lastKey: "", lastName: "" };
  private readonly targetState: SideState = { lastKey: "", lastName: "" };

  constructor(deps: {
    els: PortraitsEls;
    imageCatalog: ImageCatalog;
    ewarController: EwarController;
    ewarResolver: EwarResolver;
    combatantProfiles: CombatantProfiles;
    events: UiEvents;
  }) {
    this.els = deps.els;
    this.imageCatalog = deps.imageCatalog;
    this.ewarController = deps.ewarController;
    this.ewarResolver = deps.ewarResolver;
    this.combatantProfiles = deps.combatantProfiles;
    this.events = deps.events;
    this.events.onDistanceChanged((d) => { this.distance = d; });
    this.update();
  }

  update(): void {
    this.updateSide("attacker");
    this.updateSide("target");
  }

  private updateSide(side: Side): void {
    const state = sideStateFor(side, this.attackerState, this.targetState);
    const root = side === "attacker" ? this.els.attacker : this.els.target;
    const image = side === "attacker" ? this.els.attackerImage : this.els.targetImage;
    const effects = side === "attacker" ? this.els.attackerEffects : this.els.targetEffects;
    const profile = this.combatantProfiles.profile(side);
    if (profile === undefined) {
      root.hidden = true;
      state.lastKey = "";
      state.lastName = "";
      return;
    }
    const enemySide: Side = side === "attacker" ? "target" : "attacker";
    const projection = this.ewarController.projection(enemySide);
    const applied = this.ewarResolver.appliedEffects(projection, this.distance);
    const key = buildDiffKey(profile.name, applied);
    if (state.lastKey === key) return;
    state.lastKey = key;
    if (root.hidden) root.hidden = false;
    if (state.lastName !== profile.name) {
      state.lastName = profile.name;
      image.src = this.imageCatalog.shipImageUrl(profile.name);
    }
    effects.innerHTML = "";
    for (const effect of applied) {
      const iconUrl = this.imageCatalog.itemIconUrl(effect.moduleName);
      if (iconUrl === undefined) continue;
      const img = document.createElement("img");
      img.className = "portrait-effect-icon";
      img.alt = "";
      img.src = iconUrl;
      effects.appendChild(img);
    }
  }
}

function sideStateFor(side: Side, attackerState: SideState, targetState: SideState): SideState {
  return side === "attacker" ? attackerState : targetState;
}

function buildDiffKey(name: string, effects: readonly AppliedEwarEffect[]): string {
  return `${name}|${effects.map((e) => `${e.family}:${e.moduleName}`).join(",")}`;
}
