import type { EngineView, AppliedEwarEffect } from "../../../sim";
import type { TypeId } from "../../../gamedata/ids";
import type { ViewStream } from "../../viewStream";
import type { HintContentProvider } from "../hoverHint";
import type { I18n } from "../../i18n";
import type { ItemNameCatalog } from "../../../gamedata";
import type { StatHintModel, StatHintRenderer, StatHintRow } from "../statHint";
import { formatWithCommas } from "../controlsFormat";
import { toTypeId } from "../../../gamedata/ids";

export type PortraitEffectHintProvider = HintContentProvider;

export interface PortraitEffectHintProviderDeps {
  readonly viewStream: ViewStream;
  readonly i18n: I18n;
  readonly statHintRenderer: StatHintRenderer;
  readonly itemNameCatalog: ItemNameCatalog;
}

interface WeaponEffectAnchor {
  readonly kind: "weapon";
  readonly side: "shipA" | "shipB";
  readonly moduleId: TypeId;
  readonly weaponKind: string;
}

interface EwarEffectAnchor {
  readonly kind: "ewar";
  readonly side: "shipA" | "shipB";
  readonly moduleId: TypeId;
  readonly family: string;
}

interface RepairerEffectAnchor {
  readonly kind: "repairer";
  readonly side: "shipA" | "shipB";
  readonly moduleId: TypeId;
  readonly repairerIndex: number;
}

interface RahEffectAnchor {
  readonly kind: "rah";
  readonly side: "shipA" | "shipB";
  readonly moduleId: TypeId;
}

type EffectAnchor = WeaponEffectAnchor | EwarEffectAnchor | RepairerEffectAnchor | RahEffectAnchor;

export class PortraitEffectHintProviderImpl implements HintContentProvider {
  private readonly viewStream: ViewStream;
  private readonly i18n: I18n;
  private readonly t: (key: string) => string;
  private readonly renderer: StatHintRenderer;
  private readonly itemNameCatalog: ItemNameCatalog;

  constructor(deps: PortraitEffectHintProviderDeps) {
    this.viewStream = deps.viewStream;
    this.i18n = deps.i18n;
    this.t = (key: string) => deps.i18n.t(key);
    this.renderer = deps.statHintRenderer;
    this.itemNameCatalog = deps.itemNameCatalog;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const anchorData = effectAnchorFrom(anchor);
    if (anchorData === undefined) return;
    const view = this.viewStream.currentView();
    if (view === undefined) return;
    const model = this.buildModel(anchorData, view);
    if (model === undefined) return;
    this.renderer.render(model, container);
  }

  private buildModel(anchor: EffectAnchor, view: EngineView): StatHintModel | undefined {
    const language = this.i18n.current();
    const name = this.itemNameCatalog.nameForId(anchor.moduleId, language);
    if (anchor.kind === "weapon") return this.weaponModel(anchor, view, name);
    if (anchor.kind === "ewar") return this.ewarModel(anchor, view, name);
    if (anchor.kind === "repairer") return this.repairerModel(anchor, view, name);
    return this.rahModel(anchor, view, name);
  }

  private weaponModel(anchor: WeaponEffectAnchor, view: EngineView, name: string): StatHintModel | undefined {
    const t = this.t;
    const attacks = view.weaponAttacks[anchor.side].filter((attack) => attack.weapon.moduleId === anchor.moduleId);
    if (attacks.length === 0) return undefined;
    const appliedDps = attacks.reduce((sum, attack) => sum + attack.assessment.damage.appliedDps, 0);
    const nominalDps = attacks.reduce((sum, attack) => sum + attack.assessment.damage.nominalDps, 0);
    const rows: StatHintRow[] = [
      { label: t("appliedDpsHint.applied"), value: `${formatWithCommas(appliedDps, 1)} DPS`, emphasis: true },
      { label: t("appliedDpsHint.nominal"), value: `${formatWithCommas(nominalDps, 1)} DPS` },
      { label: t("appliedDpsHint.application"), value: percentLabel(nominalDps > 0 ? appliedDps / nominalDps : 0) },
    ];
    if (anchor.weaponKind === "drone") {
      const droneCount = droneCountFor(view, anchor.side, anchor.moduleId);
      if (droneCount !== undefined) rows.push({ label: t("portraitEffect.activeDrones"), value: droneCount });
    }
    return { name, subtitle: t(`portrait.weapon.${anchor.weaponKind}`), sections: [{ rows }] };
  }

  private ewarModel(anchor: EwarEffectAnchor, view: EngineView, name: string): StatHintModel | undefined {
    const effect = view.incomingOffensiveModules[anchor.side].find((module) => module.category === "ewar" && module.family === anchor.family && module.moduleId === anchor.moduleId);
    if (effect === undefined || effect.category !== "ewar") return undefined;
    return { name, sections: [{ rows: [{ value: ewarEffectText(effect, this.t), statement: true }] }] };
  }

  private repairerModel(anchor: RepairerEffectAnchor, view: EngineView, name: string): StatHintModel | undefined {
    const repairerView = view.defenseRuntime?.repairers[anchor.side][anchor.repairerIndex];
    if (repairerView === undefined) return undefined;
    const t = this.t;
    return {
      name,
      subtitle: t(`defense.layer.${repairerView.layer}`),
      sections: [{ rows: [
        { label: t("defense.repairPerSecond"), value: formatWithCommas(repairerView.hpPerSecond, 1) },
        { label: t("portraitEffect.repairPerCycle"), value: formatWithCommas(repairerView.hpPerCycle, 1) },
      ] }],
    };
  }

  private rahModel(anchor: RahEffectAnchor, view: EngineView, name: string): StatHintModel | undefined {
    const rahView = view.defenseRuntime?.rah[anchor.side];
    if (rahView === undefined) return undefined;
    const t = this.t;
    const rows = DAMAGE_TYPES.map((type) => ({ label: t(`dpsHint.damageType.${type}`), value: percentLabel(rahView.resists[type]) }));
    return { name, subtitle: t("defense.rah"), sections: [{ heading: t("defense.resists"), rows }] };
  }
}

const DAMAGE_TYPES = ["em", "thermal", "kinetic", "explosive"] as const;

function effectAnchorFrom(anchor: HTMLElement): EffectAnchor | undefined {
  const side = sideFromAnchor(anchor);
  const moduleId = anchor.getAttribute("data-module-id");
  if (side === undefined || moduleId === null || moduleId === "") return undefined;
  const id = toTypeId(moduleId);
  switch (anchor.getAttribute("data-effect-kind")) {
    case "weapon": {
      const weaponKind = anchor.getAttribute("data-weapon-kind");
      return weaponKind === null || weaponKind === "" ? undefined : { kind: "weapon", side, moduleId: id, weaponKind };
    }
    case "ewar": {
      const family = anchor.getAttribute("data-ewar-family");
      return family === null || family === "" ? undefined : { kind: "ewar", side, moduleId: id, family };
    }
    case "repairer": {
      const index = Number(anchor.getAttribute("data-repairer-index"));
      return Number.isInteger(index) && index >= 0 ? { kind: "repairer", side, moduleId: id, repairerIndex: index } : undefined;
    }
    case "rah":
      return { kind: "rah", side, moduleId: id };
    default:
      return undefined;
  }
}

function sideFromAnchor(anchor: HTMLElement): "shipA" | "shipB" | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  return undefined;
}

function droneCountFor(view: EngineView, side: "shipA" | "shipB", moduleId: TypeId): string | undefined {
  const specs = view.droneSpecs[side];
  const states = view.drones[side];
  let alive = 0;
  let total = 0;
  let found = false;
  for (let i = 0; i < specs.length && i < states.length; i++) {
    if (specs[i].moduleId !== moduleId) continue;
    found = true;
    alive += states[i].aliveCount;
    total += specs[i].droneCount;
  }
  return found ? `${alive}/${total}` : undefined;
}

function ewarEffectText(effect: AppliedEwarEffect, t: (key: string) => string): string {
  switch (effect.family) {
    case "web":
    case "grappler":
      return `${t("ewar.hover.web")} ${percentReduction(effect.speedMultiplier)}%`;
    case "scrambler":
      return t("ewar.hover.scrambler");
    case "disruptor": {
      const parts: string[] = [];
      if (effect.trackingMultiplier < 1) parts.push(`${t("ewar.hover.tracking")} -${percentReduction(effect.trackingMultiplier)}%`);
      if (effect.optimalMultiplier < 1) parts.push(`${t("ewar.hover.optimal")} -${percentReduction(effect.optimalMultiplier)}%`);
      if (effect.falloffMultiplier < 1) parts.push(`${t("ewar.hover.falloff")} -${percentReduction(effect.falloffMultiplier)}%`);
      return parts.join(" · ");
    }
    case "dampener": {
      const parts: string[] = [];
      if (effect.scanResolutionMultiplier < 1) parts.push(`${t("ewar.hover.scanResolution")} -${percentReduction(effect.scanResolutionMultiplier)}%`);
      if (effect.maxTargetRangeMultiplier < 1) parts.push(`${t("ewar.hover.targetingRange")} -${percentReduction(effect.maxTargetRangeMultiplier)}%`);
      return parts.join(" · ");
    }
    case "painter":
      return `${t("ewar.hover.sigRadius")} +${Math.round((effect.signatureMultiplier - 1) * 100)}%`;
    case "neutralizer":
      return `${t("ewar.hover.neutralizer")} ${effect.amountPerCycle} GJ / ${effect.cycleTime}s`;
    case "nosferatu":
      return `${t("ewar.hover.nosferatu")} ${effect.amountPerCycle} GJ / ${effect.cycleTime}s`;
    case "jammer":
      return `${t("ewar.hover.jammer")} · ${effect.cycleTime}s`;
  }
}

function percentReduction(multiplier: number): number {
  return Math.round((1 - multiplier) * 100);
}

function percentLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}
