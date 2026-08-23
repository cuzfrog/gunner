---
no-new-exports:
  - index.ts
  - module.ts
  - profileText.parse.test.ts
  - profileText.test.ts
  - profileText.testSupport.ts
  - profileText.ts
  - profileTextFields.ts
  - profileTextValidate.ts
---


# profileText

Profile text parsing and serialization.

The public surface is `parseProfile`, `serializeProfile`, `PROFILE_TEXT_HEADER`, and `registerProfileTextModule`. `attacker.ewarActivation` and `target.ewarActivation` are serialized as single-line JSON scalars; invalid lines are ignored to keep old profiles parseable.
