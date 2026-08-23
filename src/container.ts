import { createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { AppCradle as AppModuleCradle } from "./app";
import type { AppstateCradle, ClipboardProvider, LocationProvider, StorageProvider } from "./appstate";
import type { FittingCradle } from "./fitting";
import type { ShipsCradle } from "./ships";
import type { SimConfig, SimCradle } from "./sim";
import type { ControlsCradle } from "./ui/controls";
import type { Loop, Renderer } from "./ui";

interface RuntimeValues {
  readonly canvas: HTMLCanvasElement;
  readonly storage: StorageProvider;
  readonly location: LocationProvider;
  readonly clipboard: ClipboardProvider;
  readonly simConfig: SimConfig;
}

type UiCradle = ControlsCradle & AppstateCradle & { readonly renderer: Renderer; readonly loop: Loop };

export type AppCradle = RuntimeValues & SimCradle & FittingCradle & ShipsCradle & AppstateCradle & AppModuleCradle & UiCradle;

// PROXY injection: classes destructure the cradle by property name, which
// survives bundler minification (CLASSIC parses mangled parameter names).
export const container: AwilixContainer<AppCradle> = createContainer<AppCradle>({ injectionMode: InjectionMode.PROXY });
