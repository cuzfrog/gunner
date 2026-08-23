import { aliasTo, asClass, type AwilixContainer } from "awilix";
import { ReactiveAutopilot } from "./autopilot";
import type { Autopilot } from "./autopilot";
import { HitChanceImpl } from "./hitChance";
import { KinematicsImpl } from "./kinematics";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import { SimulationImpl } from "./simulation";
import type { SimCradle } from "./cradle";

export function registerSimModule<T extends SimCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    kinematics: asClass(KinematicsImpl).singleton(),
    hitChance: asClass(HitChanceImpl).singleton(),
    reactiveSteering: asClass(ReactiveAutopilot).singleton(),
    targetSteering: aliasTo<Autopilot>("reactiveSteering"),
    attackerSteering: asClass(PredictiveAutopilot).singleton(),
    simulation: asClass(SimulationImpl).singleton(),
  });
}
