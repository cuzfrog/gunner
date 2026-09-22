export const IN_SCOPE_CATEGORY_IDS: ReadonlySet<number> = new Set([7, 8, 18, 32, 66, 87, 4, 22]);
export const ICON_FILE_PREFIX = "icons/";
export const TYPE_ICON_FILE_PREFIX = "type-icons/";

export interface SdeType {
  readonly typeID: number;
  readonly groupID: number;
  readonly published: number;
  readonly iconID?: number;
}

export interface SdeGroup {
  readonly groupID: number;
  readonly categoryID: number;
}

export function buildTypeIconEntries(types: Readonly<Record<string, SdeType>>, groups: Readonly<Record<string, SdeGroup>>, inScopeCategoryIds: ReadonlySet<number>): Record<string, string> {
  const inScopeGroupIds = new Set<string>();
  for (const [gid, group] of Object.entries(groups)) {
    if (inScopeCategoryIds.has(group.categoryID)) inScopeGroupIds.add(gid);
  }
  const entries: Record<string, string> = {};
  for (const [tid, type] of Object.entries(types)) {
    if (!inScopeGroupIds.has(String(type.groupID))) continue;
    entries[tid] = type.iconID !== undefined ? `${ICON_FILE_PREFIX}${type.iconID}@1x.png` : expectedTypeIconFile(type.typeID);
  }
  return entries;
}

export function expectedTypeIconFile(typeId: number): string {
  return `${TYPE_ICON_FILE_PREFIX}${typeId}@1x.png`;
}
