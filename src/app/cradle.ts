import type { App } from "./app";
import type { Controls, Loop, Renderer } from "../ui";
import type { EngagementEvaluator, Kinematics, Simulation } from "../sim";

export interface AppCradle {
  readonly app: App;
  readonly controls: Controls;
  readonly simulation: Simulation;
  readonly kinematics: Kinematics;
  readonly engagementEvaluator: EngagementEvaluator;
  readonly renderer: Renderer;
  readonly loop: Loop;
}
