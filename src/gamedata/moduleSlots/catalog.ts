import { MODULE_SLOTS, type ModuleSlot } from "./moduleSlots";

export type { ModuleSlot } from "./moduleSlots";

export interface ModuleSlotCatalog {
  slotOf(moduleName: string): ModuleSlot | undefined;
}

export class StaticModuleSlotCatalog implements ModuleSlotCatalog {
  slotOf(moduleName: string): ModuleSlot | undefined {
    return MODULE_SLOTS[moduleName];
  }
}

export const MODULE_SLOT_CATALOG = new StaticModuleSlotCatalog();
