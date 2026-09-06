import type { App } from "./app";
import type { Controls, Loop, Renderer } from "../ui";
import type { EngagementEngine } from "../sim";

export interface AppCradle {
  readonly app: App;
  readonly controls: Controls;
  readonly engine: EngagementEngine;
  readonly renderer: Renderer;
  readonly loop: Loop;
}
