---
no-new-exports:
  - index.ts
  - module.ts
  - profileTextCodec.test.ts
  - profileText.testSupport.ts
  - profileTextFields.ts
  - profileTextFormat.ts
  - profileTextParser.test.ts
  - profileTextSerializer.test.ts
  - profileTextValidate.ts
  - profileTextCodec.ts
  - profileTextParser.ts
  - profileTextSerializer.ts
---



# profileText

Profile text parsing and serialization behind the `ProfileTextCodec` abstraction.

The public surface is the `ProfileTextCodec` type (parse / serialize / hasHeader) and
`registerProfileTextModule`, which registers `profileTextCodec` in the DI container.
`LocalProfileTextCodec` delegates to `ProfileTextParser` and `ProfileTextSerializer`.
`shipA.ewarActivation` and `shipB.ewarActivation` are serialized as single-line JSON
scalars; invalid lines are ignored to keep old profiles parseable.
