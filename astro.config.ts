import { defineConfig } from "astro/config";
import { copyGameAssets } from "./scripts/astro/copyGameAssets";

export default defineConfig({
  outDir: "./dist",
  publicDir: "./public",
  integrations: [copyGameAssets()],
  vite: {
    build: {
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 3000,
    },
  },
});
