import { toShipId, toTypeId } from "../../gamedata/ids";
import type { FittedHullSummary, ProfileSettings } from "../userSettings";

export const RIFTER_FITTING = `[Rifter, Brawler]
5MN Y-T8 Compact Microwarpdrive
150mm Light AutoCannon II, Hail S`;

export const THRASHER_FITTING = `[Thrasher, Sniper]
280mm Howitzer Artillery I, Republic Fleet EMP S
5MN Y-T8 Compact Microwarpdrive`;

export const SHIP_A_FITTED_HULL: FittedHullSummary = {
  fittingName: "Brawler",
  propulsionId: "mwd-5mn",
  propulsionKind: "microwarpdrive",
  fitted: { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 },
  propulsion: { thrust: 1_500_000, speedBonus: 5, massAddition: 500_000, sigBloom: 5 },
};

export const SHIP_B_FITTED_HULL: FittedHullSummary = {
  fittingName: "Sniper",
  propulsionId: "mwd-5mn",
  propulsionKind: "microwarpdrive",
  fitted: { mass: 1_500_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 },
  propulsion: { thrust: 1_500_000, speedBonus: 5, massAddition: 500_000, sigBloom: 5 },
};

export const FULL_PROFILE: ProfileSettings = {
  version: 13,
  shipATracking: 0.315,
  shipASigRes: "S",
  shipAOptimal: 600,
  shipAFalloff: 3000,
  shipBTracking: 0.12,
  shipBSigRes: "M",
  shipBOptimal: 12000,
  shipBFalloff: 6000,
  shipASpeed: 4649.72,
  shipAMode: "keepAtRange",
  shipARange: 5000,
  shipAAggressivity: 1,
  shipBAggressivity: 1,
  shipAMass: 1_500_000,
  shipAInertia: 2,
  shipASkillLevel: 5,
  shipAOverload: true,
  initialDistance: 5000,
  shipBSpeed: 1000,
  shipBMode: "orbit",
  shipBRange: 5000,
  shipBMass: 10_000_000,
  shipBInertia: 0.45,
  shipBSig: 40,
  shipBSkillLevel: 5,
  shipBOverload: true,
  shipAHullId: toShipId("587"),
  shipAPropulsion: "mwd-5mn",
  shipBHullId: toShipId("16242"),
  shipBPropulsion: "mwd-5mn",
  shipAFitting: RIFTER_FITTING,
  shipAOverrides: { shipAMass: 2_000_000, tracking: 0.12 },
  shipBFitting: THRASHER_FITTING,
  shipBOverrides: { shipBMass: 11_000_000 },
  shipAFittedHull: SHIP_A_FITTED_HULL,
  shipBFittedHull: SHIP_B_FITTED_HULL,
  shipAAmmo: toTypeId("12608"),
  shipBAmmo: toTypeId("21898"),
  shipAEwarActivation: {
    webs: [{ active: true, overloaded: false }, { active: false, overloaded: true }],
    grapplers: [],
    disruptors: [
      { active: true, overloaded: true, script: toTypeId("29005") },
      { active: false, overloaded: false, script: toTypeId("29007") },
    ],
  },
  shipBEwarActivation: { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [{ active: true, overloaded: true, script: "none" }] },
  shipABoosterActivation: [{ active: true, script: toTypeId("28999") }],
  shipBBoosterActivation: [{ active: false, script: "none" }],
};

export const MINIMAL_PROFILE: ProfileSettings = {
  version: 13,
  shipATracking: 0.32,
  shipASigRes: "S",
  shipAOptimal: 5000,
  shipAFalloff: 5000,
  shipBTracking: 0,
  shipBSigRes: "S",
  shipBOptimal: 0,
  shipBFalloff: 0,
  shipASpeed: 0,
  shipAMode: "keepAtRange",
  shipARange: 5000,
  shipAAggressivity: 1,
  shipBAggressivity: 1,
  shipAMass: 1_200_000,
  shipAInertia: 3,
  initialDistance: 5000,
  shipBSpeed: 1000,
  shipBMode: "orbit",
  shipBRange: 5000,
  shipBMass: 10_000_000,
  shipBInertia: 0.45,
  shipBSig: 40,
};
