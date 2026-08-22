import { RIFTER, buildSidePanel, getFake, mockShips } from "../testSupport";

function shipsWithHull() {
  const ships = mockShips();
  ships.findHull = vi.fn((name: string) => (name === "Rifter" ? RIFTER : undefined));
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
  return ships;
}

describe("SidePanel", () => {
  test("capture returns the current side panel inputs", () => {
    const { document, panel } = buildSidePanel("attacker");
    getFake(document, "attacker-speed").value = "450";
    getFake(document, "attacker-mass").value = "1200000";
    getFake(document, "attacker-inertia").value = "2.5";
    getFake(document, "attacker-range").value = "8000";
    getFake(document, "attacker-mode").value = "keepAtRange";
    getFake(document, "attacker-skills").value = "3";
    getFake(document, "attacker-overload").checked = true;
    const state = panel.capture();
    expect(state.speed).toBe(450);
    expect(state.mass).toBe(1_200_000);
    expect(state.inertia).toBe(2.5);
    expect(state.range).toBe(8000);
    expect(state.mode).toBe("keepAtRange");
    expect(state.skillLevel).toBe(3);
    expect(state.overload).toBe(true);
    expect(state.sig).toBeUndefined();
  });

  test("capture for target side includes target signature", () => {
    const { document, panel } = buildSidePanel("target");
    getFake(document, "target-mode").value = "orbit";
    getFake(document, "target-sig").value = "120";
    const state = panel.capture();
    expect(state.sig).toBe(120);
  });

  test("restore reapplies a captured state", () => {
    const { document, panel } = buildSidePanel("attacker", shipsWithHull());
    getFake(document, "attacker-speed").value = "450";
    getFake(document, "attacker-mass").value = "1200000";
    getFake(document, "attacker-inertia").value = "2.5";
    getFake(document, "attacker-range").value = "8000";
    getFake(document, "attacker-mode").value = "keepAtRange";
    getFake(document, "attacker-skills").value = "3";
    getFake(document, "attacker-overload").checked = true;
    const state = panel.capture();
    getFake(document, "attacker-speed").value = "0";
    panel.restore(state);
    expect(getFake(document, "attacker-speed").value).toBe("450");
    expect(getFake(document, "attacker-mass").value).toBe("1200000");
  });

  test("state accessors round-trip values", () => {
    const { panel } = buildSidePanel("attacker");
    panel.profile = RIFTER;
    panel.fittedHull = undefined;
    panel.fittingText = "fit";
    panel.overrides = { attackerMass: 1000 };
    panel.lastCommittedHull = "Rifter";
    expect(panel.profile).toBe(RIFTER);
    expect(panel.fittingText).toBe("fit");
    expect(panel.overrides).toEqual({ attackerMass: 1000 });
    expect(panel.lastCommittedHull).toBe("Rifter");
  });

  test("skillConditions reflects skill and overload inputs", () => {
    const { document, panel } = buildSidePanel("attacker");
    getFake(document, "attacker-skills").value = "4";
    getFake(document, "attacker-overload").checked = true;
    expect(panel.skillConditions()).toEqual({ skillLevel: 4, overloaded: true });
  });

  test("onHullChange delegates to the hull section", () => {
    const { document, panel } = buildSidePanel("attacker", shipsWithHull());
    getFake(document, "attacker-hull").value = "Rifter";
    panel.onHullChange();
    expect(panel.profile).toBe(RIFTER);
    expect(panel.lastCommittedHull).toBe("Rifter");
  });
});
