# Ship modules image + id mapping

`tmp/ship-modules/` holds ship module visuals and a `nameToId.json` that links
English type names to the image IDs embedded in the filenames.

## Contents

```
tmp/ship-modules/
├── icons/        3652 PNG · 15 MB
├── renders/       878 PNG · 5.3 MB
└── nameToId.json  1.6 MB
```

`iconID` PNGs are 64 × 64 module thumbnails shipped in Pyfa's `imgs/icons/` dir.
`renders/` PNGs are full ship/missile renders from `imgs/renders/` — kept for
context but **none overlap with fittable module types**; see below.

## nameToId.json structure

```jsonc
{
  "_meta": {
    "categories": {
      "7":  "Module",
      "8":  "Charge",
      "18": "Drone",
      "32": "Subsystem",
      "66": "Structure Module",
      "87": "Fighter"
    },
    "iconID_base":    "icons/{id}@1x.png | icons/{id}@2x.png",
    "graphicID_base": "NOT PRESENT for module types"
  },
  "byName": {
    "iconID":    { "200mm AutoCannon I": [{id: 387, files: [...], group, kind}, ...], ... },
    "graphicID": {}   // omitted — see below
  },
  "byId": {
    "iconID":    { "387": "200mm AutoCannon I", ... },
    "graphicID": {}
  }
}
```

### byName vs byId

| direction | use case |
|---|---|
| `byName.iconID[name]` | User provides a full type name — returns every item that shares the icon (I vs II, named variants, etc.) as a list |
| `byId.iconID[id]` | ID is known from UI state or database — returns **one** name (last-write-wins when multiple items share an icon) |

Use `byName` when lookup direction is user-facing or when deduplication is needed;
`byId` is a fast reverse-lookup for ID-driven flows.

## Scope and filters

Ship-fittable items only — defined as any type whose **group** belongs to
categories 7, 8, 18, 32, 66, 87 (Module, Charge, Drone, Subsystem,
Structure Module, Fighter).

Skillbooks, implants, blueprints, POS modules, market-all categories,
and all GUI chrome icons (tabs, damage-type overlay strips, etc.) are excluded.

## Why graphicID is empty

Pyfa's `imgs/renders/` ships 439 render IDs for jump bridges, NPC capital ships,
and capsuleer-character portraits. Zero overlap with module types — the 439 IDs on
disk do not appear in any fittable-module data row. `graphicID` is omitted from the
output; use `iconID` for module visuals.

## Filename convention

- `icons/{id}@1x.png` — 64 px module icon
- `icons/{id}@2x.png` — 128 px module icon (HiDPI)
- Paths are printed in each entry's `files` array; use them directly.

WebP conversion was evaluated and skipped: at 64 × 64 the tiny PNGs compress to
identical size with lossless webp, and lossy webp collapses `rgb24` → `yuv420p`,
regressing visual quality on these UI sprites.