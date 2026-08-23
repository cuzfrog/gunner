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
  # - index.ts  # public sim boundary; ewar cross-boundary contracts consumed by fitting/ui/app
  - cradle.ts
  - kinematics.test.ts
  - kinematics.ts
  - module.ts
  - predictiveAutopilot.test.ts
  - predictiveAutopilot.ts
  - simulation.test.ts
  - simulation.ts
  # - types.ts  # ewar cross-boundary contract types (EwarLoadout, EwarProjection, etc.)
  - vec2.test.ts
  - vec2.ts
  - stackingPenalty.ts
  - stackingPenalty.test.ts
  - ewarResolver.ts
  - ewarResolver.test.ts
---




# sim

Engagement simulation domain: ship reactive and predictive autopilot steering, the EVE-style dynamics engine (mass/inertia exponential velocity tracking), two-body kinematics, the EVE-style hit chance model, and the fixed-state simulation stepper. `dynamics.ts` is module-internal: its `timeConstant` and `integrateShip` helpers have no cross-boundary exports.

Cross-boundary contracts: `index.ts` exports the ewar domain types (`EwarLoadout`, `EwarProjection`, `CombatantConfig`, `DisruptionScript`, etc.), `EwarResolver`, `EngagementEvaluator`, `AttackState`, `AttackAssessment`, and `StackingPenalty` for use by `fitting`, `app`, and `ui`. `types.ts` is ungated to host these shared DTOs.

DI wiring: `module.ts` registers `attackerSteering` as the predictive autopilot, `targetSteering` as the reactive autopilot, `kinematics`, `hitChance`, `stackingPenalty`, `ewarResolver`, `engagementEvaluator` and `simulation` against the singleton `container` in `src/container.ts`. The `simConfig` consumed by `simulation` is provided by the composition root.
