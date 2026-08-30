---
no-new-exports:
  - autopilot.test.ts
  - autopilot-dynamics.test.ts
  - autopilot.ts
  - dynamics.test.ts
  - dynamics.ts
  - fireControl.test.ts
  - fireControl.ts
  - hitChance.test.ts
  - hitChance.ts
  - ewarResolver.test.ts
  - vec2.ts
  - cradle.ts
  - ewarResolver.ts
  - engagementFrameComposer.test.ts
  - engagementFrameComposer.ts
  - simValueParser.ts
  - simValueParser.test.ts
  - kinematics.ts
  - predictiveAutopilot.test.ts
  - simulation.ts
  - stackingPenalty.test.ts
  - module.ts
  - vec2.test.ts
  - simulation.test.ts
  - stackingPenalty.ts
  - predictiveAutopilot.ts
  - kinematics.test.ts
  - missileApplication.ts
  - missileApplication.test.ts
  - turretDamage.ts
  - turretDamage.test.ts
  - turretBoosterResolver.ts
  - turretBoosterResolver.test.ts
---




# sim

Engagement simulation domain: ship reactive and predictive autopilot steering, the EVE-style dynamics engine (mass/inertia exponential velocity tracking), two-body kinematics, the EVE-style hit chance model, and the fixed-state simulation stepper. `dynamics.ts` is module-internal: its `timeConstant` and `integrateShip` helpers have no cross-boundary exports.

Cross-boundary contracts: `index.ts` exports the ewar domain types (`EwarLoadout`, `EwarProjection`, `CombatantConfig`, `DisruptionScriptSpec`, etc.), the weapon union (`WeaponSpec`, `TurretSpec`, `MissileSpec`, `WeaponKind`), damage types (`DamageAssessment`, `TurretDamageBreakdown`, `MissileDamageBreakdown`), `EwarResolver`, `EngagementEvaluator`, `EngagementFrameComposer`, `AttackState`, `AttackAssessment`, `EngagementInput`, `EngagementView`, `MissileApplication`, `TurretDamage`, `StackingPenalty`, and `SimValueParser` for use by `fitting`, `app`, and `ui`. `types.ts` hosts these shared DTOs.

DI wiring: `module.ts` registers `simValueParser`, `shipASteering` and `shipBSteering` as separate singleton `PredictiveAutopilot` instances, `kinematics`, `hitChance`, `stackingPenalty`, `ewarResolver`, `turretBoosterResolver`, `missileApplication`, `turretDamage`, `engagementEvaluator`, `engagementFrameComposer` and `simulation` against the singleton `container` in `src/container.ts`. The `simConfig` consumed by `simulation` is provided by the composition root.

Gate relaxed: `types.ts` and `index.ts` were removed from `no-new-exports` to add `TargetPainterSpec`, `MissileBoosterSpec`, `MissileBoosterLoadout`, `MissileBoosterActivation`, `MissileBoosterProjection`, and `PainterActivation` alongside the existing ewar/booster DTO family. These types are shared DTOs consumed by `fitting`, `app`, and `ui`; splitting them into a separate file would fragment the cross-boundary contract model.
