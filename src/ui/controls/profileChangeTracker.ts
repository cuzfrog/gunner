import type { ProfileEquality, ProfileSettings } from "../../appstate";

export interface ProfileChangeTracker {
  setBaseline(profile: ProfileSettings | undefined): void;
  clearBaseline(): void;
  hasUnsavedChanges(current: ProfileSettings | undefined): boolean;
}

export class ProfileChangeTrackerImpl implements ProfileChangeTracker {
  private readonly equality: ProfileEquality;
  private baseline: ProfileSettings | undefined;

  constructor(deps: { readonly equality: ProfileEquality }) {
    this.equality = deps.equality;
  }

  setBaseline(profile: ProfileSettings | undefined): void {
    this.baseline = profile;
  }

  clearBaseline(): void {
    this.baseline = undefined;
  }

  hasUnsavedChanges(current: ProfileSettings | undefined): boolean {
    if (!this.baseline || !current) return false;
    return !this.equality.equal(this.baseline, current);
  }
}
