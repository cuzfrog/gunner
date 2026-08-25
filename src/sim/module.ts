import { asClass, type AwilixContainer } from "awilix";
import { ReactiveAutopilot } from "./autopilot";
import { EwarResolverImpl } from "./ewarResolver";
import { EngagementEvaluatorImpl } from "./fireControl";
import { EngagementFrameComposerImpl } from "./engagementFrameComposer";
import { TurretBoosterResolverImpl } from "./turretBoosterResolver";
import { HitChanceImpl } from "./hitChance";
import { KinematicsImpl } from "./kinematics";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import { SimulationImpl } from "./simulation";
import { StackingPenaltyImpl } from "./stackingPenalty";
import { SimSettingGuards } from "./settingGuards";
import type { SimCradle } from "./cradle";

export function registerSimModule<T extends SimCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    settingGuards: asClass(SimSettingGuards).singleton(),
    stackingPenalty: asClass(StackingPenaltyImpl).singleton(),
    ewarResolver: asClass(EwarResolverImpl).singleton(),
    turretBoosterResolver: asClass(TurretBoosterResolverImpl).singleton(),
    kinematics: asClass(KinematicsImpl).singleton(),
    hitChance: asClass(HitChanceImpl).singleton(),
    reactiveSteering: asClass(ReactiveAutopilot).singleton(),
    targetSteering: asClass(PredictiveAutopilot).singleton(),
    attackerSteering: asClass(PredictiveAutopilot).singleton(),
    simulation: asClass(SimulationImpl).singleton(),
    engagementEvaluator: asClass(EngagementEvaluatorImpl).singleton(),
    engagementFrameComposer: asClass(EngagementFrameComposerImpl).singleton(),
  });
}
