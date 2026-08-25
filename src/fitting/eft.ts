import { MODULE_SLOT_CATALOG, type ModuleSlot, type ModuleSlotCatalog } from "../gamedata/moduleSlots";

export type BankKind = "low" | "mid" | "high" | "rig" | "subsystem" | "service";

export interface QuantityItem {
  readonly name: string;
  readonly quantity: number;
}

export interface EftModule {
  readonly name: string;
  readonly charge?: string;
  readonly offline: boolean;
}

export type EftLine =
  | { readonly kind: "module"; readonly name: string; readonly charge?: string; readonly offline: boolean }
  | { readonly kind: "empty"; readonly label: string };

export interface EftBank {
  readonly bank: BankKind;
  readonly lines: readonly EftLine[];
}

export interface EftDocument {
  readonly hullName: string;
  readonly fittingName: string;
  readonly banks: readonly EftBank[];
  readonly drones: readonly QuantityItem[];
  readonly cargo: readonly QuantityItem[];
}

const HEADER_PATTERN = /^\[(?<hull>[^,]+),\s*(?<name>.+)\]$/;
const EMPTY_SLOT_PATTERN = /^\[Empty\s+(low|med|medium|high|rig|sub\s*system|subsystem|service)\s+slot\]$/i;
const QUANTITY_PATTERN = /^(.+?) x(\d+)$/;
const MODULE_PATTERN = /^([^,/\[\]]+?)(?:,\s*([^,/\[\]]+?))?(\s*\/(OFFLINE))?$/i;

const BANK_ORDER: readonly BankKind[] = ["low", "mid", "high", "rig", "subsystem", "service"];
const BANK_BY_NORMAL_NAME: Readonly<Record<string, BankKind>> = {
  low: "low",
  med: "mid",
  medium: "mid",
  high: "high",
  rig: "rig",
  sub: "subsystem",
  subsystem: "subsystem",
  service: "service",
};

export function parseEft(text: string, slotCatalog: ModuleSlotCatalog = MODULE_SLOT_CATALOG): EftDocument | undefined {
  const groups = trimmedLineGroups(text);
  if (groups.length === 0) return undefined;

  const headerGroup = groups[0];
  const headerIndex = headerGroup.findIndex((line) => HEADER_PATTERN.test(line));
  if (headerIndex === -1) return undefined;

  const match = HEADER_PATTERN.exec(headerGroup[headerIndex]);
  if (!match?.groups) return undefined;

  const hullName = match.groups.hull.trim();
  const fittingName = match.groups.name.trim();
  if (hullName.length === 0 || fittingName.length === 0) return undefined;

  const bodyGroups = buildBodyGroups(groups, headerIndex);
  const blocks = bodyGroups.map(parseBlock);
  const intendedBanks = assignModuleBanks(blocks);

  const bankLines: Record<BankKind, EftLine[]> = { low: [], mid: [], high: [], rig: [], subsystem: [], service: [] };
  const drones: QuantityItem[] = [];
  const cargo: QuantityItem[] = [];
  let droneBlockSeen = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (isQuantityOnlyBlock(block)) {
      for (const item of block.quantities) {
        if (!droneBlockSeen) {
          drones.push(item);
          droneBlockSeen = true;
        } else {
          cargo.push(item);
        }
      }
      continue;
    }

    const intended = intendedBanks[i];
    for (const line of block.lines) {
      if (line.kind === "empty") {
        bankLines[line.bank].push({ kind: "empty", label: line.label });
        continue;
      }
      const target = moduleTarget(line.module, intended, slotCatalog);
      if (target === undefined) continue;
      bankLines[target].push(eftLineFromModule(line.module));
    }

    for (const item of block.quantities) cargo.push(item);
  }

  const banks: EftBank[] = [];
  for (const kind of BANK_ORDER) {
    const lines = bankLines[kind];
    if (lines.length > 0) banks.push({ bank: kind, lines });
  }

  return { hullName, fittingName, banks, drones, cargo };
}

export function moduleLines(document: EftDocument): readonly EftModule[] {
  const modules: EftModule[] = [];
  for (const bank of document.banks) {
    for (const line of bank.lines) {
      if (line.kind === "module") modules.push(eftModuleFrom(line));
    }
  }
  return modules;
}

function eftModuleFrom(line: Extract<EftLine, { kind: "module" }>): EftModule {
  if (line.charge) return { name: line.name, charge: line.charge, offline: line.offline };
  return { name: line.name, offline: line.offline };
}

function eftLineFromModule(module: EftModule): EftLine {
  if (module.charge) return { kind: "module", name: module.name, charge: module.charge, offline: module.offline };
  return { kind: "module", name: module.name, offline: module.offline };
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

function buildBodyGroups(groups: string[][], headerIndex: number): string[][] {
  const first = groups[0].slice(headerIndex + 1);
  const rest = groups.slice(1);
  return first.length > 0 ? [first, ...rest] : rest;
}

interface ParsedModuleLine {
  readonly kind: "module";
  readonly module: EftModule;
}

interface ParsedEmptyLine {
  readonly kind: "empty";
  readonly bank: BankKind;
  readonly label: string;
}

interface Block {
  readonly lines: readonly (ParsedModuleLine | ParsedEmptyLine)[];
  readonly quantities: readonly QuantityItem[];
  readonly hasModules: boolean;
  readonly hasEmpties: boolean;
  readonly anchor?: BankKind;
}

function parseBlock(lines: string[]): Block {
  const parsedLines: (ParsedModuleLine | ParsedEmptyLine)[] = [];
  const quantities: QuantityItem[] = [];
  let hasModules = false;
  let hasEmpties = false;
  let anchor: BankKind | undefined;

  for (const line of lines) {
    const empty = parseEmptySlotLine(line);
    if (empty) {
      parsedLines.push(empty);
      hasEmpties = true;
      if (!anchor) anchor = empty.bank;
      continue;
    }

    const quantity = parseQuantityLine(line);
    if (quantity) {
      quantities.push(quantity);
      continue;
    }

    const module = parseModuleLine(line);
    if (module) {
      parsedLines.push({ kind: "module", module });
      hasModules = true;
    }
  }

  return { lines: parsedLines, quantities, hasModules, hasEmpties, anchor };
}

function isQuantityOnlyBlock(block: Block): boolean {
  return !block.hasModules && !block.hasEmpties && block.quantities.length > 0;
}

function parseEmptySlotLine(line: string): ParsedEmptyLine | undefined {
  const match = EMPTY_SLOT_PATTERN.exec(line);
  if (!match) return undefined;
  const bank = parseBankName(match[1]);
  if (bank === undefined) return undefined;
  return { kind: "empty", bank, label: line };
}

function parseBankName(raw: string): BankKind | undefined {
  const normalized = raw.toLowerCase().replace(/\s+/g, "");
  return BANK_BY_NORMAL_NAME[normalized];
}

function parseQuantityLine(line: string): QuantityItem | undefined {
  const match = QUANTITY_PATTERN.exec(line);
  if (!match) return undefined;
  const name = match[1].trim();
  const quantity = Number.parseInt(match[2], 10);
  if (name.length === 0 || !Number.isFinite(quantity) || quantity <= 0) return undefined;
  return { name, quantity };
}

function parseModuleLine(line: string): EftModule | undefined {
  const match = MODULE_PATTERN.exec(line);
  if (!match) return undefined;
  const name = match[1].trim();
  const charge = match[2]?.trim();
  if (name.length === 0) return undefined;
  return { name, charge: charge && charge.length > 0 ? charge : undefined, offline: match[3] !== undefined };
}

function moduleTarget(module: EftModule, intended: BankKind | undefined, catalog: ModuleSlotCatalog): BankKind | undefined {
  const slot: ModuleSlot | undefined = catalog.slotOf(module.name);
  if (slot !== undefined) return slot;
  return intended;
}

function assignModuleBanks(blocks: Block[]): (BankKind | undefined)[] {
  const intended: (BankKind | undefined)[] = new Array(blocks.length).fill(undefined);
  const moduleBlockIndices = blocks.map((_, i) => i).filter((i) => blocks[i].hasModules || blocks[i].hasEmpties);

  const anchors: { readonly index: number; readonly bank: BankKind }[] = [];
  for (const i of moduleBlockIndices) {
    const anchor = blocks[i].anchor;
    if (anchor) anchors.push({ index: i, bank: anchor });
  }

  for (const i of moduleBlockIndices) {
    if (blocks[i].anchor) intended[i] = blocks[i].anchor;
  }

  if (anchors.length === 0) {
    for (let i = 0; i < moduleBlockIndices.length; i++) intended[moduleBlockIndices[i]!] = BANK_ORDER[i];
    return intended;
  }

  const sortedAnchors = anchors.slice().sort((a, b) => a.index - b.index);

  const firstAnchor = sortedAnchors[0]!;
  const firstAnchorBankIndex = bankIndex(firstAnchor.bank);
  const leading = moduleBlockIndices.filter((i) => i < firstAnchor.index);
  for (let j = 0; j < leading.length; j++) {
    if (j < firstAnchorBankIndex) intended[leading[j]!] = BANK_ORDER[j];
  }

  for (let a = 0; a < sortedAnchors.length - 1; a++) {
    const left = sortedAnchors[a]!;
    const right = sortedAnchors[a + 1]!;
    const gap = moduleBlockIndices.filter((i) => i > left.index && i < right.index);
    let next = bankIndex(left.bank) + 1;
    const rightBankIndex = bankIndex(right.bank);
    for (const i of gap) {
      if (next < rightBankIndex) {
        intended[i] = BANK_ORDER[next];
        next++;
      }
    }
  }

  const lastAnchor = sortedAnchors[sortedAnchors.length - 1]!;
  const lastBankIndex = bankIndex(lastAnchor.bank);
  const trailing = moduleBlockIndices.filter((i) => i > lastAnchor.index);
  for (let j = 0; j < trailing.length; j++) {
    const bankIndex = lastBankIndex + 1 + j;
    if (bankIndex < BANK_ORDER.length) intended[trailing[j]!] = BANK_ORDER[bankIndex];
  }

  return intended;
}

function bankIndex(bank: BankKind): number {
  return BANK_ORDER.indexOf(bank);
}
