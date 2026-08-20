import { createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { App } from "./app";
import type { Autopilot, HitChance, Kinematics, SimConfig, Simulation } from "./sim";
import type { ClipboardProvider, Controls, LocationProvider, Loop, Renderer, StorageProvider } from "./ui";
import type { Ships } from "./ships";
import type { FittingDb, FittingImport } from "./fitting";

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
  fittingImport: FittingImport;
  storage: StorageProvider;
  location: LocationProvider;
  clipboard: ClipboardProvider;
}

// PROXY injection: classes destructure the cradle by property name, which
// survives bundler minification (CLASSIC parses mangled parameter names).
export const container: AwilixContainer<AppCradle> = createContainer({ injectionMode: InjectionMode.PROXY });
