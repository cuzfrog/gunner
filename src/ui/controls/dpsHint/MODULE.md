---
no-new-exports:
  - dpsHintProvider.ts
  - dpsHintRenderer.ts
  - module.ts
  - dpsHintProvider.test.ts
  - dpsHintRenderer.test.ts
  - index.ts
---


# dpsHint

Hover hint content provider for the nominal DPS readout. Implements
`HintContentProvider` with key `"dps"`. Renders a per-group damage
breakdown: weapon group name, per-damage-type rows with icons and
percentages, a sum row, and a factor chain (base, module, skill, hull,
overload) with individual and cumulative multipliers.

The provider reads the current `ImportedTurret`/`ImportedLauncher`/`ImportedDrone`
from the turret, launcher, and drone controllers to obtain the `DamageBreakdown`.
Each weapon type is mapped to a common `DpsHintSource` before group building.
Module IDs in factors are resolved to display names via `ItemNameCatalog`.
Damage type icons are served from `images/icons/damage-{type}.png`.

Registration must happen after `registerHoverHintModule` because the
provider is registered with the hover hint controller singleton.
