import { ReactiveAutopilot } from "./autopilot";
import { CapacitorSimulatorImpl } from "./capacitorSimulator";
import type { CapacitorSimulator } from "./capacitorSimulator";
import { DefenseSimulatorImpl } from "./defenseSimulator";
import type { DefenseSimulator } from "./defenseSimulator";
import { DroneSimulatorImpl } from "./droneSimulator";
import type { DroneSimulator } from "./droneSimulator";
import { FighterSimulatorImpl } from "./fighterSimulator";
import type { FighterSimulator } from "./fighterSimulator";
import type { EwarResolver } from "./ewarResolver";
import { expectedHitRoll, sampledHitRoll, type HitRollStrategy } from "./hitRoll";
import { JamClockImpl, expectedJamRoll, sampledJamRoll, type JamClock, type JamRollStrategy } from "./jamClock";
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
import type { StackingPenalty } from "./stackingPenalty";
import type { SimConfig } from "./types";
import { WeaponClockImpl } from "./weaponClock";
import type { WeaponClock } from "./weaponClock";

export interface SimWorld {
  readonly simulation: Simulation;
  readonly lockClock: LockClock;
  readonly jamClock: JamClock;
  readonly droneSimulator: DroneSimulator;
  readonly fighterSimulator: FighterSimulator;
  readonly missileSimulator: MissileSimulator;
  readonly weaponClock: WeaponClock;
  readonly defenseSimulator: DefenseSimulator;
  readonly capacitorSimulator: CapacitorSimulator;
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
  private readonly stackingPenalty: StackingPenalty;

  constructor(deps: { simConfig: SimConfig; ewarResolver: EwarResolver; kinematics: Kinematics; missileApplication: MissileApplication; rngFactory: RngFactory; stackingPenalty: StackingPenalty }) {
    this.simConfig = deps.simConfig;
    this.ewarResolver = deps.ewarResolver;
    this.kinematics = deps.kinematics;
    this.missileApplication = deps.missileApplication;
    this.rngFactory = deps.rngFactory;
    this.stackingPenalty = deps.stackingPenalty;
  }

  createSampled(): SimWorld {
    return this.create(sampledHitRoll, sampledJamRoll);
  }

  createExpected(): SimWorld {
    return this.create(expectedHitRoll, expectedJamRoll);
  }

  private create(hitRoll: HitRollStrategy, jamRoll: JamRollStrategy): SimWorld {
    const reactiveSteering = new ReactiveAutopilot();
    const shipASteering = new PredictiveAutopilot({ reactiveSteering, kinematics: this.kinematics });
    const shipBSteering = new PredictiveAutopilot({ reactiveSteering, kinematics: this.kinematics });
    return {
      simulation: new SimulationImpl({ shipASteering, shipBSteering, ewarResolver: this.ewarResolver, simConfig: this.simConfig }),
      lockClock: new LockClockImpl(),
      jamClock: new JamClockImpl({ resolver: this.ewarResolver, roll: jamRoll, rngFactory: this.rngFactory }),
      droneSimulator: new DroneSimulatorImpl(),
      fighterSimulator: new FighterSimulatorImpl(),
      missileSimulator: new MissileSimulatorImpl({ missileApplication: this.missileApplication }),
      weaponClock: new WeaponClockImpl({ rngFactory: this.rngFactory, hitRoll }),
      defenseSimulator: new DefenseSimulatorImpl({ stackingPenalty: this.stackingPenalty }),
      capacitorSimulator: new CapacitorSimulatorImpl(),
    };
  }
}
