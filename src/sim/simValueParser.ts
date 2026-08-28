import { AGGRESSIVITY_MAX, AGGRESSIVITY_MIN, type AutopilotMode, type SigResolutionClass } from "./types";

export interface SimValueParser {
  parseAutopilotMode(value: unknown): AutopilotMode | undefined;
  parseSigResolutionClass(value: unknown): SigResolutionClass | undefined;
  normalizeAggressivity(value: number): number;
}

export class SimValueParserImpl implements SimValueParser {
  parseAutopilotMode(value: unknown): AutopilotMode | undefined {
    return parseAutopilotMode(value);
  }

  parseSigResolutionClass(value: unknown): SigResolutionClass | undefined {
    return parseSigResolutionClass(value);
  }

  normalizeAggressivity(value: number): number {
    return normalizeAggressivity(value);
  }
}

export function normalizeAggressivity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(AGGRESSIVITY_MIN, Math.min(AGGRESSIVITY_MAX, value));
}

function parseAutopilotMode(value: unknown): AutopilotMode | undefined {
  return value === "orbit" || value === "keepAtRange" || value === "midships" || value === "maneuver" ? value : undefined;
}

function parseSigResolutionClass(value: unknown): SigResolutionClass | undefined {
  return value === "S" || value === "M" || value === "L" || value === "XL" ? value : undefined;
}
