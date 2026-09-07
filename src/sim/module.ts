import { asClass, asFunction, type AwilixContainer } from "awilix";
import { DefenseAssessorImpl } from "./defenseAssessment";
import { DroneApplicationImpl } from "./droneApplication";
import { EwarResolverImpl } from "./ewarResolver";
import { EngagementEvaluatorImpl } from "./fireControl";
import { EngagementFrameComposerImpl } from "./engagementFrameComposer";
import { EngagementEngineImpl } from "./engagementEngine";
import { MissileBoosterResolverImpl } from "./missileBoosterResolver";
import { SensorBoosterResolverImpl } from "./sensorBoosterResolver";
import { HitChanceImpl } from "./hitChance";
import { KinematicsImpl } from "./kinematics";
import { MissileApplicationImpl } from "./missileApplication";
import { Mulberry32RngFactory } from "./rng";
import { StackingPenaltyImpl } from "./stackingPenalty";
import { SimValueParserImpl } from "./simValueParser";
import { SimWorldFactoryImpl } from "./simWorld";
import { TurretBoosterResolverImpl } from "./turretBoosterResolver";
import { WeaponDamageAssessorImpl } from "./weaponDamageAssessor";
import type { SimCradle } from "./cradle";

export function registerSimModule<T extends SimCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    simValueParser: asClass(SimValueParserImpl).singleton(),
    stackingPenalty: asClass(StackingPenaltyImpl).singleton(),
    ewarResolver: asClass(EwarResolverImpl).singleton(),
    turretBoosterResolver: asClass(TurretBoosterResolverImpl).singleton(),
    missileBoosterResolver: asClass(MissileBoosterResolverImpl).singleton(),
    sensorBoosterResolver: asClass(SensorBoosterResolverImpl).singleton(),
    kinematics: asClass(KinematicsImpl).singleton(),
    hitChance: asClass(HitChanceImpl).singleton(),
    missileApplication: asClass(MissileApplicationImpl).singleton(),
    droneApplication: asClass(DroneApplicationImpl).singleton(),
    weaponDamageAssessor: asClass(WeaponDamageAssessorImpl).singleton(),
    engagementEvaluator: asClass(EngagementEvaluatorImpl).singleton(),
    engagementFrameComposer: asClass(EngagementFrameComposerImpl).singleton(),
    defenseAssessor: asClass(DefenseAssessorImpl).singleton(),
    rngFactory: asClass(Mulberry32RngFactory).singleton(),
    simWorldFactory: asClass(SimWorldFactoryImpl).singleton(),
    live: asFunction((cradle: SimCradle) => cradle.simWorldFactory.createSampled()).singleton(),
    projection: asFunction((cradle: SimCradle) => cradle.simWorldFactory.createExpected()).singleton(),
    engine: asClass(EngagementEngineImpl).singleton(),
  });
}
