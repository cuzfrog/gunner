import { BURST_CHARGE_GROUPS, COMMAND_BURST_GROUP } from "./combatAttributes";
import type { ChargeStats, CommandBurstStats } from "../../src/gamedata/fittingDb/types";
import type { TypeId } from "../../src/gamedata/ids";

export interface BuildCommandBurstStatsContext {
  readonly typeId: TypeId;
  readonly name: string;
  readonly values: Map<string, number>;
  readonly requiredSkillIds: readonly TypeId[];
}

export function buildCommandBurstStats(ctx: BuildCommandBurstStatsContext): CommandBurstStats | undefined {
  const duration = ctx.values.get("duration");
  const capacitorNeed = ctx.values.get("capacitorNeed");
  const chargeGroup = ctx.values.get("chargeGroup1");
  if (duration === undefined || capacitorNeed === undefined || chargeGroup === undefined) return undefined;
  return {
    id: ctx.typeId,
    name: ctx.name,
    maxRange: ctx.values.get("maxRange") ?? 0,
    cycleTime: duration / 1000,
    capacitorNeed,
    reloadTime: (ctx.values.get("reloadTime") ?? 0) / 1000,
    chargeGroup,
    requiredSkillIds: ctx.requiredSkillIds,
  };
}

export function buildBurstChargeStats(typeId: TypeId, name: string, groupId: number, values: Map<string, number>): ChargeStats | undefined {
  if (!BURST_CHARGE_GROUPS.has(groupId)) return undefined;
  const warfareBuffId = values.get("warfareBuff1ID");
  return {
    id: typeId,
    name,
    ...(warfareBuffId !== undefined ? { warfareBuffId, warfareBuffMultiplier: values.get("warfareBuff1Multiplier") } : {}),
    chargeGroup: groupId,
    chargeSize: 0,
  };
}
