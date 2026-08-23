---
no-new-exports:
  - autopilot.test.ts
  - autopilot-dynamics.test.ts
  - autopilot.ts
  - dynamics.test.ts
  - dynamics.ts
  - hitChance.test.ts
  - hitChance.ts
  - index.ts
  - cradle.ts
  - kinematics.test.ts
  - kinematics.ts
  - module.ts
  - predictiveAutopilot.test.ts
  - predictiveAutopilot.ts
  - simulation.test.ts
  - simulation.ts
  - types.ts
  - vec2.test.ts
  - vec2.ts
---




# sim

Engagement simulation domain: ship reactive and predictive autopilot steering, the EVE-style dynamics engine (mass/inertia exponential velocity tracking), two-body kinematics, the EVE-style hit chance model, and the fixed-state simulation stepper. `dynamics.ts` is module-internal: its `timeConstant` and `integrateShip` helpers have no cross-boundary exports.

DI wiring: `module.ts` registers `attackerSteering` as the predictive autopilot, `targetSteering` as the reactive autopilot, `kinematics`, `hitChance` and `simulation` against the singleton `container` in `src/container.ts`. The `simConfig` consumed by `simulation` is provided by the composition root.
