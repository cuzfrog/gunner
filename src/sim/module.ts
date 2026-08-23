import { aliasTo, asClass, type AwilixContainer } from "awilix";
import { ReactiveAutopilot } from "./autopilot";
import type { Autopilot } from "./autopilot";
import { EwarResolverImpl } from "./ewarResolver";
import { HitChanceImpl } from "./hitChance";
import { KinematicsImpl } from "./kinematics";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import { SimulationImpl } from "./simulation";
import { StackingPenaltyImpl } from "./stackingPenalty";
import type { SimCradle } from "./cradle";

export function registerSimModule<T extends SimCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    stackingPenalty: asClass(StackingPenaltyImpl).singleton(),
    ewarResolver: asClass(EwarResolverImpl).singleton(),
    kinematics: asClass(KinematicsImpl).singleton(),
    hitChance: asClass(HitChanceImpl).singleton(),
    reactiveSteering: asClass(ReactiveAutopilot).singleton(),
    targetSteering: aliasTo<Autopilot>("reactiveSteering"),
    attackerSteering: asClass(PredictiveAutopilot).singleton(),
    simulation: asClass(SimulationImpl).singleton(),
  });
}
