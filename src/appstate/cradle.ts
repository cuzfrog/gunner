import type { StorageProvider, LocationProvider } from "./providers";
import type { SavedFittings } from "./savedFittings";
import type { SettingsStore } from "./settingsStore";
import type { SettingsParser } from "./settingsParser";
import type { ProfileTextCodec } from "./profileText";
import type { ProfileEquality } from "./profileEquality";
import type { ChargeCatalog, FittingImport, MissileCatalog } from "../fitting";
import type { ItemNameResolver } from "../gamedata/itemNames";
import type { Ships } from "../ships";
import type { SimValueParser } from "../sim";

export interface AppstateCradle {
  readonly settingsStore: SettingsStore;
  readonly parser: SettingsParser;
  readonly savedFittings: SavedFittings;
  readonly profileTextCodec: ProfileTextCodec;
  readonly profileEquality: ProfileEquality;
  readonly simValueParser: SimValueParser;
  readonly storage: StorageProvider;
  readonly location: LocationProvider;
  readonly navigatorLanguage: string;
  readonly ships: Ships;
  readonly fittingImport: FittingImport;
  readonly chargeCatalog: ChargeCatalog;
  readonly missileCatalog: MissileCatalog;
  readonly itemNameResolver: ItemNameResolver;
}
