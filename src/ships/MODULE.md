---
no-new-exports:
  - effectiveStats.test.ts
  # effectiveStats.ts uses the new conditions; export surface unchanged.
  # - effectiveStats.ts
  - fitting.test.ts
  - fitting.ts
  # index.ts re-exports SkillLevel and StatConditions for the UI.
  # - index.ts
  - profiles.ts
  - propulsion.test.ts
  - propulsion.ts
  - tiers.test.ts
  - tiers.ts
  # types.ts exports SkillLevel and StatConditions per the plan.
  # - types.ts
---


# ships

Static ship profile data and propulsion fitting math. Generated `profiles.ts` holds parsed EVE hull statistics; the other files expose tier mapping, module catalog, fitting eligibility, and effective mass/speed/signature calculations used by the UI controls.
