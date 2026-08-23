# EFT Format Specification (gunner canonical subset)

Normative reference for gunner's fitting text parser and bundled fit data. Sources: EVE official developer documentation (developers.eveonline.com/docs/guides/fitting), CCP Oceanus release notes (2014), and pyfa `service/port/eft.py`. Verified 2026-02: the game client and pyfa export the same section order.

## Section order (mandatory)

```
[Hull Name, Fitting Name]

<low slot modules>

<medium slot modules>

<high slot modules>

<rig modules>

<subsystem modules>

<services>

<drone bay items>

<cargo items>
```

1. Header: first line, `[Hull, Fitting Name]`. Both names non-empty; fitting name may contain any characters except `]`.
2. Module banks appear in this exact order: **Low, Medium, High, Rig, Subsystem, Service**. Banks never repeat and never swap.
3. Drones and cargo come last, in that order.
4. Banks that have zero installed hull slots (e.g. subsystems on non-T3 hulls) are omitted entirely.

## Separators

- One blank line between the header and the first bank, and between consecutive banks (header through services).
- Two blank lines between the services/drone boundary and between drones and cargo.

## Line syntax

| Kind | Syntax | Notes |
|---|---|---|
| Module | `<Module Name>` | Name must not contain `,` `/` `[` |
| Module + charge | `<Module Name>, <Charge Name>` | Charge may itself be absent |
| Offline module | `<Module Name>[/OFFLINE]` | Suffix, case-insensitive; applies to the module |
| Empty slot | `[Empty <bank> slot]` | bank ∈ `low, med, high, rig, subsystem, service`; case-insensitive; accepted on import; pyfa emits capitalized (`[Empty Med slot]`) |
| Drone/fighter/cargo item | `<Item Name> x<quantity>` | quantity positive integer |

## Empty-slot policy

- The game client omits `[Empty … slot]` lines on export; pyfa emits them.
- Gunner's bundled data (`data/ship-fittings/`) MUST include placeholders so every bank is filled to the hull's full slot capacity. This makes bank identification purely positional and deterministic.
- Gunner's runtime parser MUST accept placeholder-less input (game exports): see parser notes below.

## Parser requirements

1. Group lines into blocks by blank-line boundaries. Attach a leading header-less first block correctly (a missing blank after the header is tolerated on import).
2. Classify each line: header / empty-slot placeholder / module (with optional charge + offline) / quantity item.
3. Determine bank identity for each block:
   - A block containing an `[Empty X slot]` placeholder belongs to bank X.
   - Otherwise assign banks by contiguous run over the canonical order (Low, Medium, High, Rig, Subsystem, Service), anchored by any placeholder-bearing block; with no anchors, the N module blocks map to the first N banks (hulls always have low/mid/high slots; a bank without hull slots cannot contain modules).
   - On contradiction (anchors disagree with contiguity), fall back to `MODULE_SLOTS` name lookup; unresolved names are dropped.
4. Quantity-only blocks map to drones (first such block) then cargo. Quantity lines mixed into a module block belong to cargo.

## Out of scope

- Multi-fit XML format (`<fittings>`), DNA/DNA-ish short forms, HTML/multibuy exports, abyssal/mutated module suffixes beyond base-name display.
