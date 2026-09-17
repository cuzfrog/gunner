import type { SubsystemStats, SubsystemSlotKind } from "../../src/gamedata/fittingDb/types";
import type { TypeId } from "../../src/gamedata/ids";

export interface BuildSubsystemStatsContext {
  readonly typeId: TypeId;
  readonly name: string;
  readonly groupId: number;
  readonly values: Map<string, number>;
  readonly requiredSkillIds: readonly TypeId[];
}

const SLOT_KIND_BY_GROUP_ID: Readonly<Record<number, SubsystemSlotKind>> = { 958: "core", 956: "offensive", 954: "defensive", 957: "propulsion" };

export function buildSubsystemStats(ctx: BuildSubsystemStatsContext): SubsystemStats | undefined {
  const slotKind = SLOT_KIND_BY_GROUP_ID[ctx.groupId];
  if (slotKind === undefined) return undefined;
  return {
    id: ctx.typeId,
    name: ctx.name,
    slotKind,
    highSlots: ctx.values.get("hiSlotModifier") ?? 0,
    medSlots: ctx.values.get("medSlotModifier") ?? 0,
    lowSlots: ctx.values.get("lowSlotModifier") ?? 0,
    turretHardpoints: ctx.values.get("turretHardPointModifier") ?? 0,
    launcherHardpoints: ctx.values.get("launcherHardPointModifier") ?? 0,
    requiredSkillIds: ctx.requiredSkillIds,
  };
}
