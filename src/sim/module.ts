import { asClass, type AwilixContainer } from "awilix";
import { AutopilotImpl } from "./autopilot";
import { HitChanceImpl } from "./hitChance";
import { KinematicsImpl } from "./kinematics";
import { SimulationImpl } from "./simulation";

export function registerSimModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    autopilot: asClass(AutopilotImpl).singleton(),
    kinematics: asClass(KinematicsImpl).singleton(),
    hitChance: asClass(HitChanceImpl).singleton(),
    simulation: asClass(SimulationImpl).singleton(),
  });
}
