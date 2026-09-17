no-new-exports:
  - ammoHintProvider.ts
  - module.ts
  - ammoHintProvider.test.ts
  - index.ts
---


# ammoHint

Hover hint content provider for ammo/missile popup list items. Implements
`HintContentProvider` with key `"ammo-hint"`. Renders a structured damage
breakdown through the shared `statHint` renderer: a damage section with a
total row and per-damage-type rows with icons, followed by an attribute
section (range/falloff/tracking multipliers for charges, explosion and
flight attributes for missiles). Labels are localized via the `ammoHint.*`,
`dpsHint.*`, and `unit.*` i18n keys.

The provider reads `data-value` (the item id) from the anchor element and
looks up the item in `FittingDb.charges` or `FittingDb.missiles` to
determine the kind and obtain raw stats. Damage type icons are served
from `images/icons/damage-{type}.png`.

Registration must happen after `registerHoverHintModule` because the
provider is registered with the hover hint controller singleton.
