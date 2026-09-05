import { buildProjection } from "./projection";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, rmSync, readFileSync } from "node:fs";

const SDE_DIR = process.env.SDE_DIR ?? join(homedir(), "workspace", "Pyfa", "staticdata", "fsd_built");
const hasSde = existsSync(join(SDE_DIR, "dogmaattributes.0.json"));

const runOrSkip = hasSde ? describe : describe.skip;

runOrSkip("buildProjection", () => {
  test("produces complete projection with all SDE attributes and effects", async () => {
    const projection = await buildProjection(SDE_DIR);
    expect(Object.keys(projection.attributes).length).toBeGreaterThan(2000);
    expect(Object.keys(projection.effects).length).toBeGreaterThan(3000);
    expect(Object.keys(projection.types).length).toBeGreaterThan(10000);
  });

  test("projection attributes have required fields", async () => {
    const projection = await buildProjection(SDE_DIR);
    const attr = Object.values(projection.attributes)[0];
    expect(attr).toHaveProperty("id");
    expect(attr).toHaveProperty("name");
    expect(attr).toHaveProperty("defaultValue");
    expect(attr).toHaveProperty("highIsGood");
    expect(attr).toHaveProperty("stackable");
  });

  test("projection effects carry modifier info", async () => {
    const projection = await buildProjection(SDE_DIR);
    const effectsWithModifiers = Object.values(projection.effects).filter((e) => e.modifiers.length > 0);
    expect(effectsWithModifiers.length).toBeGreaterThan(1000);
  });

  test("projection types have attributes and effectIds", async () => {
    const projection = await buildProjection(SDE_DIR);
    const publishedTypes = Object.values(projection.types).filter((t) => t.published);
    const withAttrs = publishedTypes.filter((t) => t.attributes.length > 0);
    expect(withAttrs.length).toBeGreaterThan(1000);
    const withEffects = publishedTypes.filter((t) => t.effectIds.length > 0);
    expect(withEffects.length).toBeGreaterThan(1000);
  });
});
