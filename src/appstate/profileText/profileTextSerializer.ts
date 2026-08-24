import type { ProfileSettings } from "../userSettings";
import { ATTACKER_FIELDS, GLOBAL_FIELDS, OVERRIDE_KEYS, TARGET_FIELDS, dotKeyForField, overrideDotKeyForFull, type ScalarValue, type Side } from "./profileTextFields";
import { PROFILE_TEXT_HEADER, stripCarriageReturn } from "./profileTextFormat";

export class ProfileTextSerializer {
  serialize(settings: ProfileSettings): string {
    const lines: string[] = [PROFILE_TEXT_HEADER];

    for (const field of GLOBAL_FIELDS) {
      this.serializeScalar(lines, dotKeyForField(field), settings[field]);
    }

    this.serializeSide(lines, "attacker", settings);
    this.serializeSide(lines, "target", settings);

    return lines.join("\n");
  }

  private serializeSide(lines: string[], side: Side, settings: ProfileSettings): void {
    const fitting = side === "attacker" ? settings.attackerFitting : settings.targetFitting;
    if (fitting !== undefined) {
      if (fitting.split("\n").some((line) => stripCarriageReturn(line) === "---")) {
        throw new Error(`fitting text for ${side} contains block terminator`);
      }
      lines.push(`${side}.fitting:`);
      lines.push(fitting);
      lines.push("---");
    }

    const fields = side === "attacker" ? ATTACKER_FIELDS : TARGET_FIELDS;
    for (const field of fields) {
      this.serializeScalar(lines, dotKeyForField(field), settings[field]);
    }

    const overrides = side === "attacker" ? settings.attackerOverrides : settings.targetOverrides;
    if (overrides !== undefined) {
      for (const key of OVERRIDE_KEYS) {
        const dotKey = overrideDotKeyForFull(side, key);
        if (dotKey === undefined) continue;
        if (key === "sigRes") {
          const sigResValue = overrides[key];
          if (sigResValue === undefined) continue;
          lines.push(`${dotKey}=${sigResValue}`);
        } else {
          const numValue = overrides[key];
          if (numValue === undefined) continue;
          lines.push(`${dotKey}=${formatNumber(numValue)}`);
        }
      }
    }
  }

  private serializeScalar(lines: string[], dotKey: string, value: ScalarValue | undefined): void {
    if (value === undefined) return;
    if (typeof value === "boolean") {
      lines.push(`${dotKey}=${value ? "true" : "false"}`);
      return;
    }
    if (typeof value === "number") {
      lines.push(`${dotKey}=${formatNumber(value)}`);
      return;
    }
    if (typeof value === "string") {
      lines.push(`${dotKey}=${value}`);
      return;
    }
    lines.push(`${dotKey}=${JSON.stringify(value)}`);
  }
}

function formatNumber(value: number): string {
  return String(value);
}
