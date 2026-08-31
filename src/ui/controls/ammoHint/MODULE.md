---
no-new-exports:
  - ammoHintProvider.ts
  - module.ts
  - ammoHintProvider.test.ts
  - ammoHintRenderer.test.ts
  - ammoHintRenderer.ts
  - index.ts
---


# ammoHint

Hover hint content provider for ammo/missile popup list items. Implements
`HintContentProvider` with key `"ammo-hint"`. Renders a structured damage
breakdown: per-damage-type rows with icons and values, a total damage row,
and a modifiers row (range/track/falloff) for charges.

The provider reads `data-value` (the item id) from the anchor element and
looks up the item in `FittingDb.charges` or `FittingDb.missiles` to
determine the kind and obtain raw stats. Damage type icons are served
from `images/icons/damage-{type}.png`.

Registration must happen after `registerHoverHintModule` because the
provider is registered with the hover hint controller singleton.
