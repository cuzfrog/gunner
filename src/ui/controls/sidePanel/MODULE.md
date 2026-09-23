---
no-new-exports:
  - side.ts
  - sidePanel.ts
  - elements.ts
  - hullSection.ts
  - pasteImportSection.ts
  - propulsionSection.ts
  - propulsionVariantSection.ts
  - skillOverloadSection.ts
  - statsSection.ts
  - sidePanelSections.ts
  - sidePanel.test.ts
  - skillOverloadSection.test.ts
  - pasteImportSection.test.ts
  - propulsionSection.test.ts
  - module.ts
  - hullSection.test.ts
  - sidePanelContract.ts
  - statsSection.test.ts
  - turretLink.ts
  - launcherLink.ts
  - weaponSystemSwitch.ts
  - weaponSystemSwitch.test.ts
  - overrides.ts
  - module.test.ts
  - navSection.ts
  - navSection.test.ts
  - index.ts
  - droneLink.ts
  - fighterLink.ts
---







# sidePanel

Side-by-side ship fitting and stat inputs for Ship A and Ship B.

The `SidePanel` interface is the public abstraction. `SidePanelDeps`, `SidePanelHost`, `SidePanelState`, and `SidePanelElements` are shared DTOs exposed as types. Implementation classes remain internal and are wired through `module.ts` via DI. `Side` is re-exported from the root `controls/side.ts` shared type.
Gate note (vorton projectors): `sidePanel.ts` and `sidePanelContract.ts` (gated) add the `importedVortons()` interface member and implementation — the `fittingText` setter and the tail of `restore()` re-import the fitting and cache the resolved `ImportedVorton[]` (restore re-resolves after skill levels are applied so skill-scaled fields like heat damage match the restored conditions; import frequency is user-action-level: paste import and session restore), giving the session's sim config source the same spec-resolution pattern the turret/launcher/drone links provide. Body and interface-member changes only, no new exports.
Gate note (fitted-spec lifecycle): the panel link surface no longer exposes restore-from-fitting. `restoreTurret/restoreLauncher/restoreDrone` were removed from the `SidePanel` interface and replaced by `recomputeFittedSpecs()`, which re-resolves turrets, launchers, drones, and fighters under the current skill conditions while preserving user selections (charges, module variants, bay/squadron edits, raw targeting inputs). `fighterLink.ts` is a new gated file mirroring `droneLink.ts`; `hullSection.ts` also clears fighters with the fitted hull.
