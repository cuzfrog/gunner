# Fitting icon troubleshooting

A fitting-preview icon requires every hop in this chain:

```
EFT text line ("Optimal Range Disruption Script x2")
  1. Parsed into a fitting row (src/fitting/fittingImport.ts resolveLine)
  2. Name resolved to a TypeId via item name packs (src/gamedata/itemNames), optional alias hop for pre-2020 names
  3. Row carries row.id / row.chargeId into the view (src/ui/controls/popup/fittingPreview.ts renderRow)
  4. imageCatalog.itemIconUrl(typeId) looks up the generated icon table (src/ui/icons/typeIconFiles.ts)
  5. URL points at a file that exists on disk (data/ship-modules/icons/<iconId>@1x.png or data/ship-modules/type-icons/<typeId>@1x.png)
  6. scripts/astro/copyGameAssets.ts copies it into dist/images/...
  7. CSS shows .preview-icon only when [src] is set (src/styles/components/fitting-preview.css)
```

An icon going missing means exactly one hop is broken. Diagnose by walking from the top - each failure mode below names its symptom.

## Failure modes

### 1. Legacy pre-2020 item name (tiericide rename)

- Symptom: a known module line gets no id; `row.id` undefined; coverage guard flags the NAME (not the id).
- Check: is the name in pyfa's conversion tables (`~/workspace/Pyfa/service/conversions/*.py`)? April/May 2020 tiericide renamed ~20 bundled names (Adaptive Invulnerability Field -> Multispectrum Shield Hardener, armor platings -> coatings, F85 -> IFFA, etc.).
- Fix: the alias table (`item-name-aliases-en.ts`) is generated from those files - regenerate it. Aliases are English-only by design.

### 2. Name exists in SDE but was filtered out of the name packs

- Symptom: name unresolvable though it appears in pyfa/the game; generator's `filterItemNames` dropped it.
- Check: category of the type (isotopes = cat 4, deployables = cat 22, civilian/unpublished items) against the in-scope set {7, 8, 18, 32, 66, 87, 4, 22} in `scripts/generate-fitting-db.ts`.
- Fix: widen the scan and regenerate. Scope decisions live in the generator, not in per-item patches.

### 3. Item sits in a "wrong" EFT section

- Symptom: icon shows for the same item in one section but not another; scripts/missiles/cap boosters/probes in the drones block lose icons. The EFT drones block is POSITIONAL (first quantity block), not semantic - non-drones legitimately live there (doc/EFT_FORMAT.md).
- Check: does the view branch on section kind to pick a lookup? Any `sectionKind === ...` inside icon resolution is the bug; the lookup must key off item identity only.
- Fix: single id-keyed `itemIconUrl(typeId)` for every row. Do not reintroduce per-section lookups.

### 4. Guard test passes while UI is broken

- Symptom: `tests/fittingIconCoverage.test.ts` green, icons still missing.
- Check: does the guard's resolution predicate match the view's actual call, exactly? (The bug: guard accepted `itemIconUrl(id) || droneIconUrl(id)` while the view called only one of them per row.)
- Fix: the guard must assert the same single call the view makes. If the view's lookup ever changes, the guard changes with it in the same commit.

### 5. Table entry missing (generator silently skipped)

- Symptom: `itemIconUrl(typeId)` returns undefined though the type is in scope.
- Check: the generated `TYPE_ICON_FILES` map; then the generator - the old implementation name-joined and `continue`d on any miss, so a single name drift silently dropped entries.
- Fix: generation must iterate SDE types directly (coverage from data, not names) and the generator must fail loudly on a missing on-disk file.

### 6. Table entry exists but file missing on disk

- Symptom: URL resolves, `<img src>` set, no image (browser 404); or build throws `Missing icon source`.
- Check: does `data/ship-modules/<table value>` exist? For icon-less types the file must be fetched from `https://images.evetech.net/types/<typeId>/icon` into `data/ship-modules/type-icons/` (re-run `scripts/sync-type-icons.ts`; it is idempotent).
- Fix: fetch and COMMIT the file; never delete the table entry to make a check pass.

### 7. iconId vs typeId file-key collision

- Symptom: an item shows a WRONG icon (not a missing one) - e.g. Wasp I renders Nocxium's icon.
- Check: `data/ship-modules/icons/` is keyed by iconId; evetech-fetched icons are keyed by typeId. iconId 1201 (Nocxium) and typeId 1201 (Wasp I) collide - the only current pair, but the hazard is structural.
- Fix: keep the two key spaces in separate directories (`icons/` vs `type-icons/`) and encode the directory in the table value. Never merge them.

### 8. Canonical text round-trip changes the fit

- Symptom: after paste-import, a row loses its id even though the raw text resolved fine (or vice versa).
- Check: `canonicalEftText` serializes via `nameForId` - a name that resolves through an ALIAS serializes to the CURRENT name. Round-trip must be stable: `canonicalEftText(canonicalEftText(x)) === canonicalEftText(x)`.
- Fix: unit-test the round-trip on tiericide-renamed fits; if unstable, the alias table mapped to a non-current name - regenerate it with chain resolution.

### 9. Old cache / stale dist

- Symptom: icons fine after `bun test` and in the source tree, missing in the browser.
- Check: `dist/images/...` actually contains the file; hard-refresh. The preview serves `dist/`, not the data dir.

## Audit recipes (quick triage)

These are patterns, not committed files. All run via `bun` with repo imports.

- Which bundled rows lack icons, exactly as the view sees them? Walk `data/ship-fittings/**/*.txt` + `PRESET_FITTINGS`, parse with `fittingImport`, and for every non-empty row assert `new StaticImageCatalog().itemIconUrl(row.id)` is defined - one line per failure with file + line + name. This is the guard test's job; if the guard misses a case, extend the guard instead of keeping a script.
- Does a name resolve? `StaticItemNameResolver` lookup against the en packs, then the alias table. If the name is unknown to the SDE entirely, no code fix applies - the fit data itself is stale.
- Does an icon file exist? Check `data/ship-modules/<TYPE_ICON_FILES[typeId]>` directly; missing evetech files -> re-run `scripts/sync-type-icons.ts`.
- Is a name a legacy rename? Grep `~/workspace/Pyfa/service/conversions/` for the name.

## Invariants that keep this from regressing

- One lookup: the view resolves icons through `itemIconUrl(typeId)` only; there is no per-section or per-kind branch anywhere in icon resolution.
- The coverage guard asserts the view's exact lookup over the entire bundled corpus, with NO allowlist.
- Every `TYPE_ICON_FILES` value has a file on disk (checked by the guard) and by the build (fails on missing source).
- The two file-key spaces (`icons/` iconId-keyed, `type-icons/` typeId-keyed) are never mixed.
