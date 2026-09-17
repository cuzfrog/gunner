no-new-exports:
  - droneHintProvider.ts
  - droneHintProvider.test.ts
  - module.ts
  - index.ts
---


# droneHint

Hover hint content provider for drone catalog list items. Implements
`HintContentProvider` with key `"drone"`. Renders the drone's combat
statistics through the shared `statHint` renderer: a damage section
(scaled total, per-type rows with icons, cycle time), targeting
(tracking, optimal, falloff), navigation (velocity, orbit speed and
range), and fit (drone bandwidth, volume). Labels are localized via the
`droneHint.*` keys plus reused `label.*`, `shipHint.*`, `ammoHint.*`,
`dpsHint.*`, and `unit.*` keys.

The provider reads `data-value` (the drone type id) from the anchor
element and looks up the stats in `FittingDb.combatDrones`. The drone
controller sets `hintContent: "drone"` on its catalog items; the shared
`SelectableList` renders `data-hint-content` and `data-value`.

Registration must happen after `registerHoverHintModule` because the
provider is registered with the hover hint controller singleton.
