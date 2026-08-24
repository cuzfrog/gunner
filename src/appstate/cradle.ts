import type { StorageProvider, LocationProvider } from "./providers";
import type { SavedFittings } from "./savedFittings";
import type { SettingsStore } from "./settingsStore";
import type { SettingsParser } from "./settingsParser";
import type { ProfileTextCodec } from "./profileText";
import type { ChargeCatalog, FittingImport } from "../fitting";
import type { Ships } from "../ships";

export interface AppstateCradle {
  readonly settingsStore: SettingsStore;
  readonly parser: SettingsParser;
  readonly savedFittings: SavedFittings;
  readonly profileTextCodec: ProfileTextCodec;
  readonly storage: StorageProvider;
  readonly location: LocationProvider;
  readonly navigatorLanguage: string;
  readonly ships: Ships;
  readonly fittingImport: FittingImport;
  readonly chargeCatalog: ChargeCatalog;
}
