---
no-new-exports:
  - shipHintProvider.ts
  - shipHintRenderer.ts
  - module.ts
  - index.ts
  - shipHintProvider.test.ts
  - shipHintRenderer.test.ts
---


# shipHint

Hover hint content provider for combatant ship portraits. Implements
`HintContentProvider` with key `"shipProfile"`. Renders the ship's localized
name, hull type + faction subtitle, and base hull attribute sections read
from `ShipProfile`: fitting slots, navigation, targeting, drones (omitted
when the hull has none), capacitor, defense HP, and a resist table
(shield/armor/hull x EM/thermal/kinetic/explosive).

The provider reads `data-value` (the ship id) from the anchor element and
resolves the profile through `Ships.findHullById`; localized labels come
from the `shipHint.*` i18n keys plus the shared `unit.*`, `defense.layer.*`,
and `dpsHint.damageType.*` keys. The portraits controller sets
`data-hint-content="shipProfile"` and `data-value` on `.portrait-image`
when a profile is assigned and clears them when the profile is removed.

Registration must happen after `registerHoverHintModule` because the
provider is registered with the hover hint controller singleton.
