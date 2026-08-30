import type { TypeId } from "../gamedata/ids";
import type { SigResolutionClass } from "../sim";
import type { PropulsionKind } from "../ships";
import type { LauncherClass } from "../fitting";
import { PanelConfigurationMemoryImpl } from "./panelConfigurationMemory";

const moduleId = (id: string): TypeId => id as TypeId;

describe("PanelConfigurationMemoryImpl", () => {
  test("starts empty", () => {
    const memory = new PanelConfigurationMemoryImpl();
    expect(memory.recallTurret("pulseLaser", "M")).toBeUndefined();
    expect(memory.recallLauncher("ham")).toBeUndefined();
    expect(memory.recallPropulsion("afterburner")).toBeUndefined();
  });

  test("remembers and recalls turret selection by family and sigRes", () => {
    const memory = new PanelConfigurationMemoryImpl();
    const selection = { moduleId: moduleId("1"), ammoId: moduleId("2") };
    memory.rememberTurret("pulseLaser", "M", selection);
    expect(memory.recallTurret("pulseLaser", "M")).toEqual(selection);
  });

  test("turret memory is keyed by both family and sigRes", () => {
    const memory = new PanelConfigurationMemoryImpl();
    const mediumSelection = { moduleId: moduleId("1"), ammoId: moduleId("2") };
    const smallSelection = { moduleId: moduleId("3"), ammoId: moduleId("4") };
    memory.rememberTurret("pulseLaser", "M", mediumSelection);
    memory.rememberTurret("pulseLaser", "S", smallSelection);
    expect(memory.recallTurret("pulseLaser", "M")).toEqual(mediumSelection);
    expect(memory.recallTurret("pulseLaser", "S")).toEqual(smallSelection);
  });

  test("turret memory is keyed by family", () => {
    const memory = new PanelConfigurationMemoryImpl();
    const pulseSelection = { moduleId: moduleId("1"), ammoId: moduleId("2") };
    const beamSelection = { moduleId: moduleId("5"), ammoId: moduleId("6") };
    memory.rememberTurret("pulseLaser", "M", pulseSelection);
    memory.rememberTurret("beamLaser", "M", beamSelection);
    expect(memory.recallTurret("pulseLaser", "M")).toEqual(pulseSelection);
    expect(memory.recallTurret("beamLaser", "M")).toEqual(beamSelection);
  });

  test("remembers and recalls launcher selection by class", () => {
    const memory = new PanelConfigurationMemoryImpl();
    const selection = { moduleId: moduleId("10"), ammoId: moduleId("11") };
    memory.rememberLauncher("ham", selection);
    expect(memory.recallLauncher("ham")).toEqual(selection);
  });

  test("launcher memory is keyed by class", () => {
    const memory = new PanelConfigurationMemoryImpl();
    const assaultSelection = { moduleId: moduleId("10"), ammoId: moduleId("11") };
    const heavySelection = { moduleId: moduleId("20"), ammoId: moduleId("21") };
    memory.rememberLauncher("ham", assaultSelection);
    memory.rememberLauncher("heavy", heavySelection);
    expect(memory.recallLauncher("ham")).toEqual(assaultSelection);
    expect(memory.recallLauncher("heavy")).toEqual(heavySelection);
  });

  test("remembers and recalls propulsion module by kind", () => {
    const memory = new PanelConfigurationMemoryImpl();
    memory.rememberPropulsion("afterburner", moduleId("100"));
    expect(memory.recallPropulsion("afterburner")).toBe(moduleId("100"));
  });

  test("propulsion memory is keyed by kind", () => {
    const memory = new PanelConfigurationMemoryImpl();
    memory.rememberPropulsion("afterburner", moduleId("100"));
    memory.rememberPropulsion("microwarpdrive", moduleId("200"));
    expect(memory.recallPropulsion("afterburner")).toBe(moduleId("100"));
    expect(memory.recallPropulsion("microwarpdrive")).toBe(moduleId("200"));
  });

  test("overwriting a turret selection replaces the previous", () => {
    const memory = new PanelConfigurationMemoryImpl();
    memory.rememberTurret("pulseLaser", "M", { moduleId: moduleId("1"), ammoId: moduleId("2") });
    memory.rememberTurret("pulseLaser", "M", { moduleId: moduleId("3"), ammoId: moduleId("4") });
    expect(memory.recallTurret("pulseLaser", "M")).toEqual({ moduleId: moduleId("3"), ammoId: moduleId("4") });
  });

  test("clear removes all memories", () => {
    const memory = new PanelConfigurationMemoryImpl();
    memory.rememberTurret("pulseLaser", "M", { moduleId: moduleId("1"), ammoId: moduleId("2") });
    memory.rememberLauncher("ham", { moduleId: moduleId("10"), ammoId: moduleId("11") });
    memory.rememberPropulsion("afterburner", moduleId("100"));
    memory.clear();
    expect(memory.recallTurret("pulseLaser", "M")).toBeUndefined();
    expect(memory.recallLauncher("ham")).toBeUndefined();
    expect(memory.recallPropulsion("afterburner")).toBeUndefined();
  });
});
