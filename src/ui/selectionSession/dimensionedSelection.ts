import type { DimensionKeyer } from "./dimensionKeyer";
import type { SelectionSession, StoredSelection } from "./selectionSession";

export interface DimensionedSelection<D> {
  selectionFor(dimension: D): StoredSelection;
  noteApplied(dimension: D, selection: StoredSelection): void;
}

export class DimensionedSelectionImpl<D> implements DimensionedSelection<D> {
  private readonly session: SelectionSession;
  private readonly keyer: DimensionKeyer<D>;

  constructor(session: SelectionSession, keyer: DimensionKeyer<D>) {
    this.session = session;
    this.keyer = keyer;
  }

  selectionFor(dimension: D): StoredSelection {
    return this.session.recall(this.keyer.key(dimension)) ?? this.keyer.fallback(dimension);
  }

  noteApplied(dimension: D, selection: StoredSelection): void {
    this.session.remember(this.keyer.key(dimension), selection);
  }
}
