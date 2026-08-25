import { fittingOptions } from "./fitting";
import { StaticShipProfileCatalog } from "../gamedata/shipProfiles";

const catalog = new StaticShipProfileCatalog();

function profileByName(name: string) {
  const found = catalog.byName(name);
  if (!found) throw new Error(`Missing test profile: ${name}`);
  return found;
}

describe("fittingOptions", () => {
  test("frigate gets its own afterburner and microwarpdrive plus the medium afterburner overfit", () => {
    const ids = fittingOptions(profileByName("Rifter")).map((m) => m.id);
    expect(ids).toEqual(["ab-1mn", "mwd-5mn", "ab-10mn"]);
  });

  test("cruiser gets its own modules plus the large afterburner overfit", () => {
    const ids = fittingOptions(profileByName("Caracal")).map((m) => m.id);
    expect(ids).toEqual(["ab-10mn", "mwd-50mn", "ab-100mn"]);
  });

  test("battleship gets only its own tier modules", () => {
    const ids = fittingOptions(profileByName("Scorpion")).map((m) => m.id);
    expect(ids).toEqual(["ab-100mn", "mwd-500mn"]);
  });

  test("capital gets only its own tier modules", () => {
    const ids = fittingOptions(profileByName("Avatar")).map((m) => m.id);
    expect(ids).toEqual(["ab-10000mn", "mwd-50000mn"]);
  });

  test("shuttle cannot fit propulsion", () => {
    const modules = fittingOptions(profileByName("Caldari Shuttle"));
    expect(modules).toHaveLength(0);
  });
});
