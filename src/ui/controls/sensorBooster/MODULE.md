---
no-new-exports:
  - sensorBoosterController.test.ts
  - sensorBoosterController.ts
  - sensorBoosterEffectDescriber.test.ts
  - sensorBoosterEffectDescriber.ts
  - module.ts
  - sensorBoosterControllerContract.ts
  - index.ts
---

# sensorBooster

Interactive sensor booster and signal amplifier module UI. Mirrors the missileBooster controller pattern for per-side booster toggles, overload, and script selection; amplifiers are passive display rows.

`SensorBoosterController` is the public abstraction and `registerSensorBoosterModule` is exported for DI registration. `SensorBoosterEffectDescriber` centralizes bonus formatting for summary tooltips and per-module hover titles. The module owns its DOM collection through the shared `ControlsEls` sensor-booster entries and subscribes to the shared `UiEvents.onFittingImported` channel to refresh the loadout when a fitting is imported.
