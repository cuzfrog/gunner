import type { App } from "./app";
import type { Controls, Loop, Renderer } from "../ui";
import type { HitChance, Kinematics, Simulation } from "../sim";

export interface AppCradle {
  readonly app: App;
  readonly controls: Controls;
  readonly simulation: Simulation;
  readonly kinematics: Kinematics;
  readonly hitChance: HitChance;
  readonly renderer: Renderer;
  readonly loop: Loop;
}
