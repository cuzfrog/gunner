---
no-new-exports:
  - appliedDpsHintProvider.ts
  - appliedDpsHintRenderer.ts
  - module.ts
  - appliedDpsHintProvider.test.ts
  - appliedDpsHintRenderer.test.ts
  - index.ts
---


# appliedDpsHint

Hover hint content provider for the applied DPS readout. Implements
`HintContentProvider` with key `"appliedDps"`. Renders a per-weapon
applied DPS breakdown from the current `EngagementView.weaponAttacks`:
weapon-kind DPS label, nominal DPS, applied DPS, and application
percentage per weapon, plus a combined total row.

The provider reads the current `EngagementView` from `ViewStore`
(implemented by `DomControls`) to obtain per-weapon `AttackAssessment`
data. Weapon-kind labels are resolved via i18n keys
(`dpsHint.turretDps` / `dpsHint.missileDps` / `dpsHint.droneDps`).

Registration must happen after `registerHoverHintModule` and
`registerDomControlsModule` because the provider depends on the
hover hint controller singleton and the `ViewStore`.
