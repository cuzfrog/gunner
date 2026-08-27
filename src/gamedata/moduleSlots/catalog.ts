import type { TypeId } from "../ids";
import { MODULE_SLOTS_BY_ID, type ModuleSlot } from "./moduleSlots";

export type { ModuleSlot } from "./moduleSlots";

export interface ModuleSlotCatalog {
  slotOf(moduleId: TypeId): ModuleSlot | undefined;
}

export class StaticModuleSlotCatalog implements ModuleSlotCatalog {
  slotOf(moduleId: TypeId): ModuleSlot | undefined {
    return MODULE_SLOTS_BY_ID[moduleId];
  }
}

export const MODULE_SLOT_CATALOG = new StaticModuleSlotCatalog();
