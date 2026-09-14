import { URL_PARAM, encodeBase64, USER_SETTINGS_VERSION, type UserSettings } from "../appstate";
import { StaticShipProfileCatalog } from "../gamedata/shipProfiles";
import { StaticPresetFitTexts } from "../gamedata/presets";
import type { ShipProfile } from "../ships";
import type { PresetFitting } from "../fitting";

export const SIMULATOR_BASE_URL = "https://gunner.ouraid.online";
export const DEFAULT_INITIAL_DISTANCE = 20000;

const GROUP_NAMES: Readonly<Record<string, string>> = {
  "25": "Frigate",
  "26": "Cruiser",
  "27": "Battleship",
  "28": "Hauler",
  "30": "Titan",
  "31": "Shuttle",
  "237": "Corvette",
  "324": "Assault Frigate",
  "358": "Heavy Assault Cruiser",
  "380": "Deep Space Transport",
  "419": "Combat Battlecruiser",
  "420": "Destroyer",
  "463": "Mining Barge",
  "485": "Dreadnought",
  "513": "Freighter",
  "540": "Command Ship",
  "541": "Interdictor",
  "543": "Exhumer",
  "547": "Carrier",
  "659": "Supercarrier",
  "830": "Covert Ops",
  "831": "Interceptor",
  "832": "Logistics",
  "833": "Force Recon Ship",
  "834": "Stealth Bomber",
  "883": "Capital Industrial Ship",
  "893": "Electronic Attack Ship",
  "894": "Heavy Interdiction Cruiser",
  "898": "Black Ops",
  "900": "Marauder",
  "902": "Jump Freighter",
  "906": "Combat Recon Ship",
  "941": "Industrial Command Ship",
  "963": "Strategic Cruiser",
  "1022": "Prototype Exploration Ship",
  "1201": "Attack Battlecruiser",
  "1202": "Blockade Runner",
  "1283": "Expedition Frigate",
  "1305": "Tactical Destroyer",
  "1527": "Logistics Frigate",
  "1534": "Command Destroyer",
  "1538": "Force Auxiliary",
  "1972": "Flag Cruiser",
  "4594": "Lancer Dreadnought",
  "4902": "Expedition Command Ship",
  "5087": "Special Edition Frigate",
  "5120": "Command Carrier",
  "legacy-standard-battleships": "Standard Battleship",
  "legacy-standard-cruisers": "Standard Cruiser",
  "legacy-standard-frigates": "Standard Frigate",
  "legacy-faction-heavy-drone": "Faction Heavy Drone",
  "legacy-electronic-attack-frigates": "Electronic Attack Frigate",
  "legacy-pirate-faction-cruisers": "Pirate Faction Cruiser",
  "legacy-recon-ships": "Recon Ship",
  "legacy-haulers": "Hauler",
};

const FACTION_NAMES: Readonly<Record<string, string>> = {
  amarr: "Amarr",
  "amarr-empire": "Amarr Empire",
  "angel-cartel": "Angel Cartel",
  "blood-raiders": "Blood Raiders",
  "caldari-state": "Caldari State",
  concord: "CONCORD",
  "deathless-circle": "Deathless Circle",
  edencom: "EDENCOM",
  "gallente-federation": "Gallente Federation",
  guristas: "Guristas Pirates",
  "intaki-syndicate": "Intaki Syndicate",
  interbus: "InterBus",
  "jovian-directorate": "Jovian Directorate",
  "minmatar-republic": "Minmatar Republic",
  "mordus-legion": "Mordu's Legion",
  "outer-ring-excavations": "ORE",
  "sanshas-nation": "Sansha's Nation",
  serpentis: "Serpentis",
  "sisters-of-eve": "Sisters of EVE",
  "society-of-conscious-thought": "Society of Conscious Thought",
  "triglavian-collective": "Triglavian Collective",
  upwell: "Upwell Consortium",
};

export function shipProfileCatalog(): StaticShipProfileCatalog {
  return new StaticShipProfileCatalog();
}

export function presetFitTexts(): StaticPresetFitTexts {
  return new StaticPresetFitTexts();
}

export function groupNameFor(hullTypeId: string): string {
  return GROUP_NAMES[hullTypeId] ?? "Spaceship";
}

export function factionNameFor(factionId: string): string {
  return FACTION_NAMES[factionId] ?? factionId;
}

export function slugify(name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length === 0) throw new Error(`Cannot slugify ship name "${name}"`);
  return slug;
}

export function matchupSlug(shipASlug: string, shipBSlug: string): string {
  const [first, second] = [shipASlug, shipBSlug].sort();
  return `${first}-vs-${second}`;
}

export function eftTextFor(hullName: string, fit: PresetFitting): string {
  return `[${hullName}, ${fit.name}]\n${fit.body}`;
}

export function firstPresetEft(page: ShipPageData, presets: StaticPresetFitTexts): string | undefined {
  const fit = page.presets[0];
  if (fit === undefined) return undefined;
  return eftTextFor(presets.hullNameFor(page.profile.id) ?? page.profile.name, fit);
}

export function simulatorDeepLink(settings: SimulatorLinkSettings): string {
  return `${SIMULATOR_BASE_URL}/?${URL_PARAM}=${encodeBase64(settings)}`;
}

// A URL payload carries simulation state only; the parser on load defaults the omitted fields
// (default ammo, language, sim speed, display units), so they are excluded here. Ship B's
// signature has no default and must be present for the wire to validate.
export type SimulatorLinkSettings = Omit<
  UserSettings,
  "shipAAmmo" | "shipBAmmo" | "language" | "simSpeed" | "shipATrackingUnit" | "shipBTrackingUnit" | "weaponRangeVisibility"
>;

export function shipWire(profile: ShipProfile, fittingText: string | undefined): SimulatorLinkSettings {
  return {
    shipASpeed: profile.baseSpeed,
    shipAMode: "keepAtRange",
    shipARange: 5000,
    shipAMass: profile.mass,
    shipAInertia: profile.inertiaModifier,
    shipATracking: 0,
    shipASigRes: "S",
    shipAOptimal: 0,
    shipAFalloff: 0,
    shipASig: profile.sigRadius,
    shipAHullId: profile.id,
    ...(fittingText === undefined ? {} : { shipAFitting: fittingText }),
    shipBSpeed: 1000,
    shipBMode: "orbit",
    shipBRange: 5000,
    shipBMass: 10000000,
    shipBInertia: 0.45,
    shipBSig: 40,
    shipBTracking: 0,
    shipBSigRes: "S",
    shipBOptimal: 0,
    shipBFalloff: 0,
    version: USER_SETTINGS_VERSION,
    initialDistance: DEFAULT_INITIAL_DISTANCE,
  };
}

export function matchupWire(shipAFittingText: string, shipBFittingText: string): SimulatorLinkSettings {
  return {
    shipASpeed: 0,
    shipAMode: "keepAtRange",
    shipARange: 5000,
    shipAMass: 0,
    shipAInertia: 0,
    shipATracking: 0,
    shipASigRes: "S",
    shipAOptimal: 0,
    shipAFalloff: 0,
    shipAFitting: shipAFittingText,
    shipBSpeed: 0,
    shipBMode: "orbit",
    shipBRange: 5000,
    shipBMass: 0,
    shipBInertia: 0,
    shipBSig: 40,
    shipBTracking: 0,
    shipBSigRes: "S",
    shipBOptimal: 0,
    shipBFalloff: 0,
    shipBFitting: shipBFittingText,
    version: USER_SETTINGS_VERSION,
    initialDistance: DEFAULT_INITIAL_DISTANCE,
  };
}

export interface ShipStatRow {
  readonly label: string;
  readonly value: string;
}

export function shipStatRows(profile: ShipProfile): readonly ShipStatRow[] {
  return [
    { label: "Hull class", value: groupNameFor(profile.hullTypeId) },
    { label: "Faction", value: factionNameFor(profile.factionId) },
    { label: "Mass", value: `${formatNumber(profile.mass)} kg` },
    { label: "Inertia modifier", value: String(profile.inertiaModifier) },
    { label: "Max velocity", value: `${formatNumber(profile.baseSpeed)} m/s` },
    { label: "Signature radius", value: `${formatNumber(profile.sigRadius)} m` },
    { label: "Scan resolution", value: `${formatNumber(profile.scanResolution)} mm` },
    { label: "Max targeting range", value: `${formatNumber(profile.maxTargetingRange / 1000)} km` },
    { label: "Max locked targets", value: String(profile.maxLockedTargets) },
    { label: "Drone bandwidth", value: `${formatNumber(profile.droneBandwidth)} Mbit/s` },
    { label: "Drone capacity", value: `${formatNumber(profile.droneCapacity)} m³` },
    { label: "Shield HP", value: formatNumber(profile.shieldHp) },
    { label: "Shield recharge time", value: `${formatNumber(profile.shieldRechargeTime)} s` },
    { label: "Armor HP", value: formatNumber(profile.armorHp) },
    { label: "Hull HP", value: formatNumber(profile.hullHp) },
    { label: "Capacitor capacity", value: `${formatNumber(profile.capacitorCapacity)} GJ` },
    { label: "Capacitor recharge time", value: `${formatNumber(profile.capacitorRechargeTime)} s` },
    { label: "Shield resists (EM / Therm / Kin / Exp)", value: resistsText(profile.shieldResists) },
    { label: "Armor resists (EM / Therm / Kin / Exp)", value: resistsText(profile.armorResists) },
    { label: "Hull resists (EM / Therm / Kin / Exp)", value: resistsText(profile.hullResists) },
  ];
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function resistsText(resists: Readonly<Record<string, number>>): string {
  return [resists.em, resists.thermal, resists.kinetic, resists.explosive].map((r) => `${Math.round(r * 100)}%`).join(" / ");
}

export interface ShipPageData {
  readonly profile: ShipProfile;
  readonly slug: string;
  readonly presets: readonly PresetFitting[];
}

export function buildShipPages(catalog: StaticShipProfileCatalog, presets: StaticPresetFitTexts): readonly ShipPageData[] {
  const presetIds = new Set(presets.listHulls().map((hull) => hull.id));
  const slugs = new Set<string>();
  return catalog.all().map((profile) => {
    const slug = slugify(profile.name);
    if (slugs.has(slug)) throw new Error(`Duplicate ship slug "${slug}" for "${profile.name}"`);
    slugs.add(slug);
    return {
      profile,
      slug,
      presets: presetIds.has(profile.id) ? presets.fittingsFor(profile.id) : [],
    };
  });
}

export interface MatchupPageData {
  readonly shipA: ShipPageData;
  readonly shipB: ShipPageData;
  readonly slug: string;
}

export function buildMatchupPages(shipPages: readonly ShipPageData[]): readonly MatchupPageData[] {
  const byGroup = new Map<string, ShipPageData[]>();
  for (const page of shipPages) {
    if (page.presets.length === 0) continue;
    const list = byGroup.get(page.profile.hullTypeId) ?? [];
    list.push(page);
    byGroup.set(page.profile.hullTypeId, list);
  }
  const matchups: MatchupPageData[] = [];
  for (const list of byGroup.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        matchups.push({ shipA: list[i], shipB: list[j], slug: matchupSlug(list[i].slug, list[j].slug) });
      }
    }
  }
  return matchups;
}
