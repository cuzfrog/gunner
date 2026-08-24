import type { ProfileParamOverrides, ProfileSettings } from "../userSettings";
import { DOT_KEY_TO_FIELD, OVERRIDE_DOT_KEY_TO_FULL, sideFromFittingDotKey } from "./profileTextFields";
import { parseFittedHullSummary, parseOverrideValue, parseScalarValue, profileSettingsFromRaw } from "./profileTextValidate";
import { PROFILE_TEXT_HEADER, stripCarriageReturn } from "./profileTextFormat";

export class ProfileTextParser {
  hasHeader(text: string): boolean {
    return text.trimStart().startsWith(PROFILE_TEXT_HEADER);
  }

  parse(text: string): ProfileSettings | undefined {
    const rawLines = text.split("\n");
    let firstLine = 0;
    while (firstLine < rawLines.length && rawLines[firstLine].trim() === "") firstLine++;
    if (stripCarriageReturn(rawLines[firstLine]) !== PROFILE_TEXT_HEADER) return undefined;

    let raw: Partial<ProfileSettings> = {};
    let attackerOverrides: Partial<ProfileParamOverrides> = {};
    let targetOverrides: Partial<ProfileParamOverrides> = {};

    let i = firstLine + 1;
    while (i < rawLines.length) {
      const line = stripCarriageReturn(rawLines[i]);
      i++;
      if (line === "") continue;
      if (line === "---") return undefined;

      if (line.endsWith(".fitting:")) {
        const side = sideFromFittingDotKey(line.slice(0, line.length - ".fitting:".length));
        if (side === undefined) return undefined;
        const { body, nextIndex } = readFittingBlock(rawLines, i);
        if (body === undefined) return undefined;
        if (body.split("\n").some((l) => stripCarriageReturn(l) === "---")) return undefined;
        raw = side === "attacker" ? { ...raw, attackerFitting: body } : { ...raw, targetFitting: body };
        i = nextIndex;
        continue;
      }

      const eq = line.indexOf("=");
      if (eq < 0) return undefined;
      const dotKey = line.slice(0, eq);
      const value = line.slice(eq + 1);

      const override = OVERRIDE_DOT_KEY_TO_FULL.get(dotKey);
      if (override !== undefined) {
        const parsed = parseOverrideValue(override, value);
        if (parsed === undefined) return undefined;
        if (dotKey.startsWith("override.attacker.")) {
          attackerOverrides = { ...attackerOverrides, [override]: parsed };
        } else {
          targetOverrides = { ...targetOverrides, [override]: parsed };
        }
        continue;
      }

      const field = DOT_KEY_TO_FIELD.get(dotKey);
      if (field === undefined) continue;
      const parsed = parseScalarValue(field, value);
      if (parsed === undefined) {
        if (field === "attackerEwarActivation" || field === "targetEwarActivation") continue;
        return undefined;
      }
      raw = { ...raw, [field]: parsed };
    }

    if (Object.keys(attackerOverrides).length > 0) raw = { ...raw, attackerOverrides };
    if (Object.keys(targetOverrides).length > 0) raw = { ...raw, targetOverrides };

    return profileSettingsFromRaw(raw);
  }
}

function readFittingBlock(lines: string[], start: number): { body: string | undefined; nextIndex: number } {
  const bodyLines: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = stripCarriageReturn(lines[i]);
    if (line === "---") {
      i++;
      break;
    }
    bodyLines.push(line);
    i++;
  }
  if (bodyLines.length === 0) return { body: undefined, nextIndex: i };
  return { body: bodyLines.join("\n"), nextIndex: i };
}
