# Ship Fittings

EFT-format PvP ship fittings. Canonical fits are grounded in community-shared, proven sources such as Osmium, EVE Workbench and EVE University Wiki. zKillboard-derived fits have been removed or replaced.

## Results

- 243 of 448 hulls have EFT fittings.
- 511 fitting files total, all validated against `doc/EFT_FORMAT.md`.
- 205 ships without fittings: most are NPC/unreleased, shuttles, industrial hulls or ships with no community-proven PvP fit.

## Layout

Each hull has its own directory under `data/ship-fittings/`, containing one or more `.txt` fitting files.

## EFT Format

Each fitting file follows the EFT convention:
- Header: `[Ship Name, Fitting Name]`
- Blank line after header
- One blank line between consecutive module sections (low, medium, high, rig, subsystem, service)
- Two blank lines between module and drone sections, and between drone and cargo sections
- Modules listed without quantity; charges combined as `Module, Charge`
- Drones and cargo items listed with `xN` suffix
- Empty slots written as `[Empty Low slot]`, `[Empty Med slot]`, `[Empty High slot]`, `[Empty Rig slot]`, `[Empty Subsystem slot]` or `[Empty Service slot]`
- No trailing blank lines

