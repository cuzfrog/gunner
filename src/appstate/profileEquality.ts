import type { ProfileSettings } from "./userSettings";

export interface ProfileEquality {
  equal(a: ProfileSettings, b: ProfileSettings): boolean;
}

export class CanonicalProfileEquality implements ProfileEquality {
  equal(a: ProfileSettings, b: ProfileSettings): boolean {
    return profilesEqual(a, b);
  }
}

function profilesEqual(a: ProfileSettings, b: ProfileSettings): boolean {
  return JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
}
