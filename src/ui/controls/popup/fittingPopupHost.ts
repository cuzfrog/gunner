import type { ShipProfile, StatConditions } from "../../../ships";

export interface FittingPopupHost {
  readonly fittingText: string | undefined;
  readonly profile: ShipProfile | undefined;
  skillConditions(): StatConditions;
}
