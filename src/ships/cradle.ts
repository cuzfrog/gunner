import type { GameDataCradle } from "../gamedata";
import type { Ships } from "./index";

export interface ShipsCradle extends GameDataCradle {
  readonly ships: Ships;
}
