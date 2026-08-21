import { createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { App } from "./app";
import type { Autopilot, HitChance, Kinematics, SimConfig, Simulation } from "./sim";
import type { ClipboardProvider, Controls, LocationProvider, Loop, Renderer, SavedFittings, StorageProvider, Timer } from "./ui";
import type { Ships } from "./ships";
import type { ChargeCatalog, FittingDb, FittingImport, PresetFittings } from "./fitting";

export interface AppCradle {
  canvas: HTMLCanvasElement;
  simConfig: SimConfig;
  attackerSteering: Autopilot;
  targetSteering: Autopilot;
  kinematics: Kinematics;
  hitChance: HitChance;
  simulation: Simulation;
  ships: Ships;
  controls: Controls;
  renderer: Renderer;
  loop: Loop;
  app: App;
  fittingDb: FittingDb;
  chargeCatalog: ChargeCatalog;
  fittingImport: FittingImport;
  presetFittings: PresetFittings;
  storage: StorageProvider;
  location: LocationProvider;
  clipboard: ClipboardProvider;
  savedFittings: SavedFittings;
  timer: Timer;
}

// PROXY injection: classes destructure the cradle by property name, which
// survives bundler minification (CLASSIC parses mangled parameter names).
export const container: AwilixContainer<AppCradle> = createContainer({ injectionMode: InjectionMode.PROXY });
