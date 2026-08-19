import { asClass, type AwilixContainer } from "awilix";
import { ReactiveAutopilot } from "./autopilot";
import { HitChanceImpl } from "./hitChance";
import { KinematicsImpl } from "./kinematics";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import { SimulationImpl } from "./simulation";

export function registerSimModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    kinematics: asClass(KinematicsImpl).singleton(),
    hitChance: asClass(HitChanceImpl).singleton(),
    targetSteering: asClass(ReactiveAutopilot).singleton(),
    attackerSteering: asClass(PredictiveAutopilot).singleton(),
    simulation: asClass(SimulationImpl).singleton(),
  });
}
