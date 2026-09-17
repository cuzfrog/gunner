---
no-new-exports:
  - moduleHintProvider.ts
  - moduleHintProvider.test.ts
  - module.ts
  - index.ts
---

# moduleHint

Hover hint content provider for module rows inside the modules popup.
Implements `HintContentProvider` with key `"module"`. Renders the
module's base attributes through the shared `statHint` renderer: an
effect section (family-specific combat stats and application range)
followed by an activation section (cycle time, capacitor need) for
active modules. Passive modules render the effect section only. Labels
are localized via `moduleHint.*` keys plus reused `label.*`,
`ewar.hover.*`, and `unit.*` keys.

The provider reads `data-value` (the module type id) from the anchor
element and resolves the stats from `FittingDb.modules` family fields,
falling back to the `trackingComputers`, `missileGuidanceComputers`, and
`missileGuidanceEnhancers` collections. Unsupported families render
nothing, and the hover hint controller keeps the hint hidden. The ewar,
booster, missileBooster, and sensorBooster controllers set
`data-hint-content="module"` and `data-value` on their row buttons.

Registration must happen after `registerHoverHintModule` because the
provider is registered with the hover hint controller singleton.
