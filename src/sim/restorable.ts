export interface Restorable<State> {
  capture(): State;
  restore(state: State): void;
}
