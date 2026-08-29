import type { AstroIntegration } from "astro";
import type { ServerResponse } from "node:http";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { TYPE_ICON_FILES } from "../../src/ui/icons/typeIconFiles";

const SHIP_IMAGES_SOURCE = "data/ship-images";
const ICONS_SOURCE_DIRECTORY = "data/ship-modules";
const IMAGES_DIRECTORY = "images";

function copyShipImages(distDir: string): void {
  const shipsDist = join(distDir, IMAGES_DIRECTORY, "ships");
  mkdirSync(shipsDist, { recursive: true });
  for (const entry of readdirSync(SHIP_IMAGES_SOURCE, { withFileTypes: true })) {
    if (entry.isFile() && extname(entry.name) === ".webp") {
      cpSync(join(SHIP_IMAGES_SOURCE, entry.name), join(shipsDist, entry.name));
    }
  }
}

function copyTypeIcons(distDir: string): void {
  for (const file of new Set(Object.values(TYPE_ICON_FILES))) {
    const src = join(ICONS_SOURCE_DIRECTORY, file);
    if (!existsSync(src)) throw new Error(`Missing icon source: ${src}`);
    const dst = join(distDir, IMAGES_DIRECTORY, file);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
  }
}

function copyAllAssets(distDir: string): void {
  copyShipImages(distDir);
  copyTypeIcons(distDir);
}

function serveFile(filePath: string, res: ServerResponse): void {
  const data = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
  res.end(data);
}

function contentTypeFor(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

export function copyGameAssets(): AstroIntegration {
  return {
    name: "copy-game-assets",
    hooks: {
      "astro:build:done": ({ logger }) => {
        copyAllAssets("dist");
        logger.info("Copied game assets (ship images + type icons)");
      },
      "astro:server:setup": ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url ?? "", "http://localhost");
          if (!url.pathname.startsWith(`/${IMAGES_DIRECTORY}/`)) return next();
          const relPath = normalize(url.pathname.slice(1));
          if (relPath.startsWith(`${IMAGES_DIRECTORY}/ships/`)) {
            const fileName = relPath.slice(`${IMAGES_DIRECTORY}/ships/`.length);
            const filePath = join(SHIP_IMAGES_SOURCE, fileName);
            if (existsSync(filePath) && statSync(filePath).isFile()) {
              return serveFile(filePath, res);
            }
          } else if (relPath.startsWith(`${IMAGES_DIRECTORY}/icons/`)) {
            const fileName = relPath.slice(`${IMAGES_DIRECTORY}/icons/`.length);
            const filePath = join(ICONS_SOURCE_DIRECTORY, "icons", fileName);
            if (existsSync(filePath) && statSync(filePath).isFile()) {
              return serveFile(filePath, res);
            }
          } else if (relPath.startsWith(`${IMAGES_DIRECTORY}/type-icons/`)) {
            const fileName = relPath.slice(`${IMAGES_DIRECTORY}/type-icons/`.length);
            const filePath = join(ICONS_SOURCE_DIRECTORY, "type-icons", fileName);
            if (existsSync(filePath) && statSync(filePath).isFile()) {
              return serveFile(filePath, res);
            }
          }
          return next();
        });
      },
    },
  };
}
