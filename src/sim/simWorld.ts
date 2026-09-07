import { ReactiveAutopilot } from "./autopilot";
import { DefenseSimulatorImpl } from "./defenseSimulator";
import type { DefenseSimulator } from "./defenseSimulator";
import { DroneSimulatorImpl } from "./droneSimulator";
import type { DroneSimulator } from "./droneSimulator";
import type { EwarResolver } from "./ewarResolver";
import { expectedHitRoll, sampledHitRoll, type HitRollStrategy } from "./hitRoll";
import type { Kinematics } from "./kinematics";
import { LockClockImpl } from "./lockClock";
import type { LockClock } from "./lockClock";
import type { MissileApplication } from "./missileApplication";
import { MissileSimulatorImpl } from "./missileSimulator";
import type { MissileSimulator } from "./missileSimulator";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import type { RngFactory } from "./rng";
import { SimulationImpl } from "./simulation";
import type { Simulation } from "./simulation";
import type { SimConfig } from "./types";
import { WeaponClockImpl } from "./weaponClock";
import type { WeaponClock } from "./weaponClock";

export interface SimWorld {
  readonly simulation: Simulation;
  readonly lockClock: LockClock;
  readonly droneSimulator: DroneSimulator;
  readonly missileSimulator: MissileSimulator;
  readonly weaponClock: WeaponClock;
  readonly defenseSimulator: DefenseSimulator;
}

export interface SimWorldFactory {
  createSampled(): SimWorld;
  createExpected(): SimWorld;
}

export class SimWorldFactoryImpl implements SimWorldFactory {
  private readonly simConfig: SimConfig;
  private readonly ewarResolver: EwarResolver;
  private readonly kinematics: Kinematics;
  private readonly missileApplication: MissileApplication;
  private readonly rngFactory: RngFactory;

  constructor(deps: { simConfig: SimConfig; ewarResolver: EwarResolver; kinematics: Kinematics; missileApplication: MissileApplication; rngFactory: RngFactory }) {
    this.simConfig = deps.simConfig;
    this.ewarResolver = deps.ewarResolver;
    this.kinematics = deps.kinematics;
    this.missileApplication = deps.missileApplication;
    this.rngFactory = deps.rngFactory;
  }

  createSampled(): SimWorld {
    return this.create(sampledHitRoll);
  }

  createExpected(): SimWorld {
    return this.create(expectedHitRoll);
  }

  private create(hitRoll: HitRollStrategy): SimWorld {
    const reactiveSteering = new ReactiveAutopilot();
    const shipASteering = new PredictiveAutopilot({ reactiveSteering, kinematics: this.kinematics });
    const shipBSteering = new PredictiveAutopilot({ reactiveSteering, kinematics: this.kinematics });
    return {
      simulation: new SimulationImpl({ shipASteering, shipBSteering, ewarResolver: this.ewarResolver, simConfig: this.simConfig }),
      lockClock: new LockClockImpl(),
      droneSimulator: new DroneSimulatorImpl(),
      missileSimulator: new MissileSimulatorImpl({ missileApplication: this.missileApplication }),
      weaponClock: new WeaponClockImpl({ rngFactory: this.rngFactory, hitRoll }),
      defenseSimulator: new DefenseSimulatorImpl(),
    };
  }
}
