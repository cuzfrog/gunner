import { homedir } from "node:os";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ShipId, TypeId } from "../src/gamedata/ids";
import { SHIP_PROFILES } from "../src/gamedata/shipProfiles/profiles";
import type { ShipNameLanguage } from "../src/ships";
import type { DamageResists } from "../src/sim";

const SDE_DIR = process.argv[2] ?? join(homedir(), "workspace", "Pyfa", "staticdata", "fsd_built");
const OUT_FILE = join(import.meta.dir, "..", "src", "gamedata", "fittingDb", "fittingDb.ts");
const I18N_EN_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-names-en.ts");
const I18N_ZH_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-names-zh.ts");
const I18N_JA_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-names-ja.ts");
const COLLISION_EN_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-name-collisions-en.ts");
const COLLISION_ZH_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-name-collisions-zh.ts");
const COLLISION_JA_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-name-collisions-ja.ts");

const MODULE_CATEGORY_ID = 7;
const CHARGE_CATEGORY_ID = 8;
const DRONE_CATEGORY_ID = 18;
const SUBSYSTEM_CATEGORY_ID = 32;
const STRUCTURE_MODULE_CATEGORY_ID = 66;
const FIGHTER_CATEGORY_ID = 87;
const FUEL_CATEGORY_ID = 4;
const DEPLOYABLE_CATEGORY_ID = 22;
const IN_SCOPE_CATEGORY_IDS = new Set([
  MODULE_CATEGORY_ID, CHARGE_CATEGORY_ID, DRONE_CATEGORY_ID, SUBSYSTEM_CATEGORY_ID,
  STRUCTURE_MODULE_CATEGORY_ID, FIGHTER_CATEGORY_ID, FUEL_CATEGORY_ID, DEPLOYABLE_CATEGORY_ID,
]);

interface SdeType {
  typeID: number;
  "typeName_en-us": string;
  typeName_zh?: string;
  typeName_ja?: string;
  groupID: number;
  published: number;
  metaLevel?: number;
  metaGroupID?: number;
  volume?: number;
}

type LocalizedName = { readonly en: string; readonly zh?: string; readonly ja?: string };

type Row<T> = T & { readonly id: TypeId; readonly name: string };

interface DroneEntry {
  readonly id: TypeId;
  readonly name: string;
}

interface SdeDogmaAttribute {
  attributeID: number;
  name: string;
}

interface SdeDogmaEffectModifier {
  readonly domain: string;
  readonly func: string;
  readonly modifiedAttributeID: number;
  readonly modifyingAttributeID: number;
  readonly operation: number;
  readonly skillTypeID?: number;
}

interface SdeDogmaEffect {
  effectID: number;
  effectName?: string;
  modifierInfo?: readonly SdeDogmaEffectModifier[];
}

interface SdeGroup {
  groupID: number;
  categoryID: number;
}

interface SdeTypeDogma {
  dogmaAttributes: readonly { attributeID: number; value: number }[];
  dogmaEffects: readonly SdeDogmaEffect[];
}

type BonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "maxVelocity" | "agility" | "missileDamage" | "missileRoF" | "turretDamage" | "turretRoF" | "droneDamage" | "armorResist" | "shieldResist" | "shieldHpPercent" | "armorHpPercent" | "hullHpPercent" | "plateHpPercent" | "extenderHpPercent";

// Extended attribute categories for data-driven skill bonuses (Phase 3) and
// data-driven hull bonuses (Phase 2). Phase 1 declares these so COMBAT_ATTRIBUTE_MAP
// can reference them; they are not yet emitted in the generated HullBonusAttribute type.
type SkillBonusAttribute = "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity";

interface HullBonusRule {
  readonly attribute: BonusAttribute;
  readonly bonusAttr?: string;
  readonly bonusAttrFallback?: string;
  readonly constant?: number;
  readonly skill?: string;
  readonly turretSkill?: string;
  readonly launcherGroup?: number;
}

interface HullBonus {
  readonly attribute: BonusAttribute;
  readonly magnitude: number;
  readonly skill?: string;
  readonly turretSkill?: string;
  readonly launcherGroup?: number;
}

// Copied from pyfa (eos/effects.py) effect handlers: maps ship dogma effectIDs to the attributes they boost.
// Only effects carried by published ships are listed. magnitude is a percent, scaled by the skill level at runtime
// when `skill` is set; `turretSkill` restricts turret bonuses to turrets requiring that skill.
const BONUS_EFFECTS: Readonly<Record<number, readonly HullBonusRule[]>> = {
  521: [{ attribute: "turretOptimal", bonusAttr: "shipBonusCC", skill: "Caldari Cruiser", turretSkill: "Medium Hybrid Turret" }],
  527: [{ attribute: "maxVelocity", bonusAttr: "shipBonusMI", skill: "Minmatar Hauler" }],
  553: [{ attribute: "turretTracking", bonusAttr: "shipBonusGB", skill: "Gallente Battleship", turretSkill: "Large Hybrid Turret" }],
  729: [{ attribute: "maxVelocity", bonusAttr: "shipBonusGI", bonusAttrFallback: "shipBonusGI2", skill: "Gallente Hauler" }],
  730: [{ attribute: "maxVelocity", bonusAttr: "shipBonusCI", skill: "Caldari Hauler" }],
  732: [{ attribute: "maxVelocity", bonusAttr: "shipBonusAI", skill: "Amarr Hauler" }],
  882: [{ attribute: "turretOptimal", bonusAttr: "shipBonusCF2", skill: "Caldari Frigate", turretSkill: "Small Hybrid Turret" }],
  919: [{ attribute: "turretTracking", bonusAttr: "shipBonusGC2", skill: "Gallente Cruiser", turretSkill: "Medium Hybrid Turret" }],
  989: [{ attribute: "turretOptimal", bonusAttr: "eliteBonusGunship1", skill: "Assault Frigates", turretSkill: "Small Hybrid Turret" }],
  991: [{ attribute: "turretOptimal", bonusAttr: "eliteBonusGunship1", skill: "Assault Frigates", turretSkill: "Small Energy Turret" }],
  996: [{ attribute: "turretTracking", bonusAttr: "eliteBonusGunship2", skill: "Assault Frigates", turretSkill: "Small Hybrid Turret" }],
  998: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusGunship2", skill: "Assault Frigates", turretSkill: "Small Projectile Turret" }],
  1058: [{ attribute: "turretOptimal", bonusAttr: "eliteBonusHeavyGunship1", skill: "Heavy Assault Cruisers", turretSkill: "Medium Energy Turret" }],
  1060: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusHeavyGunship1", skill: "Heavy Assault Cruisers", turretSkill: "Medium Projectile Turret" }],
  1080: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusHeavyGunship1", skill: "Heavy Assault Cruisers", turretSkill: "Medium Hybrid Turret" }],
  1099: [{ attribute: "turretTracking", bonusAttr: "shipBonusMF2", skill: "Minmatar Frigate", turretSkill: "Small Projectile Turret" }],
  1228: [{ attribute: "turretTracking", bonusAttr: "shipBonusGF", skill: "Gallente Frigate", turretSkill: "Small Projectile Turret" }],
  1264: [{ attribute: "turretTracking", bonusAttr: "eliteBonusInterceptor2", skill: "Interceptors", turretSkill: "Small Hybrid Turret" }],
  1268: [{ attribute: "turretTracking", bonusAttr: "eliteBonusInterceptor2", skill: "Interceptors", turretSkill: "Small Energy Turret" }],
  1412: [{ attribute: "turretOptimal", bonusAttr: "shipBonusCB", skill: "Caldari Battleship", turretSkill: "Large Hybrid Turret" }],
  1615: [{ attribute: "agility", constant: -5, skill: "Advanced Spaceship Command" }],
  1672: [{ attribute: "maxVelocity", bonusAttr: "freighterBonusA1", skill: "Amarr Freighter" }],
  1673: [{ attribute: "maxVelocity", bonusAttr: "freighterBonusC1", skill: "Caldari Freighter" }],
  1674: [{ attribute: "maxVelocity", bonusAttr: "freighterBonusG1", skill: "Gallente Freighter" }],
  1675: [{ attribute: "maxVelocity", bonusAttr: "freighterBonusM1", skill: "Minmatar Freighter" }],
  1773: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGF2", skill: "Gallente Frigate", turretSkill: "Small Hybrid Turret" }],
  2130: [{ attribute: "turretOptimal", bonusAttr: "maxRangeBonus", turretSkill: "Small Hybrid Turret" }],
  2131: [{ attribute: "turretOptimal", bonusAttr: "maxRangeBonus", turretSkill: "Small Energy Turret" }],
  2132: [{ attribute: "turretOptimal", bonusAttr: "maxRangeBonus", turretSkill: "Small Projectile Turret" }],
  2156: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusCommandShips2", skill: "Command Ships", turretSkill: "Medium Projectile Turret" }],
  2160: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusCommandShips2", skill: "Command Ships", turretSkill: "Medium Hybrid Turret" }],
  2201: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusInterdictors1", skill: "Interdictors", turretSkill: "Small Projectile Turret" }],
  2503: [{ attribute: "turretTracking", bonusAttr: "shipBonusGB2", skill: "Gallente Battleship", turretSkill: "Large Hybrid Turret" }],
  2504: [{ attribute: "turretTracking", bonusAttr: "shipBonusGF2", skill: "Gallente Frigate", turretSkill: "Small Hybrid Turret" }],
  3343: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusHeavyInterdictors1", skill: "Heavy Interdiction Cruisers", turretSkill: "Medium Projectile Turret" }],
  3392: [{ attribute: "turretTracking", bonusAttr: "eliteBonusBlackOps1", skill: "Black Ops", turretSkill: "Large Energy Turret" }],
  3424: [{ attribute: "turretTracking", bonusAttr: "eliteBonusViolators1", skill: "Marauders", turretSkill: "Large Hybrid Turret" }],
  3425: [{ attribute: "turretTracking", bonusAttr: "eliteBonusViolators1", skill: "Marauders", turretSkill: "Large Projectile Turret" }],
  3447: [{ attribute: "turretFalloff", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", turretSkill: "Large Projectile Turret" }],
  3480: [{ attribute: "turretTracking", bonusAttr: "shipBonusAB2", skill: "Amarr Battleship", turretSkill: "Large Energy Turret" }],
  3484: [{ attribute: "turretTracking", bonusAttr: "shipBonusAC2", skill: "Amarr Cruiser", turretSkill: "Medium Energy Turret" }],
  3489: [{ attribute: "turretTracking", bonusAttr: "shipBonus2AF", skill: "Amarr Frigate", turretSkill: "Small Energy Turret" }],
  3677: [{ attribute: "turretOptimal", bonusAttr: "shipBonusAB2", skill: "Amarr Battleship", turretSkill: "Large Energy Turret" }],
  3680: [{ attribute: "agility", bonusAttr: "freighterBonusC1", skill: "Caldari Freighter" }],
  3681: [{ attribute: "agility", bonusAttr: "freighterBonusM1", skill: "Minmatar Freighter" }],
  3682: [{ attribute: "agility", bonusAttr: "freighterBonusG1", skill: "Gallente Freighter" }],
  3683: [{ attribute: "agility", bonusAttr: "freighterBonusA1", skill: "Amarr Freighter" }],
  3706: [{ attribute: "turretTracking", bonusAttr: "shipBonusMC2", skill: "Minmatar Cruiser", turretSkill: "Medium Projectile Turret" }],
  4473: [{ attribute: "maxVelocity", bonusAttr: "shipBonusATC1" }],
  4474: [{ attribute: "turretOptimal", bonusAttr: "shipBonusATC2", turretSkill: "Medium Projectile Turret" }],
  4475: [{ attribute: "turretFalloff", bonusAttr: "shipBonusATC2", turretSkill: "Medium Projectile Turret" }],
  4476: [{ attribute: "turretFalloff", bonusAttr: "shipBonusATF2", turretSkill: "Small Projectile Turret" }],
  4477: [{ attribute: "turretOptimal", bonusAttr: "shipBonusATF2", turretSkill: "Small Projectile Turret" }],
  4482: [{ attribute: "turretOptimal", bonusAttr: "shipBonus2AF", skill: "Amarr Frigate", turretSkill: "Small Energy Turret" }],
  4484: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGB", skill: "Gallente Battleship", turretSkill: "Large Projectile Turret" }],
  4512: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGC", skill: "Gallente Cruiser", turretSkill: "Medium Projectile Turret" }],
  4515: [{ attribute: "turretFalloff", bonusAttr: "shipBonusMF", skill: "Minmatar Frigate", turretSkill: "Small Projectile Turret" }],
  4516: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGC", skill: "Gallente Cruiser", turretSkill: "Medium Hybrid Turret" }],
  4622: [{ attribute: "turretOptimal", bonusAttr: "shipBonusATF2", turretSkill: "Small Hybrid Turret" }],
  4623: [{ attribute: "turretTracking", bonusAttr: "shipBonusATF2", turretSkill: "Small Hybrid Turret" }],
  4624: [{ attribute: "turretTracking", bonusAttr: "shipBonusATC2", turretSkill: "Medium Hybrid Turret" }],
  4625: [{ attribute: "turretFalloff", bonusAttr: "shipBonusATC2", turretSkill: "Medium Hybrid Turret" }],
  4782: [{ attribute: "turretOptimal", bonusAttr: "shipBonusATF2", turretSkill: "Small Energy Turret" }],
  4999: [{ attribute: "turretOptimal", bonusAttr: "rookieSHTOptimalBonus", turretSkill: "Small Hybrid Turret" }],
  5018: [{ attribute: "maxVelocity", bonusAttr: "rookieShipVelocityBonus" }],
  5132: [{ attribute: "turretFalloff", bonusAttr: "shipBonusMC2", skill: "Minmatar Cruiser", turretSkill: "Medium Projectile Turret" }],
  5205: [{ attribute: "turretTracking", bonusAttr: "rookieSETTracking", turretSkill: "Small Energy Turret" }],
  5206: [{ attribute: "turretOptimal", bonusAttr: "rookieSETOptimal", turretSkill: "Small Energy Turret" }],
  5215: [{ attribute: "turretTracking", bonusAttr: "rookieSHTTracking", turretSkill: "Small Hybrid Turret" }],
  5216: [{ attribute: "turretFalloff", bonusAttr: "rookieSHTFalloff", turretSkill: "Small Hybrid Turret" }],
  5217: [{ attribute: "turretTracking", bonusAttr: "rookieSPTTracking", turretSkill: "Small Projectile Turret" }],
  5218: [{ attribute: "turretFalloff", bonusAttr: "rookieSPTFalloff", turretSkill: "Small Projectile Turret" }],
  5219: [{ attribute: "turretOptimal", bonusAttr: "rookieSPTOptimal", turretSkill: "Small Projectile Turret" }],
  5294: [{ attribute: "turretTracking", bonusAttr: "shipBonusAD2", skill: "Amarr Destroyer", turretSkill: "Small Energy Turret" }],
  5303: [{ attribute: "turretOptimal", bonusAttr: "shipBonusCD1", skill: "Caldari Destroyer", turretSkill: "Small Hybrid Turret" }],
  5304: [{ attribute: "turretTracking", bonusAttr: "shipBonusCD2", skill: "Caldari Destroyer", turretSkill: "Small Hybrid Turret" }],
  5309: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGD1", skill: "Gallente Destroyer", turretSkill: "Small Hybrid Turret" }],
  5310: [{ attribute: "turretTracking", bonusAttr: "shipBonusGD2", skill: "Gallente Destroyer", turretSkill: "Small Hybrid Turret" }],
  5318: [{ attribute: "turretTracking", bonusAttr: "shipBonusMD2", skill: "Minmatar Destroyer", turretSkill: "Small Projectile Turret" }],
  5334: [{ attribute: "turretOptimal", bonusAttr: "shipBonusCBC1", skill: "Caldari Battlecruiser", turretSkill: "Medium Hybrid Turret" }],
  5356: [{ attribute: "turretOptimal", bonusAttr: "shipBonusCBC1", skill: "Caldari Battlecruiser", turretSkill: "Large Hybrid Turret" }],
  5358: [{ attribute: "turretTracking", bonusAttr: "shipBonusGBC1", skill: "Gallente Battlecruiser", turretSkill: "Large Hybrid Turret" }],
  5361: [{ attribute: "turretFalloff", bonusAttr: "shipBonusMBC2", skill: "Minmatar Battlecruiser", turretSkill: "Large Projectile Turret" }],
  5380: [{ attribute: "turretTracking", bonusAttr: "shipBonusGBC2", skill: "Gallente Battlecruiser", turretSkill: "Medium Hybrid Turret" }],
  5381: [{ attribute: "turretTracking", bonusAttr: "shipBonusABC1", skill: "Amarr Battlecruiser", turretSkill: "Medium Energy Turret" }],
  5382: [{ attribute: "turretOptimal", bonusAttr: "shipBonusAC2", skill: "Amarr Cruiser", turretSkill: "Medium Energy Turret" }],
  5468: [{ attribute: "agility", bonusAttr: "shipBonusCI2" }],
  5469: [{ attribute: "agility", bonusAttr: "shipBonusMI2", skill: "Minmatar Hauler" }],
  5470: [{ attribute: "agility", bonusAttr: "shipBonusGI2", skill: "Gallente Hauler" }],
  5471: [{ attribute: "agility", bonusAttr: "shipBonusAI2", skill: "Amarr Hauler" }],
  5485: [{ attribute: "turretOptimal", bonusAttr: "shipBonusMF", skill: "Minmatar Frigate", turretSkill: "Small Projectile Turret" }],
  5610: [{ attribute: "turretOptimal", bonusAttr: "shipBonusAB", skill: "Amarr Battleship", turretSkill: "Large Energy Turret" }],
  5611: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGB2", skill: "Gallente Battleship", turretSkill: "Large Hybrid Turret" }],
  5721: [{ attribute: "turretOptimal", bonusAttr: "shipBonusRole7", turretSkill: "Medium Energy Turret" }],
  5724: [{ attribute: "turretOptimal", bonusAttr: "shipBonusGF", skill: "Gallente Frigate", turretSkill: "Small Hybrid Turret" }],
  5726: [{ attribute: "turretOptimal", bonusAttr: "shipBonusRole7", turretSkill: "Large Energy Turret" }],
  5779: [{ attribute: "turretFalloff", bonusAttr: "shipBonusMF2", skill: "Minmatar Frigate", turretSkill: "Small Projectile Turret" }],
  5957: [{ attribute: "turretOptimal", bonusAttr: "eliteBonusHeavyInterdictors1", skill: "Heavy Interdiction Cruisers", turretSkill: "Medium Energy Turret" }],
  5958: [{ attribute: "turretTracking", bonusAttr: "shipBonusGC", skill: "Gallente Cruiser", turretSkill: "Medium Hybrid Turret" }],
  5959: [{ attribute: "turretOptimal", bonusAttr: "eliteBonusHeavyInterdictors1", skill: "Heavy Interdiction Cruisers", turretSkill: "Medium Hybrid Turret" }],
  5998: [{ attribute: "agility", bonusAttr: "freighterBonusO2", skill: "ORE Freighter" }],
  6025: [{ attribute: "turretOptimal", bonusAttr: "eliteBonusReconShip1", skill: "Recon Ships", turretSkill: "Medium Hybrid Turret" }],
  6038: [{ attribute: "turretOptimal", bonusAttr: "shipBonusTacticalDestroyerMinmatar2", skill: "Minmatar Tactical Destroyer", turretSkill: "Small Projectile Turret" }],
  6150: [{ attribute: "turretTracking", bonusAttr: "shipBonusTacticalDestroyerGallente2", skill: "Gallente Tactical Destroyer", turretSkill: "Small Hybrid Turret" }],
  6172: [{ attribute: "turretFalloff", bonusAttr: "roleBonusCBC", turretSkill: "Medium Energy Turret" }, { attribute: "turretOptimal", bonusAttr: "roleBonusCBC", turretSkill: "Medium Energy Turret" }],
  6173: [{ attribute: "turretFalloff", bonusAttr: "roleBonusCBC", turretSkill: "Medium Hybrid Turret" }, { attribute: "turretOptimal", bonusAttr: "roleBonusCBC", turretSkill: "Medium Hybrid Turret" }],
  6174: [{ attribute: "turretFalloff", bonusAttr: "roleBonusCBC", turretSkill: "Medium Projectile Turret" }, { attribute: "turretOptimal", bonusAttr: "roleBonusCBC", turretSkill: "Medium Projectile Turret" }],
  6178: [{ attribute: "turretTracking", bonusAttr: "shipBonusMBC2", skill: "Minmatar Battlecruiser", turretSkill: "Medium Projectile Turret" }],
  6725: [{ attribute: "turretFalloff", bonusAttr: "shipBonus2AF", skill: "Amarr Frigate", turretSkill: "Small Energy Turret" }],
  7000: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGF", skill: "Gallente Frigate", turretSkill: "Small Hybrid Turret" }],
  7044: [{ attribute: "agility", bonusAttr: "shipBonusGC", skill: "Gallente Cruiser" }],
  8129: [{ attribute: "maxVelocity", bonusAttr: "shipBonusGF", skill: "Gallente Frigate" }],
  8133: [{ attribute: "maxVelocity", bonusAttr: "shipBonusMF", skill: "Minmatar Frigate" }],
  8155: [{ attribute: "turretTracking", bonusAttr: "eliteBonusBlackOps1", skill: "Black Ops", turretSkill: "Large Projectile Turret" }],
  8156: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusBlackOps2", skill: "Black Ops", turretSkill: "Large Projectile Turret" }],
  11059: [{ attribute: "turretTracking", bonusAttr: "shipBonusCBC1", skill: "Caldari Battlecruiser", turretSkill: "Medium Hybrid Turret" }],
  11064: [{ attribute: "turretOptimal", bonusAttr: "shipBonusABC1", skill: "Amarr Battlecruiser", turretSkill: "Medium Energy Turret" }],
  11376: [{ attribute: "turretOptimal", bonusAttr: "shipBonusDreadnoughtG1", skill: "Gallente Dreadnought", turretSkill: "Capital Hybrid Turret" }],
  11392: [{ attribute: "turretOptimal", bonusAttr: "shipBonusNavyDestroyerCaldari2", skill: "Caldari Destroyer", turretSkill: "Small Hybrid Turret" }],
  11393: [{ attribute: "turretOptimal", bonusAttr: "shipBonusNavyDestroyerGallente4", turretSkill: "Small Hybrid Turret" }],
  11394: [{ attribute: "turretFalloff", bonusAttr: "shipBonusNavyDestroyerGallente5", turretSkill: "Small Hybrid Turret" }],
  11396: [{ attribute: "turretOptimal", bonusAttr: "shipBonusNavyDestroyerCaldari4", turretSkill: "Small Hybrid Turret" }],
  11397: [{ attribute: "turretFalloff", bonusAttr: "shipBonusNavyDestroyerCaldari5", turretSkill: "Small Hybrid Turret" }],
  11401: [{ attribute: "turretOptimal", bonusAttr: "shipBonusNavyDestroyerMinmatar4", turretSkill: "Small Projectile Turret" }],
  11402: [{ attribute: "turretFalloff", bonusAttr: "shipBonusNavyDestroyerMinmatar5", turretSkill: "Small Projectile Turret" }],
  11410: [{ attribute: "turretFalloff", bonusAttr: "shipBonusNavyDestroyerAmarr7", turretSkill: "Small Energy Turret" }],
  11415: [{ attribute: "turretTracking", bonusAttr: "eliteBonusHeavyGunship1", skill: "Heavy Assault Cruisers", turretSkill: "Medium Hybrid Turret" }],
  11416: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGC2", skill: "Gallente Cruiser", turretSkill: "Medium Hybrid Turret" }],
  11430: [{ attribute: "turretTracking", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", turretSkill: "Large Projectile Turret" }],
  11450: [{ attribute: "turretOptimal", bonusAttr: "shipBonusNavyDestroyerAmarr6", turretSkill: "Small Energy Turret" }],
  11696: [{ attribute: "turretTracking", bonusAttr: "shipBonusDreadnoughtC1", skill: "Caldari Dreadnought", turretSkill: "Capital Hybrid Turret" }],
  11697: [{ attribute: "turretOptimal", bonusAttr: "shipBonusDreadnoughtC2", skill: "Caldari Dreadnought", turretSkill: "Capital Hybrid Turret" }],
  11704: [{ attribute: "turretFalloff", bonusAttr: "shipBonusDreadnoughtM2", skill: "Minmatar Dreadnought", turretSkill: "Capital Projectile Turret" }],
  11743: [{ attribute: "turretTracking", bonusAttr: "shipBonusGD1", skill: "Gallente Destroyer", turretSkill: "Small Projectile Turret" }],
  11763: [{ attribute: "turretFalloff", bonusAttr: "shipBonusGBC1", skill: "Gallente Battlecruiser", turretSkill: "Medium Projectile Turret" }],
  11767: [{ attribute: "turretTracking", bonusAttr: "eliteBonusHeavyGunship1", skill: "Heavy Assault Cruisers", turretSkill: "Medium Hybrid Turret" }],
  11919: [{ attribute: "turretFalloff", bonusAttr: "shipBonusMD1", skill: "Minmatar Destroyer", turretSkill: "Small Projectile Turret" }],
  11944: [{ attribute: "turretFalloff", bonusAttr: "shipBonusTitanG2", skill: "Gallente Dreadnought", turretSkill: "Capital Projectile Turret" }],
  11945: [{ attribute: "turretTracking", bonusAttr: "shipBonusTitanG1", skill: "Gallente Dreadnought", turretSkill: "Capital Projectile Turret" }],
  11994: [{ attribute: "turretFalloff", bonusAttr: "eliteBonusHeavyGunship2", skill: "Heavy Assault Cruisers", turretSkill: "Medium Hybrid Turret" }],
  11998: [{ attribute: "turretOptimal", bonusAttr: "eliteBonusGunship2", skill: "Assault Frigates", turretSkill: "Small Hybrid Turret" }],
  11999: [{ attribute: "turretTracking", bonusAttr: "eliteBonusGunship2", skill: "Assault Frigates", turretSkill: "Small Hybrid Turret" }],
  12038: [{ attribute: "turretFalloff", bonusAttr: "shipBonus3MF", skill: "Minmatar Frigate", turretSkill: "Small Projectile Turret" }],
  12213: [{ attribute: "turretFalloff", bonusAttr: "ShipBonusMC3", skill: "Minmatar Cruiser", turretSkill: "Medium Projectile Turret" }],
  12245: [{ attribute: "turretFalloff", bonusAttr: "shipBonusDreadnoughtG1", skill: "Gallente Dreadnought", turretSkill: "Capital Projectile Turret" }],
  12567: [{ attribute: "turretFalloff", bonusAttr: "shipBonusRole6", turretSkill: "Small Projectile Turret" }],
  // Missile damage bonuses (per-damage-type effects are deduplicated in buildHullBonuses by bonusAttr+launcherGroup+skill).
  // Light missile damage (launcherGroup 509)
  5234: [{ attribute: "missileDamage", bonusAttr: "shipBonusCF2", skill: "Caldari Frigate", launcherGroup: 509 }],
  5237: [{ attribute: "missileDamage", bonusAttr: "shipBonusCF2", skill: "Caldari Frigate", launcherGroup: 509 }],
  5240: [{ attribute: "missileDamage", bonusAttr: "shipBonusCF2", skill: "Caldari Frigate", launcherGroup: 509 }],
  5243: [{ attribute: "missileDamage", bonusAttr: "shipBonusCF2", skill: "Caldari Frigate", launcherGroup: 509 }],
  11070: [{ attribute: "missileDamage", bonusAttr: "shipBonusCF", skill: "Caldari Frigate", launcherGroup: 509 }],
  6096: [{ attribute: "missileDamage", bonusAttr: "shipBonusMC2", skill: "Minmatar Cruiser", launcherGroup: 509 }],
  12807: [{ attribute: "missileDamage", bonusAttr: "shipBonusAD1", skill: "Amarr Destroyer", launcherGroup: 509 }],
  12812: [{ attribute: "missileDamage", bonusAttr: "shipBonusCD1", skill: "Caldari Destroyer", launcherGroup: 509 }],
  12813: [{ attribute: "missileDamage", bonusAttr: "shipBonusCD2", skill: "Caldari Destroyer", launcherGroup: 509 }],
  5319: [{ attribute: "missileDamage", bonusAttr: "shipBonusMD1", skill: "Minmatar Destroyer", launcherGroup: 509 }],
  11513: [{ attribute: "missileDamage", bonusAttr: "shipBonusMF2", skill: "Minmatar Frigate", launcherGroup: 509 }],
  // Rocket damage (launcherGroup 507)
  3234: [{ attribute: "missileDamage", bonusAttr: "shipBonusAF", skill: "Amarr Frigate", launcherGroup: 507 }],
  3235: [{ attribute: "missileDamage", bonusAttr: "shipBonusAF", skill: "Amarr Frigate", launcherGroup: 507 }],
  3236: [{ attribute: "missileDamage", bonusAttr: "shipBonusAF", skill: "Amarr Frigate", launcherGroup: 507 }],
  3237: [{ attribute: "missileDamage", bonusAttr: "shipBonusAF", skill: "Amarr Frigate", launcherGroup: 507 }],
  5306: [{ attribute: "missileDamage", bonusAttr: "shipBonusCD1", skill: "Caldari Destroyer", launcherGroup: 507 }],
  5320: [{ attribute: "missileDamage", bonusAttr: "shipBonusMD1", skill: "Minmatar Destroyer", launcherGroup: 507 }],
  6360: [{ attribute: "missileDamage", bonusAttr: "shipBonusMF2", skill: "Minmatar Frigate", launcherGroup: 507 }],
  6361: [{ attribute: "missileDamage", bonusAttr: "shipBonusMF3", skill: "Minmatar Frigate", launcherGroup: 507 }],
  // Heavy missile damage (launcherGroup 510)
  5340: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC1", skill: "Caldari Battlecruiser", launcherGroup: 510 }],
  5636: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 510 }],
  5637: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 510 }],
  5638: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 510 }],
  5639: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 510 }],
  6093: [{ attribute: "missileDamage", bonusAttr: "shipBonusMC2", skill: "Minmatar Cruiser", launcherGroup: 510 }],
  7031: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", launcherGroup: 510 }],
  7032: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", launcherGroup: 510 }],
  7033: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", launcherGroup: 510 }],
  7034: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", launcherGroup: 510 }],
  11411: [{ attribute: "missileDamage", bonusAttr: "shipBonusMC2", skill: "Minmatar Cruiser", launcherGroup: 510 }],
  11423: [{ attribute: "missileDamage", bonusAttr: "shipBonusAB", skill: "Amarr Battleship", launcherGroup: 510 }],
  12892: [{ attribute: "missileDamage", bonusAttr: "shipBonusMBC2", skill: "Minmatar Battlecruiser", launcherGroup: 510 }],
  // Heavy assault missile damage (launcherGroup 771)
  5339: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC1", skill: "Caldari Battlecruiser", launcherGroup: 771 }],
  4643: [{ attribute: "missileDamage", bonusAttr: "shipBonusAC1", skill: "Amarr Cruiser", launcherGroup: 771 }],
  6088: [{ attribute: "missileDamage", bonusAttr: "shipBonusMC2", skill: "Minmatar Cruiser", launcherGroup: 771 }],
  7035: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", launcherGroup: 771 }],
  7036: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", launcherGroup: 771 }],
  7037: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", launcherGroup: 771 }],
  7038: [{ attribute: "missileDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", launcherGroup: 771 }],
  12893: [{ attribute: "missileDamage", bonusAttr: "shipBonusMBC2", skill: "Minmatar Battlecruiser", launcherGroup: 771 }],
  // Cruise missile damage (launcherGroup 506)
  5862: [{ attribute: "missileDamage", bonusAttr: "shipBonusCB", skill: "Caldari Battleship", launcherGroup: 506 }],
  5863: [{ attribute: "missileDamage", bonusAttr: "shipBonusCB", skill: "Caldari Battleship", launcherGroup: 506 }],
  5864: [{ attribute: "missileDamage", bonusAttr: "shipBonusCB", skill: "Caldari Battleship", launcherGroup: 506 }],
  5865: [{ attribute: "missileDamage", bonusAttr: "shipBonusCB", skill: "Caldari Battleship", launcherGroup: 506 }],
  5628: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 506 }],
  5629: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 506 }],
  5630: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 506 }],
  5631: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 506 }],
  11422: [{ attribute: "missileDamage", bonusAttr: "shipBonusAB", skill: "Amarr Battleship", launcherGroup: 506 }],
  // Torpedo damage (launcherGroup 508)
  4393: [{ attribute: "missileDamage", bonusAttr: "eliteBonusCovertOps2", skill: "Covert Ops", launcherGroup: 508 }],
  4394: [{ attribute: "missileDamage", bonusAttr: "eliteBonusCovertOps2", skill: "Covert Ops", launcherGroup: 508 }],
  4395: [{ attribute: "missileDamage", bonusAttr: "eliteBonusCovertOps2", skill: "Covert Ops", launcherGroup: 508 }],
  4396: [{ attribute: "missileDamage", bonusAttr: "eliteBonusCovertOps2", skill: "Covert Ops", launcherGroup: 508 }],
  5632: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 508 }],
  5633: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 508 }],
  5634: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 508 }],
  5635: [{ attribute: "missileDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 508 }],
  11421: [{ attribute: "missileDamage", bonusAttr: "shipBonusAB", skill: "Amarr Battleship", launcherGroup: 508 }],
  // Missile ROF bonuses (negative magnitude = faster firing)
  760: [{ attribute: "missileRoF", bonusAttr: "shipBonusCF2", skill: "Caldari Frigate", launcherGroup: 509 }],
  912: [{ attribute: "missileRoF", bonusAttr: "shipBonusCC2", skill: "Caldari Cruiser", launcherGroup: 510 }],
  1885: [{ attribute: "missileRoF", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship", launcherGroup: 506 }],
  1886: [{ attribute: "missileRoF", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship", launcherGroup: 508 }],
  2647: [{ attribute: "missileRoF", bonusAttr: "eliteBonusHeavyGunship2", skill: "Heavy Assault Cruisers", launcherGroup: 510 }],
  2648: [{ attribute: "missileRoF", bonusAttr: "eliteBonusHeavyGunship2", skill: "Heavy Assault Cruisers", launcherGroup: 771 }],
  2649: [{ attribute: "missileRoF", bonusAttr: "eliteBonusHeavyGunship2", skill: "Heavy Assault Cruisers", launcherGroup: 509 }],
  3703: [{ attribute: "missileRoF", bonusAttr: "shipBonusMC2", skill: "Minmatar Cruiser", launcherGroup: 510 }],
  4645: [{ attribute: "missileRoF", bonusAttr: "eliteBonusHeavyGunship2", skill: "Heavy Assault Cruisers" }],
  4649: [{ attribute: "missileRoF", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship", launcherGroup: 506 }],
  4793: [{ attribute: "missileRoF", bonusAttr: "shipBonusATC1", skill: "Amarr Battlecruiser", launcherGroup: 510 }],
  4794: [{ attribute: "missileRoF", bonusAttr: "shipBonusATC1", skill: "Amarr Battlecruiser", launcherGroup: 509 }],
  4795: [{ attribute: "missileRoF", bonusAttr: "shipBonusATC1", skill: "Amarr Battlecruiser", launcherGroup: 771 }],
  4972: [{ attribute: "missileRoF", bonusAttr: "eliteBonusGunship1", skill: "Assault Frigates", launcherGroup: 509 }],
  4973: [{ attribute: "missileRoF", bonusAttr: "eliteBonusGunship1", skill: "Assault Frigates", launcherGroup: 507 }],
  5131: [{ attribute: "missileRoF", bonusAttr: "shipBonusCC", skill: "Caldari Cruiser" }],
  5349: [{ attribute: "missileRoF", bonusAttr: "shipBonusMBC2", skill: "Minmatar Battlecruiser", launcherGroup: 510 }],
  5350: [{ attribute: "missileRoF", bonusAttr: "shipBonusMBC2", skill: "Minmatar Battlecruiser", launcherGroup: 771 }],
  5456: [{ attribute: "missileRoF", bonusAttr: "shipBonusCB", skill: "Caldari Battleship", launcherGroup: 506 }],
  5457: [{ attribute: "missileRoF", bonusAttr: "shipBonusCB", skill: "Caldari Battleship", launcherGroup: 508 }],
  5496: [{ attribute: "missileRoF", bonusAttr: "eliteBonusCommandShipHAMRoFCS1", skill: "Command Ships", launcherGroup: 771 }],
  5497: [{ attribute: "missileRoF", bonusAttr: "eliteBonusCommandShipHMRoFCS1", skill: "Command Ships", launcherGroup: 510 }],
  5618: [{ attribute: "missileRoF", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship", launcherGroup: 1245 }],
  5619: [{ attribute: "missileRoF", bonusAttr: "shipBonusCB", skill: "Caldari Battleship", launcherGroup: 1245 }],
  5620: [{ attribute: "missileRoF", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 1245 }],
  5621: [{ attribute: "missileRoF", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 506 }],
  5622: [{ attribute: "missileRoF", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", launcherGroup: 508 }],
  5678: [{ attribute: "missileRoF", bonusAttr: "shipBonusMF2", skill: "Minmatar Frigate", launcherGroup: 509 }],
  5778: [{ attribute: "missileRoF", bonusAttr: "shipBonusMF2", skill: "Minmatar Frigate", launcherGroup: 509 }],
  5939: [{ attribute: "missileRoF", bonusAttr: "shipBonusAF2", skill: "Amarr Frigate", launcherGroup: 507 }],
  5944: [{ attribute: "missileRoF", bonusAttr: "shipBonusAD1", skill: "Amarr Destroyer" }],
  6085: [{ attribute: "missileRoF", bonusAttr: "shipBonusTacticalDestroyerCaldari1", skill: "Caldari Tactical Destroyer" }],
  6880: [{ attribute: "missileRoF", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship" }],
  11068: [{ attribute: "missileRoF", bonusAttr: "shipBonusMF", skill: "Minmatar Frigate", launcherGroup: 509 }],
  11512: [{ attribute: "missileRoF", bonusAttr: "eliteBonusGunship1", skill: "Assault Frigates", launcherGroup: 509 }],
  12817: [{ attribute: "missileRoF", bonusAttr: "shipBonusMD3", skill: "Minmatar Destroyer" }],
  // Turret damage bonuses (ship hull effects that boost damageMultiplier)
  508: [{ attribute: "turretDamage", bonusAttr: "shipBonusMF", skill: "Minmatar Frigate", turretSkill: "Small Projectile Turret" }],
  512: [{ attribute: "turretDamage", bonusAttr: "shipBonusGF", skill: "Gallente Frigate", turretSkill: "Small Hybrid Turret" }],
  514: [{ attribute: "turretDamage", bonusAttr: "shipBonusAF", skill: "Amarr Frigate", turretSkill: "Small Energy Turret" }],
  549: [{ attribute: "turretDamage", bonusAttr: "shipBonusMB", skill: "Minmatar Battleship", turretSkill: "Large Projectile Turret" }],
  550: [{ attribute: "turretDamage", bonusAttr: "shipBonusGB", skill: "Gallente Battleship", turretSkill: "Large Hybrid Turret" }],
  562: [{ attribute: "turretDamage", bonusAttr: "shipBonusGC", skill: "Gallente Cruiser", turretSkill: "Medium Hybrid Turret" }],
  754: [{ attribute: "turretDamage", bonusAttr: "shipBonusCF", skill: "Caldari Frigate", turretSkill: "Small Hybrid Turret" }],
  757: [{ attribute: "turretDamage", bonusAttr: "shipBonusAF", skill: "Amarr Frigate", turretSkill: "Small Energy Turret" }],
  968: [{ attribute: "turretDamage", bonusAttr: "shipBonusMC2", skill: "Minmatar Cruiser", turretSkill: "Medium Projectile Turret" }],
  1021: [{ attribute: "turretDamage", bonusAttr: "eliteBonusGunship2", skill: "Assault Frigates", turretSkill: "Small Hybrid Turret" }],
  1061: [{ attribute: "turretDamage", bonusAttr: "eliteBonusHeavyGunship2", skill: "Heavy Assault Cruisers", turretSkill: "Medium Hybrid Turret" }],
  1062: [{ attribute: "turretDamage", bonusAttr: "eliteBonusHeavyGunship2", skill: "Heavy Assault Cruisers", turretSkill: "Medium Energy Turret" }],
  1087: [{ attribute: "turretDamage", bonusAttr: "eliteBonusHeavyGunship2", skill: "Heavy Assault Cruisers", turretSkill: "Medium Projectile Turret" }],
  1179: [{ attribute: "turretDamage", bonusAttr: "eliteBonusGunship2", skill: "Assault Frigates", turretSkill: "Small Energy Turret" }],
  1218: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Small Hybrid Turret" }],
  1233: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Medium Hybrid Turret" }],
  1240: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Large Hybrid Turret" }],
  2155: [{ attribute: "turretDamage", bonusAttr: "eliteBonusCommandShips1", skill: "Command Ships", turretSkill: "Medium Projectile Turret" }],
  2157: [{ attribute: "turretDamage", bonusAttr: "eliteBonusCommandShips1", skill: "Command Ships", turretSkill: "Medium Energy Turret" }],
  2215: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Small Projectile Turret" }],
  2611: [{ attribute: "turretDamage", bonusAttr: "eliteBonusGunship1", skill: "Assault Frigates", turretSkill: "Small Projectile Turret" }],
  2805: [{ attribute: "turretDamage", bonusAttr: "shipBonusAB2", skill: "Amarr Battleship", turretSkill: "Large Energy Turret" }],
  3415: [{ attribute: "turretDamage", bonusAttr: "eliteBonusViolatorsRole1", turretSkill: "Large Energy Turret" }],
  3416: [{ attribute: "turretDamage", bonusAttr: "eliteBonusViolatorsRole1", turretSkill: "Large Hybrid Turret" }],
  3417: [{ attribute: "turretDamage", bonusAttr: "eliteBonusViolatorsRole1", turretSkill: "Large Projectile Turret" }],
  3478: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Large Energy Turret" }],
  3483: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Medium Energy Turret" }],
  3487: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Small Energy Turret" }],
  3649: [{ attribute: "turretDamage", bonusAttr: "eliteBonusViolators1", skill: "Marauders", turretSkill: "Large Energy Turret" }],
  4366: [{ attribute: "turretDamage", bonusAttr: "shipBonusCC2", skill: "Caldari Cruiser", turretSkill: "Medium Hybrid Turret" }],
  4472: [{ attribute: "turretDamage", bonusAttr: "shipBonusMC", skill: "Minmatar Cruiser", turretSkill: "Medium Projectile Turret" }],
  4789: [{ attribute: "turretDamage", bonusAttr: "shipBonusATF1", turretSkill: "Small Energy Turret" }],
  4941: [{ attribute: "turretDamage", bonusAttr: "shipBonusCF2", skill: "Caldari Frigate", turretSkill: "Small Hybrid Turret" }],
  4991: [{ attribute: "turretDamage", bonusAttr: "rookieSETDamageBonus", turretSkill: "Small Energy Turret" }],
  5013: [{ attribute: "turretDamage", bonusAttr: "rookieSHTDamageBonus", turretSkill: "Small Hybrid Turret" }],
  5020: [{ attribute: "turretDamage", bonusAttr: "rookieSPTDamageBonus", turretSkill: "Small Projectile Turret" }],
  5133: [{ attribute: "turretDamage", bonusAttr: "shipBonusCC", skill: "Caldari Cruiser", turretSkill: "Medium Hybrid Turret" }],
  5136: [{ attribute: "turretDamage", bonusAttr: "shipBonusAC", skill: "Amarr Cruiser", turretSkill: "Medium Energy Turret" }],
  5220: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Medium Projectile Turret" }],
  5317: [{ attribute: "turretDamage", bonusAttr: "shipBonusMD1", skill: "Minmatar Destroyer", turretSkill: "Small Projectile Turret" }],
  5333: [{ attribute: "turretDamage", bonusAttr: "shipBonusABC2", skill: "Amarr Battlecruiser", turretSkill: "Medium Energy Turret" }],
  5341: [{ attribute: "turretDamage", bonusAttr: "shipBonusGBC1", skill: "Gallente Battlecruiser", turretSkill: "Medium Hybrid Turret" }],
  5352: [{ attribute: "turretDamage", bonusAttr: "shipBonusMBC1", skill: "Minmatar Battlecruiser", turretSkill: "Medium Projectile Turret" }],
  5355: [{ attribute: "turretDamage", bonusAttr: "shipBonusABC2", skill: "Amarr Battlecruiser", turretSkill: "Large Energy Turret" }],
  5357: [{ attribute: "turretDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", turretSkill: "Large Hybrid Turret" }],
  5359: [{ attribute: "turretDamage", bonusAttr: "shipBonusGBC2", skill: "Gallente Battlecruiser", turretSkill: "Large Hybrid Turret" }],
  5486: [{ attribute: "turretDamage", bonusAttr: "shipBonusMBC2", skill: "Minmatar Battlecruiser", turretSkill: "Medium Projectile Turret" }],
  5501: [{ attribute: "turretDamage", bonusAttr: "eliteBonusCommandShips2", skill: "Command Ships", turretSkill: "Medium Hybrid Turret" }],
  5673: [{ attribute: "turretDamage", bonusAttr: "eliteBonusInterceptor2", skill: "Interceptors", turretSkill: "Small Projectile Turret" }],
  5956: [{ attribute: "turretDamage", bonusAttr: "shipBonusAC2", skill: "Amarr Cruiser", turretSkill: "Medium Energy Turret" }],
  6006: [{ attribute: "turretDamage", bonusAttr: "shipBonusTacticalDestroyerAmarr1", skill: "Amarr Tactical Destroyer", turretSkill: "Small Energy Turret" }],
  6027: [{ attribute: "turretDamage", bonusAttr: "eliteBonusReconShip1", skill: "Recon Ships", turretSkill: "Medium Projectile Turret" }],
  6037: [{ attribute: "turretDamage", bonusAttr: "shipBonusTacticalDestroyerMinmatar1", skill: "Minmatar Tactical Destroyer", turretSkill: "Small Projectile Turret" }],
  6177: [{ attribute: "turretDamage", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser", turretSkill: "Medium Hybrid Turret" }],
  6501: [{ attribute: "turretDamage", bonusAttr: "shipBonusDreadnoughtA1", skill: "Amarr Dreadnought", turretSkill: "Capital Energy Turret" }],
  6506: [{ attribute: "turretDamage", bonusAttr: "shipBonusDreadnoughtG1", skill: "Gallente Dreadnought", turretSkill: "Capital Hybrid Turret" }],
  6509: [{ attribute: "turretDamage", bonusAttr: "shipBonusDreadnoughtM1", skill: "Minmatar Dreadnought", turretSkill: "Capital Projectile Turret" }],
  6634: [{ attribute: "turretDamage", bonusAttr: "shipBonusTitanA1", skill: "Amarr Titan", turretSkill: "Capital Energy Turret" }],
  6636: [{ attribute: "turretDamage", bonusAttr: "shipBonusTitanG1", skill: "Gallente Titan", turretSkill: "Capital Hybrid Turret" }],
  6637: [{ attribute: "turretDamage", bonusAttr: "shipBonusTitanM1", skill: "Minmatar Titan", turretSkill: "Capital Projectile Turret" }],
  6709: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole1", turretSkill: "Capital Hybrid Turret" }],
  6711: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole3", turretSkill: "Capital Hybrid Turret" }],
  6851: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole3", turretSkill: "Capital Energy Turret" }],
  6992: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole1", turretSkill: "Medium Hybrid Turret" }],
  6994: [{ attribute: "turretDamage", bonusAttr: "eliteBonusReconShip1", skill: "Recon Ships", turretSkill: "Medium Hybrid Turret" }],
  7003: [{ attribute: "turretDamage", bonusAttr: "eliteBonusCovertOps3", skill: "Covert Ops", turretSkill: "Small Hybrid Turret" }],
  7055: [{ attribute: "turretDamage", bonusAttr: "shipBonusRole7", turretSkill: "Large Hybrid Turret" }],
  8106: [{ attribute: "turretDamage", bonusAttr: "shipBonusMB2", skill: "Minmatar Battleship", turretSkill: "Large Projectile Turret" }],
  11072: [{ attribute: "turretDamage", bonusAttr: "shipBonusGF2", skill: "Gallente Frigate", turretSkill: "Small Hybrid Turret" }],
  // Turret rate-of-fire bonuses (ship hull effects that boost speed/cycle time)
  602: [{ attribute: "turretRoF", bonusAttr: "shipBonusMC", skill: "Minmatar Cruiser", turretSkill: "Medium Projectile Turret" }],
  604: [{ attribute: "turretRoF", bonusAttr: "shipBonusMB2", skill: "Minmatar Battleship", turretSkill: "Large Projectile Turret" }],
  887: [{ attribute: "turretRoF", bonusAttr: "shipBonusAB2", skill: "Amarr Battleship", turretSkill: "Large Energy Turret" }],
  907: [{ attribute: "turretRoF", bonusAttr: "shipBonusAC2", skill: "Amarr Cruiser", turretSkill: "Medium Energy Turret" }],
  1232: [{ attribute: "turretRoF", bonusAttr: "shipBonusRole7", turretSkill: "Medium Projectile Turret" }],
  1239: [{ attribute: "turretRoF", bonusAttr: "shipBonusRole7", turretSkill: "Large Projectile Turret" }],
  3705: [{ attribute: "turretRoF", bonusAttr: "shipBonusGC2", skill: "Gallente Cruiser", turretSkill: "Medium Hybrid Turret" }],
  4464: [{ attribute: "turretRoF", bonusAttr: "shipBonusMF", turretSkill: "Small Projectile Turret" }],
  5353: [{ attribute: "turretRoF", bonusAttr: "shipBonusMBC2", skill: "Minmatar Battlecruiser", turretSkill: "Medium Projectile Turret" }],
  5360: [{ attribute: "turretRoF", bonusAttr: "shipBonusMBC1", skill: "Minmatar Battlecruiser", turretSkill: "Large Projectile Turret" }],
  5424: [{ attribute: "turretRoF", bonusAttr: "shipBonusGB", skill: "Gallente Battleship", turretSkill: "Large Hybrid Turret" }],
  6149: [{ attribute: "turretRoF", bonusAttr: "shipBonusTacticalDestroyerGallente1", skill: "Gallente Tactical Destroyer", turretSkill: "Small Hybrid Turret" }],
  6507: [{ attribute: "turretRoF", bonusAttr: "shipBonusDreadnoughtG2", skill: "Gallente Dreadnought", turretSkill: "Capital Hybrid Turret" }],
  6510: [{ attribute: "turretRoF", bonusAttr: "shipBonusDreadnoughtM2", skill: "Minmatar Dreadnought", turretSkill: "Capital Projectile Turret" }],
  6654: [{ attribute: "turretRoF", bonusAttr: "shipBonusTitanG2", skill: "Gallente Titan", turretSkill: "Capital Hybrid Turret" }],
  6655: [{ attribute: "turretRoF", bonusAttr: "shipBonusTitanM2", skill: "Minmatar Titan", turretSkill: "Capital Projectile Turret" }],
  6867: [{ attribute: "turretRoF", bonusAttr: "shipBonusMF", skill: "Minmatar Frigate", turretSkill: "Small Projectile Turret" }],
  7018: [{ attribute: "turretRoF", bonusAttr: "shipBonusAF", turretSkill: "Small Energy Turret" }],
  7248: [{ attribute: "turretRoF", bonusAttr: "shipBonusMF", skill: "Minmatar Frigate", turretSkill: "Small Projectile Turret" }],
  8094: [{ attribute: "turretRoF", bonusAttr: "shipBonusGD1", skill: "Gallente Destroyer", turretSkill: "Small Hybrid Turret" }],
  2187: [{ attribute: "droneDamage", bonusAttr: "shipBonusGB2", skill: "Gallente Battleship" }],
  2188: [{ attribute: "droneDamage", bonusAttr: "shipBonusGC2", skill: "Gallente Cruiser" }],
  2189: [{ attribute: "droneDamage", bonusAttr: "shipBonusAC2", skill: "Amarr Cruiser" }],
  4619: [{ attribute: "droneDamage", bonusAttr: "shipBonusGF2", skill: "Gallente Frigate" }],
  5014: [{ attribute: "droneDamage", bonusAttr: "rookieDroneBonus" }],
  5295: [{ attribute: "droneDamage", bonusAttr: "shipBonusAD1", skill: "Amarr Destroyer" }],
  5311: [{ attribute: "droneDamage", bonusAttr: "shipBonusGD1", skill: "Gallente Destroyer" }],
  5326: [{ attribute: "droneDamage", bonusAttr: "shipBonusABC2", skill: "Amarr Battlecruiser" }],
  5343: [{ attribute: "droneDamage", bonusAttr: "shipBonusGBC1", skill: "Gallente Battlecruiser" }],
  5417: [{ attribute: "droneDamage", bonusAttr: "shipBonusAB", skill: "Amarr Battleship" }],
  5803: [{ attribute: "droneDamage", bonusAttr: "shipBonusRole7" }],
  5804: [{ attribute: "droneDamage", bonusAttr: "shipBonusRole7" }],
  5821: [{ attribute: "droneDamage", bonusAttr: "shipBonusRole7" }],
  8225: [{ attribute: "droneDamage", bonusAttr: "shipRoleBonusDroneDamage" }],
  8261: [{ attribute: "droneDamage", bonusAttr: "industrialCommandBonusDroneDamage", skill: "Industrial Command Ships" }],
  8470: [{ attribute: "droneDamage", bonusAttr: "capitalIndustrialCommandBonusDroneDamage", skill: "Capital Industrial Ships" }],
  11426: [{ attribute: "droneDamage", bonusAttr: "shipBonusAB", skill: "Amarr Battleship" }],
  12249: [{ attribute: "droneDamage", bonusAttr: "shipBonusGBC1", skill: "Gallente Battlecruiser" }],
  // Defensive hull bonuses
  909: [{ attribute: "armorHpPercent", bonusAttr: "shipBonusAC2", skill: "Amarr Cruiser" }],
  2465: [{ attribute: "armorResist", bonusAttr: "shipBonusAB", skill: "Amarr Battleship" }],
  2602: [{ attribute: "shieldResist", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship" }],
  2603: [{ attribute: "shieldResist", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship" }],
  2604: [{ attribute: "shieldResist", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship" }],
  2605: [{ attribute: "shieldResist", bonusAttr: "shipBonus2CB", skill: "Caldari Battleship" }],
  1812: [{ attribute: "shieldResist", bonusAttr: "shipBonusCC2", skill: "Caldari Cruiser" }],
  1813: [{ attribute: "shieldResist", bonusAttr: "shipBonusCC2", skill: "Caldari Cruiser" }],
  1814: [{ attribute: "shieldResist", bonusAttr: "shipBonusCC2", skill: "Caldari Cruiser" }],
  1815: [{ attribute: "shieldResist", bonusAttr: "shipBonusCC2", skill: "Caldari Cruiser" }],
  5335: [{ attribute: "shieldResist", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser" }],
  5336: [{ attribute: "shieldResist", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser" }],
  5337: [{ attribute: "shieldResist", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser" }],
  5338: [{ attribute: "shieldResist", bonusAttr: "shipBonusCBC2", skill: "Caldari Battlecruiser" }],
  3331: [{ attribute: "armorHpPercent", bonusAttr: "eliteBonusCommandShips1", skill: "Command Ships" }],
  3592: [{ attribute: "hullHpPercent", bonusAttr: "eliteBonusJumpFreighter1", skill: "Jump Freighters" }],
  3678: [{ attribute: "shieldHpPercent", bonusAttr: "eliteBonusJumpFreighter1", skill: "Jump Freighters" }],
  3679: [{ attribute: "armorHpPercent", bonusAttr: "eliteBonusJumpFreighter1", skill: "Jump Freighters" }],
  8377: [
    { attribute: "plateHpPercent", bonusAttr: "battleshipPlateHPBonus" },
    { attribute: "extenderHpPercent", bonusAttr: "battleshipExtenderHPBonus" },
  ],
};

const MODULE_GROUPS = new Set([
  38, // Shield Extender
  46, // Propulsion Module
  78, // Reinforced Bulkhead
  59, // Gyrostabilizer
  205, // Heat Sink
  211, // Tracking Enhancer
  // 213 Tracking Computer is handled explicitly below
  302, // Magnetic Field Stabilizer
  367, // Ballistic Control System
  329, // Armor Plate
  762, // Inertial Stabilizer
  763, // Nanofiber Internal Structure
  764, // Overdrive Injector System
  773, // Rig Armor
  774, // Rig Shield
  775, // Rig Energy Weapon
  776, // Rig Hybrid Weapon
  777, // Rig Projectile Weapon
  778, // Rig Drones
  779, // Rig Launcher
  781, // Rig Core
  782, // Rig Navigation
  786, // Rig Electronic Systems
  1308, // Rig Anchor
  647, // Drone Control Range Module
  // Defense modules
  60, // Damage Control
  62, // Armor Repair Unit
  63, // Hull Repair Unit
  77, // Shield Hardener
  98, // Armor Coating
  295, // Shield Resistance Amplifier
  326, // Energized Armor Membrane
  328, // Armor Hardener
  338, // Shield Boost Amplifier
  40, // Shield Booster
  41, // Shield Recharger
  57, // Shield Power Relay
  1150, // Armor Resistance Shift Hardener (RAH)
  1156, // Ancillary Shield Booster
  1199, // Ancillary Armor Repairer
]);

const SCRIPT_GROUPS = new Set([907]);
const EWAR_SCRIPT_GROUPS = new Set([909]);

const WARP_SCRAMBLER_GROUP = 52;
const STASIS_WEB_GROUP = 65;
const STASIS_GRAPPLER_GROUP = 1672;
const TRACKING_COMPUTER_GROUP = 213;
const WEAPON_DISRUPTOR_GROUP = 291;
const TARGET_PAINTER_GROUP = 379;
const MISSILE_GUIDANCE_COMPUTER_GROUP = 1396;
const MISSILE_GUIDANCE_ENHANCER_GROUP = 1395;
const MISSILE_SCRIPT_GROUP = 1400;
const MISSILE_DAMAGE_EFFECT = 763;
const MISSILE_ROF_EFFECT = 889;

const TURRET_GROUPS = new Set([53, 55, 74]);

// Maps SDE dogma attribute IDs to internal combat bonus categories. Used by Phase 2
// (hull bonuses) and Phase 3 (skill bonuses) to derive bonuses from modifierInfo.
// Attribute 51 (speed) and 37 (maxVelocity) are context-dependent: the caller
// disambiguates based on the modifier's filter (turret skill vs missile skill,
// ship vs missile). Attribute 54 (maxRange) is filtered to exclude warp scramblers.
const COMBAT_ATTRIBUTE_MAP: Readonly<Record<number, BonusAttribute | SkillBonusAttribute>> = {
  114: "missileDamage", // emDamage
  116: "missileDamage", // explosiveDamage
  117: "missileDamage", // kineticDamage
  118: "missileDamage", // thermalDamage
  64: "turretDamage", // damageMultiplier
  51: "turretRoF", // speed (cycle time) — disambiguated to missileRoF at runtime
  160: "turretTracking", // trackingSpeed
  204: "turretTracking", // trackingSpeedMultiplier
  54: "turretOptimal", // maxRange — filtered to exclude warp scramblers
  158: "turretFalloff", // falloff
  37: "maxVelocity", // maxVelocity — disambiguated to missileVelocity at runtime
  281: "missileFlightTime", // explosionDelay
  654: "missileExplosionRadius", // aoeCloudSize
  653: "missileExplosionVelocity", // aoeVelocity
};

const CHARGE_GROUPS = new Set([
  83, 85, 86,
  372, 373, 374, 375, 376, 377,
  1987, 1989,
]);

const LAUNCHER_GROUPS = new Set([
  506, 507, 508, 509, 510, 511, 524, 771, 1245, 1673, 1674,
]);

const MISSILE_CHARGE_GROUPS = new Set([
  89, 384, 385, 386, 387, 394, 395, 396, 476, 648, 653, 654, 655, 656, 657, 772, 1019, 1677, 1678,
]);

const COMBAT_DRONE_GROUP = 100;
const OMNIDIRECTIONAL_TRACKING_LINK_GROUP = 646;
const OMNIDIRECTIONAL_TRACKING_ENHANCER_GROUP = 1292;
const DRONE_CONTROL_RANGE_MODULE_GROUP = 647;

const RIG_SIG_DRAWBACK_EFFECT = 2716;
const RIG_AGILITY_DRAWBACK_EFFECT = 2717;
const SHIP_CATEGORY_ID = 6;

// Defense module effect IDs (from RESEARCH.md pyfa effect anchors)
const DEFENSE_EFFECTS = {
  damageControl: 2302,
  armorResonancePassive: 2041,
  shieldResonancePassive: 2052,
  shieldHardener: 5230,
  armorHardener: 5231,
  shieldBoost: 4,
  armorRepair: 27,
  structureRepair: 26,
  fueledShieldBoost: 4936,
  fueledArmorRepair: 5275,
  shieldBoostAmplifier: 1720,
  rah: 4928,
  shieldExtender: 21,
  armorPlate: 1959,
  shieldRecharge: 50,
} as const;

// Maps module dogma effectIDs to the weapon group they modify. These are damage/RoF
// multiplier effects from Heat Sinks, Gyrostabilizers, Magnetic Field Stabilizers, and
// their rig/booster variants. The module's damageMultiplier and speedMultiplier attributes
// are applied to turret modules of the matching weapon group with stacking penalties.
const DAMAGE_MODULE_EFFECTS: Readonly<Record<number, TurretWeaponGroup>> = {
  89: "Projectile Weapon",
  91: "Energy Weapon",
  92: "Projectile Weapon",
  93: "Hybrid Weapon",
  95: "Energy Weapon",
  96: "Hybrid Weapon",
  2798: "Projectile Weapon",
  2799: "Projectile Weapon",
  2802: "Hybrid Weapon",
  2803: "Energy Weapon",
  2804: "Hybrid Weapon",
};

// Skill typeIDs that provide turret damage or rate-of-fire bonuses. The bonus attribute
// on the skill item is a percentage per level; it is applied as an unpenalized boost.
// WARHEAD_UPGRADES_SKILL_ID is the missile damage skill, not in SKILL_BONUS_RULES (turret-only).
const WARHEAD_UPGRADES_SKILL_ID = "20315";
// Drone skill typeIDs referenced by DroneSkillModelImpl (src/fitting/droneStats.ts).
// These must stay in sync with the runtime constants so that addSkillNames includes them
// in the item name packs for display-time resolution via ItemNameCatalog.
const DRONE_SKILL_IDS = ["3442", "24241", "33699", "3441", "23594"];
interface SkillBonusRule {
  readonly skillId: number;
  readonly bonusType: "turretDamage" | "turretRoF";
  readonly bonusAttr: string;
  readonly weaponGroup?: TurretWeaponGroup;
  readonly turretSkill?: string;
  readonly specializationSkill?: string;
}

const SKILL_BONUS_RULES: readonly SkillBonusRule[] = [
  { skillId: 3300, bonusType: "turretRoF", bonusAttr: "turretSpeeBonus" },
  { skillId: 3310, bonusType: "turretRoF", bonusAttr: "rofBonus" },
  { skillId: 3315, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", weaponGroup: "Energy Weapon" },
  { skillId: 3315, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", weaponGroup: "Projectile Weapon" },
  { skillId: 3315, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", weaponGroup: "Hybrid Weapon" },
  { skillId: 3301, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Small Hybrid Turret" },
  { skillId: 3302, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Small Projectile Turret" },
  { skillId: 3303, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Small Energy Turret" },
  { skillId: 3304, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Medium Hybrid Turret" },
  { skillId: 3305, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Medium Projectile Turret" },
  { skillId: 3306, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Medium Energy Turret" },
  { skillId: 3307, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Large Hybrid Turret" },
  { skillId: 3308, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Large Projectile Turret" },
  { skillId: 3309, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Large Energy Turret" },
  { skillId: 20327, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Capital Energy Turret" },
  { skillId: 21666, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Capital Hybrid Turret" },
  { skillId: 21667, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", turretSkill: "Capital Projectile Turret" },
  { skillId: 11082, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Small Railgun Specialization" },
  { skillId: 11083, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Small Beam Laser Specialization" },
  { skillId: 11084, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Small Autocannon Specialization" },
  { skillId: 12201, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Small Artillery Specialization" },
  { skillId: 12202, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Medium Artillery Specialization" },
  { skillId: 12203, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Large Artillery Specialization" },
  { skillId: 12204, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Medium Beam Laser Specialization" },
  { skillId: 12205, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Large Beam Laser Specialization" },
  { skillId: 12206, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Medium Railgun Specialization" },
  { skillId: 12207, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Large Railgun Specialization" },
  { skillId: 12208, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Medium Autocannon Specialization" },
  { skillId: 12209, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Large Autocannon Specialization" },
  { skillId: 12210, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Small Blaster Specialization" },
  { skillId: 12211, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Medium Blaster Specialization" },
  { skillId: 12212, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Large Blaster Specialization" },
  { skillId: 12213, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Small Pulse Laser Specialization" },
  { skillId: 12214, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Medium Pulse Laser Specialization" },
  { skillId: 12215, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Large Pulse Laser Specialization" },
  { skillId: 41403, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Capital Autocannon Specialization" },
  { skillId: 41404, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Capital Artillery Specialization" },
  { skillId: 41405, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Capital Blaster Specialization" },
  { skillId: 41406, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Capital Railgun Specialization" },
  { skillId: 41407, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Capital Pulse Laser Specialization" },
  { skillId: 41408, bonusType: "turretDamage", bonusAttr: "damageMultiplierBonus", specializationSkill: "Capital Beam Laser Specialization" },
];

function stringifyWithTypeIds<T>(value: T): string {
  return JSON.stringify(value)
    .replace(/"id":"(\d+)"/g, '"id":"$1" as TypeId')
    .replace(/"requiredSkillIds":\[(.*?)\]/g, (match, inner) => `"requiredSkillIds":[${inner.replace(/"(\d+)"/g, '"$1" as TypeId')}]`);
}

function stringifyHullBonuses(value: Record<ShipId, readonly HullBonus[]>): string {
  const entries = Object.entries(value)
    .map(([shipId, bonuses]) => `[${JSON.stringify(shipId)} as ShipId]:${JSON.stringify(bonuses)}`)
    .join(",");
  return `{${entries}}`;
}

function stringifySkillBonuses(skillMagnitudes: ReadonlyMap<number, ReadonlyMap<string, number>>): string {
  const entries = SKILL_BONUS_RULES.map((rule) => {
    const attrs = skillMagnitudes.get(rule.skillId);
    const magnitude = attrs?.get(rule.bonusAttr);
    if (magnitude === undefined) return null;
    const obj: Record<string, unknown> = {
      skillId: String(rule.skillId),
      bonusType: rule.bonusType,
      magnitudePerLevel: magnitude,
    };
    if (rule.weaponGroup !== undefined) obj.weaponGroup = rule.weaponGroup;
    if (rule.turretSkill !== undefined) obj.turretSkill = rule.turretSkill;
    if (rule.specializationSkill !== undefined) obj.specializationSkill = rule.specializationSkill;
    return JSON.stringify(obj).replace(/"skillId":"(\d+)"/, '"skillId":"$1" as TypeId');
  }).filter((entry): entry is string => entry !== null);
  return `[${entries.join(",")}]`;
}

function buildShipNameToId(): ReadonlyMap<string, ShipId> {
  const map = new Map<string, ShipId>();
  for (const profile of SHIP_PROFILES) map.set(profile.name, profile.id);
  return map;
}

function resolveShipId(name: string, sdeType: SdeType | undefined, shipNameToId: ReadonlyMap<string, ShipId>): ShipId {
  const legacy = shipNameToId.get(name);
  if (legacy) return legacy;
  if (sdeType) return String(sdeType.typeID) as ShipId;
  throw new Error(`Unknown ship hull name: ${name}`);
}

async function loadMerged<T>(prefix: string): Promise<Record<string, T>> {
  const files = (await readdir(SDE_DIR))
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort();
  const all: Record<string, T> = {};
  for (const file of files) {
    const text = await readFile(join(SDE_DIR, file), "utf8");
    const parsed: Record<string, T> = JSON.parse(text);
    Object.assign(all, parsed);
  }
  return all;
}

function buildAttributeNameMap(attributes: Record<string, SdeDogmaAttribute>): Map<number, string> {
  const map = new Map<number, string>();
  for (const attribute of Object.values(attributes)) {
    if (!map.has(attribute.attributeID)) map.set(attribute.attributeID, attribute.name);
  }
  return map;
}

function buildAttributeValues(
  attributeNames: Map<number, string>,
  typeDogma: SdeTypeDogma | undefined,
): Map<string, number> {
  const values = new Map<string, number>();
  if (!typeDogma) return values;
  for (const { attributeID, value } of typeDogma.dogmaAttributes) {
    const name = attributeNames.get(attributeID);
    if (name) values.set(name, value);
  }
  return values;
}

function buildEffectSet(typeDogma: SdeTypeDogma | undefined): Set<number> {
  const effects = new Set<number>();
  if (!typeDogma) return effects;
  for (const { effectID } of typeDogma.dogmaEffects) effects.add(effectID);
  return effects;
}

function buildSkillMagnitudes(
  attributeNames: Map<number, string>,
  typedogmas: Record<string, SdeTypeDogma>,
): ReadonlyMap<number, ReadonlyMap<string, number>> {
  const result = new Map<number, ReadonlyMap<string, number>>();
  const skillIds = new Set(SKILL_BONUS_RULES.map((rule) => rule.skillId));
  for (const skillId of skillIds) {
    const typeDogma = typedogmas[String(skillId)];
    const values = buildAttributeValues(attributeNames, typeDogma);
    result.set(skillId, values);
  }
  return result;
}

function sizeTierFromPropulsionName(name: string): "small" | "medium" | "large" | "capital" {
  if (/10000MN|50000MN/.test(name)) return "capital";
  if (/100MN|500MN/.test(name)) return "large";
  if (/10MN|50MN/.test(name)) return "medium";
  return "small";
}

function kindFromPropulsionName(name: string): "afterburner" | "microwarpdrive" {
  return /microwarpdrive|mwd/i.test(name) ? "microwarpdrive" : "afterburner";
}

interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: "small" | "medium" | "large" | "capital";
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
}

interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercentage?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly sigBonusPercent?: number;
  readonly sigDrawbackPercent?: number;
  readonly agilityDrawbackPercent?: number;
  readonly turretTrackingPercent?: number;
  readonly turretOptimalPercent?: number;
  readonly turretFalloffPercent?: number;
  readonly turretDamageMultiplier?: number;
  readonly turretSpeedMultiplier?: number;
  readonly turretWeaponGroup?: TurretWeaponGroup;
  readonly propulsion?: FittingPropulsionStats;
  readonly stasisWeb?: StasisWebStats;
  readonly stasisGrappler?: StasisGrapplerStats;
  readonly trackingDisruptor?: TrackingDisruptorStats;
  readonly warpScrambler?: WarpScramblerStats;
  readonly targetPainter?: TargetPainterStats;
  readonly missileDamageMultiplier?: number;
  readonly missileCycleTimeMultiplier?: number;
  readonly droneDamageBonus?: number;
  readonly droneControlRangeBonus?: number;
  readonly defense?: DefenseModuleStats;
}

type TurretWeaponGroup = "Energy Weapon" | "Hybrid Weapon" | "Projectile Weapon";

interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly damageMultiplier: number;
  readonly cycleTime: number;
  readonly turretSkill?: string;
  readonly specializationSkill?: string;
  readonly requiredSkillIds: readonly TypeId[];
  readonly metaLevel: number;
  readonly metaGroupID: number;
}

interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
  readonly emDamage?: number;
  readonly thermalDamage?: number;
  readonly kineticDamage?: number;
  readonly explosiveDamage?: number;
}

interface LauncherStats {
  readonly rateOfFire: number;
  readonly launcherGroup: number;
  readonly chargeGroups: readonly number[];
  readonly requiredSkillIds: readonly TypeId[];
  readonly metaLevel: number;
  readonly metaGroupID: number;
}

interface MissileStats {
  readonly damage: number;
  readonly damageType: "em" | "thermal" | "kinetic" | "explosive";
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number;
  readonly launcherGroup: number;
  readonly chargeGroup: number;
  readonly requiredSkillIds: readonly TypeId[];
}

interface TurretScriptStats {
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
}

export interface StasisWebStats {
  readonly maxRange: number;
  readonly speedFactorPercent: number;
  readonly overloadRangeBonusPercent: number;
}

export interface StasisGrapplerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly speedFactorPercent: number;
  readonly overloadOptimalBonusPercent: number;
}

export interface TrackingDisruptorStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly disruptionPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

export interface DisruptionScriptStats {
  readonly trackingDeltaBonus: number;
  readonly rangeDeltaBonus: number;
  readonly falloffDeltaBonus: number;
}

export interface WarpScramblerStats {
  readonly maxRange: number;
  readonly overloadRangeBonusPercent: number;
}

export interface TrackingComputerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
}

export interface TargetPainterStats {
  readonly maxRange: number;
  readonly falloff: number;
  readonly signatureRadiusBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

export interface MissileGuidanceComputerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

export interface MissileGuidanceEnhancerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
}

export interface MissileScriptStats {
  readonly explosionRadiusMultiplier: number;
  readonly explosionVelocityMultiplier: number;
  readonly missileVelocityMultiplier: number;
  readonly flightTimeMultiplier: number;
}

interface OmnidirectionalTrackingLinkStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

interface OmnidirectionalTrackingEnhancerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
}

type DroneSizeClass = "light" | "medium" | "heavy" | "sentry";

interface DroneStats {
  readonly sizeClass: DroneSizeClass;
  readonly damageMultiplier: number;
  readonly emDamage: number;
  readonly thermalDamage: number;
  readonly kineticDamage: number;
  readonly explosiveDamage: number;
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly maxVelocity: number;
  readonly orbitSpeed: number;
  readonly orbitRange: number;
  readonly cycleTime: number;
  readonly bandwidth: number;
  readonly volume: number;
  readonly metaLevel: number;
  readonly metaGroupID: number;
}

function optionalNumber(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value === 0) return undefined;
  return value;
}

function buildPropulsionStats(values: Map<string, number>, type: SdeType): FittingModuleStats {
  const massAddition = values.get("massAddition") ?? 0;
  const speedFactor = values.get("speedFactor") ?? 0;
  const speedBoostFactor = values.get("speedBoostFactor") ?? 0;
  const sigBloom = (values.get("signatureRadiusBonus") ?? 0) / 100;
  const name = type["typeName_en-us"];
  return {
    propulsion: {
      kind: kindFromPropulsionName(name),
      sizeTier: sizeTierFromPropulsionName(name),
      thrust: speedBoostFactor,
      speedBonus: speedFactor / 100,
      massAddition,
      sigBloom,
    },
  };
}

function buildModuleStats(values: Map<string, number>, effects: Set<number>): FittingModuleStats | undefined {
  const stats: { -readonly [K in keyof FittingModuleStats]?: FittingModuleStats[K] } = {};

  const massAddition = optionalNumber(values.get("massAddition"));
  if (massAddition !== undefined) stats.massAddition = massAddition;

  const massBonusPercentage = optionalNumber(values.get("massBonusPercentage"));
  if (massBonusPercentage !== undefined) stats.massBonusPercentage = massBonusPercentage;

  const speedBonusRaw = values.get("velocityBonus") ?? values.get("implantBonusVelocity");
  const speedBonusPercent = optionalNumber(speedBonusRaw);
  if (speedBonusPercent !== undefined) stats.speedBonusPercent = speedBonusPercent;

  const agilityBonusRaw = values.get("agilityMultiplier") ?? values.get("agilityBonus");
  if (agilityBonusRaw !== undefined && Number.isFinite(agilityBonusRaw) && agilityBonusRaw !== 0) {
    stats.agilityMultiplier = 1 + agilityBonusRaw / 100;
  }

  const sigRadiusAdd = optionalNumber(values.get("signatureRadiusAdd"));
  if (sigRadiusAdd !== undefined) stats.sigRadiusAdd = sigRadiusAdd;

  const sigBonusPercent = optionalNumber(values.get("signatureRadiusBonus"));
  if (sigBonusPercent !== undefined) stats.sigBonusPercent = sigBonusPercent;

  const turretTrackingPercent = optionalNumber(values.get("trackingSpeedBonus"));
  if (turretTrackingPercent !== undefined) stats.turretTrackingPercent = turretTrackingPercent;

  const turretOptimalPercent = optionalNumber(values.get("maxRangeBonus"));
  if (turretOptimalPercent !== undefined) stats.turretOptimalPercent = turretOptimalPercent;

  const turretFalloffPercent = optionalNumber(values.get("falloffBonus"));
  if (turretFalloffPercent !== undefined) stats.turretFalloffPercent = turretFalloffPercent;

  const drawback = values.get("drawback") ?? 0;
  if (effects.has(RIG_SIG_DRAWBACK_EFFECT) && Number.isFinite(drawback) && drawback !== 0) {
    stats.sigDrawbackPercent = drawback;
  }
  if (effects.has(RIG_AGILITY_DRAWBACK_EFFECT) && Number.isFinite(drawback) && drawback !== 0) {
    stats.agilityDrawbackPercent = drawback;
  }

  const damageGroup = resolveDamageModuleGroup(effects);
  if (damageGroup !== undefined) {
    const damageMultiplier = optionalNumber(values.get("damageMultiplier"));
    const speedMultiplier = optionalNumber(values.get("speedMultiplier"));
    if ((damageMultiplier !== undefined && damageMultiplier !== 0) || (speedMultiplier !== undefined && speedMultiplier !== 0)) {
      stats.turretWeaponGroup = damageGroup;
      if (damageMultiplier !== undefined && damageMultiplier !== 0) stats.turretDamageMultiplier = damageMultiplier;
      if (speedMultiplier !== undefined && speedMultiplier !== 0) stats.turretSpeedMultiplier = speedMultiplier;
    }
  }

  if (effects.has(MISSILE_DAMAGE_EFFECT) || effects.has(MISSILE_ROF_EFFECT)) {
    const missileDamageMultiplier = optionalNumber(values.get("missileDamageMultiplierBonus"));
    const missileCycleTimeMultiplier = optionalNumber(values.get("speedMultiplier"));
    if (missileDamageMultiplier !== undefined) stats.missileDamageMultiplier = missileDamageMultiplier;
    if (missileCycleTimeMultiplier !== undefined) stats.missileCycleTimeMultiplier = missileCycleTimeMultiplier;
  }

  const droneDamageBonus = optionalNumber(values.get("droneDamageBonus"));
  if (droneDamageBonus !== undefined) stats.droneDamageBonus = droneDamageBonus;

  const droneControlRangeBonus = optionalNumber(values.get("droneRangeBonus"));
  if (droneControlRangeBonus !== undefined) stats.droneControlRangeBonus = droneControlRangeBonus;

  if (Object.keys(stats).length === 0) return undefined;
  return { ...stats };
}

function resolveDamageModuleGroup(effects: Set<number>): TurretWeaponGroup | undefined {
  for (const effectId of effects) {
    const group = DAMAGE_MODULE_EFFECTS[effectId];
    if (group !== undefined) return group;
  }
  return undefined;
}

interface DefenseRepairerOverload {
  readonly amountMultiplier: number;
  readonly cycleTimeMultiplier: number;
}

interface DefenseAncillary {
  readonly chargeMultiplier: number;
  readonly shots: number;
  readonly reloadTime: number;
}

interface DefenseModuleStats {
  readonly kind: "damageControl" | "rah" | "repairer" | "boostAmplifier"
    | "resistModule" | "shieldExtender" | "armorPlate" | "rechargeModule";
  readonly layer?: "shield" | "armor" | "hull";
  readonly active?: boolean;
  readonly resistBonus?: DamageResists;
  readonly overloadBonusMultiplier?: number;
  readonly shieldResists?: DamageResists;
  readonly armorResists?: DamageResists;
  readonly hullResists?: DamageResists;
  readonly baseArmorResists?: DamageResists;
  readonly resistanceShiftAmount?: number;
  readonly amount?: number;
  readonly cycleTime?: number;
  readonly capacitorNeed?: number;
  readonly heatDamage?: number;
  readonly overload?: DefenseRepairerOverload;
  readonly overloadCycleTimeMultiplier?: number;
  readonly ancillary?: DefenseAncillary;
  readonly multiplier?: number;
  readonly shieldHpAdd?: number;
  readonly armorHpAdd?: number;
  readonly sigRadiusPenalty?: number;
  readonly rechargeMultiplier?: number;
}

function buildDefenseStats(values: Map<string, number>, effects: Set<number>, groupId: number): DefenseModuleStats | undefined {
  if (effects.has(DEFENSE_EFFECTS.damageControl)) return buildDamageControlStats(values);
  if (effects.has(DEFENSE_EFFECTS.rah)) return buildRahStats(values);
  if (effects.has(DEFENSE_EFFECTS.shieldBoost) || effects.has(DEFENSE_EFFECTS.fueledShieldBoost)) {
    return buildShieldBoosterStats(values, effects);
  }
  if (effects.has(DEFENSE_EFFECTS.armorRepair) || effects.has(DEFENSE_EFFECTS.fueledArmorRepair)) {
    return buildArmorRepairerStats(values, effects, groupId);
  }
  if (effects.has(DEFENSE_EFFECTS.structureRepair)) return buildHullRepairerStats(values);
  if (effects.has(DEFENSE_EFFECTS.shieldBoostAmplifier)) return buildShieldBoostAmplifierStats(values);
  if (effects.has(DEFENSE_EFFECTS.shieldHardener) || effects.has(DEFENSE_EFFECTS.armorHardener)) {
    return buildActiveHardenerStats(values, effects);
  }
  if (effects.has(DEFENSE_EFFECTS.armorResonancePassive) || effects.has(DEFENSE_EFFECTS.shieldResonancePassive)) {
    return buildPassiveResistStats(values, effects);
  }
  if (effects.has(DEFENSE_EFFECTS.shieldExtender)) return buildShieldExtenderStats(values);
  if (effects.has(DEFENSE_EFFECTS.armorPlate)) return buildArmorPlateStats(values);
  if (effects.has(DEFENSE_EFFECTS.shieldRecharge)) return buildRechargeModuleStats(values);
  return undefined;
}

function buildDamageControlStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const shieldResists = extractDcResonances(values, "shield");
  const armorResists = extractDcResonances(values, "armor");
  const hullResists = extractDcResonances(values, "hull");
  if (!shieldResists && !armorResists && !hullResists) return undefined;
  return {
    kind: "damageControl",
    shieldResists: shieldResists ?? undefined,
    armorResists: armorResists ?? undefined,
    hullResists: hullResists ?? undefined,
  };
}

function buildRahStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const armorResonances = extractDcResonances(values, "armor");
  const resistanceShiftAmount = optionalNumber(values.get("resistanceShiftAmount"));
  const duration = optionalNumber(values.get("duration"));
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  if (!armorResonances) return undefined;
  return {
    kind: "rah",
    baseArmorResists: armorResonances,
    resistanceShiftAmount: resistanceShiftAmount ?? 6,
    cycleTime: duration !== undefined ? duration / 1000 : undefined,
    capacitorNeed,
    overloadCycleTimeMultiplier: overloadDurationBonus !== undefined ? 1 + overloadDurationBonus / 100 : undefined,
  };
}

function buildShieldBoosterStats(values: Map<string, number>, effects: Set<number>): DefenseModuleStats | undefined {
  const shieldBonus = optionalNumber(values.get("shieldBonus"));
  const duration = optionalNumber(values.get("duration"));
  if (shieldBonus === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  const overloadShieldBonus = optionalNumber(values.get("overloadShieldBonus"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  const isAncillary = effects.has(DEFENSE_EFFECTS.fueledShieldBoost);
  const reloadTime = optionalNumber(values.get("reloadTime"));
  const ancillary = isAncillary ? { chargeMultiplier: 1, shots: 0, reloadTime: (reloadTime ?? 0) / 1000 } : undefined;
  return {
    kind: "repairer",
    layer: "shield",
    amount: shieldBonus,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: buildRepairerOverload(overloadShieldBonus, overloadDurationBonus),
    ancillary,
  };
}

function buildArmorRepairerStats(values: Map<string, number>, effects: Set<number>, groupId: number): DefenseModuleStats | undefined {
  const armorDamageAmount = optionalNumber(values.get("armorDamageAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (armorDamageAmount === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  const overloadAmountBonus = optionalNumber(values.get("overloadArmorDamageAmount"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  const isAncillary = groupId === 1199 || effects.has(DEFENSE_EFFECTS.fueledArmorRepair);
  const chargedArmorDamageMultiplier = optionalNumber(values.get("chargedArmorDamageMultiplier"));
  const reloadTime = optionalNumber(values.get("reloadTime"));
  const ancillary = buildAncillary(isAncillary, chargedArmorDamageMultiplier ?? 1, reloadTime);
  return {
    kind: "repairer",
    layer: "armor",
    amount: armorDamageAmount,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: buildRepairerOverload(overloadAmountBonus, overloadDurationBonus),
    ancillary,
  };
}

function buildHullRepairerStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const structureDamageAmount = optionalNumber(values.get("structureDamageAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (structureDamageAmount === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  return {
    kind: "repairer",
    layer: "hull",
    amount: structureDamageAmount,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 },
  };
}

function buildShieldBoostAmplifierStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const shieldBoostMultiplier = optionalNumber(values.get("shieldBoostMultiplier"));
  if (shieldBoostMultiplier === undefined) return undefined;
  return { kind: "boostAmplifier", multiplier: round6(1 + shieldBoostMultiplier / 100) };
}

function buildActiveHardenerStats(values: Map<string, number>, effects: Set<number>): DefenseModuleStats | undefined {
  const layer = effects.has(DEFENSE_EFFECTS.shieldHardener) ? "shield" : "armor";
  const resistBonus = extractResistBonus(values);
  if (!resistBonus) return undefined;
  const duration = optionalNumber(values.get("duration"));
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  const overloadHardeningBonus = optionalNumber(values.get("overloadHardeningBonus"));
  return {
    kind: "resistModule",
    layer,
    active: true,
    resistBonus,
    overloadBonusMultiplier: overloadHardeningBonus !== undefined ? 1 + overloadHardeningBonus / 100 : undefined,
    cycleTime: duration !== undefined ? duration / 1000 : undefined,
    capacitorNeed,
    heatDamage,
  };
}

function buildPassiveResistStats(values: Map<string, number>, effects: Set<number>): DefenseModuleStats | undefined {
  const layer = effects.has(DEFENSE_EFFECTS.shieldResonancePassive) ? "shield" : "armor";
  const resistBonus = extractResistBonus(values);
  if (!resistBonus) return undefined;
  return { kind: "resistModule", layer, active: false, resistBonus };
}

function buildShieldExtenderStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const capacityBonus = optionalNumber(values.get("capacityBonus"));
  if (capacityBonus === undefined) return undefined;
  const sigRadiusAdd = optionalNumber(values.get("signatureRadiusAdd"));
  return { kind: "shieldExtender", shieldHpAdd: capacityBonus, sigRadiusPenalty: sigRadiusAdd };
}

function buildArmorPlateStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const armorHpBonusAdd = optionalNumber(values.get("armorHPBonusAdd"));
  if (armorHpBonusAdd === undefined) return undefined;
  return { kind: "armorPlate", armorHpAdd: armorHpBonusAdd };
}

function buildRechargeModuleStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const rechargeBonus = optionalNumber(values.get("rechargeratebonus")) ?? optionalNumber(values.get("shieldRechargeRateMultiplier"));
  if (rechargeBonus === undefined) return undefined;
  return { kind: "rechargeModule", rechargeMultiplier: 1 + rechargeBonus / 100 };
}

function buildRepairerOverload(amountBonus: number | undefined, durationBonus: number | undefined): DefenseRepairerOverload {
  return {
    amountMultiplier: amountBonus !== undefined ? 1 + amountBonus / 100 : 1,
    cycleTimeMultiplier: durationBonus !== undefined ? 1 + durationBonus / 100 : 1,
  };
}

function buildAncillary(isAncillary: boolean, chargeMultiplier: number, reloadTime: number | undefined): DefenseAncillary | undefined {
  if (!isAncillary) return undefined;
  return { chargeMultiplier, shots: 0, reloadTime: (reloadTime ?? 0) / 1000 };
}

function extractResistBonus(values: Map<string, number>): DamageResists | undefined {
  const em = optionalNumber(values.get("emDamageResistanceBonus"));
  const thermal = optionalNumber(values.get("thermalDamageResistanceBonus"));
  const kinetic = optionalNumber(values.get("kineticDamageResistanceBonus"));
  const explosive = optionalNumber(values.get("explosiveDamageResistanceBonus"));
  if (em === undefined && thermal === undefined && kinetic === undefined && explosive === undefined) return undefined;
  return {
    em: round6(Math.abs(em ?? 0) / 100),
    thermal: round6(Math.abs(thermal ?? 0) / 100),
    kinetic: round6(Math.abs(kinetic ?? 0) / 100),
    explosive: round6(Math.abs(explosive ?? 0) / 100),
  };
}

function extractDcResonances(values: Map<string, number>, prefix: string): DamageResists | undefined {
  const emAttr = prefix === "hull" ? "hullEmDamageResonance" : `${prefix}EmDamageResonance`;
  const thermalAttr = prefix === "hull" ? "hullThermalDamageResonance" : `${prefix}ThermalDamageResonance`;
  const kineticAttr = prefix === "hull" ? "hullKineticDamageResonance" : `${prefix}KineticDamageResonance`;
  const explosiveAttr = prefix === "hull" ? "hullExplosiveDamageResonance" : `${prefix}ExplosiveDamageResonance`;
  const em = optionalNumber(values.get(emAttr));
  const thermal = optionalNumber(values.get(thermalAttr));
  const kinetic = optionalNumber(values.get(kineticAttr));
  const explosive = optionalNumber(values.get(explosiveAttr));
  if (em === undefined && thermal === undefined && kinetic === undefined && explosive === undefined) return undefined;
  return {
    em: round6(1 - (em ?? 1)),
    thermal: round6(1 - (thermal ?? 1)),
    kinetic: round6(1 - (kinetic ?? 1)),
    explosive: round6(1 - (explosive ?? 1)),
  };
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function buildStasisWebStats(values: Map<string, number>): StasisWebStats | undefined {
  const speedFactor = values.get("speedFactor");
  const maxRange = values.get("maxRange");
  if (speedFactor === undefined || maxRange === undefined) return undefined;
  return {
    maxRange,
    speedFactorPercent: speedFactor,
    overloadRangeBonusPercent: values.get("overloadRangeBonus") ?? 0,
  };
}

export function buildStasisGrapplerStats(values: Map<string, number>): StasisGrapplerStats | undefined {
  const speedFactor = values.get("speedFactor");
  const maxRange = values.get("maxRange");
  if (speedFactor === undefined || maxRange === undefined) return undefined;
  return {
    optimal: maxRange,
    falloff: values.get("falloffEffectiveness") ?? 0,
    speedFactorPercent: speedFactor,
    overloadOptimalBonusPercent: values.get("overloadRangeBonus") ?? 0,
  };
}

export function buildTrackingComputerStats(values: Map<string, number>): TrackingComputerStats | undefined {
  const trackingBonus = values.get("trackingSpeedBonus");
  if (trackingBonus === undefined) return undefined;
  return {
    trackingBonusPercent: trackingBonus,
    optimalBonusPercent: values.get("maxRangeBonus") ?? 0,
    falloffBonusPercent: values.get("falloffBonus") ?? 0,
  };
}

export function buildTargetPainterStats(values: Map<string, number>): TargetPainterStats | undefined {
  const signatureRadiusBonus = values.get("signatureRadiusBonus");
  const maxRange = values.get("maxRange");
  if (signatureRadiusBonus === undefined || maxRange === undefined) return undefined;
  return {
    maxRange,
    falloff: values.get("falloffEffectiveness") ?? 0,
    signatureRadiusBonusPercent: signatureRadiusBonus,
    overloadStrengthBonusPercent: values.get("overloadPainterStrengthBonus") ?? 0,
  };
}

export function buildMissileGuidanceComputerStats(values: Map<string, number>): MissileGuidanceComputerStats | undefined {
  const explosionRadiusBonus = values.get("aoeCloudSizeBonus");
  if (explosionRadiusBonus === undefined) return undefined;
  return {
    explosionRadiusBonusPercent: explosionRadiusBonus,
    explosionVelocityBonusPercent: values.get("aoeVelocityBonus") ?? 0,
    missileVelocityBonusPercent: values.get("missileVelocityBonus") ?? 0,
    flightTimeBonusPercent: values.get("explosionDelayBonus") ?? 0,
    overloadStrengthBonusPercent: values.get("overloadTrackingModuleStrengthBonus") ?? 0,
  };
}

export function buildMissileGuidanceEnhancerStats(values: Map<string, number>): MissileGuidanceEnhancerStats | undefined {
  const explosionRadiusBonus = values.get("aoeCloudSizeBonus");
  if (explosionRadiusBonus === undefined) return undefined;
  return {
    explosionRadiusBonusPercent: explosionRadiusBonus,
    explosionVelocityBonusPercent: values.get("aoeVelocityBonus") ?? 0,
    missileVelocityBonusPercent: values.get("missileVelocityBonus") ?? 0,
    flightTimeBonusPercent: values.get("explosionDelayBonus") ?? 0,
  };
}

export function buildMissileScriptStats(values: Map<string, number>): MissileScriptStats | undefined {
  const explosionRadiusBonusBonus = values.get("aoeCloudSizeBonusBonus");
  if (explosionRadiusBonusBonus === undefined) return undefined;
  return {
    explosionRadiusMultiplier: 1 + explosionRadiusBonusBonus / 100,
    explosionVelocityMultiplier: 1 + (values.get("aoeVelocityBonusBonus") ?? 0) / 100,
    missileVelocityMultiplier: 1 + (values.get("missileVelocityBonusBonus") ?? 0) / 100,
    flightTimeMultiplier: 1 + (values.get("explosionDelayBonusBonus") ?? 0) / 100,
  };
}

export function buildTrackingDisruptorStats(values: Map<string, number>): TrackingDisruptorStats | undefined {
  const disruptionPercent = values.get("trackingSpeedBonus");
  if (disruptionPercent === undefined) return undefined;
  return {
    optimal: values.get("maxRange") ?? 0,
    falloff: values.get("falloffEffectiveness") ?? 0,
    disruptionPercent,
    overloadStrengthBonusPercent: values.get("overloadTrackingModuleStrengthBonus") ?? 0,
  };
}

export function buildWarpScramblerStats(values: Map<string, number>): WarpScramblerStats | undefined {
  const propulsionBlock = values.get("activationBlockedStrenght");
  const maxRange = values.get("maxRange");
  if (propulsionBlock === undefined || propulsionBlock <= 0 || maxRange === undefined) return undefined;
  return {
    maxRange,
    overloadRangeBonusPercent: values.get("overloadRangeBonus") ?? 0,
  };
}

export function buildDisruptionScriptStats(values: Map<string, number>): DisruptionScriptStats {
  return {
    trackingDeltaBonus: values.get("trackingSpeedBonusBonus") ?? 0,
    rangeDeltaBonus: values.get("maxRangeBonusBonus") ?? 0,
    falloffDeltaBonus: values.get("falloffBonusBonus") ?? 0,
  };
}

function buildHullBonuses(attributeNames: Map<number, string>, typeDogma: SdeTypeDogma | undefined): readonly HullBonus[] {
  if (!typeDogma) return [];
  const values = buildAttributeValues(attributeNames, typeDogma);
  const effects = buildEffectSet(typeDogma);

  const bonuses: HullBonus[] = [];
  const seen = new Set<string>();
  for (const effectID of effects) {
    const rules = BONUS_EFFECTS[effectID];
    if (!rules) continue;
    for (const rule of rules) {
      const magnitude = resolveBonusMagnitude(rule, values);
      if (magnitude === undefined || !Number.isFinite(magnitude) || magnitude === 0) continue;
      const key = `${rule.attribute}:${rule.bonusAttr ?? ""}:${rule.launcherGroup ?? ""}:${rule.skill ?? ""}:${rule.turretSkill ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bonuses.push({ attribute: rule.attribute, magnitude, skill: rule.skill, turretSkill: rule.turretSkill, launcherGroup: rule.launcherGroup });
    }
  }
  return bonuses;
}

function resolveBonusMagnitude(rule: HullBonusRule, values: Map<string, number>): number | undefined {
  if (rule.constant !== undefined) return rule.constant;
  if (!rule.bonusAttr) return undefined;
  if (values.has(rule.bonusAttr)) return values.get(rule.bonusAttr);
  if (rule.bonusAttrFallback && values.has(rule.bonusAttrFallback)) return values.get(rule.bonusAttrFallback);
  return undefined;
}

function turretSkillFromRequired(
  types: Record<string, SdeType>,
  requiredSkills: Record<string, Record<string, number>>,
  typeID: number,
): string | undefined {
  const skills = requiredSkills[String(typeID)];
  if (!skills) return undefined;
  for (const skillTypeID of Object.keys(skills)) {
    const name = types[skillTypeID]?.["typeName_en-us"];
    if (name?.includes("Turret")) return name;
  }
  return undefined;
}

function specializationSkillFromRequired(
  types: Record<string, SdeType>,
  requiredSkills: Record<string, Record<string, number>>,
  typeID: number,
): string | undefined {
  const skills = requiredSkills[String(typeID)];
  if (!skills) return undefined;
  for (const skillTypeID of Object.keys(skills)) {
    const name = types[skillTypeID]?.["typeName_en-us"];
    if (name?.includes("Specialization")) return name;
  }
  return undefined;
}

function buildRequiredSkillIds(requiredSkills: Record<string, Record<string, number>>, typeID: number): readonly TypeId[] {
  const skills = requiredSkills[String(typeID)];
  if (!skills) return [];
  return Object.keys(skills).map((id) => id as TypeId);
}

export function buildLauncherStats(values: Map<string, number>, groupID: number, type: SdeType, requiredSkillIds: readonly TypeId[]): LauncherStats | undefined {
  const speed = values.get("speed");
  if (speed === undefined || speed <= 0) return undefined;
  const chargeGroups: number[] = [];
  for (const attr of ["chargeGroup1", "chargeGroup2", "chargeGroup3", "chargeGroup4", "chargeGroup5"]) {
    const group = values.get(attr);
    if (group !== undefined && group > 0) chargeGroups.push(group);
  }
  if (chargeGroups.length === 0) return undefined;
  return { rateOfFire: speed / 1000, launcherGroup: groupID, chargeGroups, requiredSkillIds, metaLevel: type.metaLevel ?? 0, metaGroupID: type.metaGroupID ?? 1 };
}

export function buildMissileStats(values: Map<string, number>, groupID: number, requiredSkillIds: readonly TypeId[]): MissileStats | undefined {
  const emDamage = values.get("emDamage") ?? 0;
  const thermalDamage = values.get("thermalDamage") ?? 0;
  const kineticDamage = values.get("kineticDamage") ?? 0;
  const explosiveDamage = values.get("explosiveDamage") ?? 0;
  const damage = emDamage + thermalDamage + kineticDamage + explosiveDamage;
  if (damage <= 0) return undefined;
  const explosionRadius = values.get("aoeCloudSize");
  const explosionVelocity = values.get("aoeVelocity");
  const damageReductionFactor = values.get("aoeDamageReductionFactor");
  const maxVelocity = values.get("maxVelocity");
  const flightTime = values.get("explosionDelay");
  const launcherGroup = values.get("launcherGroup");
  if (explosionRadius === undefined || explosionVelocity === undefined) return undefined;
  if (damageReductionFactor === undefined || maxVelocity === undefined) return undefined;
  if (flightTime === undefined || launcherGroup === undefined) return undefined;
  return {
    damage,
    damageType: damageTypeFromValues(emDamage, thermalDamage, kineticDamage, explosiveDamage),
    explosionRadius,
    explosionVelocity,
    damageReductionFactor,
    maxVelocity,
    flightTime: flightTime / 1000,
    launcherGroup,
    chargeGroup: groupID,
    requiredSkillIds,
  };
}

function damageTypeFromValues(em: number, thermal: number, kinetic: number, explosive: number): "em" | "thermal" | "kinetic" | "explosive" {
  if (em > 0) return "em";
  if (thermal > 0) return "thermal";
  if (kinetic > 0) return "kinetic";
  return "explosive";
}

export function buildDroneStats(values: Map<string, number>, type: SdeType): DroneStats | undefined {
  const damageMultiplier = values.get("damageMultiplier");
  const tracking = values.get("trackingSpeed");
  const sigResolution = values.get("optimalSigRadius");
  const optimal = values.get("maxRange");
  const speed = values.get("speed");
  if (damageMultiplier === undefined || tracking === undefined || sigResolution === undefined || optimal === undefined || speed === undefined) return undefined;
  const emDamage = values.get("emDamage") ?? 0;
  const thermalDamage = values.get("thermalDamage") ?? 0;
  const kineticDamage = values.get("kineticDamage") ?? 0;
  const explosiveDamage = values.get("explosiveDamage") ?? 0;
  if (emDamage + thermalDamage + kineticDamage + explosiveDamage <= 0) return undefined;
  const falloff = values.get("falloff") ?? 0;
  const maxVelocity = values.get("maxVelocity") ?? 0;
  const orbitSpeed = values.get("entityCruiseSpeed") ?? 0;
  const bandwidth = values.get("droneBandwidthUsed") ?? 0;
  const sizeClass = droneSizeClassFromStats(maxVelocity, orbitSpeed, bandwidth);
  const rawOrbitRange = values.get("entityFlyRange") ?? 0;
  const orbitRange = sizeClass === "sentry" ? 0 : rawOrbitRange;
  const volume = type.volume ?? bandwidth;
  return {
    sizeClass,
    damageMultiplier,
    emDamage,
    thermalDamage,
    kineticDamage,
    explosiveDamage,
    tracking,
    sigResolution,
    optimal,
    falloff,
    maxVelocity,
    orbitSpeed,
    orbitRange,
    cycleTime: speed / 1000,
    bandwidth,
    volume,
    metaLevel: type.metaLevel ?? 0,
    metaGroupID: type.metaGroupID ?? 1,
  };
}

function droneSizeClassFromStats(maxVelocity: number, orbitSpeed: number, bandwidth: number): DroneSizeClass {
  if (maxVelocity <= 1 && orbitSpeed <= 1) return "sentry";
  if (bandwidth <= 5) return "light";
  if (bandwidth <= 10) return "medium";
  return "heavy";
}

export function buildOmnidirectionalTrackingLinkStats(values: Map<string, number>): OmnidirectionalTrackingLinkStats | undefined {
  const trackingBonusPercent = values.get("trackingSpeedBonus");
  const optimalBonusPercent = values.get("maxRangeBonus");
  const falloffBonusPercent = values.get("falloffBonus");
  if (trackingBonusPercent === undefined || optimalBonusPercent === undefined || falloffBonusPercent === undefined) return undefined;
  const overloadStrengthBonusPercent = values.get("overloadTrackingModuleStrengthBonus") ?? 0;
  return { trackingBonusPercent, optimalBonusPercent, falloffBonusPercent, overloadStrengthBonusPercent };
}

export function buildOmnidirectionalTrackingEnhancerStats(values: Map<string, number>): OmnidirectionalTrackingEnhancerStats | undefined {
  const trackingBonusPercent = values.get("trackingSpeedBonus");
  const optimalBonusPercent = values.get("maxRangeBonus");
  const falloffBonusPercent = values.get("falloffBonus");
  if (trackingBonusPercent === undefined || optimalBonusPercent === undefined || falloffBonusPercent === undefined) return undefined;
  return { trackingBonusPercent, optimalBonusPercent, falloffBonusPercent };
}

async function main() {
  const types = await loadMerged<SdeType>("types.");
  const typedogmas = await loadMerged<SdeTypeDogma>("typedogma.");
  const attributes = await loadMerged<SdeDogmaAttribute>("dogmaattributes.");
  const dogmaEffects = await loadMerged<SdeDogmaEffect>("dogmaeffects.");
  const groups = await loadMerged<SdeGroup>("groups.");
  const requiredSkills = await loadMerged<Record<string, number>>("requiredskillsfortypes.");
  const attributeNames = buildAttributeNameMap(attributes);
  const shipGroupIds = new Set(Object.values(groups).filter((group) => group.categoryID === SHIP_CATEGORY_ID).map((group) => group.groupID));

  const fittingModules: Record<string, Row<FittingModuleStats>> = {};
  const turrets: Record<string, Row<TurretStats>> = {};
  const charges: Record<string, Row<ChargeStats>> = {};
  const launchers: Record<string, Row<LauncherStats>> = {};
  const missiles: Record<string, Row<MissileStats>> = {};
  const scripts: Record<string, Row<TurretScriptStats>> = {};
  const stasisWebs: Record<string, Row<StasisWebStats>> = {};
  const stasisGrapplers: Record<string, Row<StasisGrapplerStats>> = {};
  const trackingComputers: Record<string, Row<TrackingComputerStats>> = {};
  const trackingDisruptors: Record<string, Row<TrackingDisruptorStats>> = {};
  const warpScramblers: Record<string, Row<WarpScramblerStats>> = {};
  const disruptionScripts: Record<string, Row<DisruptionScriptStats>> = {};
  const targetPainters: Record<string, Row<TargetPainterStats>> = {};
  const missileGuidanceComputers: Record<string, Row<MissileGuidanceComputerStats>> = {};
  const missileGuidanceEnhancers: Record<string, Row<MissileGuidanceEnhancerStats>> = {};
  const missileScripts: Record<string, Row<MissileScriptStats>> = {};
  const omnidirectionalTrackingLinks: Record<string, Row<OmnidirectionalTrackingLinkStats>> = {};
  const omnidirectionalTrackingEnhancers: Record<string, Row<OmnidirectionalTrackingEnhancerStats>> = {};
  const hullBonuses: Record<ShipId, readonly HullBonus[]> = {};
  const drones: Record<string, DroneEntry> = {};
  const combatDrones: Record<string, Row<DroneStats>> = {};
  const itemNames: Record<string, LocalizedName> = {};
  const idToType = new Map<string, SdeType>();
  const shipNameToId = buildShipNameToId();

  for (const type of Object.values(types)) {
    const id = String(type.typeID) as TypeId;
    idToType.set(id, type);
    if (!type.published) continue;
    const typeDogma = typedogmas[String(type.typeID)];
    const values = buildAttributeValues(attributeNames, typeDogma);
    const enName = type["typeName_en-us"];

    if (shipGroupIds.has(type.groupID)) {
      const bonuses = buildHullBonuses(attributeNames, typeDogma);
      const shipId = resolveShipId(enName, type, shipNameToId);
      if (bonuses.length > 0) hullBonuses[shipId] = bonuses;
      continue;
    }

    if (TURRET_GROUPS.has(type.groupID)) {
      const tracking = values.get("trackingSpeed");
      const optimal = values.get("maxRange");
      const speed = values.get("speed");
      const damageMultiplier = values.get("damageMultiplier");
      if (tracking !== undefined && optimal !== undefined && speed !== undefined && damageMultiplier !== undefined) {
        turrets[id] = {
          id,
          name: enName,
          tracking,
          optimal,
          falloff: values.get("falloff") ?? 0,
          chargeSize: values.get("chargeSize") ?? 1,
          damageMultiplier,
          cycleTime: speed / 1000,
          turretSkill: turretSkillFromRequired(types, requiredSkills, type.typeID),
          specializationSkill: specializationSkillFromRequired(types, requiredSkills, type.typeID),
          requiredSkillIds: buildRequiredSkillIds(requiredSkills, type.typeID),
          metaLevel: type.metaLevel ?? 0,
          metaGroupID: type.metaGroupID ?? 1,
        };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (CHARGE_GROUPS.has(type.groupID)) {
      const trackingMultiplier = values.get("trackingSpeedMultiplier");
      const rangeMultiplier = values.get("weaponRangeMultiplier");
      const falloffMultiplier = values.get("fallofMultiplier");
      const emDamage = values.get("emDamage");
      const thermalDamage = values.get("thermalDamage");
      const kineticDamage = values.get("kineticDamage");
      const explosiveDamage = values.get("explosiveDamage");
      const hasRangeMods = trackingMultiplier !== undefined || rangeMultiplier !== undefined || falloffMultiplier !== undefined;
      const hasDamage = (emDamage ?? 0) + (thermalDamage ?? 0) + (kineticDamage ?? 0) + (explosiveDamage ?? 0) > 0;
      if (hasRangeMods || hasDamage) {
        charges[id] = { id, name: enName, trackingMultiplier, rangeMultiplier, falloffMultiplier, emDamage, thermalDamage, kineticDamage, explosiveDamage };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (LAUNCHER_GROUPS.has(type.groupID)) {
      const stats = buildLauncherStats(values, type.groupID, type, buildRequiredSkillIds(requiredSkills, type.typeID));
      if (stats) {
        launchers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (MISSILE_CHARGE_GROUPS.has(type.groupID)) {
      const stats = buildMissileStats(values, type.groupID, buildRequiredSkillIds(requiredSkills, type.typeID));
      if (stats) {
        missiles[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (SCRIPT_GROUPS.has(type.groupID)) {
      const tracking = values.get("trackingSpeedBonusBonus");
      const optimal = values.get("maxRangeBonusBonus");
      const falloff = values.get("falloffBonusBonus");
      if (tracking !== undefined || optimal !== undefined || falloff !== undefined) {
        scripts[id] = {
          id,
          name: enName,
          trackingMultiplier: 1 + (tracking ?? 0) / 100,
          optimalMultiplier: 1 + (optimal ?? 0) / 100,
          falloffMultiplier: 1 + (falloff ?? 0) / 100,
        };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (EWAR_SCRIPT_GROUPS.has(type.groupID)) {
      const stats = buildDisruptionScriptStats(values);
      if (stats) {
        disruptionScripts[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (groups[String(type.groupID)]?.categoryID === DRONE_CATEGORY_ID) {
      drones[id] = { id, name: enName };
      if (type.groupID === COMBAT_DRONE_GROUP) {
        const stats = buildDroneStats(values, type);
        if (stats) combatDrones[id] = { ...stats, id, name: enName };
      }
      addItemName(itemNames, id, type);
      continue;
    }

    if (type.groupID === STASIS_WEB_GROUP) {
      const stats = buildStasisWebStats(values);
      if (stats) {
        stasisWebs[id] = { ...stats, id, name: enName };
        fittingModules[id] = { stasisWeb: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === STASIS_GRAPPLER_GROUP) {
      const stats = buildStasisGrapplerStats(values);
      if (stats) {
        stasisGrapplers[id] = { ...stats, id, name: enName };
        fittingModules[id] = { stasisGrappler: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === WEAPON_DISRUPTOR_GROUP) {
      const stats = buildTrackingDisruptorStats(values);
      if (stats) {
        trackingDisruptors[id] = { ...stats, id, name: enName };
        fittingModules[id] = { trackingDisruptor: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === TRACKING_COMPUTER_GROUP) {
      const stats = buildTrackingComputerStats(values);
      if (stats) {
        trackingComputers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === WARP_SCRAMBLER_GROUP) {
      const stats = buildWarpScramblerStats(values);
      if (stats) {
        warpScramblers[id] = { ...stats, id, name: enName };
        fittingModules[id] = { warpScrambler: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === TARGET_PAINTER_GROUP) {
      const stats = buildTargetPainterStats(values);
      if (stats) {
        targetPainters[id] = { ...stats, id, name: enName };
        fittingModules[id] = { targetPainter: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === MISSILE_GUIDANCE_COMPUTER_GROUP) {
      const stats = buildMissileGuidanceComputerStats(values);
      if (stats) {
        missileGuidanceComputers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === MISSILE_GUIDANCE_ENHANCER_GROUP) {
      const stats = buildMissileGuidanceEnhancerStats(values);
      if (stats) {
        missileGuidanceEnhancers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === MISSILE_SCRIPT_GROUP) {
      const stats = buildMissileScriptStats(values);
      if (stats) {
        missileScripts[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === OMNIDIRECTIONAL_TRACKING_LINK_GROUP) {
      const stats = buildOmnidirectionalTrackingLinkStats(values);
      if (stats) {
        omnidirectionalTrackingLinks[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === OMNIDIRECTIONAL_TRACKING_ENHANCER_GROUP) {
      const stats = buildOmnidirectionalTrackingEnhancerStats(values);
      if (stats) {
        omnidirectionalTrackingEnhancers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (MODULE_GROUPS.has(type.groupID)) {
      const effects = buildEffectSet(typeDogma);
      if (type.groupID === 46) {
        fittingModules[id] = { ...buildPropulsionStats(values, type), id, name: enName };
        addItemName(itemNames, id, type);
      } else {
        const stats = buildModuleStats(values, effects);
        const defense = buildDefenseStats(values, effects, type.groupID);
        if (stats || defense) {
          fittingModules[id] = { ...stats, defense, id, name: enName };
          addItemName(itemNames, id, type);
        }
      }
    }
  }

  const sortedDrones = Object.fromEntries(
    Object.entries(drones).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, entry]) => [id, entry]),
  );
  const sortedCombatDrones = Object.fromEntries(
    Object.entries(combatDrones).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, entry]) => [id, entry]),
  );

  const skillMagnitudes = buildSkillMagnitudes(attributeNames, typedogmas);

  const date = new Date().toISOString().split("T")[0];
  const header =
    `// Generated from EVE Online SDE via Pyfa staticdata (${date}). Do not edit by hand.\n` +
    `/* eslint-disable */\n\n` +
    `import type { ShipId, TypeId } from "../ids";\n` +
    `import type { HullTier } from "../../ships";\n` +
    `import type { DamageResists } from "../../sim";\n\n`;
  const typeDefinitions = `export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
}

export type DefenseLayer = "shield" | "armor" | "hull";

export interface DefenseRepairerOverload {
  readonly amountMultiplier: number;
  readonly cycleTimeMultiplier: number;
}

export interface DefenseAncillary {
  readonly chargeMultiplier: number;
  readonly shots: number;
  readonly reloadTime: number;
}

export interface DefenseModuleStats {
  readonly kind: "damageControl" | "rah" | "repairer" | "boostAmplifier" | "resistModule" | "shieldExtender" | "armorPlate" | "rechargeModule";
  readonly layer?: DefenseLayer;
  readonly active?: boolean;
  readonly resistBonus?: DamageResists;
  readonly overloadBonusMultiplier?: number;
  readonly shieldResists?: DamageResists;
  readonly armorResists?: DamageResists;
  readonly hullResists?: DamageResists;
  readonly baseArmorResists?: DamageResists;
  readonly resistanceShiftAmount?: number;
  readonly amount?: number;
  readonly cycleTime?: number;
  readonly capacitorNeed?: number;
  readonly heatDamage?: number;
  readonly overload?: DefenseRepairerOverload;
  readonly overloadCycleTimeMultiplier?: number;
  readonly ancillary?: DefenseAncillary;
  readonly multiplier?: number;
  readonly shieldHpAdd?: number;
  readonly armorHpAdd?: number;
  readonly sigRadiusPenalty?: number;
  readonly rechargeMultiplier?: number;
}

export interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercentage?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly sigBonusPercent?: number;
  readonly sigDrawbackPercent?: number;
  readonly agilityDrawbackPercent?: number;
  readonly turretTrackingPercent?: number;
  readonly turretOptimalPercent?: number;
  readonly turretFalloffPercent?: number;
  readonly turretDamageMultiplier?: number;
  readonly turretSpeedMultiplier?: number;
  readonly turretWeaponGroup?: TurretWeaponGroup;
  readonly propulsion?: FittingPropulsionStats;
  readonly stasisWeb?: Omit<StasisWebStats, "id" | "name">;
  readonly stasisGrappler?: Omit<StasisGrapplerStats, "id" | "name">;
  readonly trackingDisruptor?: Omit<TrackingDisruptorStats, "id" | "name">;
  readonly warpScrambler?: Omit<WarpScramblerStats, "id" | "name">;
  readonly targetPainter?: Omit<TargetPainterStats, "id" | "name">;
  readonly missileDamageMultiplier?: number;
  readonly missileCycleTimeMultiplier?: number;
  readonly droneDamageBonus?: number;
  readonly droneControlRangeBonus?: number;
  readonly defense?: DefenseModuleStats;
  readonly id: TypeId;
  readonly name: string;
}

export type TurretWeaponGroup = "Energy Weapon" | "Hybrid Weapon" | "Projectile Weapon";

export interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly damageMultiplier: number;
  readonly cycleTime: number;
  readonly turretSkill?: string;
  readonly specializationSkill?: string;
  readonly requiredSkillIds: readonly TypeId[];
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly id: TypeId;
  readonly name: string;
}

export type HullBonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "maxVelocity" | "agility" | "missileDamage" | "missileRoF" | "turretDamage" | "turretRoF" | "droneDamage" | "armorResist" | "shieldResist" | "shieldHpPercent" | "armorHpPercent" | "hullHpPercent" | "plateHpPercent" | "extenderHpPercent";

export interface HullBonus {
  readonly attribute: HullBonusAttribute;
  readonly magnitude: number;
  readonly skill?: string;
  readonly turretSkill?: string;
  readonly launcherGroup?: number;
}

export type SkillBonusType = "turretDamage" | "turretRoF";

export interface SkillBonus {
  readonly skillId: TypeId;
  readonly bonusType: SkillBonusType;
  readonly magnitudePerLevel: number;
  readonly weaponGroup?: TurretWeaponGroup;
  readonly turretSkill?: string;
  readonly specializationSkill?: string;
}

export interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
  readonly emDamage?: number;
  readonly thermalDamage?: number;
  readonly kineticDamage?: number;
  readonly explosiveDamage?: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface LauncherStats {
  readonly rateOfFire: number;
  readonly launcherGroup: number;
  readonly chargeGroups: readonly number[];
  readonly requiredSkillIds: readonly TypeId[];
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileStats {
  readonly damage: number;
  readonly damageType: "em" | "thermal" | "kinetic" | "explosive";
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number;
  readonly launcherGroup: number;
  readonly chargeGroup: number;
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface TurretScriptStats {
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface StasisWebStats {
  readonly maxRange: number;
  readonly speedFactorPercent: number;
  readonly overloadRangeBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface StasisGrapplerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly speedFactorPercent: number;
  readonly overloadOptimalBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface TrackingDisruptorStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly disruptionPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface DisruptionScriptStats {
  readonly trackingDeltaBonus: number;
  readonly rangeDeltaBonus: number;
  readonly falloffDeltaBonus: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface WarpScramblerStats {
  readonly maxRange: number;
  readonly overloadRangeBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface TrackingComputerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface TargetPainterStats {
  readonly maxRange: number;
  readonly falloff: number;
  readonly signatureRadiusBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileGuidanceComputerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileGuidanceEnhancerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileScriptStats {
  readonly explosionRadiusMultiplier: number;
  readonly explosionVelocityMultiplier: number;
  readonly missileVelocityMultiplier: number;
  readonly flightTimeMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface OmnidirectionalTrackingLinkStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface OmnidirectionalTrackingEnhancerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export type DroneSizeClass = "light" | "medium" | "heavy" | "sentry";

export interface DroneStats {
  readonly sizeClass: DroneSizeClass;
  readonly damageMultiplier: number;
  readonly emDamage: number;
  readonly thermalDamage: number;
  readonly kineticDamage: number;
  readonly explosiveDamage: number;
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly maxVelocity: number;
  readonly orbitSpeed: number;
  readonly orbitRange: number;
  readonly cycleTime: number;
  readonly bandwidth: number;
  readonly volume: number;
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly id: TypeId;
  readonly name: string;
}

`;

  const scriptDefinitions = `export const SCRIPTS: Readonly<Record<string, TurretScriptStats>> = ${stringifyWithTypeIds(scripts)};

export const STASIS_WEBS: Readonly<Record<string, StasisWebStats>> = ${stringifyWithTypeIds(stasisWebs)};

export const STASIS_GRAPPLERS: Readonly<Record<string, StasisGrapplerStats>> = ${stringifyWithTypeIds(stasisGrapplers)};

export const TRACKING_COMPUTERS: Readonly<Record<string, TrackingComputerStats>> = ${stringifyWithTypeIds(trackingComputers)};

export const TRACKING_DISRUPTORS: Readonly<Record<string, TrackingDisruptorStats>> = ${stringifyWithTypeIds(trackingDisruptors)};

export const WARP_SCRAMBLERS: Readonly<Record<string, WarpScramblerStats>> = ${stringifyWithTypeIds(warpScramblers)};

export const DISRUPTION_SCRIPTS: Readonly<Record<string, DisruptionScriptStats>> = ${stringifyWithTypeIds(disruptionScripts)};

export const TARGET_PAINTERS: Readonly<Record<string, TargetPainterStats>> = ${stringifyWithTypeIds(targetPainters)};

export const MISSILE_GUIDANCE_COMPUTERS: Readonly<Record<string, MissileGuidanceComputerStats>> = ${stringifyWithTypeIds(missileGuidanceComputers)};

export const MISSILE_GUIDANCE_ENHANCERS: Readonly<Record<string, MissileGuidanceEnhancerStats>> = ${stringifyWithTypeIds(missileGuidanceEnhancers)};

export const MISSILE_SCRIPTS: Readonly<Record<string, MissileScriptStats>> = ${stringifyWithTypeIds(missileScripts)};

export const OMNIDIRECTIONAL_TRACKING_LINKS: Readonly<Record<string, OmnidirectionalTrackingLinkStats>> = ${stringifyWithTypeIds(omnidirectionalTrackingLinks)};

export const OMNIDIRECTIONAL_TRACKING_ENHANCERS: Readonly<Record<string, OmnidirectionalTrackingEnhancerStats>> = ${stringifyWithTypeIds(omnidirectionalTrackingEnhancers)};

`;

  const lines: string[] = [
    header,
    typeDefinitions,
    scriptDefinitions,
    `export const FITTING_MODULES: Readonly<Record<string, FittingModuleStats>> = ${stringifyWithTypeIds(fittingModules)};`,
    ``,
    `export const TURRETS: Readonly<Record<string, TurretStats>> = ${stringifyWithTypeIds(turrets)};`,
    ``,
    `export const CHARGES: Readonly<Record<string, ChargeStats>> = ${stringifyWithTypeIds(charges)};`,
    ``,
    `export const LAUNCHERS: Readonly<Record<string, LauncherStats>> = ${stringifyWithTypeIds(launchers)};`,
    ``,
    `export const MISSILES: Readonly<Record<string, MissileStats>> = ${stringifyWithTypeIds(missiles)};`,
    ``,
    `export const HULL_BONUSES: Readonly<Record<ShipId, readonly HullBonus[]>> = ${stringifyHullBonuses(hullBonuses)};`,
    ``,
    `export const SKILL_BONUSES: readonly SkillBonus[] = ${stringifySkillBonuses(skillMagnitudes)};`,
    ``,
    `export const DRONES: Readonly<Record<string, { readonly id: TypeId; readonly name: string }>> = ${stringifyWithTypeIds(sortedDrones)};`,
    ``,
    `export const COMBAT_DRONES: Readonly<Record<string, DroneStats>> = ${stringifyWithTypeIds(sortedCombatDrones)};`,
    ``,
  ];

  addInScopeItemNames(itemNames, types, groups, IN_SCOPE_CATEGORY_IDS);
  addSkillNames(itemNames, types);

  const dbTableNames = collectDbTableNames(
    fittingModules,
    turrets,
    charges,
    launchers,
    missiles,
    scripts,
    stasisWebs,
    stasisGrapplers,
    trackingComputers,
    trackingDisruptors,
    warpScramblers,
    disruptionScripts,
    targetPainters,
    missileGuidanceComputers,
    missileGuidanceEnhancers,
    missileScripts,
    omnidirectionalTrackingLinks,
    omnidirectionalTrackingEnhancers,
    drones,
    combatDrones,
  );
  const filteredItemNames = filterItemNames(itemNames, idToType, groups, dbTableNames);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, lines.join("\n"));
  await writeI18nFiles(filteredItemNames, date);
  const counts = [
    `${Object.keys(fittingModules).length} modules`,
    `${Object.keys(turrets).length} turrets`,
    `${Object.keys(charges).length} charges`,
    `${Object.keys(launchers).length} launchers`,
    `${Object.keys(missiles).length} missiles`,
    `${Object.keys(scripts).length} turret scripts`,
    `${Object.keys(stasisWebs).length} stasis webs`,
    `${Object.keys(stasisGrapplers).length} stasis grapplers`,
    `${Object.keys(trackingComputers).length} tracking computers`,
    `${Object.keys(trackingDisruptors).length} tracking disruptors`,
    `${Object.keys(warpScramblers).length} warp scramblers`,
    `${Object.keys(disruptionScripts).length} disruption scripts`,
    `${Object.keys(targetPainters).length} target painters`,
    `${Object.keys(missileGuidanceComputers).length} missile guidance computers`,
    `${Object.keys(missileGuidanceEnhancers).length} missile guidance enhancers`,
    `${Object.keys(missileScripts).length} missile scripts`,
    `${Object.keys(omnidirectionalTrackingLinks).length} omnidirectional tracking links`,
    `${Object.keys(omnidirectionalTrackingEnhancers).length} omnidirectional tracking enhancers`,
    `${Object.keys(hullBonuses).length} hull bonus sets`,
    `${Object.keys(sortedDrones).length} drones`,
    `${Object.keys(sortedCombatDrones).length} combat drones`,
  ];
  console.log(`Wrote ${counts.join(", ")} to ${OUT_FILE}`);
  console.log(`Wrote ${Object.keys(filteredItemNames).length} item names to ${I18N_EN_FILE}, ${I18N_ZH_FILE}, ${I18N_JA_FILE}`);
}

function addItemName(
  itemNames: Record<string, LocalizedName>,
  id: string,
  type: SdeType,
): void {
  const en = type["typeName_en-us"];
  itemNames[id] = {
    en,
    zh: type.typeName_zh?.trim() || en,
    ja: type.typeName_ja?.trim() || en,
  };
}

function addInScopeItemNames(
  itemNames: Record<string, LocalizedName>,
  types: Readonly<Record<string, SdeType>>,
  groups: Readonly<Record<string, SdeGroup>>,
  inScopeCategoryIds: ReadonlySet<number>,
): void {
  const inScopeGroupIds = new Set<string>();
  for (const [gid, group] of Object.entries(groups)) {
    if (inScopeCategoryIds.has(group.categoryID)) inScopeGroupIds.add(gid);
  }
  for (const [id, type] of Object.entries(types)) {
    if (!inScopeGroupIds.has(String(type.groupID))) continue;
    if (id in itemNames) continue;
    addItemName(itemNames, id, type);
  }
}

function relevantSkillIds(): readonly string[] {
  const ids = new Set<string>();
  for (const rule of SKILL_BONUS_RULES) ids.add(String(rule.skillId));
  ids.add(WARHEAD_UPGRADES_SKILL_ID);
  for (const id of DRONE_SKILL_IDS) ids.add(id);
  return [...ids];
}

// Localized names for skill IDs that are not present in the SDE types table.
// These skills were introduced in expansions after the SDE snapshot used by this script.
// When the SDE is updated and these IDs appear in types.0.json, this fallback becomes
// a no-op because addSkillNames checks the SDE first.
const SKILL_NAME_FALLBACKS: Readonly<Record<string, LocalizedName>> = {
  "24241": { en: "Light Drone Operation", zh: "轻型无人机操控理论", ja: "ライトドローンオペレーション" },
  "33699": { en: "Medium Drone Operation", zh: "中型无人机操控理论", ja: "ミディアムドローンオペレーション" },
  "23594": { en: "Sentry Drone Interfacing", zh: "岗哨无人机操控理论", ja: "セントリードローンインターフェイス" },
};

function addSkillNames(itemNames: Record<string, LocalizedName>, types: Readonly<Record<string, SdeType>>): void {
  for (const id of relevantSkillIds()) {
    if (id in itemNames) continue;
    const type = types[id];
    if (type) { addItemName(itemNames, id, type); continue; }
    const fallback = SKILL_NAME_FALLBACKS[id];
    if (fallback) itemNames[id] = fallback;
  }
}

function collectDbTableNames(
  fittingModules: Record<string, FittingModuleStats>,
  turrets: Record<string, TurretStats>,
  charges: Record<string, ChargeStats>,
  launchers: Record<string, LauncherStats>,
  missiles: Record<string, MissileStats>,
  scripts: Record<string, TurretScriptStats>,
  stasisWebs: Record<string, StasisWebStats>,
  stasisGrapplers: Record<string, StasisGrapplerStats>,
  trackingComputers: Record<string, TrackingComputerStats>,
  trackingDisruptors: Record<string, TrackingDisruptorStats>,
  warpScramblers: Record<string, WarpScramblerStats>,
  disruptionScripts: Record<string, DisruptionScriptStats>,
  targetPainters: Record<string, TargetPainterStats>,
  missileGuidanceComputers: Record<string, MissileGuidanceComputerStats>,
  missileGuidanceEnhancers: Record<string, MissileGuidanceEnhancerStats>,
  missileScripts: Record<string, MissileScriptStats>,
  omnidirectionalTrackingLinks: Record<string, Row<OmnidirectionalTrackingLinkStats>>,
  omnidirectionalTrackingEnhancers: Record<string, Row<OmnidirectionalTrackingEnhancerStats>>,
  drones: Record<string, DroneEntry>,
  combatDrones: Record<string, Row<DroneStats>>,
): Set<string> {
  return new Set([
    ...Object.keys(fittingModules),
    ...Object.keys(turrets),
    ...Object.keys(charges),
    ...Object.keys(launchers),
    ...Object.keys(missiles),
    ...Object.keys(scripts),
    ...Object.keys(stasisWebs),
    ...Object.keys(stasisGrapplers),
    ...Object.keys(trackingComputers),
    ...Object.keys(trackingDisruptors),
    ...Object.keys(warpScramblers),
    ...Object.keys(disruptionScripts),
    ...Object.keys(targetPainters),
    ...Object.keys(missileGuidanceComputers),
    ...Object.keys(missileGuidanceEnhancers),
    ...Object.keys(missileScripts),
    ...Object.keys(omnidirectionalTrackingLinks),
    ...Object.keys(omnidirectionalTrackingEnhancers),
    ...Object.keys(drones),
    ...Object.keys(combatDrones),
    ...relevantSkillIds(),
  ]);
}

function isInScopeItem(type: SdeType | undefined, groups: Record<string, SdeGroup>): boolean {
  if (!type) return false;
  const group = groups[String(type.groupID)];
  if (!group) return false;
  return IN_SCOPE_CATEGORY_IDS.has(group.categoryID);
}

function filterItemNames(
  itemNames: Record<string, LocalizedName>,
  idToType: ReadonlyMap<string, SdeType>,
  groups: Record<string, SdeGroup>,
  dbTableNames: ReadonlySet<string>,
): Record<string, LocalizedName> {
  const filtered: Record<string, LocalizedName> = {};
  for (const [id, localizations] of Object.entries(itemNames)) {
    if (dbTableNames.has(id) || isInScopeItem(idToType.get(id), groups)) {
      filtered[id] = localizations;
    }
  }
  return filtered;
}

const CANONICAL_OVERRIDES: Record<ShipNameLanguage, Record<string, string>> = {
  en: {},
  zh: {
    "莱塞勒氏改良型爆炸装甲增强器": "Raysere's Modified Explosive Armor Hardener",
  },
  ja: {
    "ドミネーション炭化鉛弾XL": "Domination Carbonized Lead XL",
    "デュアルアフォーカルパルスレーザーI": "Dual Afocal Pulse Laser I",
    "大型エクスプローシブ・アーマーレインフォーサーII": "Large Explosive Armor Reinforcer II",
    "大型キネティック・アーマーレインフォーサーI": "Large Kinetic Armor Reinforcer I",
    "中型重力子スマートボムII": "Medium Graviton Smartbomb II",
    "共和国海軍仕様炭化鉛弾S": "Republic Fleet Carbonized Lead S",
    "トゥルーサンシャEMコーティング": "True Sansha EM Coating",
  },
};

interface CollisionTables {
  readonly en: Record<string, string>;
  readonly zh: Record<string, string>;
  readonly ja: Record<string, string>;
}

function buildCollisionTables(
  itemNames: Record<string, LocalizedName>,
  canonicalOverrides: Record<ShipNameLanguage, Record<string, string>> = CANONICAL_OVERRIDES,
): CollisionTables {
  const groups: Record<ShipNameLanguage, Map<string, string[]>> = {
    en: new Map(),
    zh: new Map(),
    ja: new Map(),
  };
  const languages: readonly ShipNameLanguage[] = ["en", "zh", "ja"];
  for (const [id, names] of Object.entries(itemNames)) {
    for (const language of languages) {
      const name = (language === "en" ? names.en : names[language]?.trim() || names.en).trim();
      if (name.length === 0) continue;
      const list = groups[language].get(name) ?? [];
      list.push(id);
      groups[language].set(name, list);
    }
  }

  const collisions: Record<ShipNameLanguage, Record<string, string>> = { en: {}, zh: {}, ja: {} };
  for (const language of languages) {
    for (const [name, ids] of groups[language]) {
      if (ids.length < 2) continue;
      const override = canonicalOverrides[language][name];
      let preferred: string;
      if (override) {
        const match = ids.find((id) => itemNames[id].en === override);
        if (!match) throw new Error(`Collision override for ${language} "${name}" maps to unknown English name "${override}"`);
        preferred = match;
      } else {
        preferred = [...ids].sort((a, b) => Number(a) - Number(b))[0];
      }
      collisions[language][name] = preferred;
    }
  }

  for (const language of languages) {
    for (const [name, override] of Object.entries(canonicalOverrides[language])) {
      const ids = groups[language].get(name);
      if (!ids || ids.length < 2) throw new Error(`Collision override for ${language} "${name}" does not match a colliding name`);
      if (!ids.some((id) => itemNames[id].en === override)) throw new Error(`Collision override for ${language} "${name}" maps to unknown English name "${override}"`);
    }
  }

  return collisions;
}

interface WriteI18nOptions {
  readonly enFile?: string;
  readonly zhFile?: string;
  readonly jaFile?: string;
  readonly collisionEnFile?: string;
  readonly collisionZhFile?: string;
  readonly collisionJaFile?: string;
  readonly canonicalOverrides?: Record<ShipNameLanguage, Record<string, string>>;
}

async function writeI18nFiles(
  itemNames: Record<string, LocalizedName>,
  date: string,
  {
    enFile = I18N_EN_FILE,
    zhFile = I18N_ZH_FILE,
    jaFile = I18N_JA_FILE,
    collisionEnFile = COLLISION_EN_FILE,
    collisionZhFile = COLLISION_ZH_FILE,
    collisionJaFile = COLLISION_JA_FILE,
    canonicalOverrides = CANONICAL_OVERRIDES,
  }: WriteI18nOptions = {},
): Promise<void> {
  const sorted = Object.entries(itemNames).sort((a, b) => a[1].en.localeCompare(b[1].en));
  const en: Record<string, string> = {};
  const zh: Record<string, string> = {};
  const ja: Record<string, string> = {};
  for (const [id, names] of sorted) {
    en[id] = names.en;
    zh[id] = names.zh?.trim() || names.en;
    ja[id] = names.ja?.trim() || names.en;
  }
  const header = `// Generated from EVE Online SDE via Pyfa staticdata (${date}). Do not edit by hand.\n/* eslint-disable */\n\n`;
  const recordType = "Readonly<Record<string, string>>";
  const enContent = `${header}export const ITEM_NAMES_EN: ${recordType} = ${JSON.stringify(en)};\n`;
  const zhContent = `${header}export const ITEM_NAMES_ZH: ${recordType} = ${JSON.stringify(zh)};\n`;
  const jaContent = `${header}export const ITEM_NAMES_JA: ${recordType} = ${JSON.stringify(ja)};\n`;

  const collisions = buildCollisionTables(itemNames, canonicalOverrides);
  const collisionEnContent = `${header}export const ITEM_NAME_COLLISIONS_EN: ${recordType} = ${JSON.stringify(collisions.en)};\n`;
  const collisionZhContent = `${header}export const ITEM_NAME_COLLISIONS_ZH: ${recordType} = ${JSON.stringify(collisions.zh)};\n`;
  const collisionJaContent = `${header}export const ITEM_NAME_COLLISIONS_JA: ${recordType} = ${JSON.stringify(collisions.ja)};\n`;

  await mkdir(dirname(enFile), { recursive: true });
  await writeFile(enFile, enContent);
  await mkdir(dirname(zhFile), { recursive: true });
  await writeFile(zhFile, zhContent);
  await mkdir(dirname(jaFile), { recursive: true });
  await writeFile(jaFile, jaContent);
  await mkdir(dirname(collisionEnFile), { recursive: true });
  await writeFile(collisionEnFile, collisionEnContent);
  await mkdir(dirname(collisionZhFile), { recursive: true });
  await writeFile(collisionZhFile, collisionZhContent);
  await mkdir(dirname(collisionJaFile), { recursive: true });
  await writeFile(collisionJaFile, collisionJaContent);
}

export { filterItemNames as _filterItemNames, writeI18nFiles as _writeI18nFiles, buildModuleStats as _buildModuleStats, buildDefenseStats as _buildDefenseStats, buildTargetPainterStats as _buildTargetPainterStats, buildMissileGuidanceComputerStats as _buildMissileGuidanceComputerStats, buildMissileGuidanceEnhancerStats as _buildMissileGuidanceEnhancerStats, buildMissileScriptStats as _buildMissileScriptStats };

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
