import { RIFTER, buildSidePanel, getFake, mockShips } from "../testSupport";

function shipsWithStats() {
  const ships = mockShips();
  ships.findHull = vi.fn(() => RIFTER);
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
  ships.fittedStats = vi.fn(() => ({ mass: 1_000_000, inertiaModifier: 2, sigRadius: 30, maxSpeed: 0, alignTime: 0 }));
  ships.maxSpeedForFittedMass = vi.fn(() => 450);
  ships.alignTime = vi.fn(() => 2.5);
  return ships;
}

describe("StatsSection", () => {
  function loadProfile({ document, panel }: ReturnType<typeof buildSidePanel>) {
    getFake(document, "attacker-hull").value = "Rifter";
    panel.onHullChange();
  }

  test("updateShipStats fills speed, mass and inertia from fitted stats", () => {
    const result = buildSidePanel("attacker", shipsWithStats());
    loadProfile(result);
    const { document } = result;
    getFake(document, "attacker-mass").value = "0";
    getFake(document, "attacker-inertia").value = "0";
    getFake(document, "attacker-speed").value = "0";
    result.panel.sections.stats.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    expect(getFake(document, "attacker-mass").value).toBe("1000000");
    expect(getFake(document, "attacker-inertia").value).toBe("2");
    expect(getFake(document, "attacker-speed").value).toBe("450");
  });

  test("updateShipStats respects mass override", () => {
    const result = buildSidePanel("attacker", shipsWithStats());
    loadProfile(result);
    const { document, panel } = result;
    panel.overrides = { attackerMass: 800_000 };
    getFake(document, "attacker-mass").value = "800000";
    panel.sections.stats.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    expect(getFake(document, "attacker-mass").value).toBe("800000");
  });

  test("updateSpeedFromMass recalculates speed", () => {
    const result = buildSidePanel("attacker", shipsWithStats());
    loadProfile(result);
    const { document, panel } = result;
    getFake(document, "attacker-mass").value = "500000";
    panel.sections.stats.updateSpeedFromMass();
    expect(getFake(document, "attacker-speed").value).toBe("450");
  });

  test("updateAlignTime writes the align time suffix", () => {
    const result = buildSidePanel("attacker", shipsWithStats());
    loadProfile(result);
    const { document, panel } = result;
    getFake(document, "attacker-mass").value = "1000000";
    getFake(document, "attacker-inertia").value = "2";
    panel.sections.stats.updateAlignTime();
    expect(getFake(document, "attacker-align-time").textContent).toContain("2.5");
  });

  test("isOverridden reads the panel overrides", () => {
    const { panel } = buildSidePanel("attacker");
    panel.overrides = { attackerSpeed: 300 };
    expect(panel.sections.stats.isOverridden("attackerSpeed")).toBe(true);
    expect(panel.sections.stats.isOverridden("attackerMass")).toBe(false);
  });
});
