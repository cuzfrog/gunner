import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { copyGameAssets } from "./scripts/astro/copyGameAssets";

export default defineConfig({
  site: "https://gunner.ouraid.online",
  outDir: "./dist",
  publicDir: "./public",
  integrations: [copyGameAssets(), sitemap()],
  vite: {
    build: {
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 3000,
    },
  },
});
