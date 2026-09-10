# capacitor

Side-panel capacitor field controller. Owns the capacitor popup: live bar and net regen, static stats, usage rows with starvation attribution, capacitor booster rows (mode toggle, charge selection, manual inject), and the infinite-capacitor toggle.

`capacitorControllerContract.ts` exposes `CapacitorController` (also `CapacitorReadout`, the narrow per-frame consumer used by the readout presenter). `CapacitorFieldEls`/`CapacitorEls` mirror the defense field element collection. Fitting stats arrive via the `onFittingImported` event (`imported.capacitor` from the fitting module). Booster charge selection reuses the shared `ScriptSection` popup mounted on the field; manual inject emits `emitCapBoosterInject(side, boosterIndex)` consumed by the app module to call the engine.

Runtime state the controller owns: per-side infinite flag, per-booster mode and selected charge (override; undefined falls back to the fitted charge), plus the latest `CapacitorView` per side for live rendering. `capture`/`restore` move that state through `SessionCodec`; `capBoosterSpecs` produces `CapBoosterSimSpec[]` for `SimConfigSource` (boosters without a resolvable charge are excluded). Known v1 limitation: a UI-selected charge affects the runtime sim only; the static stats keep reflecting the fitted charge until the fitting is re-imported.

`index.ts` exports the contract types plus `registerCapacitorModule` for DI registration, mirroring the defense module.

no-new-exports:
  - capacitorController.ts
  - capacitorController.test.ts
  - module.ts
  - index.ts
