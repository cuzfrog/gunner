#!/usr/bin/env bun
// Re-renders every ship image in data/ship-images/ from CCP's official image
// service (images.evetech.net), keyed by the ship typeId in SHIP_PROFILES.
// Source jpgs are cached in tmp/ship-images/ so re-runs only download what is
// missing; the webp output is always re-encoded at RENDER_SIZE.
import { mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SHIP_PROFILES } from "../../src/gamedata/shipProfiles/profiles";
import { convertToWebp } from "./convert-webp";

const RENDER_SIZE = 128;
const CACHE_DIR = "tmp/ship-images";
const OUTPUT_DIR = "data/ship-images";
const FETCH_CONCURRENCY = 8;

function cacheFileName(shipName) {
  return `${shipName.replaceAll(" ", "_")}.jpg`;
}

function outputFileName(shipName) {
  return `${shipName.replaceAll(" ", "_")}.webp`;
}

async function fetchRender(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const pending = SHIP_PROFILES.filter((profile) => {
    const cached = join(CACHE_DIR, cacheFileName(profile.name));
    return !existsSync(cached);
  });
  console.log(`${SHIP_PROFILES.length} ships, ${pending.length} renders to download.`);

  const failures = [];
  let index = 0;
  async function worker() {
    while (index < pending.length) {
      const profile = pending[index++];
      const target = join(CACHE_DIR, cacheFileName(profile.name));
      try {
        const bytes = await fetchRender(`https://images.evetech.net/types/${profile.id}/render?size=${RENDER_SIZE}`);
        await Bun.write(target, bytes);
      } catch (error) {
        failures.push(`${profile.name} (${profile.id}): ${error.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker));
  for (const failure of failures) console.error(`FAILED ${failure}`);

  const sources = readdirSync(CACHE_DIR).filter((file) => file.endsWith(".jpg"));
  // Ships without an evetech render (e.g. newly published hulls) keep their
  // existing wiki-sourced webp; only a ship with neither source is an error.
  const converted = [];
  for (const profile of SHIP_PROFILES) {
    if (sources.includes(cacheFileName(profile.name))) {
      convertToWebp(join(CACHE_DIR, cacheFileName(profile.name)), join(OUTPUT_DIR, outputFileName(profile.name)), RENDER_SIZE);
      converted.push(profile.name);
    } else if (!existsSync(join(OUTPUT_DIR, outputFileName(profile.name)))) {
      console.error(`No render and no existing image for ${profile.name} (${profile.id})`);
      process.exit(1);
    }
  }
  console.log(`Converted ${converted.length} renders to ${OUTPUT_DIR}/ at ${RENDER_SIZE}px; kept ${SHIP_PROFILES.length - converted.length} existing.`);
}

await main();
