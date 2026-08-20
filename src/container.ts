import { createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { App } from "./app";
import type { Autopilot, HitChance, Kinematics, SimConfig, Simulation } from "./sim";
import type { Controls, Loop, Renderer } from "./ui";
import type { Ships } from "./ships";

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
}

// PROXY injection: classes destructure the cradle by property name, which
// survives bundler minification (CLASSIC parses mangled parameter names).
export const container: AwilixContainer<AppCradle> = createContainer({ injectionMode: InjectionMode.PROXY });
