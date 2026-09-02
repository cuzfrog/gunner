import { createContainer, InjectionMode } from "awilix";
import { registerGameDataModule } from "../../../gamedata";
import { registerShipsModule, type DefenseSkills, type ShipsCradle, defaultDefenseSkills } from "../../../ships";
import { RIFTER, buildSidePanel, getFake, mockShips } from "../testSupport";

function realShips() {
  const cradle = createContainer<ShipsCradle>({ injectionMode: InjectionMode.PROXY });
  registerGameDataModule(cradle);
  registerShipsModule(cradle);
  return cradle.cradle.ships;
}

function shipsWithHull() {
  const ships = mockShips();
  ships.findHullById = vi.fn((id: string) => (id === RIFTER.id ? RIFTER : undefined));
  ships.findHull = vi.fn((name: string) => (name === "Rifter" ? RIFTER : undefined));
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
  return ships;
}

describe("SidePanel", () => {
  test("capture returns the current side panel inputs", () => {
    const { document, panel } = buildSidePanel("shipA");
    getFake(document, "ship-a-speed").value = "450";
    getFake(document, "ship-a-mass").value = "1200000";
    getFake(document, "ship-a-inertia").value = "2.5";
    getFake(document, "ship-a-range").value = "8000";
    getFake(document, "ship-a-mode").value = "keepAtRange";
    getFake(document, "ship-a-sig").value = "36";
    getFake(document, "ship-a-skills").value = "3";
    getFake(document, "ship-a-overload").checked = true;
    const state = panel.capture();
    expect(state.speed).toBe(450);
    expect(state.mass).toBe(1_200_000);
    expect(state.inertia).toBe(2.5);
    expect(state.range).toBe(8000);
    expect(state.mode).toBe("keepAtRange");
    expect(state.skillLevel).toBe(3);
    expect(state.overload).toBe(true);
    expect(state.sig).toBe(36);
  });

  test("capture for shipB side includes shipB signature", () => {
    const { document, panel } = buildSidePanel("shipB");
    getFake(document, "ship-b-mode").value = "orbit";
    getFake(document, "ship-b-sig").value = "120";
    const state = panel.capture();
    expect(state.sig).toBe(120);
  });

  test("restore reapplies a captured state", () => {
    const { document, panel } = buildSidePanel("shipA", shipsWithHull());
    getFake(document, "ship-a-speed").value = "450";
    getFake(document, "ship-a-mass").value = "1200000";
    getFake(document, "ship-a-inertia").value = "2.5";
    getFake(document, "ship-a-range").value = "8000";
    getFake(document, "ship-a-mode").value = "keepAtRange";
    getFake(document, "ship-a-skills").value = "3";
    getFake(document, "ship-a-overload").checked = true;
    const state = panel.capture();
    getFake(document, "ship-a-speed").value = "0";
    panel.restore(state);
    expect(getFake(document, "ship-a-speed").value).toBe("450");
    expect(getFake(document, "ship-a-mass").value).toBe("1200000");
  });

  test("state accessors round-trip values", () => {
    const { panel } = buildSidePanel("shipA");
    panel.profile = RIFTER;
    panel.fittedHull = undefined;
    panel.fittingText = "fit";
    panel.recordOverride("shipAMass", 1000);
    panel.lastCommittedHull = RIFTER.id;
    expect(panel.profile).toBe(RIFTER);
    expect(panel.fittingText).toBe("fit");
    expect(panel.isOverridden("shipAMass")).toBe(true);
    expect(panel.lastCommittedHull).toBe(RIFTER.id);
  });

  test("shipA record lands in the turret overrides store", () => {
    const { panel, turretOverrides } = buildSidePanel("shipA");
    panel.recordOverride("shipAMass", 1000);
    expect(panel.isOverridden("shipAMass")).toBe(true);
    expect(turretOverrides.get().shipAMass).toBe(1000);
  });

  test("shipB record lands in the shipB turret overrides store", () => {
    const { panel, turretOverrides } = buildSidePanel("shipB");
    panel.recordOverride("shipBMass", 2000);
    expect(panel.isOverridden("shipBMass")).toBe(true);
    expect(turretOverrides.get().shipBMass).toBe(2000);
  });

  test("shipB restore round-trips overrides", () => {
    const { panel } = buildSidePanel("shipB", shipsWithHull());
    panel.profile = RIFTER;
    panel.recordOverride("shipBMass", 2000);
    const state = panel.capture();
    expect(state.overrides.shipBMass).toBe(2000);
    expect(state.hull).toBe(RIFTER.id);
    panel.clearOverrides();
    expect(panel.isOverridden("shipBMass")).toBe(false);
    panel.restore(state);
    expect(panel.isOverridden("shipBMass")).toBe(true);
  });

  test("shipA restore does not clear the turret overrides store", () => {
    const { panel, turretOverrides } = buildSidePanel("shipA", shipsWithHull());
    panel.profile = RIFTER;
    panel.recordOverride("shipASpeed", 500);
    const state = panel.capture();
    expect(state.overrides).toEqual({ shipASpeed: 500 });
    expect(state.hull).toBe(RIFTER.id);
    panel.restore(state);
    expect(turretOverrides.get().shipASpeed).toBe(500);
    expect(panel.isOverridden("shipASpeed")).toBe(true);
  });

  test("shipB overrides are captured and restored", () => {
    const { panel } = buildSidePanel("shipB");
    panel.recordOverride("shipBMass", 2000);
    expect(panel.isOverridden("shipBMass")).toBe(true);
    panel.clearOverrides();
    expect(panel.isOverridden("shipBMass")).toBe(false);
  });

  test("skillConditions reflects skill and overload inputs", () => {
    const { document, panel } = buildSidePanel("shipA");
    getFake(document, "ship-a-skills").value = "4";
    getFake(document, "ship-a-overload").checked = true;
    expect(panel.skillConditions()).toEqual({ skillLevel: 4, overloaded: true, weaponOverloaded: false, defenseSkills: defaultDefenseSkills(4) });
  });

  test("onHullChange delegates to the hull section", () => {
    const { document, panel } = buildSidePanel("shipA", shipsWithHull());
    getFake(document, "ship-a-hull").value = "Rifter";
    panel.sections.hull.onHullChange();
    expect(panel.profile).toBe(RIFTER);
    expect(panel.lastCommittedHull).toBe(RIFTER.id);
  });

  test("setConfigInputsEnabled(false) disables the ship configuration controls", () => {
    const { document, panel } = buildSidePanel("shipA");
    const options = getFake(document, "ship-a-skill-options");
    const skillOption = document.createElement("button");
    options.appendChild(skillOption);

    panel.setConfigInputsEnabled(false);

    expect(getFake(document, "ship-a-speed").disabled).toBe(true);
    expect(getFake(document, "ship-a-mass").disabled).toBe(true);
    expect(getFake(document, "ship-a-inertia").disabled).toBe(true);
    expect(getFake(document, "ship-a-mode").disabled).toBe(true);
    expect(getFake(document, "ship-a-range").disabled).toBe(true);
    expect(getFake(document, "ship-a-sig").disabled).toBe(true);
    expect(getFake(document, "ship-a-skills").disabled).toBe(true);
    expect(getFake(document, "ship-a-skill-trigger").disabled).toBe(true);
    expect(getFake(document, "ship-a-skill-trigger").getAttribute("aria-disabled")).toBe("true");
    expect(getFake(document, "ship-a-overload").disabled).toBe(true);
    expect(getFake(document, "ship-a-overload-button").disabled).toBe(true);
    expect(getFake(document, "ship-a-overload-button").getAttribute("aria-disabled")).toBe("true");
    expect(options.children[0].disabled).toBe(true);
  });

  test("setConfigInputsEnabled(false) disables shipB signature on the shipB panel", () => {
    const { document, panel } = buildSidePanel("shipB");
    panel.setConfigInputsEnabled(false);
    expect(getFake(document, "ship-b-sig").disabled).toBe(true);
  });

  test("capture derives baseMaxSpeed from current ship and propulsion for manual config", () => {
    const ships = realShips();
    const { document, panel } = buildSidePanel("shipA", ships);
    const rifter = ships.findHull("Rifter")!;
    panel.profile = rifter;
    panel.sections.propulsion.setPropulsionActive("mwd-5mn");
    panel.sections.propulsion.onPropulsionChange();

    const state = panel.capture();
    const base = ships.fittedStats(rifter, undefined, undefined, { skillLevel: state.skillLevel ?? 5, overloaded: state.overload, weaponOverloaded: false }).baseMaxSpeed;
    expect(state.baseMaxSpeed).toBeCloseTo(base, 6);
    expect(state.baseMaxSpeed).toBeLessThan(state.speed);
  });

  test("setConfigInputsEnabled(true) re-enables config controls and reapplies the overload rule", () => {
    const { document, panel } = buildSidePanel("shipA");
    panel.setConfigInputsEnabled(false);

    panel.setConfigInputsEnabled(true);

    expect(getFake(document, "ship-a-speed").disabled).toBe(false);
    expect(getFake(document, "ship-a-mass").disabled).toBe(false);
    expect(getFake(document, "ship-a-inertia").disabled).toBe(false);
    expect(getFake(document, "ship-a-mode").disabled).toBe(false);
    expect(getFake(document, "ship-a-range").disabled).toBe(false);
    expect(getFake(document, "ship-a-sig").disabled).toBe(false);
    expect(getFake(document, "ship-a-skills").disabled).toBe(false);
    expect(getFake(document, "ship-a-skill-trigger").disabled).toBe(false);
    // overload refollows the propulsion/ewar rule: with no ship or propulsion it stays disabled
    expect(getFake(document, "ship-a-overload").disabled).toBe(true);
  });

  test("shipA speed input records override and calls host onConfigChange", () => {
    const { document, host, turretOverrides } = buildSidePanel("shipA");
    getFake(document, "ship-a-speed").value = "450";
    getFake(document, "ship-a-speed").trigger("input");
    expect(host.onConfigChange).toHaveBeenCalled();
    expect(turretOverrides.get().shipASpeed).toBe(450);
  });

  test("shipA mass input records override and calls host onConfigChange", () => {
    const { document, host, turretOverrides } = buildSidePanel("shipA");
    getFake(document, "ship-a-mass").value = "1200000";
    getFake(document, "ship-a-mass").trigger("input");
    expect(host.onConfigChange).toHaveBeenCalled();
    expect(turretOverrides.get().shipAMass).toBe(1_200_000);
  });

  test("shipA inertia input records override and calls host onConfigChange", () => {
    const { document, host, turretOverrides } = buildSidePanel("shipA");
    getFake(document, "ship-a-inertia").value = "2.5";
    getFake(document, "ship-a-inertia").trigger("input");
    expect(host.onConfigChange).toHaveBeenCalled();
    expect(turretOverrides.get().shipAInertia).toBe(2.5);
  });

  test("shipA mode input toggles its own aggressivity slider and calls host onConfigChange", () => {
    const { document, host } = buildSidePanel("shipA");
    getFake(document, "ship-a-mode").value = "maneuver";
    getFake(document, "ship-a-mode").trigger("input");
    expect(getFake(document, "ship-a-aggressivity-slider").disabled).toBe(false);
    expect(host.onConfigChange).toHaveBeenCalled();

    getFake(document, "ship-a-mode").value = "midships";
    getFake(document, "ship-a-mode").trigger("input");
    expect(getFake(document, "ship-a-aggressivity-slider").disabled).toBe(true);
    expect(host.onConfigChange).toHaveBeenCalled();
  });

  test("shipB mode input toggles its own aggressivity slider and calls host onConfigChange", () => {
    const { document, host } = buildSidePanel("shipB");
    getFake(document, "ship-b-mode").value = "maneuver";
    getFake(document, "ship-b-mode").trigger("input");
    expect(getFake(document, "ship-b-aggressivity-slider").disabled).toBe(false);
    expect(host.onConfigChange).toHaveBeenCalled();
  });

  test("shipA range input calls host onConfigChange", () => {
    const { document, host } = buildSidePanel("shipA");
    getFake(document, "ship-a-range").value = "8000";
    getFake(document, "ship-a-range").trigger("input");
    expect(host.onConfigChange).toHaveBeenCalled();
  });

  test("shipB signature input records override in the shipB turret store and calls host onDisplayChange", () => {
    const { document, panel, host, turretOverrides } = buildSidePanel("shipB");
    getFake(document, "ship-b-sig").value = "120";
    getFake(document, "ship-b-sig").trigger("input");
    expect(host.onDisplayChange).toHaveBeenCalled();
    expect(turretOverrides.get().shipBSig).toBe(120);
    expect(panel.isOverridden("shipBSig")).toBe(true);
    expect(panel.capture().sig).toBe(120);
  });

  test("shipA signature input records override in turret store and calls host onDisplayChange", () => {
    const { document, host, turretOverrides } = buildSidePanel("shipA");
    getFake(document, "ship-a-sig").value = "80";
    getFake(document, "ship-a-sig").trigger("input");
    expect(host.onDisplayChange).toHaveBeenCalled();
    expect(turretOverrides.get().shipASig).toBe(80);
  });

  test("restore with undefined defenseSkills resets to defaults", () => {
    const { panel } = buildSidePanel("shipA");
    const customSkills: DefenseSkills = { ...defaultDefenseSkills(5), shieldManagement: 0, hullUpgrades: 3 };
    panel.sections.skill.setDefenseSkills(customSkills);
    expect(panel.skillConditions().defenseSkills).toEqual(customSkills);
    const state = panel.capture();
    panel.restore({ ...state, defenseSkills: undefined });
    expect(panel.skillConditions().defenseSkills).toEqual(defaultDefenseSkills(5));
  });
});
