---
no-new-exports:
  - imageCatalog.ts
  - module.ts
  - imageCatalog.test.ts
  - index.ts
  - iconIds.ts
  - droneIconIds.ts
---


# icons

Static image and icon URL catalog.

`iconIds.ts` and `droneIconIds.ts` are generated data files consumed only by `imageCatalog.ts`. The public surface is `ImageCatalog` and `registerIconsModule`. `StaticImageCatalog` is registered by `module.ts` under the key `imageCatalog`.
