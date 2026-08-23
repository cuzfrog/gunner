import type { AppstateCradle } from "../appstate";
import type { ControlsCradle } from "./controls";
import type { Loop, Renderer } from ".";

export interface UiCradle extends ControlsCradle, AppstateCradle {
  readonly renderer: Renderer;
  readonly loop: Loop;
}
