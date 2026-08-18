---
sealed:
  - autopilot.test.ts
  - autopilot-dynamics.test.ts
  - autopilot.ts
  - dynamics.test.ts
  - dynamics.ts
  - hitChance.test.ts
  - hitChance.ts
  - index.ts
  - kinematics.test.ts
  - kinematics.ts
  - module.ts
  - simulation.test.ts
  - simulation.ts
  - trackingScore.test.ts
  - trackingScore.ts
  - types.ts
---


# sim

Engagement simulation domain: ship autopilot steering, the EVE-style dynamics engine (mass/inertia exponential velocity tracking), two-body kinematics, the EVE-style hit chance model, and the fixed-state simulation stepper.

DI wiring: `module.ts` registers `autopilot`, `kinematics`, `hitChance` and `simulation` against the singleton `container` in `src/container.ts`. The `simConfig` consumed by `simulation` is provided by the composition root.
