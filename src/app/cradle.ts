import type { App } from "./app";
import type { Controls, Loop, Renderer } from "../ui";
import type { DefenseSimulator, DroneSimulator, EngagementFrameComposer, EwarResolver, LockClock, MissileBoosterResolver, MissileSimulator, SensorBoosterResolver, Simulation, WeaponClock } from "../sim";

export interface AppCradle {
  readonly app: App;
  readonly controls: Controls;
  readonly simulation: Simulation;
  readonly droneSimulator: DroneSimulator;
  readonly missileSimulator: MissileSimulator;
  readonly defenseSimulator: DefenseSimulator;
  readonly engagementFrameComposer: EngagementFrameComposer;
  readonly ewarResolver: EwarResolver;
  readonly missileBoosterResolver: MissileBoosterResolver;
  readonly sensorBoosterResolver: SensorBoosterResolver;
  readonly weaponClock: WeaponClock;
  readonly lockClock: LockClock;
  readonly renderer: Renderer;
  readonly loop: Loop;
}
