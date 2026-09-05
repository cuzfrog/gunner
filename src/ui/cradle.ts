import type { AppstateCradle } from "../appstate";
import type { ControlsCradle } from "./controls";
import type { Loop, Renderer } from ".";
import type { ViewStream } from "./viewStream";

export interface UiCradle extends ControlsCradle, AppstateCradle {
  readonly renderer: Renderer;
  readonly loop: Loop;
  readonly viewStream: ViewStream;
}
