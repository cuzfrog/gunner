---
no-new-exports:
  - imageCatalog.ts
  - module.ts
  - imageCatalog.test.ts
  - index.ts
  - iconIds.ts
  - droneIconIds.ts
  - shipImageIds.ts
---


# icons

Static image and icon URL catalog.

`iconIds.ts`, `droneIconIds.ts`, and `shipImageIds.ts` are generated data files consumed only by `imageCatalog.ts`. The public surface is `ImageCatalog` and `registerIconsModule`. `StaticImageCatalog` is registered by `module.ts` under the key `imageCatalog`.
