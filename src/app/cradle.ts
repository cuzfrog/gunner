import type { App } from "./app";
import type { Controls, Loop, Renderer } from "../ui";
import type { EngagementFrameComposer, Simulation } from "../sim";

export interface AppCradle {
  readonly app: App;
  readonly controls: Controls;
  readonly simulation: Simulation;
  readonly engagementFrameComposer: EngagementFrameComposer;
  readonly renderer: Renderer;
  readonly loop: Loop;
}
