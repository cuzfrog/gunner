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
    panel.recordOverride("attackerMass", 1000);
    panel.lastCommittedHull = "Rifter";
    expect(panel.profile).toBe(RIFTER);
    expect(panel.fittingText).toBe("fit");
    expect(panel.isOverridden("attackerMass")).toBe(true);
    expect(panel.lastCommittedHull).toBe("Rifter");
  });

  test("attacker record lands in the turret overrides store", () => {
    const { panel, turretOverrides } = buildSidePanel("attacker");
    panel.recordOverride("attackerMass", 1000);
    expect(panel.isOverridden("attackerMass")).toBe(true);
    expect(turretOverrides.get().attackerMass).toBe(1000);
  });

  test("target record lands locally and does not affect the turret store", () => {
    const { panel, turretOverrides } = buildSidePanel("target");
    panel.recordOverride("targetMass", 2000);
    expect(panel.isOverridden("targetMass")).toBe(true);
    expect(turretOverrides.get().targetMass).toBeUndefined();
  });

  test("target restore round-trips overrides", () => {
    const { panel } = buildSidePanel("target", shipsWithHull());
    panel.profile = RIFTER;
    panel.recordOverride("targetMass", 2000);
    const state = panel.capture();
    expect(state.overrides.targetMass).toBe(2000);
    expect(state.hull).toBe("Rifter");
    panel.clearOverrides();
    expect(panel.isOverridden("targetMass")).toBe(false);
    panel.restore(state);
    expect(panel.isOverridden("targetMass")).toBe(true);
  });

  test("attacker restore does not clear the turret overrides store", () => {
    const { panel, turretOverrides } = buildSidePanel("attacker", shipsWithHull());
    panel.profile = RIFTER;
    panel.recordOverride("attackerSpeed", 500);
    const state = panel.capture();
    expect(state.overrides).toEqual({});
    expect(state.hull).toBe("Rifter");
    panel.restore(state);
    expect(turretOverrides.get().attackerSpeed).toBe(500);
    expect(panel.isOverridden("attackerSpeed")).toBe(true);
  });

  test("target overrides are captured and restored", () => {
    const { panel } = buildSidePanel("target");
    panel.recordOverride("targetMass", 2000);
    expect(panel.isOverridden("targetMass")).toBe(true);
    panel.clearOverrides();
    expect(panel.isOverridden("targetMass")).toBe(false);
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
    panel.sections.hull.onHullChange();
    expect(panel.profile).toBe(RIFTER);
    expect(panel.lastCommittedHull).toBe("Rifter");
  });
});
