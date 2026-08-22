export interface ParsedModuleLine {
  readonly name: string;
  readonly charge?: string;
  readonly offline: boolean;
}

export interface ParsedQuantityItem {
  readonly name: string;
  readonly quantity: number;
}

export interface ParsedFitting {
  readonly hullName: string;
  readonly fittingName: string;
  readonly modules: readonly ParsedModuleLine[];
  readonly drones: readonly ParsedQuantityItem[];
  readonly cargo: readonly ParsedQuantityItem[];
}

const HEADER_PATTERN = /^\[(?<hull>[^,]+),\s*(?<name>.+)\]$/;
const EMPTY_SLOT_PATTERN = /^\[.+?\]$/;
const QUANTITY_PATTERN = /^(.+?) x(\d+)$/;
const MODULE_PATTERN = /^([^,/\[\]]+?)(?:,\s*([^,/\[\]]+?))?(\s*\/(OFFLINE|offline))?$/;

export function parseEft(text: string): ParsedFitting | undefined {
  const groups = trimmedLineGroups(text);
  if (groups.length === 0) return undefined;

  const headerGroup = groups[0];
  const headerIndex = headerGroup.findIndex((line) => HEADER_PATTERN.test(line));
  if (headerIndex === -1) return undefined;

  const parsedHeader = HEADER_PATTERN.exec(headerGroup[headerIndex]);
  if (!parsedHeader?.groups) return undefined;

  const hullName = parsedHeader.groups.hull.trim();
  const fittingName = parsedHeader.groups.name.trim();
  if (hullName.length === 0 || fittingName.length === 0) return undefined;

  const modules: ParsedModuleLine[] = [];
  const cargo: ParsedQuantityItem[] = [];
  const drones: ParsedQuantityItem[] = [];
  let droneBlockSeen = false;

  for (let i = 0; i < groups.length; i++) {
    const group = i === 0 ? headerGroup.slice(headerIndex + 1) : groups[i];
    const quantities: ParsedQuantityItem[] = [];
    const moduleLines: ParsedModuleLine[] = [];

    for (const line of group) {
      if (EMPTY_SLOT_PATTERN.test(line)) continue;

      const quantity = parseQuantityLine(line);
      if (quantity) {
        quantities.push(quantity);
        continue;
      }

      const module = parseModuleLine(line);
      if (module) {
        moduleLines.push(module);
      }
    }

    if (moduleLines.length > 0) {
      modules.push(...moduleLines);
      cargo.push(...quantities);
      continue;
    }

    if (quantities.length === 0) continue;

    if (!droneBlockSeen) {
      drones.push(...quantities);
      droneBlockSeen = true;
    } else {
      cargo.push(...quantities);
    }
  }

  return { hullName, fittingName, modules, cargo, drones };
}

function trimmedLineGroups(text: string): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
    } else {
      current.push(trimmed);
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function parseQuantityLine(line: string): ParsedQuantityItem | undefined {
  const match = QUANTITY_PATTERN.exec(line);
  if (!match) return undefined;
  const name = match[1].trim();
  const quantity = Number.parseInt(match[2], 10);
  if (name.length === 0 || !Number.isFinite(quantity) || quantity <= 0) return undefined;
  return { name, quantity };
}

function parseModuleLine(line: string): ParsedModuleLine | undefined {
  const match = MODULE_PATTERN.exec(line);
  if (!match) return undefined;
  const name = match[1].trim();
  const charge = match[2]?.trim();
  if (name.length === 0) return undefined;
  return { name, charge: charge && charge.length > 0 ? charge : undefined, offline: match[3] !== undefined };
}
