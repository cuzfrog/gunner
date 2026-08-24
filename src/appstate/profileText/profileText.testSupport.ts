import type { FittedHullSummary, ProfileSettings } from "../userSettings";

export const RIFTER_FITTING = `[Rifter, Brawler]
5MN Y-T8 Compact Microwarpdrive
150mm Light AutoCannon II, Hail S`;

export const THRASHER_FITTING = `[Thrasher, Sniper]
280mm Howitzer Artillery I, Republic Fleet EMP S
5MN Y-T8 Compact Microwarpdrive`;

export const ATTACKER_FITTED_HULL: FittedHullSummary = {
  fittingName: "Brawler",
  propulsionId: "mwd-5mn",
  fitted: { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 },
  propulsion: { thrust: 1_500_000, speedBonus: 5, massAddition: 500_000, sigBloom: 5 },
};

export const TARGET_FITTED_HULL: FittedHullSummary = {
  fittingName: "Sniper",
  propulsionId: "mwd-5mn",
  fitted: { mass: 1_500_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 },
  propulsion: { thrust: 1_500_000, speedBonus: 5, massAddition: 500_000, sigBloom: 5 },
};

export const FULL_PROFILE: ProfileSettings = {
  version: 7,
  tracking: 0.315,
  sigRes: "S",
  optimal: 600,
  falloff: 3000,
  attackerSpeed: 4649.72,
  attackerMode: "keepAtRange",
  attackerRange: 5000,
  maneuverAggressivity: 1,
  attackerMass: 1_500_000,
  attackerInertia: 2,
  attackerSkillLevel: 5,
  attackerOverload: true,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSig: 40,
  targetSkillLevel: 5,
  targetOverload: true,
  attackerHull: "Rifter",
  attackerPropulsion: "mwd-5mn",
  targetHull: "Thrasher",
  targetPropulsion: "mwd-5mn",
  attackerFitting: RIFTER_FITTING,
  attackerOverrides: { attackerMass: 2_000_000, tracking: 0.12 },
  targetFitting: THRASHER_FITTING,
  targetOverrides: { targetMass: 11_000_000 },
  attackerFittedHull: ATTACKER_FITTED_HULL,
  targetFittedHull: TARGET_FITTED_HULL,
  attackerEwarActivation: {
    webs: [true, false],
    disruptors: [
      { active: true, script: "Optimal Range Disruption Script" },
      { active: false, script: "Tracking Speed Disruption Script" },
    ],
  },
  targetEwarActivation: { webs: [false], disruptors: [{ active: true, script: "none" }] },
};

export const MINIMAL_PROFILE: ProfileSettings = {
  version: 7,
  tracking: 0.32,
  sigRes: "S",
  optimal: 5000,
  falloff: 5000,
  attackerSpeed: 0,
  attackerMode: "keepAtRange",
  attackerRange: 5000,
  attackerMass: 1_200_000,
  attackerInertia: 3,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSig: 40,
};
