import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSdeGroups, readSdeTypes } from "./sdeSource";

describe("readSdeTypes", () => {
  test("merges all types shards into one record", () => {
    const dir = mkdtempSync(join(tmpdir(), "sde-source-"));
    try {
      writeFileSync(join(dir, "types.0.json"), JSON.stringify({ "627": { typeID: 627, groupID: 26, published: 1 } }), "utf8");
      writeFileSync(join(dir, "types.1.json"), JSON.stringify({ "2205": { typeID: 2205, groupID: 100, published: 1 } }), "utf8");
      writeFileSync(join(dir, "types.2.json"), JSON.stringify({ "31864": { typeID: 31864, groupID: 100, published: 1, iconID: 1084 } }), "utf8");
      const types = readSdeTypes(dir);
      expect(Object.keys(types).sort((a, b) => Number(a) - Number(b))).toEqual(["627", "2205", "31864"]);
      expect(types["2205"].groupID).toBe(100);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("readSdeGroups", () => {
  test("reads the groups file", () => {
    const dir = mkdtempSync(join(tmpdir(), "sde-source-"));
    try {
      writeFileSync(join(dir, "groups.0.json"), JSON.stringify({ "100": { groupID: 100, categoryID: 18 } }), "utf8");
      expect(readSdeGroups(dir)).toEqual({ "100": { groupID: 100, categoryID: 18 } });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
