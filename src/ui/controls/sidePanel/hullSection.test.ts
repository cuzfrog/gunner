import { RIFTER, buildSidePanel, getFake, mockShips } from "../testSupport";

function shipsWithHull() {
  const ships = mockShips();
  ships.findHull = vi.fn((name: string) => (name === "Rifter" ? RIFTER : undefined));
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
  return ships;
}

describe("HullSection", () => {
  test("onHullInput applies a valid hull while typing", () => {
    const { document, panel } = buildSidePanel("attacker", shipsWithHull());
    getFake(document, "attacker-hull").value = "Rifter";
    panel.onHullInput();
    expect(panel.profile).toBe(RIFTER);
    expect(getFake(document, "attacker-hull").classList.toggle).toHaveBeenCalledWith("hull-invalid", false);
  });

  test("onHullChange commits a valid hull", () => {
    const { document, panel } = buildSidePanel("attacker", shipsWithHull());
    getFake(document, "attacker-hull").value = "Rifter";
    panel.onHullChange();
    expect(panel.profile).toBe(RIFTER);
    expect(panel.lastCommittedHull).toBe("Rifter");
    expect(panel.host.persistConfigChange).toHaveBeenCalled();
  });

  test("onHullChange marks an unknown hull invalid", () => {
    const { document, panel } = buildSidePanel("attacker", shipsWithHull());
    getFake(document, "attacker-hull").value = "Unknown";
    panel.onHullChange();
    expect(panel.profile).toBeUndefined();
    expect(getFake(document, "attacker-hull").classList.toggle).toHaveBeenCalledWith("hull-invalid", true);
  });

  test("clearHull resets the hull and image", () => {
    const { document, panel } = buildSidePanel("attacker", shipsWithHull());
    panel.sections.hull.applyProfile(RIFTER, false);
    panel.sections.hull.clearHull(true, true);
    expect(panel.profile).toBeUndefined();
    expect(getFake(document, "attacker-hull").value).toBe("");
    expect(getFake(document, "attacker-ship-image").hidden).toBe(true);
  });

  test("updateHullHint renders the hull type and faction", () => {
    const { document, panel } = buildSidePanel("attacker", shipsWithHull());
    panel.sections.hull.applyProfile(RIFTER, false);
    expect(getFake(document, "attacker-hull-hint").textContent).toBe("Frigate · Minmatar Republic");
  });

  test("refreshHullInputs rewrites the input from the current profile", () => {
    const { document, panel } = buildSidePanel("attacker", shipsWithHull());
    panel.sections.hull.applyProfile(RIFTER, false);
    getFake(document, "attacker-hull").value = "typed";
    panel.sections.hull.refreshHullInputs();
    expect(getFake(document, "attacker-hull").value).toBe("Rifter");
  });
});
