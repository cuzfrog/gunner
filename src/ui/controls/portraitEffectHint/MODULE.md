---
no-new-exports:
  - portraitEffectHintProvider.ts
  - portraitEffectHintProvider.test.ts
  - module.ts
  - index.ts
---

# portraitEffectHint

Hover hint content provider for the portrait effect icons (key
`"portraitEffect"`). The portraits controller renders each effect icon as an
anchor carrying `data-hint-content="portraitEffect"` plus identifying
attributes (`data-side`, `data-effect-kind`, and kind-specific
`data-weapon-kind` / `data-ewar-family` / `data-repairer-index` /
`data-module-id`). `data-side` is the portrait (defender) side: weapon and
drone data is read from the opponent's `weaponAttacks`/`drones`, while ewar
and defense data is read on the portrait side itself. This provider parses
those attributes and builds a live
`StatHintModel` from the current `EngagementView` on every render, so values
update every sim frame while the hint is visible:

- weapon icons: module name, weapon-kind subtitle, applied/nominal DPS and
  application percentage from `view.weaponAttacks` matched by `moduleId`;
  drone icons additionally show active/total drone count from
  `view.drones`/`view.droneSpecs`.
- ewar icons: module name with the effect description text.
- repairer icons: layer subtitle, repair per second and per cycle from
  `view.defenseRuntime.repairers`.
- RAH icon: current adaptive resists from `view.defenseRuntime.rah`.

Module names come from `ItemNameCatalog` (lazy non-English packs resolve
through the placeholder-then-rerender flow via `onItemNamesLoaded`).

Registration must happen after `registerHoverHintModule` and
`registerStatHintModule` because the provider depends on the hover hint
controller and the stat hint renderer.
