import type { StoredSelection } from "./selectionSession";

export interface DimensionKeyer<D> {
  key(dimension: D): string;
  fallback(dimension: D): StoredSelection;
}
