import type { PropulsionId, PropulsionModule, ShipProfile, Ships } from "../../../ships";
import type { FittingImport } from "../../../fitting";
import { RIFTER, buildSidePanel, getFake, mockFittingImport, mockShips } from "../testSupport";

const AB_1MN = "ab-1mn" as const;

const AB_MODULE: PropulsionModule = {
  id: AB_1MN,
  kind: "afterburner",
  sizeTier: "small",
  label: "1MN Afterburner I",
  thrust: 150,
  speedBonus: 1.5,
  massAddition: 0,
  sigBloom: 0,
};

function fittingForPropulsion(): FittingImport {
  const fitting = mockFittingImport();
  fitting.propulsionVariantNames = vi.fn(() => ["1MN Afterburner I"]);
  fitting.propulsionStats = vi.fn(() => AB_MODULE);
  return fitting;
}

function shipsWithPropulsion(): Ships {
  const ships = mockShips();
  ships.findHull = vi.fn(() => RIFTER);
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
  ships.fittingOptions = vi.fn(() => [AB_MODULE]);
  ships.allFittingOptions = vi.fn(() => [AB_MODULE]);
  ships.fittingOption = vi.fn((_profile: ShipProfile, id: PropulsionId) => (id === AB_1MN ? AB_MODULE : undefined));
  ships.parsePropulsionId = vi.fn((id: string) => (id === AB_1MN ? id : undefined));
  return ships;
}

function loadProfile({ document, panel }: ReturnType<typeof buildSidePanel>) {
  getFake(document, "attacker-hull").value = "Rifter";
  panel.onHullChange();
}

describe("PropulsionSection", () => {
  test("renderPropulsionOptions creates options and buttons", () => {
    const result = buildSidePanel("attacker", shipsWithPropulsion(), fittingForPropulsion());
    loadProfile(result);
    const { document, panel } = result;
    panel.renderPropulsionOptions();
    expect(getFake(document, "attacker-propulsion").children.length).toBeGreaterThan(0);
    expect(getFake(document, "attacker-propulsion-options").children.length).toBeGreaterThan(0);
  });

  test("onPropulsionChange fits a propulsion to the hull", () => {
    const result = buildSidePanel("attacker", shipsWithPropulsion(), fittingForPropulsion());
    loadProfile(result);
    const { document, panel } = result;
    getFake(document, "attacker-propulsion").value = AB_1MN;
    panel.onPropulsionChange();
    expect(panel.fittedHull?.propulsionId).toBe(AB_1MN);
    expect(panel.fittedHull?.propulsionName).toBe("1MN Afterburner I");
  });

  test("variant popup renders variant buttons", () => {
    const result = buildSidePanel("attacker", shipsWithPropulsion(), fittingForPropulsion());
    loadProfile(result);
    const { document, panel } = result;
    panel.imageCatalog.itemIconUrl = vi.fn(() => "icon.png");
    panel.renderPropulsionOptions();
    panel.getPropulsionVariantPopup().open();
    const variants = getFake(document, "attacker-propulsion-variants");
    expect(variants.hidden).toBe(false);
    expect(variants.children.length).toBeGreaterThan(0);
    const button = variants.children[0];
    expect(button.children[0]?.src).toBe("icon.png");
  });
});
