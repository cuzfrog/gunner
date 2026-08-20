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
  const nonEmpty = trimmedNonEmptyLines(text);
  const header = nonEmpty.find((line) => HEADER_PATTERN.test(line));
  if (!header) return undefined;

  const parsedHeader = HEADER_PATTERN.exec(header);
  if (!parsedHeader?.groups) return undefined;

  const hullName = parsedHeader.groups.hull.trim();
  const fittingName = parsedHeader.groups.name.trim();
  if (hullName.length === 0 || fittingName.length === 0) return undefined;

  const modules: ParsedModuleLine[] = [];
  const drones: ParsedQuantityItem[] = [];
  const cargo: ParsedQuantityItem[] = [];

  for (const line of nonEmpty) {
    if (line === header) continue;
    if (EMPTY_SLOT_PATTERN.test(line)) continue;

    const quantity = parseQuantityLine(line);
    if (quantity) {
      cargo.push(quantity);
      continue;
    }

    const module = parseModuleLine(line);
    if (module) {
      modules.push(module);
    }
  }

  return { hullName, fittingName, modules, drones, cargo };
}

function trimmedNonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
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
