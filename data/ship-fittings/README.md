# Ship Fittings

EFT-format PvP ship fittings derived from zKillboard API killmail data.

## Layout

Scripts are in this directory. Run with `node tmp/ship-fittings/download-fits.mjs`.

### `download-fits.mjs`
- Reads `data/ship-profiles.json` (448 ships) and `tmp/ship-fittings/data/invTypes.csv` (Fuzzwork SDE) to build typeID and group maps.
- For each ship, fetches losses from `https://zkillboard.com/api/losses/shipID/{typeID}/`.
- Falls back to `https://zkillboard.com/api/kills/shipID/{typeID}/` when the losses endpoint returns 0 results, filtering by `victim.ship_type_id === typeID`.
- Filters PvP-only (`!zkb.npc`) with `> MIN_ITEMS` victim items (`MIN_ITEMS = 5`).
- Converts killmails to EFT format via `killmailToEft()`, which includes a combat-module pre-check: returns `null` if no items have combat slot flags (low/med/high 11-34, rig 92-94, subsystem 119-122/136-139, drone 157-158/204-208).
- Deduplicates fittings by sorted module config signature, saves up to `MAX_FITS = 4` per ship.
- Processes ships sequentially with `DELAY_MS = 500` delay (only for non-skipped ships) to avoid zKillboard rate limiting.
- Skips ships that already have 4 fitting files (`hasExistingFits()` check).

### `data/`
Fuzzwork SDE CSV files (`invTypes.csv`, `invGroups.csv`, `invCategories.csv`, `invFlags.csv`).

## Results

- 414 of 448 ships have EFT fittings (92.4%).
- 1,631 fitting files total, 0 cargo-only fittings remaining.
- 34 ships without fittings: 7 NPC/unreleased (no type IDs), 11 with 0 victim losses, 12 cargo-only (shuttles/special editions where zKillboard returns only cargo-hold items), 4 shuttles with 0 combat-module items.

## Limitations

- zKillboard API does not include fitted module data (attacker `items`) for kills where the ship was an attacker (e.g., Guardian-Vexor with 41 attacker kills).
- ESI API is network-blocked (connection timeout).
- zKillboard API item data is non-deterministic: some requests return full item lists (with combat module flags), others return only cargo-hold items (flag 0/5).
- Shuttles and special-edition ships typically lose with only cargo items, not fitted modules.

## EFT Format

Each fitting file follows the EFT convention:
- Header: `[Ship Name, Killmail ID]`
- Blank line after header
- One blank line between consecutive module sections (low, medium, high, rig, subsystem)
- Two blank lines between module and drone sections, and between drone and cargo sections
- Modules listed without quantity; charges combined as `Module, Charge`
- Drones and cargo items listed with `xN` suffix
- No trailing blank lines