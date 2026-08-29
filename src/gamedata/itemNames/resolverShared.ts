import { toTypeId, type TypeId } from "../ids";

export type NameToIds = Map<string, TypeId[]>;

export function buildReverseMap(pack: Readonly<Record<string, string>>, collisions: Readonly<Record<string, string>>): NameToIds {
  const groups = new Map<string, TypeId[]>();
  for (const [id, name] of Object.entries(pack)) {
    const typeId = toTypeId(id);
    const list = groups.get(name) ?? [];
    list.push(typeId);
    groups.set(name, list);
  }

  const map = new Map<string, TypeId[]>();
  for (const [name, ids] of groups) {
    const preferredId = collisions[name];
    const preferred = preferredId !== undefined ? toTypeId(preferredId) : undefined;
    const sorted = [...ids].sort((a, b) => Number(a) - Number(b));
    if (preferred && ids.includes(preferred)) {
      const rest = sorted.filter((id) => id !== preferred);
      map.set(name, [preferred, ...rest]);
    } else {
      map.set(name, sorted);
    }
  }
  return map;
}
