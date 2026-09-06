---
no-new-exports:
  - inflictedDpsHintProvider.ts
  - module.ts
  - index.ts
  - inflictedDpsHintRenderer.test.ts
  - inflictedDpsHintProvider.test.ts
---


# inflictedDpsHint

Hover hint content provider for the inflicted DPS readout. Implements
`HintContentProvider` with key `"inflictedDps"`. Renders a per-layer
inflicted damage breakdown showing how the next 1-second damage batch
splits across shield, armor, and hull, plus a combined total row.

The provider reads the current `EngagementView` from `ViewStream`
to obtain the attacker's `AttackAssessment.damage.appliedDps` and the
opponent's `DamageProjection` from `EngagementView.projection[opponent]`
(`totalInflicted` and `byLayer`). The opponent is the opposite side:
shipA's inflicted DPS uses shipB's projection, and vice versa. Layers
with zero inflicted damage are skipped.

Registration must happen after `registerHoverHintModule` because the
provider depends on the hover hint controller singleton.
