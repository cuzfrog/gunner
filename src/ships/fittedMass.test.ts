import { fittedMassFactor } from "./fittedMass";

describe("fittedMassFactor", () => {
  test.each([
    ["Standard Frigates", 1.03],
    ["Standard Destroyers", 1.03],
    ["Corvettes", 1.03],
    ["Interceptors", 1.03],
    ["Standard Cruisers", 1.05],
    ["Standard Battlecruisers", 1.05],
    ["Heavy Assault Cruisers", 1.05],
    ["Recon Ships", 1.05],
    ["Standard Battleships", 1.03],
    ["Marauders", 1.03],
    ["Black Ops", 1.03],
    ["Carriers", 1.02],
    ["Dreadnoughts", 1.02],
    ["Force Auxiliaries", 1.02],
    ["Titans", 1.02],
    ["Shuttles", 1],
    ["Special Edition Shuttles", 1],
    ["Unknown Hulls", 1],
  ] as const)("returns the fitted mass factor for %s", (hullType, expected) => {
    expect(fittedMassFactor(hullType)).toBe(expected);
  });
});
