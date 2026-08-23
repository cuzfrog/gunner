import {
  resolveRole,
  resolveTankType,
  resolveWeapon,
  summarizeFitting,
} from "./fittingSummary";
import type { ParsedFitting } from "../src/fitting/eft";

function makeParsed(modules: ParsedFitting["modules"], drones: ParsedFitting["drones"] = []): ParsedFitting {
  return {
    hullName: "TestShip",
    fittingName: "Killmail 12345",
    modules,
    drones,
    cargo: [],
  };
}

describe("resolveWeapon", () => {
  test("returns Blaster for blaster-based fit", () => {
    const modules = [{ name: "Light Electron Blaster II", charge: "Antimatter S", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Blaster");
  });

  test("returns Rail for railgun-based fit", () => {
    const modules = [{ name: "125mm Railgun I", charge: "Antimatter S", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Rail");
  });

  test("returns AC for autocannon-based fit", () => {
    const modules = [{ name: "150mm Light AutoCannon I", charge: "EMP S", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("AC");
  });

  test("returns Art for artillery-based fit", () => {
    const modules = [{ name: "280mm Howitzer Artillery I", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Art");
  });

  test("returns Missile for missile launcher", () => {
    const modules = [{ name: "Heavy Missile Launcher II", charge: "Inferno", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Missile");
  });

  test("returns Torp for torpedo launcher", () => {
    const modules = [{ name: "Torpedo Launcher II", charge: "Mjolnir", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Torp");
  });

  test("returns Rocket for rocket launcher", () => {
    const modules = [{ name: "Rocket Launcher II", charge: "Nova", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Rocket");
  });

  test("returns Pulse for pulse laser fit", () => {
    const modules = [{ name: "Small Focused Pulse Laser II", charge: "Multifrequency S", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Pulse");
  });

  test("returns Beam for beam laser fit", () => {
    const modules = [{ name: "Small Focused Beam Laser II", charge: "Multifrequency S", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Beam");
  });

  test("returns Drone for combat drone drones with no weapon", () => {
    const modules = [{ name: "1MN Afterburner II", offline: false }];
    const drones = [{ name: "Hobgoblin I", quantity: 5 }];
    expect(resolveWeapon(modules, drones)).toBe("Drone");
  });

  test("returns Fighter for Infiltrator drone (stealth bomber fighter)", () => {
    const modules = [{ name: "1MN Afterburner II", offline: false }];
    const drones = [{ name: "Infiltrator I", quantity: 5 }];
    expect(resolveWeapon(modules, drones)).toBe("Fighter");
  });

  test("returns Blaster for Particle Accelerator variant", () => {
    const modules = [{ name: "Modal Light Neutron Particle Accelerator I", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("Blaster");
  });

  test("returns AC for Machine Gun autocannon variant", () => {
    const modules = [{ name: "150mm Light Gallium Machine Gun", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("AC");
  });

  test("returns AC for Repeating Cannon autocannon variant", () => {
    const modules = [{ name: "800mm Repeating Cannon I", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("AC");
  });

  test("returns Drone for faction-branded combat drone", () => {
    const modules = [{ name: "1MN Afterburner II", offline: false }];
    const drones = [{ name: "Republic Fleet Valkyrie", quantity: 5 }];
    expect(resolveWeapon(modules, drones)).toBe("Drone");
  });

  test("returns Drone for Caldari Navy Wasp heavy drone", () => {
    const modules = [{ name: "1MN Afterburner II", offline: false }];
    const drones = [{ name: "Caldari Navy Wasp", quantity: 4 }];
    expect(resolveWeapon(modules, drones)).toBe("Drone");
  });

  test("returns Drone for Hornet light drone", () => {
    const modules = [{ name: "1MN Afterburner II", offline: false }];
    const drones = [{ name: "Hornet II", quantity: 5 }];
    expect(resolveWeapon(modules, drones)).toBe("Drone");
  });

  test("returns Drone for Bouncer sentry drone", () => {
    const modules = [{ name: "1MN Afterburner II", offline: false }];
    const drones = [{ name: "Bouncer II", quantity: 5 }];
    expect(resolveWeapon(modules, drones)).toBe("Drone");
  });

  test("returns DPS for fit without identifiable weapon", () => {
    const modules = [{ name: "Stasis Webifier II", offline: false }];
    expect(resolveWeapon(modules, [])).toBe("");
  });
});

describe("resolveTankType", () => {
  test("returns Armor for plate-based fit", () => {
    const modules = [
      { name: "400mm Steel Plates II", offline: false },
      { name: "Damage Control II", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Armor");
  });

  test("returns Armor for armor repairer-based fit", () => {
    const modules = [
      { name: "Small Armor Repairer II", offline: false },
      { name: "Multispectrum Coating II", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Armor");
  });

  test("returns Armor for EM Armor Hardener + Damage Control + Trimark (Shield_Abaddon case)", () => {
    // Regression: 'EM Armor Hardener' was misclassified as non-tank,
    // causing the Shield_Abaddon fit to be incorrectly labeled as Shield.
    const modules = [
      { name: "Damage Control II", offline: false },
      { name: "EM Armor Hardener II", offline: false },
      { name: "EM Armor Hardener II", offline: false },
      { name: "EM Armor Hardener II", offline: false },
      { name: "Large Trimark Armor Pump I", offline: false },
      { name: "Large Trimark Armor Pump I", offline: false },
      { name: "Large Trimark Armor Pump I", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Armor");
  });

  test("returns Armor for Reactive Armor Hardener", () => {
    const modules = [
      { name: "Reactive Armor Hardener", offline: false },
      { name: "Kinetic Armor Hardener II", offline: false },
      { name: "Damage Control II", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Armor");
  });

  test("returns Shield for shield extender fit", () => {
    const modules = [
      { name: "Small Shield Extender II", offline: false },
      { name: "Damage Control II", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Shield");
  });

  test("returns Shield for shield hardener fit", () => {
    const modules = [
      { name: "Multispectrum Shield Hardener II", offline: false },
      { name: "5MN Microwarpdrive", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Shield");
  });

  test("prefers Armor when plate equals shield", () => {
    const modules = [
      { name: "400mm Steel Plates II", offline: false },
      { name: "Medium Shield Extender II", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Armor");
  });

  test("returns Shield for pure shield fit", () => {
    const modules = [
      { name: "Medium Shield Extender II", offline: false },
      { name: "Multispectrum Shield Hardener II", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Shield");
  });

  test("returns Shield for shield booster fit", () => {
    const modules = [
      { name: "X-Large Ancillary Shield Booster", offline: false },
      { name: "Large Shield Extender II", offline: false },
    ];
    expect(resolveTankType(modules)).toBe("Shield");
  });

  test("returns Shield for no clear tank (default)", () => {
    const modules = [{ name: "5MN Microwarpdrive", offline: false }];
    expect(resolveTankType(modules)).toBe("Shield");
  });
});

describe("resolveRole", () => {
  test("returns Tackle for scram+web fit without MWD", () => {
    const modules = [
      { name: "Small Faint Scoped Warp Scrambler", offline: false },
      { name: "Stasis Webifier II", offline: false },
      { name: "1MN Monopropellant Enduring Afterburner", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Tackle");
  });

  test("returns Tackle for warp disruptor + web without MWD", () => {
    const modules = [
      { name: "Faint Epsilon Scoped Warp Disruptor", offline: false },
      { name: "Fleeting Compact Stasis Webifier", offline: false },
      { name: "1MN Afterburner II", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Tackle");
  });

  test("returns Kitetackle for tackle+MWD fit", () => {
    const modules = [
      { name: "Initiated Compact Warp Disruptor", offline: false },
      { name: "Stasis Webifier II", offline: false },
      { name: "5MN Y-T8 Compact Microwarpdrive", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Kitetackle");
  });

  test("returns Kitetackle for scram+web+MWD", () => {
    const modules = [
      { name: "Warp Scrambler II", offline: false },
      { name: "Stasis Webifier II", offline: false },
      { name: "5MN Y-T8 Compact Microwarpdrive", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Kitetackle");
  });

  test("returns Ewar for sensor damper", () => {
    const modules = [{ name: "Remote Sensor Dampener I", offline: false }];
    expect(resolveRole(modules, [])).toBe("Ewar");
  });

  test("returns Ewar for target painter", () => {
    const modules = [{ name: "Target Painter II", offline: false }];
    expect(resolveRole(modules, [])).toBe("Ewar");
  });

  test("returns Ewar for energy neutralizer", () => {
    const modules = [{ name: "Small Gremlin Compact Energy Neutralizer", offline: false }];
    expect(resolveRole(modules, [])).toBe("Ewar");
  });

  test("returns Ewar for nosferatu", () => {
    const modules = [{ name: "Small Ghoul Compact Energy Nosferatu", offline: false }];
    expect(resolveRole(modules, [])).toBe("Ewar");
  });

  test("returns Logi for remote shield repairer", () => {
    const modules = [{ name: "Large Remote Shield Repairer I", offline: false }];
    expect(resolveRole(modules, [])).toBe("Logi");
  });

  test("returns Support for command burst + damage modules", () => {
    const modules = [
      { name: "Armor Command Burst II", charge: "Rapid Repair Charge", offline: false },
      { name: "Heavy Pulse Laser II", charge: "Conflagration M", offline: false },
      { name: "5MN Microwarpdrive", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Support");
  });

  test("returns Commandship for pure command bursts without DPS", () => {
    const modules = [
      { name: "Armor Command Burst II", charge: "Rapid Repair Charge", offline: false },
      { name: "Shield Command Burst II", offline: false },
      { name: "1MN Afterburner II", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Commandship");
  });

  test("returns Scanner for probing fit", () => {
    const modules = [
      { name: "Core Probe Launcher I", offline: false },
      { name: "Data Analyzer I", offline: false },
      { name: "Relic Analyzer I", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Scanner");
  });

  test("returns Miner for mining laser fit", () => {
    const modules = [
      { name: "Modulated Strip Miner II", offline: false },
      { name: "1MN Afterburner II", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Miner");
  });

  test("returns empty string for plain DPS fit", () => {
    const modules = [
      { name: "Small Focused Pulse Laser II", charge: "S", offline: false },
      { name: "1MN Afterburner II", offline: false },
      { name: "Small Armor Repairer II", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("");
  });

  test("returns Hauler for hauler fit with no weapons", () => {
    const modules = [
      { name: "Expanded Cargohold II", offline: false },
      { name: "Expanded Cargohold II", offline: false },
      { name: "1MN Afterburner II", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("Hauler");
  });

  test("does not classify Hauler when weapons are present", () => {
    const modules = [
      { name: "Expanded Cargohold II", offline: false },
      { name: "Small Focused Pulse Laser II", charge: "S", offline: false },
    ];
    expect(resolveRole(modules, [])).toBe("");
  });
});

describe("summarizeFitting", () => {
  test("Pulse Armor for pulse fit with plates", () => {
    // Actual Abaddon pulse fit (from file): Mega Pulse + plates
    const text = `[Abaddon, Killmail 137867666]
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
100MN Y-S8 Compact Afterburner
Multispectrum Energized Membrane II
1600mm Steel Plates II
1600mm Steel Plates II
Large Trimark Armor Pump I
Large Trimark Armor Pump I
Large Trimark Armor Pump I
`;
    const result = summarizeFitting(text);
    expect(result).toBeDefined();
    expect(result!.weapon).toBe("Pulse");
    expect(result!.tank).toBe("Armor");
    expect(result!.role).toBe("");
    expect(result!.displayName).toBe("Pulse Armor Abaddon");
  });

  test("Support Pulse for command burst fit", () => {
    const text = `[Absolution, Killmail 137868681]
Heavy Pulse Laser II, Conflagration M
Armor Command Burst II, Armor Energizing Charge
Heavy Pulse Laser II, Conflagration M
`;
    const result = summarizeFitting(text);
    expect(result).toBeDefined();
    expect(result!.role).toBe("Support");
    expect(result!.weapon).toBe("Pulse");
    expect(result!.displayName).toContain("Support");
  });

  test("Kitetackle AC Shield for kite tackle fit", () => {
    const text = `[Algos, Killmail 137868163]
125mm Gatling AutoCannon I, Republic Fleet Phased Plasma S
5MN Quad LiF Restrained Microwarpdrive
Faint Scoped Warp Disruptor
`;
    const result = summarizeFitting(text);
    expect(result).toBeDefined();
    expect(result!.role).toBe("Kitetackle");
    expect(result!.weapon).toBe("AC");
    expect(result!.tank).toBe("Shield");
    expect(result!.displayName).toBe("Kitetackle AC Shield Algos");
  });

  test("Rail no-role for sniper rail fit", () => {
    const text = `[Adrestia, Killmail 56615140]
250mm Railgun II
250mm Railgun II
250mm Railgun II
250mm Railgun II
250mm Railgun II
50MN Y-T8 Compact Microwarpdrive
`;
    const result = summarizeFitting(text);
    expect(result).toBeDefined();
    expect(result!.weapon).toBe("Rail");
    expect(result!.role).toBe("");
    expect(result!.displayName).toBe("Rail Shield Adrestia");
  });

  test("Torp Shield for torpedo boat", () => {
    const text = `[Scorpion Navy Issue, Killmail 137852070]
Torpedo Launcher II, Mjolnir Rage Torpedo
Torpedo Launcher II, Mjolnir Rage Torpedo
500MN Quad LiF Restrained Microwarpdrive
Caldari Navy Large Shield Extender
`;
    const result = summarizeFitting(text);
    expect(result).toBeDefined();
    expect(result!.weapon).toBe("Torp");
    expect(result!.tank).toBe("Shield");
    expect(result!.displayName).toBe("Torp Shield Scorpion Navy Issue");
  });

  test("Scanner for scanning fit without combat weapons", () => {
    // No weapon modules - only probes and scanners
    const text = `[Probe, Killmail 137868009]
Salvager I
Core Probe Launcher I
Data Analyzer I
Relic Analyzer I
Scan Rangefinding Array I
`;
    const result = summarizeFitting(text);
    expect(result).toBeDefined();
    expect(result!.role).toBe("Scanner");
    expect(result!.displayName).toBe("Scanner Shield Probe");
  });

  test("returns Armor for Shield_Abaddon-type fit (EM Armor Hardener + Damage Control)", () => {
    // Regression test: Armor Hardener was wrongly excluded from tank counting
    const text = `[Abaddon, Killmail 999]
Large EMP Smartbomb I
Cap Recharger II
Damage Control II
EM Armor Hardener II
EM Armor Hardener II
EM Armor Hardener II
Large Trimark Armor Pump I
Large Trimark Armor Pump I
Large Trimark Armor Pump I
`;
    const result = summarizeFitting(text);
    expect(result).toBeDefined();
    expect(result!.tank).toBe("Armor");
    expect(result!.displayName).toBe("Armor Abaddon");
  });

  test("returns undefined for empty/unparseable text", () => {
    expect(summarizeFitting("")).toBeUndefined();
    expect(summarizeFitting("no header\n")).toBeUndefined();
  });
});