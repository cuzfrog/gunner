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
  # index.ts is intentionally ungated: it re-exports cross-boundary simulation DTOs.
  # - index.ts
  - kinematics.test.ts
  - kinematics.ts
  - module.ts
  - predictiveAutopilot.test.ts
  - predictiveAutopilot.ts
  - simulation.test.ts
  - simulation.ts
  - stackingPenalty.test.ts
  - stackingPenalty.ts
  # types.ts and types.test.ts are intentionally ungated: they host shared cross-boundary DTOs.
  # - types.test.ts
  # - types.ts
  - vec2.test.ts
---






# sim

Engagement simulation domain: ship reactive and predictive autopilot steering, the EVE-style dynamics engine (mass/inertia exponential velocity tracking), two-body kinematics, the EVE-style hit chance model, and the fixed-state simulation stepper. `dynamics.ts` is module-internal: its `timeConstant` and `integrateShip` helpers have no cross-boundary exports.

Cross-boundary contracts: `index.ts` exports the ewar domain types (`EwarLoadout`, `EwarProjection`, `CombatantConfig`, `DisruptionScriptSpec`, etc.), `EwarResolver`, `EngagementEvaluator`, `EngagementFrameComposer`, `AttackState`, `AttackAssessment`, `EngagementInput`, `EngagementView`, and `StackingPenalty` for use by `fitting`, `app`, and `ui`. `types.ts` is ungated to host these shared DTOs.

DI wiring: `module.ts` registers `attackerSteering` and `targetSteering` as separate singleton `PredictiveAutopilot` instances, `kinematics`, `hitChance`, `stackingPenalty`, `ewarResolver`, `engagementEvaluator`, `engagementFrameComposer` and `simulation` against the singleton `container` in `src/container.ts`. The `simConfig` consumed by `simulation` is provided by the composition root.
