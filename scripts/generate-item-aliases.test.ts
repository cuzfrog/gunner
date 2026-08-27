import { _resolveChains, _filterAliases } from "./generate-item-aliases";

describe("_resolveChains", () => {
  test("passes through direct mappings", () => {
    const conversions = { "Old A": "New A", "Old B": "New B" };
    expect(_resolveChains(conversions)).toEqual({ "Old A": "New A", "Old B": "New B" });
  });

  test("collapses two-hop chains to a single hop", () => {
    const conversions = { "Old A": "Mid A", "Mid A": "New A" };
    expect(_resolveChains(conversions)).toEqual({ "Old A": "New A", "Mid A": "New A" });
  });

  test("collapses three-hop chains to a single hop", () => {
    const conversions = { "A1": "A2", "A2": "A3", "A3": "A4" };
    expect(_resolveChains(conversions)).toEqual({ "A1": "A4", "A2": "A4", "A3": "A4" });
  });

  test("handles cycles by keeping the last reachable target before the cycle closes", () => {
    const conversions = { "A": "B", "B": "A" };
    expect(_resolveChains(conversions)).toEqual({ "A": "B", "B": "A" });
  });
});

describe("_filterAliases", () => {
  test("keeps pairs whose target is a current name and source is not", () => {
    const aliases = { "Old A": "New A", "Old B": "New B" };
    const currentNames = new Set(["New A", "New B", "Existing C"]);
    expect(_filterAliases(aliases, currentNames)).toEqual({ "Old A": "New A", "Old B": "New B" });
  });

  test("drops pairs whose target is not a current name", () => {
    const aliases = { "Old A": "Gone A", "Old B": "New B" };
    const currentNames = new Set(["New B"]);
    expect(_filterAliases(aliases, currentNames)).toEqual({ "Old B": "New B" });
  });

  test("drops pairs whose source is already a current name", () => {
    const aliases = { "Current Name": "Other Name", "Old B": "New B" };
    const currentNames = new Set(["Current Name", "New B", "Other Name"]);
    expect(_filterAliases(aliases, currentNames)).toEqual({ "Old B": "New B" });
  });

  test("drops pairs where source and target are the same current name", () => {
    const aliases = { "Same": "Same" };
    const currentNames = new Set(["Same"]);
    expect(_filterAliases(aliases, currentNames)).toEqual({});
  });
});
