// Generated from EVE fitting analysis heuristics (2026-08-20). Do not edit by hand.

import { moduleLines, parseEft } from "../src/fitting/eft";
import type { EftDocument, EftModule, QuantityItem } from "../src/fitting/eft";

export interface FittingSummary {
  readonly role: string;
  readonly weapon: string;
  readonly tank: string;
  readonly shipName: string;
  readonly displayName: string;
}

const WEAPON_PATTERNS: { readonly pattern: RegExp; readonly label: string }[] = [
  { pattern: /Blaster|Particle Accelerator/, label: "Blaster" },
  { pattern: /Rail(?:gun)?/, label: "Rail" },
  { pattern: /AutoCannon|Machine Gun|Repeating Cannon/, label: "AC" },
  { pattern: /Artillery/, label: "Art" },
  { pattern: /Howitzer/, label: "Art" },
  { pattern: /Light Missile Launcher/, label: "Missile" },
  { pattern: /Heavy Missile Launcher/, label: "Missile" },
  { pattern: /Cruise Missile Launcher/, label: "Missile" },
  { pattern: /Missile Launcher/, label: "Missile" },
  { pattern: /Rocket Launcher/, label: "Rocket" },
  { pattern: /Torpedo Launcher/, label: "Torp" },
];

const NON_TANK_MODULE = /Afterburner|Microwarpdrive|Heat Sink|Gyrostabilizer|Magnetic Field Stabilizer|Drone Damage Amplifier|Probe Launcher|Relic Analyzer|Data Analyzer|Cargo Scanner|Ship Scanner|Salvager|Capacitor Relay|Capacitor Power|Mining Foreman Burst|Shield Command Burst|Information Command Burst|Skirmish Command Burst|Energized Adaptive Nano|Multispectrum Energized|Drone Link|Drone Navigation|Drone Sizer|Civilian|Tracking Computer|Tracking Enhancer|Nominal|Inertial Stabilizers|Nanofiber Internal|Overdrive Injector|Reinforced Bulkheads|Armor Plating|Trimark Armor Pump|Auxiliary Thrusters|Low Friction Nozzle|Hyperspatial Velocity|Warp Core Optimizer|Energy\b/i;

const NON_TANK_BODY = /Laser|Blaster|Rail(?:gun)?|Cannon|Launcher|Artillery|Howitzer|Torpedo|Rocket|Missile|Tracking Computer/;

export function summarizeFitting(text: string): FittingSummary | undefined {
  const parsed = parseEft(text);
  if (!parsed) return undefined;

  const modules = moduleLines(parsed).filter((m) => !m.offline);
  if (modules.length === 0) return undefined;

  const tankType = _resolveTankType(modules);
  const role = _resolveRole(modules, parsed.drones);
  const weapon = _resolveWeapon(modules, parsed.drones);
  const shipName = parsed.hullName;

  const parts = [role, weapon, tankType, shipName].filter((s) => s.length > 0);

  return {
    role,
    weapon,
    tank: tankType,
    shipName,
    displayName: parts.join(" "),
  };
}

export function summarizeFittingText(text: string): string {
  const summary = summarizeFitting(text);
  if (!summary) return "Unknown Ship";
  return summary.displayName;
}

export function renameFittingText(text: string): string | undefined {
  const summary = summarizeFitting(text);
  if (!summary) return undefined;

  const parsed = parseEft(text);
  if (!parsed) return undefined;

  const rest = text.replace(/^\[[^\]]*\]\r?\n?/, "").trimStart();
  return `[${parsed.hullName}, ${summary.displayName}]\n${rest}`;
}

// --- Weapon detection ---

function _resolveWeapon(modules: readonly EftModule[], drones: readonly QuantityItem[]): string {
  for (const module of modules) {
    // Skip probe/scanner equipment before weapon detection
    if (/Probe Launcher|Relic Analyzer|Data Analyzer|Salvager/i.test(module.name)) continue;
    if (/Drone\s+Navigation|Drone\s+Damage|Drone\s+Sizer/i.test(module.name)) continue;

    for (const { pattern, label } of WEAPON_PATTERNS) {
      if (pattern.test(module.name)) return label;
    }

    // Pulse/Beam lasers
    if (module.name.includes("Pulse Laser")) return "Pulse";
    if (module.name.includes("Beam Laser")) return "Beam";

    // Fighters
    if (module.name.includes("Fighter") && !module.name.includes("Fighter Support")) return "Fighter";
    if (module.name.includes("Drone Link") || module.name.includes("Drone Bay")) return "Drone";
  }

  // Check drones
  if (drones.length > 0) {
    for (const drone of drones) {
      if (/Mining\s+Drone/.test(drone.name)) continue;
      if (/(Fighter|Infiltrator|Pioneer|Ranger)/i.test(drone.name)) return "Fighter";
      if (/\b(Acolyte|Warrior|Hobgoblin|Hornet|Valkyrie|Infiltrator|Vespa|Hammerhead|Warden|Bouncer|Garde|Curator|Wasp|Praetor|Berserker|Ogre|Gecko)\b/.test(drone.name)) {
        return "Drone";
      }
    }
  }

  return "";
}

// --- Tank type detection ---

function _resolveTankType(modules: readonly EftModule[]): string {
  let armorCount = 0;
  let shieldCount = 0;

  for (const module of modules) {
    if (isNonTankModule(module.name)) continue;
    if (isArmorPlate(module.name)) { armorCount++; continue; }
    if (isArmorRepair(module.name)) { armorCount++; continue; }
    if (isShieldModule(module.name)) { shieldCount++; continue; }
  }

  if (armorCount >= shieldCount && armorCount > 0) return "Armor";
  if (shieldCount > 0) return "Shield";
  return "Shield"; // default
}

function isNonTankModule(name: string): boolean {
  // Name-based filter (most specific items first)
  if (NON_TANK_MODULE.test(name)) return true;
  // Generic weapon module body patterns
  if (NON_TANK_BODY.test(name)) return true;
  return false;
}

function isArmorPlate(name: string): boolean {
  // Named plate variants
  if (/\b(1600mm|800mm|400mm|200mm|100mm)\s+(Rolled Tungsten|Crystalline Carbonide|Steel)\s+Plates?\b/.test(name)) return true;
  // Generic Plate (not Shield Plate/Extender/Hardener)
  if (/\bPlate(s)?\b/.test(name) && !/\bShield/.test(name) && !/\bHardener/.test(name)) return true;
  // Armor Plating
  if (/Armor\s+Plating/i.test(name)) return true;
  return false;
}

function isArmorRepair(name: string): boolean {
  return /Armor\s+Repairer|Remote\s+Armor\s+Repairer|Ancillary\s+Armor\s+Repairer|\b\w+\s+Armor\s+Hardener\b|Armor\s+Reinforcer/.test(name);
}

function isShieldModule(name: string): boolean {
  return (
    /Shield\s+Booster|Ancillary\s+Shield\s+Booster|Remote\s+Shield\s+Repairer|Shield\s+Extender|Shield\s+Hardener|Shield\s+Amplifier|Shield\s+Energizer/.test(
      name,
    )
  );
}

// --- Role detection ---

const ROLE_TACKLE: readonly string[] = ["Warp Scrambler", "Warp Disruptor", "Stasis Webifier", "Stasis Grappler", "Interdiction Nullifier"];
const ROLE_EWAR: readonly string[] = [
  "Sensor Dampener",
  "Tracking Disruptor",
  "Target Painter",
  "Energy Neutralizer",
  "Energy Nosferatu",
];

function _resolveRole(modules: readonly EftModule[], drones: readonly QuantityItem[]): string {
  const moduleNames = modules.map((m) => m.name);

  // Tackle
  const hasTackle = moduleNames.some((n) => ROLE_TACKLE.some((p) => n.includes(p)));
  if (hasTackle) {
    const forMWD = moduleNames.some((n) => /Microwarpdrive/.test(n));
    return forMWD ? "Kitetackle" : "Tackle";
  }

  // Ewar
  const hasEwar = moduleNames.some((n) => ROLE_EWAR.some((p) => n.includes(p)));
  if (hasEwar) return "Ewar";

  // Command Burst + DPS = Support, sans DPS = Commandship
  const hasCommandBurst = moduleNames.some((n) => /Command Burst/.test(n));
  if (hasCommandBurst) {
    const hasDamage = moduleNames.some((n) =>
      /Laser|Blaster|Rail|Cannon|Launcher|Missile|Torpedo/.test(n),
    );
    return hasDamage ? "Support" : "Commandship";
  }

  // Logistics
  const hasLogi = moduleNames.some((n) =>
    /Remote Shield Repairer|Remote Armor Repairer|Remote Hull Repairer/.test(n),
  );
  if (hasLogi) return "Logi";

  // Miner / Scanner
  const nMinerLaser = moduleNames.filter((n) =>
    /Mining\s+Laser|Strip\s+Miner|Modulated\s+Strip\s+Miner/.test(n),
  ).length;
  const hasScanner = moduleNames.some((n) =>
    /Core\s+Probe\s+Launcher|Expanded\s+Probe\s+Launcher|Relic\s+Analyzer|Data\s+Analyzer/.test(n),
  );
  const hasWeapon = moduleNames.some((n) =>
    /(Auto)?Cannon|Howitzer|Artillery|Blaster|Rail(?:gun)?|Laser|Missile\s+Launcher|Torpedo\s+Launcher|Rocket\s+Launcher/.test(n),
  );

  if (hasScanner && nMinerLaser === 0 && !hasWeapon) return "Scanner";
  if (nMinerLaser > 0) return "Miner";

  // Hauler: cargohold modules, no weapons
  const hasHaulerGear = moduleNames.some((n) => /Expanded\s+Cargohold/.test(n)) && !hasWeapon;
  if (hasHaulerGear && nMinerLaser === 0) return "Hauler";

  // Drone DPS: no weapon launchers, has combat drones
  if (drones.length > 0 && !moduleNames.some((n) => /Launcher/.test(n))) {
    if (drones.some((d) =>
      /\b(Acolyte|Warrior|Hobgoblin|Hornet|Valkyrie|Infiltrator|Vespa|Hammerhead|Warden|Bouncer|Garde|Curator|Wasp|Praetor|Berserker|Ogre|Gecko)\b/.test(d.name),
    )) {
      return "Drone";
    }
  }

  return "";
}

// Visible for unit testing of internal resolvers
export { _resolveWeapon as resolveWeapon, _resolveTankType as resolveTankType, _resolveRole as resolveRole };
