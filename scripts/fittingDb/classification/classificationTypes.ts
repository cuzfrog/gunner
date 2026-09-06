import type { HullBonusAttribute, SkillBonusType } from "../../../src/gamedata/fittingDb/types";

export type RigDrawbackKind = "signature" | "agility" | "armorHp" | "shieldHp" | "cpu" | "cpuNeed" | "powerNeed" | "capacitorRecharge" | "cargoCapacity" | "warpSpeed" | "repairPowerGrid";

export type AttributeDomain =
  | "combatBonus" | "moduleStat" | "rigDrawback" | "charge" | "drone"
  | "shipStat" | "skill" | "fitting" | "capacitor" | "ewar" | "sensor"
  | "warfare" | "booster" | "overheat" | "cargo" | "mining" | "warp"
  | "exploration" | "t3Subsystem" | "industrial" | "dot" | "entosis"
  | "fighter" | "structure" | "other";

export type AttributeClassification =
  | {
      readonly kind: "semantic";
      readonly id: number;
      readonly name: string;
      readonly semantic: HullBonusAttribute | SkillBonusType | "drawback" | "moduleStat";
      readonly disambiguate?: "context";
    }
  | {
      readonly kind: "outOfScope";
      readonly id: number;
      readonly name: string;
      readonly domain: AttributeDomain;
      readonly reason: string;
    };

export type EffectClassification =
  | {
      readonly kind: "modifier";
      readonly id: number;
      readonly name: string;
      readonly projection: "hullBonus" | "skillBonus" | "moduleStat" | "none";
      readonly drawback?: RigDrawbackKind;
      readonly scalesWithHullSkill: boolean;
    }
  | {
      readonly kind: "action";
      readonly id: number;
      readonly name: string;
      readonly projection: "defense" | "none";
    }
  | {
      readonly kind: "ignored";
      readonly id: number;
      readonly name: string;
      readonly reason: string;
    };
