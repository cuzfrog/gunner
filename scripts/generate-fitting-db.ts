import { homedir } from "node:os";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ShipId, TypeId } from "../src/gamedata/ids";
import { SHIP_PROFILES } from "../src/gamedata/shipProfiles/profiles";
import type { ShipNameLanguage } from "../src/ships";

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

interface SdeDogmaEffect {
  effectID: number;
}

interface SdeGroup {
  groupID: number;
  categoryID: number;
}

interface SdeTypeDogma {
  dogmaAttributes: readonly { attributeID: number; value: number }[];
  dogmaEffects: readonly SdeDogmaEffect[];
}

type BonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "maxVelocity" | "agility";

interface HullBonusRule {
  readonly attribute: BonusAttribute;
  readonly bonusAttr?: string;
  readonly bonusAttrFallback?: string;
  readonly constant?: number;
  readonly skill?: string;
  readonly turretSkill?: string;
}

interface HullBonus {
  readonly attribute: BonusAttribute;
  readonly magnitude: number;
  readonly skill?: string;
  readonly turretSkill?: string;
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
};

const MODULE_GROUPS = new Set([
  38, // Shield Extender
  46, // Propulsion Module
  78, // Reinforced Bulkhead
  211, // Tracking Enhancer
  // 213 Tracking Computer is handled explicitly below
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
]);

const SCRIPT_GROUPS = new Set([907]);
const EWAR_SCRIPT_GROUPS = new Set([909]);

const WARP_SCRAMBLER_GROUP = 52;
const STASIS_WEB_GROUP = 65;
const STASIS_GRAPPLER_GROUP = 1672;
const TRACKING_COMPUTER_GROUP = 213;
const WEAPON_DISRUPTOR_GROUP = 291;

const TURRET_GROUPS = new Set([53, 55, 74]);

const CHARGE_GROUPS = new Set([
  83, 85, 86,
  372, 373, 374, 375, 376, 377,
  648, 653, 654, 655, 656, 657,
  1677, 1678,
  1987, 1989,
]);

const RIG_SIG_DRAWBACK_EFFECT = 2716;
const RIG_AGILITY_DRAWBACK_EFFECT = 2717;
const SHIP_CATEGORY_ID = 6;

function stringifyWithTypeIds<T>(value: T): string {
  return JSON.stringify(value).replace(/"id":"(\d+)"/g, '"id":"$1" as TypeId');
}

function stringifyHullBonuses(value: Record<ShipId, readonly HullBonus[]>): string {
  const entries = Object.entries(value)
    .map(([shipId, bonuses]) => `[${JSON.stringify(shipId)} as ShipId]:${JSON.stringify(bonuses)}`)
    .join(",");
  return `{${entries}}`;
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
  readonly propulsion?: FittingPropulsionStats;
  readonly stasisWeb?: StasisWebStats;
  readonly stasisGrappler?: StasisGrapplerStats;
  readonly trackingDisruptor?: TrackingDisruptorStats;
  readonly warpScrambler?: WarpScramblerStats;
}

interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly turretSkill?: string;
}

interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
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
  const stats: Record<string, number> = {};

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

  if (Object.keys(stats).length === 0) return undefined;
  return { ...stats };
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
  for (const effectID of effects) {
    const rules = BONUS_EFFECTS[effectID];
    if (!rules) continue;
    for (const rule of rules) {
      const magnitude = resolveBonusMagnitude(rule, values);
      if (magnitude === undefined || !Number.isFinite(magnitude) || magnitude === 0) continue;
      bonuses.push({ attribute: rule.attribute, magnitude, skill: rule.skill, turretSkill: rule.turretSkill });
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

async function main() {
  const types = await loadMerged<SdeType>("types.");
  const typedogmas = await loadMerged<SdeTypeDogma>("typedogma.");
  const attributes = await loadMerged<SdeDogmaAttribute>("dogmaattributes.");
  const groups = await loadMerged<SdeGroup>("groups.");
  const requiredSkills = await loadMerged<Record<string, number>>("requiredskillsfortypes.");
  const attributeNames = buildAttributeNameMap(attributes);
  const shipGroupIds = new Set(Object.values(groups).filter((group) => group.categoryID === SHIP_CATEGORY_ID).map((group) => group.groupID));

  const fittingModules: Record<string, Row<FittingModuleStats>> = {};
  const turrets: Record<string, Row<TurretStats>> = {};
  const charges: Record<string, Row<ChargeStats>> = {};
  const scripts: Record<string, Row<TurretScriptStats>> = {};
  const stasisWebs: Record<string, Row<StasisWebStats>> = {};
  const stasisGrapplers: Record<string, Row<StasisGrapplerStats>> = {};
  const trackingComputers: Record<string, Row<TrackingComputerStats>> = {};
  const trackingDisruptors: Record<string, Row<TrackingDisruptorStats>> = {};
  const warpScramblers: Record<string, Row<WarpScramblerStats>> = {};
  const disruptionScripts: Record<string, Row<DisruptionScriptStats>> = {};
  const hullBonuses: Record<ShipId, readonly HullBonus[]> = {};
  const drones: Record<string, DroneEntry> = {};
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
      if (tracking !== undefined && optimal !== undefined) {
        turrets[id] = {
          id,
          name: enName,
          tracking,
          optimal,
          falloff: values.get("falloff") ?? 0,
          chargeSize: values.get("chargeSize") ?? 1,
          turretSkill: turretSkillFromRequired(types, requiredSkills, type.typeID),
        };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (CHARGE_GROUPS.has(type.groupID)) {
      const trackingMultiplier = values.get("trackingSpeedMultiplier");
      const rangeMultiplier = values.get("weaponRangeMultiplier");
      const falloffMultiplier = values.get("fallofMultiplier");
      if (trackingMultiplier !== undefined || rangeMultiplier !== undefined || falloffMultiplier !== undefined) {
        charges[id] = { id, name: enName, trackingMultiplier, rangeMultiplier, falloffMultiplier };
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

    if (MODULE_GROUPS.has(type.groupID)) {
      const effects = buildEffectSet(typeDogma);
      if (type.groupID === 46) {
        fittingModules[id] = { ...buildPropulsionStats(values, type), id, name: enName };
        addItemName(itemNames, id, type);
      } else {
        const stats = buildModuleStats(values, effects);
        if (stats) {
          fittingModules[id] = { ...stats, id, name: enName };
          addItemName(itemNames, id, type);
        }
      }
    }
  }

  const sortedDrones = Object.fromEntries(
    Object.entries(drones).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, entry]) => [id, entry]),
  );

  const date = new Date().toISOString().split("T")[0];
  const header =
    `// Generated from EVE Online SDE via Pyfa staticdata (${date}). Do not edit by hand.\n` +
    `/* eslint-disable */\n\n` +
    `import type { ShipId, TypeId } from "../ids";\n` +
    `import type { HullTier } from "../../ships";\n\n`;
  const typeDefinitions = `export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
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
  readonly propulsion?: FittingPropulsionStats;
  readonly stasisWeb?: Omit<StasisWebStats, "id" | "name">;
  readonly stasisGrappler?: Omit<StasisGrapplerStats, "id" | "name">;
  readonly trackingDisruptor?: Omit<TrackingDisruptorStats, "id" | "name">;
  readonly warpScrambler?: Omit<WarpScramblerStats, "id" | "name">;
  readonly id: TypeId;
  readonly name: string;
}

export interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly turretSkill?: string;
  readonly id: TypeId;
  readonly name: string;
}

export type HullBonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "maxVelocity" | "agility";

export interface HullBonus {
  readonly attribute: HullBonusAttribute;
  readonly magnitude: number;
  readonly skill?: string;
  readonly turretSkill?: string;
}

export interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
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

`;

  const scriptDefinitions = `export const SCRIPTS: Readonly<Record<string, TurretScriptStats>> = ${stringifyWithTypeIds(scripts)};

export const STASIS_WEBS: Readonly<Record<string, StasisWebStats>> = ${stringifyWithTypeIds(stasisWebs)};

export const STASIS_GRAPPLERS: Readonly<Record<string, StasisGrapplerStats>> = ${stringifyWithTypeIds(stasisGrapplers)};

export const TRACKING_COMPUTERS: Readonly<Record<string, TrackingComputerStats>> = ${stringifyWithTypeIds(trackingComputers)};

export const TRACKING_DISRUPTORS: Readonly<Record<string, TrackingDisruptorStats>> = ${stringifyWithTypeIds(trackingDisruptors)};

export const WARP_SCRAMBLERS: Readonly<Record<string, WarpScramblerStats>> = ${stringifyWithTypeIds(warpScramblers)};

export const DISRUPTION_SCRIPTS: Readonly<Record<string, DisruptionScriptStats>> = ${stringifyWithTypeIds(disruptionScripts)};

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
    `export const HULL_BONUSES: Readonly<Record<ShipId, readonly HullBonus[]>> = ${stringifyHullBonuses(hullBonuses)};`,
    ``,
    `export const DRONES: Readonly<Record<string, { readonly id: TypeId; readonly name: string }>> = ${stringifyWithTypeIds(sortedDrones)};`,
    ``,
  ];

  addInScopeItemNames(itemNames, types, groups, IN_SCOPE_CATEGORY_IDS);

  const dbTableNames = collectDbTableNames(
    fittingModules,
    turrets,
    charges,
    scripts,
    stasisWebs,
    stasisGrapplers,
    trackingComputers,
    trackingDisruptors,
    warpScramblers,
    disruptionScripts,
    drones,
  );
  const filteredItemNames = filterItemNames(itemNames, idToType, groups, dbTableNames);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, lines.join("\n"));
  await writeI18nFiles(filteredItemNames, date);
  const counts = [
    `${Object.keys(fittingModules).length} modules`,
    `${Object.keys(turrets).length} turrets`,
    `${Object.keys(charges).length} charges`,
    `${Object.keys(scripts).length} turret scripts`,
    `${Object.keys(stasisWebs).length} stasis webs`,
    `${Object.keys(stasisGrapplers).length} stasis grapplers`,
    `${Object.keys(trackingComputers).length} tracking computers`,
    `${Object.keys(trackingDisruptors).length} tracking disruptors`,
    `${Object.keys(warpScramblers).length} warp scramblers`,
    `${Object.keys(disruptionScripts).length} disruption scripts`,
    `${Object.keys(hullBonuses).length} hull bonus sets`,
    `${Object.keys(sortedDrones).length} drones`,
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

function collectDbTableNames(
  fittingModules: Record<string, FittingModuleStats>,
  turrets: Record<string, TurretStats>,
  charges: Record<string, ChargeStats>,
  scripts: Record<string, TurretScriptStats>,
  stasisWebs: Record<string, StasisWebStats>,
  stasisGrapplers: Record<string, StasisGrapplerStats>,
  trackingComputers: Record<string, TrackingComputerStats>,
  trackingDisruptors: Record<string, TrackingDisruptorStats>,
  warpScramblers: Record<string, WarpScramblerStats>,
  disruptionScripts: Record<string, DisruptionScriptStats>,
  drones: Record<string, DroneEntry>,
): Set<string> {
  return new Set([
    ...Object.keys(fittingModules),
    ...Object.keys(turrets),
    ...Object.keys(charges),
    ...Object.keys(scripts),
    ...Object.keys(stasisWebs),
    ...Object.keys(stasisGrapplers),
    ...Object.keys(trackingComputers),
    ...Object.keys(trackingDisruptors),
    ...Object.keys(warpScramblers),
    ...Object.keys(disruptionScripts),
    ...Object.keys(drones),
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

export { filterItemNames as _filterItemNames, writeI18nFiles as _writeI18nFiles };

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
