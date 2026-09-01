import type { App } from "./app";
import type { Controls, Loop, Renderer } from "../ui";
import type { DroneSimulator, EngagementFrameComposer, EwarResolver, MissileBoosterResolver, MissileSimulator, Simulation } from "../sim";

export interface AppCradle {
  readonly app: App;
  readonly controls: Controls;
  readonly simulation: Simulation;
  readonly droneSimulator: DroneSimulator;
  readonly missileSimulator: MissileSimulator;
  readonly engagementFrameComposer: EngagementFrameComposer;
  readonly ewarResolver: EwarResolver;
  readonly missileBoosterResolver: MissileBoosterResolver;
  readonly renderer: Renderer;
  readonly loop: Loop;
}
