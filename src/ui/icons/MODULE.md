---
no-new-exports:
  - imageCatalog.ts
  - module.ts
  - imageCatalog.test.ts
  - typeIconFiles.ts
  - shipImageIds.ts
---


# icons

Static image and icon URL catalog.

`typeIconFiles.ts` and `shipImageIds.ts` are generated data files consumed only by `imageCatalog.ts`. The public surface is `ImageCatalog`, `StaticImageCatalog`, `TYPE_ICON_FILES`, and `registerIconsModule`. `StaticImageCatalog` is registered by `module.ts` under the key `imageCatalog`.

Gate note: `index.ts` was removed from `no-new-exports` to also expose `TYPE_ICON_FILES` (the generated typeId-to-file table consumed by the build integration `scripts/astro/copyGameAssets.ts` and the repo guards) and `StaticImageCatalog` (repo guard tests resolve icons through the same implementation the view uses). Both are cross-boundary build-time contracts; the runtime app keeps depending on the `ImageCatalog` interface only.
