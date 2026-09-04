---
no-new-exports:
  - actualDpsHintProvider.ts
  - actualDpsHintRenderer.ts
  - module.ts
  - index.ts
  - actualDpsHintRenderer.test.ts
  - actualDpsHintProvider.test.ts
---


# actualDpsHint

Hover hint content provider for the actual DPS readout. Implements
`HintContentProvider` with key `"actualDps"`. Renders a per-damage-type
breakdown showing applied DPS, effective resist, and actual DPS per
type, plus a combined total row.

The provider reads the current `EngagementView` from `ViewStore`
(implemented by `DomControls`) to obtain the attacker's
`AttackAssessment.damage.appliedByType` and the opponent's
`DefenseAssessment.effectiveResists` and `actualIncomingByType`.
The opponent is the opposite side: shipA's actual DPS uses shipB's
defense, and vice versa. Damage types with zero applied DPS are
skipped.

Registration must happen after `registerHoverHintModule` and
`registerDomControlsModule` because the provider depends on the
hover hint controller singleton and the `ViewStore`.
