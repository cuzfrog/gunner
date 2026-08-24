import type { AutopilotMode, SigResolutionClass } from "../sim";

export interface SettingGuards {
  isAutopilotMode(value: unknown): value is AutopilotMode;
  isSigResolutionClass(value: unknown): value is SigResolutionClass;
}
