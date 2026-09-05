---
no-new-exports:
  - actualDpsHintProvider.ts
  - module.ts
  - index.ts
  - actualDpsHintRenderer.test.ts
  - actualDpsHintProvider.test.ts
---


# actualDpsHint

Hover hint content provider for the actual DPS readout. Implements
`HintContentProvider` with key `"actualDps"`. Renders a per-layer
HP loss breakdown showing how the next 1-second damage batch splits
across shield, armor, and hull, plus a combined total row.

The provider reads the current `EngagementView` from `ViewStore`
(implemented by `DomControls`) to obtain the attacker's
`AttackAssessment.damage.appliedDps` and the opponent's
`DamageProjection` from `EngagementView.projection[opponent]`
(`totalHpLost` and `byLayer`). The opponent is the opposite side:
shipA's actual DPS uses shipB's projection, and vice versa. Layers
with zero HP loss are skipped.

Registration must happen after `registerHoverHintModule` and
`registerDomControlsModule` because the provider depends on the
hover hint controller singleton and the `ViewStore`.
