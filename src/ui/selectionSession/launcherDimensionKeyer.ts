import type { LauncherClass, LauncherClasses } from "../../fitting";
import type { DimensionKeyer } from "./dimensionKeyer";
import type { StoredSelection } from "./selectionSession";

export class LauncherDimensionKeyerImpl implements DimensionKeyer<LauncherClass> {
  private readonly launcherClasses: LauncherClasses;

  constructor(launcherClasses: LauncherClasses) {
    this.launcherClasses = launcherClasses;
  }

  key(launcherClass: LauncherClass): string {
    return `launcher:${launcherClass}`;
  }

  fallback(launcherClass: LauncherClass): StoredSelection {
    return { moduleId: this.launcherClasses.representativeOf(launcherClass) };
  }
}
