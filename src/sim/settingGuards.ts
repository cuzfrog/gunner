import type { SettingGuards } from "../appstate";
import type { AutopilotMode, SigResolutionClass } from "./types";
import { isAutopilotMode, isSigResolutionClass } from "./types";

export class SimSettingGuards implements SettingGuards {
  isAutopilotMode(value: unknown): value is AutopilotMode {
    return isAutopilotMode(value);
  }

  isSigResolutionClass(value: unknown): value is SigResolutionClass {
    return isSigResolutionClass(value);
  }
}
