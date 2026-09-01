---
no-new-exports:
  - autopilot.test.ts
  - autopilot-dynamics.test.ts
  - autopilot.ts
  - dynamics.test.ts
  - dynamics.ts
  - fireControl.test.ts
  - hitChance.test.ts
  - hitChance.ts
  - ewarResolver.test.ts
  - vec2.ts
  - ewarResolver.ts
  - engagementFrameComposer.test.ts
  - simValueParser.ts
  - simValueParser.test.ts
  - kinematics.ts
  - predictiveAutopilot.test.ts
  - simulation.ts
  - stackingPenalty.test.ts
  - vec2.test.ts
  - simulation.test.ts
  - stackingPenalty.ts
  - predictiveAutopilot.ts
  - kinematics.test.ts
  - missileApplication.ts
  - missileApplication.test.ts
  - missileSimulator.ts
  - missileSimulator.test.ts
  - turretDamage.ts
  - turretDamage.test.ts
  - turretBoosterResolver.ts
  - turretBoosterResolver.test.ts
  - missileBoosterResolver.ts
  - missileBoosterResolver.test.ts
  - expectedHitMultiplier.ts
  - expectedHitMultiplier.test.ts
  - droneApplication.ts
  - droneApplication.test.ts
  - droneSimulator.ts
  - droneSimulator.test.ts
  - cradle.ts
  - engagementFrameComposer.ts
  - fireControl.ts
  - module.ts
---





# sim

Engagement simulation domain: ship reactive and predictive autopilot steering, the EVE-style dynamics engine (mass/inertia exponential velocity tracking), two-body kinematics, the EVE-style hit chance model, and the fixed-state simulation stepper. `dynamics.ts` is module-internal: its `timeConstant` and `integrateShip` helpers have no cross-boundary exports.

Cross-boundary contracts: `index.ts` exports the ewar domain types (`EwarLoadout`, `EwarProjection`, `CombatantConfig`, `DisruptionScriptSpec`, etc.), the weapon union (`WeaponSpec`, `TurretSpec`, `MissileSpec`, `DroneSpec`, `WeaponKind`), damage types (`DamageAssessment`, `TurretDamageBreakdown`, `MissileDamageBreakdown`, `DroneDamageBreakdown`), `EwarResolver`, `EngagementEvaluator`, `EngagementFrameComposer`, `AttackState`, `AttackAssessment`, `EngagementInput`, `EngagementView`, `MissileApplication`, `DroneApplication`, `TurretDamage`, `StackingPenalty`, and `SimValueParser` for use by `fitting`, `app`, and `ui`. `types.ts` hosts these shared DTOs.

DI wiring: `module.ts` registers `simValueParser`, `shipASteering` and `shipBSteering` as separate singleton `PredictiveAutopilot` instances, `kinematics`, `hitChance`, `stackingPenalty`, `ewarResolver`, `turretBoosterResolver`, `missileBoosterResolver`, `missileApplication`, `droneApplication`, `droneSimulator`, `missileSimulator`, `turretDamage`, `engagementEvaluator`, `engagementFrameComposer` and `simulation` against the singleton `container` in `src/container.ts`. The `simConfig` consumed by `simulation` is provided by the composition root.

Gate relaxed: `types.ts` and `index.ts` were removed from `no-new-exports` to add `TargetPainterSpec`, `MissileBoosterSpec`, `MissileBoosterLoadout`, `MissileBoosterActivation`, `MissileBoosterProjection`, and `PainterActivation` alongside the existing ewar/booster DTO family. These types are shared DTOs consumed by `fitting`, `app`, and `ui`; splitting them into a separate file would fragment the cross-boundary contract model. `fireControl.ts`, `cradle.ts`, and `module.ts` were removed to wire `DroneApplication` and `DroneSimulator` into the engagement evaluator and DI container; the evaluator dispatches drone weapons alongside turret and missile weapons, and the simulator tracks per-group drone flight state. `engagementFrameComposer.ts` was removed to add `WeaponAttack` alongside `EngagementView` — per-weapon assessments are needed by the UI to render Applied DPS source attribution. `DroneMode`, `DroneRuntimeState`, `DroneSimulator`, and `DroneSimConfig` were added to `types.ts` and `index.ts` as cross-boundary DTOs consumed by `app` and `ui`. `MissileApplicationResult`, `MissileRuntimeState`, `MissileImpact`, `MissileImpactSummary`, `MissileAttackFacts`, `MissileLaunchSpec`, and `MissileSimConfig` were added to `types.ts` and `index.ts` as cross-boundary DTOs for the physical missile simulator; `MissileApplication.compute` was refactored to a pure formula (no frame/range) returning `MissileApplicationResult`, with `inRange`/`timeToImpact` moving to `MissileAttackFacts` sourced from the simulator. `AttackState` was extended with `missileFacts?: MissileAttackFacts` and `EngagementInput` was extended with `missileFacts` so the evaluator consumes physical missile facts from the simulator instead of computing analytical DPS; `assessMissile` uses `facts.rollingAppliedDps` when facts are present and falls back to the analytical bridge otherwise.
