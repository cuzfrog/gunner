import type { PropulsionKind, PropulsionModule } from "../../ships";
import type { DimensionKeyer } from "./dimensionKeyer";
import type { StoredSelection } from "./selectionSession";

export interface PropulsionDimension {
  readonly kind: PropulsionKind;
  readonly module: PropulsionModule;
}

export class PropulsionDimensionKeyerImpl implements DimensionKeyer<PropulsionDimension> {
  key(dimension: PropulsionDimension): string {
    return `propulsion:${dimension.kind}`;
  }

  fallback(dimension: PropulsionDimension): StoredSelection {
    return { moduleId: dimension.module.defaultModuleId };
  }
}
