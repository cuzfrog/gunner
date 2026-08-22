---
no-new-exports:
  - imageCatalog.ts
  - module.ts
---

# icons

Static image and icon URL catalog.

`iconIds.ts` and `droneIconIds.ts` are generated data files consumed only by `imageCatalog.ts`. The public surface is `ImageCatalog` and `registerIconsModule`. `StaticImageCatalog` is registered by `module.ts` under the key `imageCatalog`.
