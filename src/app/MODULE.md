---
no-new-exports:
  - app.test.ts
  - app.ts
  - cradle.ts
  - index.ts
  - module.ts
---



# app

Application orchestration: `App.start` wires the controls callbacks, loop speed and tick handler, then renders; `App.tick` advances the simulation one fixed step and renders the resulting engagement frame (kinematics, hit chance, canvas draw, DOM readouts).

DI wiring: `module.ts` registers `app` against the singleton `container` in `src/container.ts`.
