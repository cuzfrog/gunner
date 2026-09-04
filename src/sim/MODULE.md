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
  - turretBoosterResolver.ts
  - turretBoosterResolver.test.ts
  - missileBoosterResolver.ts
  - missileBoosterResolver.test.ts
  - sensorBoosterResolver.ts
  - sensorBoosterResolver.test.ts
  - lockClock.ts
  - lockClock.test.ts
  - expectedHitMultiplier.ts
  - expectedHitMultiplier.test.ts
  - droneApplication.ts
  - droneApplication.test.ts
  - droneSimulator.ts
  - droneSimulator.test.ts
  - cradle.ts
  - engagementFrameComposer.ts
  - defenseAssessment.ts
  - fireControl.ts
  - rng.ts
  - rng.test.ts
  - hitRoll.ts
  - hitRoll.test.ts
  - weaponClock.ts
  - weaponClock.test.ts
  - weaponDamageAssessor.ts
  - weaponDamageAssessor.test.ts
  - module.ts
  - defenseSimulator.test.ts
  - defenseSimulator.ts
  - types.ts
  - defenseAssessment.test.ts
  - types.test.ts
  - index.ts
---






# sim

Engagement simulation domain: ship reactive and predictive autopilot steering, the EVE-style dynamics engine (mass/inertia exponential velocity tracking), two-body kinematics, the EVE-style hit chance model, and the fixed-state simulation stepper. `dynamics.ts` is module-internal: its `timeConstant` and `integrateShip` helpers have no cross-boundary exports. `weaponDamageAssessor.ts` is the single source of truth for count-scaled volley assembly: `computeBaseVolley` applies the weapon count exactly once (`damagePerShot * count` for turrets/drones, `damagePerMissile * launcherCount` for missiles), and `assess` produces the full `DamageAssessment` from a base volley and an application factor. `fireControl.ts` and `droneApplication.ts` delegate to it; `app.ts` consumes the resulting `baseVolleyByType` from the view's `weaponAttacks` assessment when building missile launch specs, so the physical missile simulator receives a pre-scaled volley rather than reconstructing damage from per-shot values.

Cross-boundary contracts: `index.ts` exports the ewar domain types (`EwarLoadout`, `EwarProjection`, `CombatantConfig`, `DisruptionScriptSpec`, etc.), the weapon union (`WeaponSpec`, `TurretSpec`, `MissileSpec`, `DroneSpec`, `WeaponKind`), damage types (`DamageType`, `DamageVector`, `DamageResists`, `DefenseLayer`, `DefenseLayerSpec`, `DefenseSpec`, `RepairerSpec`, `DamageAssessment`, `TurretDamageBreakdown`, `MissileDamageBreakdown`, `DroneDamageBreakdown`), the damage vector helpers (`ZERO_DAMAGE`, `DAMAGE_TYPES`, `damageVectorSum`, `damageVectorScale`, `damageVectorAdd`, `damageVectorFromPartial`), `EwarResolver`, `EngagementEvaluator`, `EngagementFrameComposer`, `AttackState`, `AttackAssessment`, `EngagementInput`, `EngagementView`, `MissileApplication`, `DroneApplication`, `WeaponDamageAssessor`, `StackingPenalty`, and `SimValueParser` for use by `fitting`, `app`, and `ui`. `types.ts` hosts these shared DTOs. Weapon spec damage fields (`TurretSpec.damagePerShot`, `MissileSpec.damagePerMissile`, `DroneSpec.damagePerShot`) are `DamageVector` rather than scalar `number`; `DamageAssessment` carries `baseVolleyByType: DamageVector` (count-scaled, pre-application) alongside `appliedByType: DamageVector` and the scalar `appliedDps`/`application`/`volley` fields. `DamageType` was moved from `fitting/damageBreakdown.ts` to `sim/types.ts` as the single source of truth; `fitting` re-exports it from `sim`. `DefenseSpec`, `DefenseLayerSpec`, and `RepairerSpec` are the defense DTOs consumed by `fitting` (to produce) and `sim`/`ui` (to consume); they parallel `WeaponSpec` in the producer/consumer contract.

DI wiring: `module.ts` registers `simValueParser`, `shipASteering` and `shipBSteering` as separate singleton `PredictiveAutopilot` instances, `kinematics`, `hitChance`, `stackingPenalty`, `ewarResolver`, `turretBoosterResolver`, `missileBoosterResolver`, `sensorBoosterResolver`, `missileApplication`, `droneApplication`, `droneSimulator`, `missileSimulator`, `weaponDamageAssessor`, `engagementEvaluator`, `engagementFrameComposer`, `defenseAssessor`, `defenseSimulator`, `weaponClock`, and `lockClock` against the singleton `container` in `src/container.ts`. The `simConfig` consumed by `simulation` is provided by the composition root.

Gate relaxed: `types.ts` and `index.ts` were removed from `no-new-exports` to add `TargetPainterSpec`, `MissileBoosterSpec`, `MissileBoosterLoadout`, `MissileBoosterActivation`, `MissileBoosterProjection`, and `PainterActivation` alongside the existing ewar/booster DTO family. These types are shared DTOs consumed by `fitting`, `app`, and `ui`; splitting them into a separate file would fragment the cross-boundary contract model. `fireControl.ts`, `cradle.ts`, and `module.ts` were removed to wire `DroneApplication` and `DroneSimulator` into the engagement evaluator and DI container; the evaluator dispatches drone weapons alongside turret and missile weapons, and the simulator tracks per-group drone flight state. `engagementFrameComposer.ts` was removed to add `WeaponAttack` alongside `EngagementView` — per-weapon assessments are needed by the UI to render Applied DPS source attribution. `DroneMode`, `DroneRuntimeState`, `DroneSimulator`, and `DroneSimConfig` were added to `types.ts` and `index.ts` as cross-boundary DTOs consumed by `app` and `ui`. `MissileApplicationResult`, `MissileRuntimeState`, `MissileAttackFacts`, `MissileLaunchSpec`, and `MissileSimConfig` were added to `types.ts` and `index.ts` as cross-boundary DTOs for the physical missile simulator; `MissileApplication.compute` was refactored to a pure formula (no frame/range) returning `MissileApplicationResult`, with `inRange`/`timeToImpact` moving to `MissileAttackFacts` sourced from the simulator. `AttackState` was extended with `missileFacts?: MissileAttackFacts` and `EngagementInput` was extended with `missileFacts` so the evaluator consumes physical missile facts from the simulator instead of computing analytical DPS; `assessMissile` uses `facts.predicted.application` when facts are present and falls back to the analytical bridge otherwise. The simulator predicts application by estimating the target's speed at impact time using current velocity and acceleration, then applying the EVE explosion formula. `defenseAssessment.ts` was added to `no-new-exports` with its initial exports (`DefenseAssessor`, `DefenseAssessment`, `LayerEhp`, `EMPTY_DEFENSE_ASSESSMENT`) re-exported through `index.ts` for consumption by `fitting` and `ui`; it parallels the existing per-side assessment pattern. `defenseSimulator.ts` was removed from `no-new-exports` to add `RepairMode`, `RepairerViewState`, `RahViewState`, `RepairerActivationEntry`, and `RahActivationEntry` as cross-boundary DTOs consumed by `app` and `ui` for Phase 4 active defense control; `RahSpec` was added to `types.ts` alongside the existing defense DTOs. `index.ts` was removed from `no-new-exports` to add `WeaponDamageAssessor` as a cross-boundary contract consumed by `SimCradle` (which is exported to `app` and `ui`); `DamageAssessment` was extended with `baseVolleyByType: DamageVector` (count-scaled, pre-application volley) so physical consumers can use a pre-scaled volley instead of recomputing damage from per-shot values, and `MissileLaunchSpec` was extended with the same field so the missile simulator receives the pre-scaled volley at launch time.
