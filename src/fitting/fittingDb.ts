// Generated from EVE Online SDE via Pyfa staticdata (2026-08-24). Do not edit by hand.
/* eslint-disable */

import type { HullTier } from "../ships";


export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
}

export interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercentage?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly sigBonusPercent?: number;
  readonly sigDrawbackPercent?: number;
  readonly agilityDrawbackPercent?: number;
  readonly turretTrackingPercent?: number;
  readonly turretOptimalPercent?: number;
  readonly turretFalloffPercent?: number;
  readonly propulsion?: FittingPropulsionStats;
  readonly stasisWeb?: StasisWebStats;
  readonly trackingDisruptor?: TrackingDisruptorStats;
}

export interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly turretSkill?: string;
}

export type HullBonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "maxVelocity" | "agility";

export interface HullBonus {
  readonly attribute: HullBonusAttribute;
  readonly magnitude: number;
  readonly skill?: string;
  readonly turretSkill?: string;
}

export interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
}

export interface TurretScriptStats {
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
}

export interface StasisWebStats {
  readonly maxRange: number;
  readonly speedFactorPercent: number;
  readonly overloadRangeBonusPercent: number;
}

export interface TrackingDisruptorStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly disruptionPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

export interface DisruptionScriptStats {
  readonly trackingDeltaBonus: number;
  readonly rangeDeltaBonus: number;
}


export const SCRIPTS = {
  "Optimal Range Script": {
    "trackingMultiplier": 0,
    "optimalMultiplier": 2,
    "falloffMultiplier": 2
  },
  "Tracking Speed Script": {
    "trackingMultiplier": 2,
    "optimalMultiplier": 0,
    "falloffMultiplier": 0
  }
} as unknown as Readonly<Record<string, TurretScriptStats>>;

export const STASIS_WEBS = {
  "Stasis Webifier I": {
    "maxRange": 10000,
    "speedFactorPercent": -50,
    "overloadRangeBonusPercent": 30
  },
  "Stasis Webifier II": {
    "maxRange": 10000,
    "speedFactorPercent": -60,
    "overloadRangeBonusPercent": 30
  },
  "X5 Enduring Stasis Webifier": {
    "maxRange": 10000,
    "speedFactorPercent": -55,
    "overloadRangeBonusPercent": 30
  },
  "Fleeting Compact Stasis Webifier": {
    "maxRange": 10000,
    "speedFactorPercent": -55,
    "overloadRangeBonusPercent": 30
  },
  "Dark Blood Stasis Webifier": {
    "maxRange": 15000,
    "speedFactorPercent": -55,
    "overloadRangeBonusPercent": 30
  },
  "Domination Stasis Webifier": {
    "maxRange": 15000,
    "speedFactorPercent": -50,
    "overloadRangeBonusPercent": 30
  },
  "Dread Guristas Stasis Webifier": {
    "maxRange": 13000,
    "speedFactorPercent": -55,
    "overloadRangeBonusPercent": 30
  },
  "True Sansha Stasis Webifier": {
    "maxRange": 15000,
    "speedFactorPercent": -55,
    "overloadRangeBonusPercent": 30
  },
  "Shadow Serpentis Stasis Webifier": {
    "maxRange": 14000,
    "speedFactorPercent": -60,
    "overloadRangeBonusPercent": 30
  },
  "Mizuro's Modified Stasis Webifier": {
    "maxRange": 17000,
    "speedFactorPercent": -60,
    "overloadRangeBonusPercent": 30
  },
  "Hakim's Modified Stasis Webifier": {
    "maxRange": 18000,
    "speedFactorPercent": -60,
    "overloadRangeBonusPercent": 30
  },
  "Gotan's Modified Stasis Webifier": {
    "maxRange": 19000,
    "speedFactorPercent": -60,
    "overloadRangeBonusPercent": 30
  },
  "Tobias' Modified Stasis Webifier": {
    "maxRange": 20000,
    "speedFactorPercent": -60,
    "overloadRangeBonusPercent": 30
  },
  "Caldari Navy Stasis Webifier": {
    "maxRange": 13000,
    "speedFactorPercent": -55,
    "overloadRangeBonusPercent": 30
  },
  "Federation Navy Stasis Webifier": {
    "maxRange": 14000,
    "speedFactorPercent": -60,
    "overloadRangeBonusPercent": 30
  },
  "Khanid Navy Stasis Webifier": {
    "maxRange": 12000,
    "speedFactorPercent": -60,
    "overloadRangeBonusPercent": 30
  },
  "Civilian Stasis Webifier": {
    "maxRange": 10000,
    "speedFactorPercent": -35,
    "overloadRangeBonusPercent": 30
  },
  "Republic Fleet Stasis Webifier": {
    "maxRange": 15000,
    "speedFactorPercent": -50,
    "overloadRangeBonusPercent": 30
  }
} as unknown as Readonly<Record<string, StasisWebStats>>;

export const TRACKING_DISRUPTORS = {
  "Tracking Disruptor I": {
    "optimal": 40000,
    "falloff": 20000,
    "disruptionPercent": -15.3,
    "overloadStrengthBonusPercent": 20
  },
  "Tracking Disruptor II": {
    "optimal": 48000,
    "falloff": 24000,
    "disruptionPercent": -17.19,
    "overloadStrengthBonusPercent": 20
  },
  "Baker Nunn Enduring Tracking Disruptor I": {
    "optimal": 40000,
    "falloff": 20000,
    "disruptionPercent": -16.24,
    "overloadStrengthBonusPercent": 20
  },
  "Balmer Series Compact Tracking Disruptor I": {
    "optimal": 40000,
    "falloff": 20000,
    "disruptionPercent": -16.24,
    "overloadStrengthBonusPercent": 20
  },
  "DDO Scoped Tracking Disruptor I": {
    "optimal": 44000,
    "falloff": 22000,
    "disruptionPercent": -16.24,
    "overloadStrengthBonusPercent": 20
  },
  "'Investor' Tracking Disruptor I": {
    "optimal": 48000,
    "falloff": 24000,
    "disruptionPercent": -17.19,
    "overloadStrengthBonusPercent": 20
  }
} as unknown as Readonly<Record<string, TrackingDisruptorStats>>;

export const DISRUPTION_SCRIPTS = {
  "Optimal Range Disruption Script": {
    "trackingDeltaBonus": -100,
    "rangeDeltaBonus": 100
  },
  "Tracking Speed Disruption Script": {
    "trackingDeltaBonus": 100,
    "rangeDeltaBonus": -100
  }
} as unknown as Readonly<Record<string, DisruptionScriptStats>>;


export const FITTING_MODULES = {
  "Small Shield Extender I": {
    "sigRadiusAdd": 2
  },
  "Small Shield Extender II": {
    "sigRadiusAdd": 2
  },
  "5MN Microwarpdrive I": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5,
      "massAddition": 500000,
      "sigBloom": 5
    }
  },
  "1MN Afterburner II": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.35,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "1MN Afterburner I": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.15,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "5MN Microwarpdrive II": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.1,
      "massAddition": 500000,
      "sigBloom": 4.75
    }
  },
  "Stasis Webifier I": {
    "stasisWeb": {
      "maxRange": 10000,
      "speedFactorPercent": -50,
      "overloadRangeBonusPercent": 30
    }
  },
  "Stasis Webifier II": {
    "stasisWeb": {
      "maxRange": 10000,
      "speedFactorPercent": -60,
      "overloadRangeBonusPercent": 30
    }
  },
  "'Basic' Overdrive Injector System": {
    "speedBonusPercent": 6
  },
  "Overdrive Injector System II": {
    "speedBonusPercent": 12.5
  },
  "'Basic' Reinforced Bulkheads": {
    "agilityMultiplier": 1.01
  },
  "'Basic' Nanofiber Internal Structure": {
    "speedBonusPercent": 5.25,
    "agilityMultiplier": 0.8975
  },
  "Overdrive Injector System I": {
    "speedBonusPercent": 10.5
  },
  "Reinforced Bulkheads I": {
    "agilityMultiplier": 1.03
  },
  "Reinforced Bulkheads II": {
    "agilityMultiplier": 1.05
  },
  "'Basic' Inertial Stabilizers": {
    "agilityMultiplier": 0.86,
    "sigBonusPercent": 5
  },
  "Inertial Stabilizers I": {
    "agilityMultiplier": 0.8325,
    "sigBonusPercent": 10
  },
  "Inertial Stabilizers II": {
    "agilityMultiplier": 0.8,
    "sigBonusPercent": 11
  },
  "'Basic' Tracking Enhancer": {
    "turretTrackingPercent": 6,
    "turretOptimalPercent": 5,
    "turretFalloffPercent": 10
  },
  "Tracking Computer I": {
    "turretTrackingPercent": 10,
    "turretOptimalPercent": 5,
    "turretFalloffPercent": 10
  },
  "Tracking Computer II": {
    "turretTrackingPercent": 15,
    "turretOptimalPercent": 7.5,
    "turretFalloffPercent": 15
  },
  "Tracking Enhancer I": {
    "turretTrackingPercent": 7,
    "turretOptimalPercent": 7.25,
    "turretFalloffPercent": 14.5
  },
  "Tracking Enhancer II": {
    "turretTrackingPercent": 9.5,
    "turretOptimalPercent": 10,
    "turretFalloffPercent": 20
  },
  "Tracking Disruptor I": {
    "trackingDisruptor": {
      "optimal": 40000,
      "falloff": 20000,
      "disruptionPercent": -15.3,
      "overloadStrengthBonusPercent": 20
    }
  },
  "Tracking Disruptor II": {
    "trackingDisruptor": {
      "optimal": 48000,
      "falloff": 24000,
      "disruptionPercent": -17.19,
      "overloadStrengthBonusPercent": 20
    }
  },
  "Nanofiber Internal Structure I": {
    "speedBonusPercent": 7.75,
    "agilityMultiplier": 0.87
  },
  "Nanofiber Internal Structure II": {
    "speedBonusPercent": 9.5,
    "agilityMultiplier": 0.8425
  },
  "Medium Shield Extender I": {
    "sigRadiusAdd": 7
  },
  "Medium Shield Extender II": {
    "sigRadiusAdd": 7
  },
  "Large Shield Extender I": {
    "sigRadiusAdd": 25
  },
  "Large Shield Extender II": {
    "sigRadiusAdd": 25
  },
  "X5 Enduring Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 10000,
      "speedFactorPercent": -55,
      "overloadRangeBonusPercent": 30
    }
  },
  "Fleeting Compact Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 10000,
      "speedFactorPercent": -55,
      "overloadRangeBonusPercent": 30
    }
  },
  "Baker Nunn Enduring Tracking Disruptor I": {
    "trackingDisruptor": {
      "optimal": 40000,
      "falloff": 20000,
      "disruptionPercent": -16.24,
      "overloadStrengthBonusPercent": 20
    }
  },
  "Balmer Series Compact Tracking Disruptor I": {
    "trackingDisruptor": {
      "optimal": 40000,
      "falloff": 20000,
      "disruptionPercent": -16.24,
      "overloadStrengthBonusPercent": 20
    }
  },
  "DDO Scoped Tracking Disruptor I": {
    "trackingDisruptor": {
      "optimal": 44000,
      "falloff": 22000,
      "disruptionPercent": -16.24,
      "overloadStrengthBonusPercent": 20
    }
  },
  "Type-D Restrained Inertial Stabilizers": {
    "agilityMultiplier": 0.815,
    "sigBonusPercent": 8
  },
  "Type-D Restrained Nanofiber Structure": {
    "speedBonusPercent": 8.5,
    "agilityMultiplier": 0.855
  },
  "Type-D Restrained Overdrive Injector": {
    "speedBonusPercent": 11.75
  },
  "Type-D Restrained Reinforced Bulkheads": {
    "agilityMultiplier": 1.01
  },
  "Mark I Compact Reinforced Bulkheads": {
    "agilityMultiplier": 1.03
  },
  "500MN Cold-Gas Enduring Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.05,
      "massAddition": 50000000,
      "sigBloom": 5
    }
  },
  "100MN Monopropellant Enduring Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.25,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "5MN Cold-Gas Enduring Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.05,
      "massAddition": 500000,
      "sigBloom": 5
    }
  },
  "5MN Y-T8 Compact Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.05,
      "massAddition": 500000,
      "sigBloom": 5
    }
  },
  "50MN Cold-Gas Enduring Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.05,
      "massAddition": 5000000,
      "sigBloom": 5
    }
  },
  "1MN Y-S8 Compact Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.25,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "1MN Monopropellant Enduring Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.25,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "10MN Monopropellant Enduring Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.25,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Optical Compact Tracking Computer": {
    "turretTrackingPercent": 12,
    "turretOptimalPercent": 6,
    "turretFalloffPercent": 12
  },
  "F-12 Enduring Tracking Computer": {
    "turretTrackingPercent": 12,
    "turretOptimalPercent": 6,
    "turretFalloffPercent": 12
  },
  "Fourier Compact Tracking Enhancer": {
    "turretTrackingPercent": 8,
    "turretOptimalPercent": 8.25,
    "turretFalloffPercent": 16.5
  },
  "Large Azeotropic Restrained Shield Extender": {
    "sigRadiusAdd": 15
  },
  "Medium Azeotropic Restrained Shield Extender": {
    "sigRadiusAdd": 3
  },
  "Medium F-S9 Regolith Compact Shield Extender": {
    "sigRadiusAdd": 7
  },
  "Small F-S9 Regolith Compact Shield Extender": {
    "sigRadiusAdd": 2
  },
  "Large F-S9 Regolith Compact Shield Extender": {
    "sigRadiusAdd": 25
  },
  "1600mm Steel Plates I": {
    "massAddition": 3500000
  },
  "100mm Steel Plates I": {
    "massAddition": 35000
  },
  "200mm Steel Plates I": {
    "massAddition": 140000
  },
  "400mm Steel Plates I": {
    "massAddition": 350000
  },
  "800mm Steel Plates I": {
    "massAddition": 1350000
  },
  "400mm Rolled Tungsten Compact Plates": {
    "massAddition": 350000
  },
  "400mm Crystalline Carbonide Restrained Plates": {
    "massAddition": 300000
  },
  "800mm Rolled Tungsten Compact Plates": {
    "massAddition": 1350000
  },
  "800mm Crystalline Carbonide Restrained Plates": {
    "massAddition": 1200000
  },
  "1600mm Rolled Tungsten Compact Plates": {
    "massAddition": 3500000
  },
  "1600mm Crystalline Carbonide Restrained Plates": {
    "massAddition": 3000000
  },
  "100mm Rolled Tungsten Compact Plates": {
    "massAddition": 35000
  },
  "100mm Crystalline Carbonide Restrained Plates": {
    "massAddition": 32500
  },
  "200mm Rolled Tungsten Compact Plates": {
    "massAddition": 140000
  },
  "200mm Crystalline Carbonide Restrained Plates": {
    "massAddition": 120000
  },
  "50MN Microwarpdrive I": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5,
      "massAddition": 5000000,
      "sigBloom": 5
    }
  },
  "500MN Microwarpdrive I": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5,
      "massAddition": 50000000,
      "sigBloom": 5
    }
  },
  "10MN Afterburner I": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.15,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "10MN Afterburner II": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.35,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "100MN Afterburner I": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.15,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "100MN Afterburner II": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.35,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "50MN Microwarpdrive II": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.1,
      "massAddition": 5000000,
      "sigBloom": 4.75
    }
  },
  "500MN Microwarpdrive II": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.1,
      "massAddition": 50000000,
      "sigBloom": 4.75
    }
  },
  "Domination Tracking Enhancer": {
    "turretTrackingPercent": 10,
    "turretOptimalPercent": 10.5,
    "turretFalloffPercent": 21
  },
  "Domination 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.45,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Shadow Serpentis 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.45,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Domination 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.45,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Shadow Serpentis 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.45,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Domination 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.45,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Shadow Serpentis 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.45,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Domination 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.12,
      "massAddition": 50000000,
      "sigBloom": 4.5
    }
  },
  "Shadow Serpentis 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.12,
      "massAddition": 50000000,
      "sigBloom": 4.75
    }
  },
  "Domination 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.12,
      "massAddition": 5000000,
      "sigBloom": 4.5
    }
  },
  "Shadow Serpentis 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.12,
      "massAddition": 5000000,
      "sigBloom": 4.75
    }
  },
  "Domination 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.12,
      "massAddition": 500000,
      "sigBloom": 4.5
    }
  },
  "Shadow Serpentis 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.12,
      "massAddition": 500000,
      "sigBloom": 4.75
    }
  },
  "Domination Overdrive Injector": {
    "speedBonusPercent": 12.5
  },
  "Domination Nanofiber Structure": {
    "speedBonusPercent": 9.5,
    "agilityMultiplier": 0.84
  },
  "Shadow Serpentis Tracking Computer": {
    "turretTrackingPercent": 17.5,
    "turretOptimalPercent": 8,
    "turretFalloffPercent": 16
  },
  "Dark Blood Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 15000,
      "speedFactorPercent": -55,
      "overloadRangeBonusPercent": 30
    }
  },
  "Domination Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 15000,
      "speedFactorPercent": -50,
      "overloadRangeBonusPercent": 30
    }
  },
  "Dread Guristas Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 13000,
      "speedFactorPercent": -55,
      "overloadRangeBonusPercent": 30
    }
  },
  "True Sansha Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 15000,
      "speedFactorPercent": -55,
      "overloadRangeBonusPercent": 30
    }
  },
  "Shadow Serpentis Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 14000,
      "speedFactorPercent": -60,
      "overloadRangeBonusPercent": 30
    }
  },
  "Mizuro's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.5,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Hakim's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.55,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Gotan's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.6,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Tobias' Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.65,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Mizuro's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.14,
      "massAddition": 50000000,
      "sigBloom": 4.3
    }
  },
  "Hakim's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.16,
      "massAddition": 50000000,
      "sigBloom": 4.1
    }
  },
  "Gotan's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.18,
      "massAddition": 50000000,
      "sigBloom": 3.9
    }
  },
  "Tobias' Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.2,
      "massAddition": 50000000,
      "sigBloom": 3.5
    }
  },
  "Brynn's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.5,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Tuvan's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.55,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Setele's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.6,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Cormack's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.65,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Brynn's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.14,
      "massAddition": 50000000,
      "sigBloom": 4.5
    }
  },
  "Tuvan's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.16,
      "massAddition": 50000000,
      "sigBloom": 4.3
    }
  },
  "Setele's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.18,
      "massAddition": 50000000,
      "sigBloom": 4.1
    }
  },
  "Cormack's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.2,
      "massAddition": 50000000,
      "sigBloom": 3.9
    }
  },
  "Mizuro's Modified Tracking Enhancer": {
    "turretTrackingPercent": 12.5,
    "turretOptimalPercent": 11,
    "turretFalloffPercent": 22
  },
  "Hakim's Modified Tracking Enhancer": {
    "turretTrackingPercent": 15,
    "turretOptimalPercent": 11.5,
    "turretFalloffPercent": 23
  },
  "Gotan's Modified Tracking Enhancer": {
    "turretTrackingPercent": 17.5,
    "turretOptimalPercent": 12,
    "turretFalloffPercent": 24
  },
  "Tobias' Modified Tracking Enhancer": {
    "turretTrackingPercent": 20,
    "turretOptimalPercent": 12.5,
    "turretFalloffPercent": 25
  },
  "Mizuro's Modified Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 17000,
      "speedFactorPercent": -60,
      "overloadRangeBonusPercent": 30
    }
  },
  "Hakim's Modified Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 18000,
      "speedFactorPercent": -60,
      "overloadRangeBonusPercent": 30
    }
  },
  "Gotan's Modified Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 19000,
      "speedFactorPercent": -60,
      "overloadRangeBonusPercent": 30
    }
  },
  "Tobias' Modified Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 20000,
      "speedFactorPercent": -60,
      "overloadRangeBonusPercent": 30
    }
  },
  "Brynn's Modified Tracking Computer": {
    "turretTrackingPercent": 18.4,
    "turretOptimalPercent": 8.7,
    "turretFalloffPercent": 17.4
  },
  "Tuvan's Modified Tracking Computer": {
    "turretTrackingPercent": 19.3,
    "turretOptimalPercent": 9.1,
    "turretFalloffPercent": 18.2
  },
  "Setele's Modified Tracking Computer": {
    "turretTrackingPercent": 20.1,
    "turretOptimalPercent": 9.5,
    "turretFalloffPercent": 19
  },
  "Cormack's Modified Tracking Computer": {
    "turretTrackingPercent": 21,
    "turretOptimalPercent": 9.9,
    "turretFalloffPercent": 19.8
  },
  "Republic Fleet 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.12,
      "massAddition": 500000,
      "sigBloom": 4.5
    }
  },
  "Republic Fleet 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.45,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Republic Fleet 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.12,
      "massAddition": 5000000,
      "sigBloom": 4.5
    }
  },
  "Republic Fleet 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.45,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Republic Fleet 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.12,
      "massAddition": 50000000,
      "sigBloom": 4.5
    }
  },
  "Republic Fleet 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.45,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Federation Navy 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.12,
      "massAddition": 500000,
      "sigBloom": 4.75
    }
  },
  "Federation Navy 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.45,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Federation Navy 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.12,
      "massAddition": 5000000,
      "sigBloom": 4.75
    }
  },
  "Federation Navy 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.45,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Federation Navy 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.12,
      "massAddition": 50000000,
      "sigBloom": 4.75
    }
  },
  "Federation Navy 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.45,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Federation Navy Tracking Computer": {
    "turretTrackingPercent": 17.5,
    "turretOptimalPercent": 8,
    "turretFalloffPercent": 16
  },
  "Republic Fleet Overdrive Injector": {
    "speedBonusPercent": 12.5
  },
  "Republic Fleet Nanofiber Structure": {
    "speedBonusPercent": 9.5,
    "agilityMultiplier": 0.84
  },
  "Republic Fleet Tracking Enhancer": {
    "turretTrackingPercent": 10,
    "turretOptimalPercent": 10.5,
    "turretFalloffPercent": 21
  },
  "Caldari Navy Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 13000,
      "speedFactorPercent": -55,
      "overloadRangeBonusPercent": 30
    }
  },
  "Federation Navy Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 14000,
      "speedFactorPercent": -60,
      "overloadRangeBonusPercent": 30
    }
  },
  "Gistii C-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.5,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Gistum C-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.5,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Gist C-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.5,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Gistii B-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.55,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Gistum B-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.55,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Gist B-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.55,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Gistii A-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.6,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Gistum A-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.6,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Gist A-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.6,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Gist X-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.65,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Coreli C-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.5,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Corelum C-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.5,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Core C-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.5,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Coreli B-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.55,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Corelum B-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.55,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Core B-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.55,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Coreli A-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.6,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Corelum A-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.6,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Core A-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.6,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Core X-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.65,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "Coreli C-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.14,
      "massAddition": 500000,
      "sigBloom": 4.5
    }
  },
  "Corelum C-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.14,
      "massAddition": 5000000,
      "sigBloom": 4.5
    }
  },
  "Core C-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.14,
      "massAddition": 50000000,
      "sigBloom": 4.5
    }
  },
  "Coreli B-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.16,
      "massAddition": 500000,
      "sigBloom": 4.3
    }
  },
  "Corelum B-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.16,
      "massAddition": 5000000,
      "sigBloom": 4.3
    }
  },
  "Core B-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.16,
      "massAddition": 50000000,
      "sigBloom": 4.3
    }
  },
  "Coreli A-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.18,
      "massAddition": 500000,
      "sigBloom": 4.1
    }
  },
  "Corelum A-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.18,
      "massAddition": 5000000,
      "sigBloom": 4.1
    }
  },
  "Core A-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.18,
      "massAddition": 50000000,
      "sigBloom": 4.1
    }
  },
  "Core X-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.2,
      "massAddition": 50000000,
      "sigBloom": 3.9
    }
  },
  "Gistii C-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.14,
      "massAddition": 500000,
      "sigBloom": 4.3
    }
  },
  "Gistum C-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.14,
      "massAddition": 5000000,
      "sigBloom": 4.3
    }
  },
  "Gist C-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.14,
      "massAddition": 50000000,
      "sigBloom": 4.3
    }
  },
  "Gistii B-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.16,
      "massAddition": 500000,
      "sigBloom": 4.1
    }
  },
  "Gistum B-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.16,
      "massAddition": 5000000,
      "sigBloom": 4.1
    }
  },
  "Gist B-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.16,
      "massAddition": 50000000,
      "sigBloom": 4.1
    }
  },
  "Gistii A-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.18,
      "massAddition": 500000,
      "sigBloom": 3.9
    }
  },
  "Gistum A-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.18,
      "massAddition": 5000000,
      "sigBloom": 3.9
    }
  },
  "Gist A-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.18,
      "massAddition": 50000000,
      "sigBloom": 3.9
    }
  },
  "Gist X-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.2,
      "massAddition": 50000000,
      "sigBloom": 3.5
    }
  },
  "100mm Steel Plates II": {
    "massAddition": 37500
  },
  "200mm Steel Plates II": {
    "massAddition": 150000
  },
  "400mm Steel Plates II": {
    "massAddition": 375000
  },
  "800mm Steel Plates II": {
    "massAddition": 1450000
  },
  "1600mm Steel Plates II": {
    "massAddition": 3750000
  },
  "Small 'Wolf' Shield Extender": {
    "sigRadiusAdd": 2
  },
  "Medium 'Canyon' Shield Extender": {
    "sigRadiusAdd": 7
  },
  "Large 'Sheriff' Shield Extender": {
    "sigRadiusAdd": 25
  },
  "1MN Analog Booster Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.35,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "10MN Analog Booster Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.35,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "100MN Analog Booster Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.35,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "5MN Digital Booster Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.1,
      "massAddition": 500000,
      "sigBloom": 5
    }
  },
  "50MN Digital Booster Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.1,
      "massAddition": 5000000,
      "sigBloom": 5
    }
  },
  "500MN Digital Booster Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.1,
      "massAddition": 50000000,
      "sigBloom": 5
    }
  },
  "Synthetic Hull Conversion Overdrive Injector": {
    "speedBonusPercent": 12
  },
  "Synthetic Hull Conversion Reinforced Bulkheads": {
    "agilityMultiplier": 1.03
  },
  "Synthetic Hull Conversion Inertial Stabilizers": {
    "agilityMultiplier": 0.8,
    "sigBonusPercent": 6
  },
  "Synthetic Hull Conversion Nanofiber Structure": {
    "speedBonusPercent": 8.75,
    "agilityMultiplier": 0.845
  },
  "1MN Civilian Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 0.6,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "'Marketeer' Tracking Computer": {
    "turretTrackingPercent": 15,
    "turretOptimalPercent": 7.5,
    "turretFalloffPercent": 15
  },
  "'Investor' Tracking Disruptor I": {
    "trackingDisruptor": {
      "optimal": 48000,
      "falloff": 24000,
      "disruptionPercent": -17.19,
      "overloadStrengthBonusPercent": 20
    }
  },
  "'Abatis' 100mm Steel Plates": {
    "massAddition": 35000
  },
  "'Bailey' 1600mm Steel Plates": {
    "massAddition": 3500000
  },
  "'Chainmail' 200mm Steel Plates": {
    "massAddition": 140000
  },
  "'Bastion' 400mm Steel Plates": {
    "massAddition": 350000
  },
  "'Citadella' 100mm Steel Plates": {
    "massAddition": 25000
  },
  "'Barbican' 800mm Steel Plates": {
    "massAddition": 1350000
  },
  "Large EM Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Large Explosive Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Large Kinetic Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Large Thermal Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Large Trimark Armor Pump I": {
    "agilityDrawbackPercent": 10
  },
  "Large Remote Repair Augmentor I": {
    "agilityDrawbackPercent": 10
  },
  "Large Core Defense Capacitor Safeguard I": {
    "sigDrawbackPercent": 10
  },
  "Large Energy Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Large Energy Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Large Energy Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Large Hybrid Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Large Hybrid Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Large Hybrid Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Large Projectile Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Large Projectile Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Large Projectile Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Large Low Friction Nozzle Joints I": {
    "agilityMultiplier": 0.883
  },
  "Large Auxiliary Thrusters I": {
    "speedBonusPercent": 7.25
  },
  "Large Warp Core Optimizer I": {
    "sigDrawbackPercent": 10
  },
  "Large Hyperspatial Velocity Optimizer I": {
    "sigDrawbackPercent": 10
  },
  "Large Polycarbon Engine Housing I": {
    "speedBonusPercent": 5.5,
    "agilityMultiplier": 0.909
  },
  "Large EM Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Large Explosive Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Large Kinetic Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Large Thermal Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Field Purger I": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Operational Solidifier I": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Field Extender I": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Charge Economizer I": {
    "sigDrawbackPercent": 10
  },
  "Large EM Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Large Explosive Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Large Kinetic Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Large Thermal Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Large Remote Repair Augmentor II": {
    "agilityDrawbackPercent": 10
  },
  "Large Trimark Armor Pump II": {
    "agilityDrawbackPercent": 10
  },
  "Large Low Friction Nozzle Joints II": {
    "agilityMultiplier": 0.86
  },
  "Large Polycarbon Engine Housing II": {
    "speedBonusPercent": 6.6,
    "agilityMultiplier": 0.89
  },
  "Large Auxiliary Thrusters II": {
    "speedBonusPercent": 8.75
  },
  "Large Warp Core Optimizer II": {
    "sigDrawbackPercent": 10
  },
  "Large Hyperspatial Velocity Optimizer II": {
    "sigDrawbackPercent": 10
  },
  "Large Energy Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Large Energy Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Large Energy Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Large Hybrid Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Large Hybrid Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Large Hybrid Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Large Projectile Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Large Projectile Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Large Projectile Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Large EM Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Large Explosive Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Large Kinetic Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Large Thermal Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Capacitor Safeguard II": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Charge Economizer II": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Field Extender II": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Field Purger II": {
    "sigDrawbackPercent": 10
  },
  "Large Core Defense Operational Solidifier II": {
    "sigDrawbackPercent": 10
  },
  "Small Remote Repair Augmentor I": {
    "agilityDrawbackPercent": 10
  },
  "Khanid Navy Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 12000,
      "speedFactorPercent": -60,
      "overloadRangeBonusPercent": 30
    }
  },
  "Thukker Large Shield Extender": {
    "sigRadiusAdd": 15
  },
  "Thukker Medium Shield Extender": {
    "sigRadiusAdd": 3
  },
  "Syndicate 100mm Steel Plates": {
    "massAddition": 25000
  },
  "Syndicate 1600mm Steel Plates": {
    "massAddition": 2500000
  },
  "Syndicate 200mm Steel Plates": {
    "massAddition": 100000
  },
  "Syndicate 400mm Steel Plates": {
    "massAddition": 250000
  },
  "Syndicate 800mm Steel Plates": {
    "massAddition": 1000000
  },
  "Civilian Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 10000,
      "speedFactorPercent": -35,
      "overloadRangeBonusPercent": 30
    }
  },
  "Small Trimark Armor Pump I": {
    "agilityDrawbackPercent": 10
  },
  "Capital Trimark Armor Pump I": {
    "agilityDrawbackPercent": 10
  },
  "Small EM Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Medium EM Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Capital EM Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Small EM Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Medium EM Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Capital EM Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Small Explosive Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Medium Explosive Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Capital Explosive Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Small Explosive Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Medium Explosive Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Capital Explosive Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Small Kinetic Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Medium Kinetic Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Capital Kinetic Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Small Kinetic Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Medium Kinetic Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Capital Kinetic Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Small Thermal Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Medium Thermal Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Capital Thermal Armor Reinforcer I": {
    "agilityDrawbackPercent": 10
  },
  "Small Thermal Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Medium Thermal Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Capital Thermal Armor Reinforcer II": {
    "agilityDrawbackPercent": 10
  },
  "Medium Trimark Armor Pump I": {
    "agilityDrawbackPercent": 10
  },
  "Small Trimark Armor Pump II": {
    "agilityDrawbackPercent": 10
  },
  "Medium Trimark Armor Pump II": {
    "agilityDrawbackPercent": 10
  },
  "Capital Trimark Armor Pump II": {
    "agilityDrawbackPercent": 10
  },
  "Medium Remote Repair Augmentor I": {
    "agilityDrawbackPercent": 10
  },
  "Capital Remote Repair Augmentor I": {
    "agilityDrawbackPercent": 10
  },
  "Small Remote Repair Augmentor II": {
    "agilityDrawbackPercent": 10
  },
  "Medium Remote Repair Augmentor II": {
    "agilityDrawbackPercent": 10
  },
  "Capital Remote Repair Augmentor II": {
    "agilityDrawbackPercent": 10
  },
  "Small Auxiliary Thrusters I": {
    "speedBonusPercent": 7.25
  },
  "Medium Auxiliary Thrusters I": {
    "speedBonusPercent": 7.25
  },
  "Capital Auxiliary Thrusters I": {
    "speedBonusPercent": 7.25
  },
  "Small Auxiliary Thrusters II": {
    "speedBonusPercent": 8.75
  },
  "Medium Auxiliary Thrusters II": {
    "speedBonusPercent": 8.75
  },
  "Capital Auxiliary Thrusters II": {
    "speedBonusPercent": 8.75
  },
  "Small Low Friction Nozzle Joints I": {
    "agilityMultiplier": 0.883
  },
  "Medium Low Friction Nozzle Joints I": {
    "agilityMultiplier": 0.883
  },
  "Capital Low Friction Nozzle Joints I": {
    "agilityMultiplier": 0.883
  },
  "Small Hyperspatial Velocity Optimizer I": {
    "sigDrawbackPercent": 10
  },
  "Medium Hyperspatial Velocity Optimizer I": {
    "sigDrawbackPercent": 10
  },
  "Capital Hyperspatial Velocity Optimizer I": {
    "sigDrawbackPercent": 10
  },
  "Small Hyperspatial Velocity Optimizer II": {
    "sigDrawbackPercent": 10
  },
  "Medium Hyperspatial Velocity Optimizer II": {
    "sigDrawbackPercent": 10
  },
  "Capital Hyperspatial Velocity Optimizer II": {
    "sigDrawbackPercent": 10
  },
  "Small Low Friction Nozzle Joints II": {
    "agilityMultiplier": 0.86
  },
  "Medium Low Friction Nozzle Joints II": {
    "agilityMultiplier": 0.86
  },
  "Capital Low Friction Nozzle Joints II": {
    "agilityMultiplier": 0.86
  },
  "Small Polycarbon Engine Housing I": {
    "speedBonusPercent": 5.5,
    "agilityMultiplier": 0.909
  },
  "Medium Polycarbon Engine Housing I": {
    "speedBonusPercent": 5.5,
    "agilityMultiplier": 0.909
  },
  "Capital Polycarbon Engine Housing I": {
    "agilityMultiplier": 0.909
  },
  "Small Polycarbon Engine Housing II": {
    "speedBonusPercent": 6.6,
    "agilityMultiplier": 0.89
  },
  "Medium Polycarbon Engine Housing II": {
    "speedBonusPercent": 6.6,
    "agilityMultiplier": 0.89
  },
  "Capital Polycarbon Engine Housing II": {
    "agilityMultiplier": 0.89
  },
  "Small Warp Core Optimizer I": {
    "sigDrawbackPercent": 10
  },
  "Medium Warp Core Optimizer I": {
    "sigDrawbackPercent": 10
  },
  "Capital Warp Core Optimizer I": {
    "sigDrawbackPercent": 10
  },
  "Small Warp Core Optimizer II": {
    "sigDrawbackPercent": 10
  },
  "Medium Warp Core Optimizer II": {
    "sigDrawbackPercent": 10
  },
  "Capital Warp Core Optimizer II": {
    "sigDrawbackPercent": 10
  },
  "Small Energy Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Medium Energy Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Capital Energy Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Small Energy Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Medium Energy Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Capital Energy Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Small Energy Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Medium Energy Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Capital Energy Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Small Energy Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Medium Energy Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Capital Energy Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Small Energy Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Medium Energy Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Capital Energy Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Small Energy Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Medium Energy Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Capital Energy Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Small Hybrid Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Medium Hybrid Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Capital Hybrid Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Small Hybrid Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Medium Hybrid Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Capital Hybrid Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Small Hybrid Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Medium Hybrid Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Capital Hybrid Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Small Hybrid Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Medium Hybrid Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Capital Hybrid Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Small Hybrid Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Medium Hybrid Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Capital Hybrid Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Small Hybrid Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Medium Hybrid Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Capital Hybrid Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Small Projectile Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Medium Projectile Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Capital Projectile Ambit Extension I": {
    "turretFalloffPercent": 15
  },
  "Small Projectile Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Medium Projectile Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Capital Projectile Ambit Extension II": {
    "turretFalloffPercent": 20
  },
  "Small Projectile Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Medium Projectile Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Capital Projectile Locus Coordinator I": {
    "turretOptimalPercent": 15
  },
  "Small Projectile Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Medium Projectile Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Capital Projectile Locus Coordinator II": {
    "turretOptimalPercent": 20
  },
  "Small Projectile Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Medium Projectile Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Capital Projectile Metastasis Adjuster I": {
    "turretTrackingPercent": 15
  },
  "Small Projectile Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Medium Projectile Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Capital Projectile Metastasis Adjuster II": {
    "turretTrackingPercent": 20
  },
  "Small EM Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Medium EM Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Capital EM Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Small EM Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Medium EM Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Capital EM Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Small Explosive Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Medium Explosive Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Capital Explosive Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Small Explosive Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Medium Explosive Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Capital Explosive Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Small Kinetic Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Medium Kinetic Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Capital Kinetic Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Small Kinetic Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Medium Kinetic Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Capital Kinetic Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Small Thermal Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Medium Thermal Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Capital Thermal Shield Reinforcer I": {
    "sigDrawbackPercent": 10
  },
  "Small Thermal Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Medium Thermal Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Capital Thermal Shield Reinforcer II": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Capacitor Safeguard I": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Capacitor Safeguard I": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Capacitor Safeguard I": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Capacitor Safeguard II": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Capacitor Safeguard II": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Capacitor Safeguard II": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Charge Economizer I": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Charge Economizer I": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Charge Economizer I": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Charge Economizer II": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Charge Economizer II": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Charge Economizer II": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Field Extender I": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Field Extender I": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Field Extender I": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Field Extender II": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Field Extender II": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Field Extender II": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Field Purger I": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Field Purger I": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Field Purger I": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Field Purger II": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Field Purger II": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Field Purger II": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Operational Solidifier I": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Operational Solidifier I": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Operational Solidifier I": {
    "sigDrawbackPercent": 10
  },
  "Small Core Defense Operational Solidifier II": {
    "sigDrawbackPercent": 10
  },
  "Medium Core Defense Operational Solidifier II": {
    "sigDrawbackPercent": 10
  },
  "Capital Core Defense Operational Solidifier II": {
    "sigDrawbackPercent": 10
  },
  "Imperial Navy 100mm Steel Plates": {
    "massAddition": 32500
  },
  "Federation Navy 100mm Steel Plates": {
    "massAddition": 20000
  },
  "Imperial Navy 1600mm Steel Plates": {
    "massAddition": 3000000
  },
  "Federation Navy 1600mm Steel Plates": {
    "massAddition": 2250000
  },
  "Imperial Navy 200mm Steel Plates": {
    "massAddition": 120000
  },
  "Federation Navy 200mm Steel Plates": {
    "massAddition": 90000
  },
  "Imperial Navy 400mm Steel Plates": {
    "massAddition": 300000
  },
  "Federation Navy 400mm Steel Plates": {
    "massAddition": 225000
  },
  "Imperial Navy 800mm Steel Plates": {
    "massAddition": 1200000
  },
  "Federation Navy 800mm Steel Plates": {
    "massAddition": 900000
  },
  "Caldari Navy Small Shield Extender": {
    "sigRadiusAdd": 2
  },
  "Republic Fleet Small Shield Extender": {
    "sigRadiusAdd": 1
  },
  "Caldari Navy Medium Shield Extender": {
    "sigRadiusAdd": 7
  },
  "Republic Fleet Medium Shield Extender": {
    "sigRadiusAdd": 5
  },
  "Caldari Navy Large Shield Extender": {
    "sigRadiusAdd": 25
  },
  "Republic Fleet Large Shield Extender": {
    "sigRadiusAdd": 20
  },
  "Small Higgs Anchor I": {
    "massBonusPercentage": 100,
    "speedBonusPercent": -75,
    "agilityMultiplier": 0.44999999999999996
  },
  "Medium Higgs Anchor I": {
    "massBonusPercentage": 100,
    "speedBonusPercent": -75,
    "agilityMultiplier": 0.44999999999999996
  },
  "Large Higgs Anchor I": {
    "massBonusPercentage": 100,
    "speedBonusPercent": -75,
    "agilityMultiplier": 0.44999999999999996
  },
  "Capital Higgs Anchor I": {
    "massBonusPercentage": 100,
    "speedBonusPercent": -75,
    "agilityMultiplier": 0.44999999999999996
  },
  "Domination Inertial Stabilizers": {
    "agilityMultiplier": 0.795,
    "sigBonusPercent": 7
  },
  "Shadow Serpentis Inertial Stabilizers": {
    "agilityMultiplier": 0.785,
    "sigBonusPercent": 10
  },
  "ORE Reinforced Bulkheads": {
    "agilityMultiplier": 1.04
  },
  "Syndicate Reinforced Bulkheads": {
    "agilityMultiplier": 1.02
  },
  "10MN Y-S8 Compact Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.25,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "100MN Y-S8 Compact Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.25,
      "massAddition": 50000000,
      "sigBloom": 0
    }
  },
  "5MN Quad LiF Restrained Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.05,
      "massAddition": 500000,
      "sigBloom": 4.5
    }
  },
  "50MN Y-T8 Compact Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.05,
      "massAddition": 5000000,
      "sigBloom": 5
    }
  },
  "50MN Quad LiF Restrained Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.05,
      "massAddition": 5000000,
      "sigBloom": 4.5
    }
  },
  "500MN Y-T8 Compact Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.05,
      "massAddition": 50000000,
      "sigBloom": 5
    }
  },
  "500MN Quad LiF Restrained Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.05,
      "massAddition": 50000000,
      "sigBloom": 4.5
    }
  },
  "25000mm Steel Plates I": {
    "massAddition": 80000000
  },
  "25000mm Crystalline Carbonide Restrained Plates": {
    "massAddition": 68000000
  },
  "25000mm Rolled Tungsten Compact Plates": {
    "massAddition": 80000000
  },
  "25000mm Steel Plates II": {
    "massAddition": 88000000
  },
  "Capital Shield Extender I": {
    "sigRadiusAdd": 1000
  },
  "Capital Azeotropic Restrained Shield Extender": {
    "sigRadiusAdd": 800
  },
  "Capital F-S9 Regolith Compact Shield Extender": {
    "sigRadiusAdd": 1000
  },
  "Capital Shield Extender II": {
    "sigRadiusAdd": 1200
  },
  "Republic Fleet Stasis Webifier": {
    "stasisWeb": {
      "maxRange": 15000,
      "speedFactorPercent": -50,
      "overloadRangeBonusPercent": 30
    }
  },
  "10000MN Afterburner I": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.15,
      "massAddition": 500000000,
      "sigBloom": 0
    }
  },
  "10000MN Y-S8 Compact Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.25,
      "massAddition": 500000000,
      "sigBloom": 0
    }
  },
  "10000MN Monopropellant Enduring Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.25,
      "massAddition": 500000000,
      "sigBloom": 0
    }
  },
  "10000MN Afterburner II": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.35,
      "massAddition": 500000000,
      "sigBloom": 0
    }
  },
  "Domination 10000MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.45,
      "massAddition": 500000000,
      "sigBloom": 0
    }
  },
  "Shadow Serpentis 10000MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.45,
      "massAddition": 500000000,
      "sigBloom": 0
    }
  },
  "50000MN Microwarpdrive I": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5,
      "massAddition": 500000000,
      "sigBloom": 5
    }
  },
  "50000MN Y-T8 Compact Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.05,
      "massAddition": 500000000,
      "sigBloom": 5
    }
  },
  "50000MN Quad LiF Restrained Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.05,
      "massAddition": 500000000,
      "sigBloom": 4.5
    }
  },
  "50000MN Cold-Gas Enduring Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.05,
      "massAddition": 500000000,
      "sigBloom": 5
    }
  },
  "50000MN Microwarpdrive II": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.1,
      "massAddition": 500000000,
      "sigBloom": 4.75
    }
  },
  "Domination 50000MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.12,
      "massAddition": 500000000,
      "sigBloom": 4.5
    }
  },
  "Shadow Serpentis 50000MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.12,
      "massAddition": 500000000,
      "sigBloom": 4.75
    }
  },
  "CONCORD 25000mm Steel Plates": {
    "massAddition": 68000000
  },
  "Dark Blood 25000mm Steel Plates": {
    "massAddition": 68000000
  },
  "Shadow Serpentis 25000mm Steel Plates": {
    "massAddition": 68000000
  },
  "CONCORD Capital Shield Extender": {
    "sigRadiusAdd": 800
  },
  "True Sansha Capital Shield Extender": {
    "sigRadiusAdd": 800
  },
  "Dread Guristas Capital Shield Extender": {
    "sigRadiusAdd": 800
  },
  "Domination Capital Shield Extender": {
    "sigRadiusAdd": 800
  },
  "50MN Abyssal Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0
    }
  },
  "5MN Abyssal Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0
    }
  },
  "500MN Abyssal Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0
    }
  },
  "1MN Abyssal Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0
    }
  },
  "10MN Abyssal Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0
    }
  },
  "100MN Abyssal Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0
    }
  },
  "10000MN Abyssal Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0
    }
  },
  "50000MN Abyssal Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0
    }
  },
  "Asine's Modified 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.2,
      "massAddition": 500000,
      "sigBloom": 3.9
    }
  },
  "Ramaku's Modified 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.2,
      "massAddition": 500000,
      "sigBloom": 3.7
    }
  },
  "Sila's Modified 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.2,
      "massAddition": 5000000,
      "sigBloom": 3.7
    }
  },
  "Gara's Modified 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.2,
      "massAddition": 5000000,
      "sigBloom": 3.9
    }
  },
  "Asine's Modified 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.65,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Ramaku's Modified 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.65,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Gara's Modified 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.65,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Sila's Modified 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.65,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Usaras' Modified 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.7,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "Nija's Modified 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.7,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "True Sansha 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.475,
      "massAddition": 500000,
      "sigBloom": 0
    }
  },
  "True Sansha 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.475,
      "massAddition": 5000000,
      "sigBloom": 0
    }
  },
  "Roden’s Modified Nanofiber Internal Structure": {
    "speedBonusPercent": 10,
    "agilityMultiplier": 0.835
  },
  "Imperial Navy 'Atonement' Tracking Enhancer": {
    "turretTrackingPercent": 9.5,
    "turretOptimalPercent": 10,
    "turretFalloffPercent": 20
  },
  "Lorharyth’s Modified Inertial Stabilizer": {
    "agilityMultiplier": 0.775,
    "sigBonusPercent": 9
  }
} as unknown as Readonly<Record<string, FittingModuleStats>>;

export const TURRETS = {
  "Gatling Pulse Laser I": {
    "tracking": 308.125,
    "optimal": 4200,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Light Pulse Laser I": {
    "tracking": 273.75,
    "optimal": 4725,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Light Beam Laser I": {
    "tracking": 117,
    "optimal": 9625,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Pulse Laser I": {
    "tracking": 246.25,
    "optimal": 5250,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Beam Laser I": {
    "tracking": 90,
    "optimal": 11000,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Quad Light Beam Laser I": {
    "tracking": 23.328,
    "optimal": 8800,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Medium Pulse Laser I": {
    "tracking": 28.8,
    "optimal": 9450,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Medium Beam Laser I": {
    "tracking": 12.096,
    "optimal": 19250,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Pulse Laser I": {
    "tracking": 26,
    "optimal": 10500,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Beam Laser I": {
    "tracking": 9.504,
    "optimal": 22000,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Dual Heavy Pulse Laser I": {
    "tracking": 3.75,
    "optimal": 18900,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Heavy Beam Laser I": {
    "tracking": 1.75,
    "optimal": 35000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Pulse Laser I": {
    "tracking": 3.375,
    "optimal": 21000,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Beam Laser I": {
    "tracking": 1.53125,
    "optimal": 40000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Tachyon Beam Laser I": {
    "tracking": 1.39205,
    "optimal": 44000,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "125mm Gatling AutoCannon I": {
    "tracking": 417,
    "optimal": 800,
    "falloff": 4300,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "150mm Light AutoCannon I": {
    "tracking": 362,
    "optimal": 900,
    "falloff": 4730,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "200mm AutoCannon I": {
    "tracking": 315,
    "optimal": 1000,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "250mm Light Artillery Cannon I": {
    "tracking": 80,
    "optimal": 8050,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "280mm Howitzer Artillery I": {
    "tracking": 64,
    "optimal": 10000,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Dual 180mm AutoCannon I": {
    "tracking": 44.68992,
    "optimal": 1600,
    "falloff": 9030,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "220mm Vulcan AutoCannon I": {
    "tracking": 38.8608,
    "optimal": 1800,
    "falloff": 9933,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "425mm AutoCannon I": {
    "tracking": 33.792,
    "optimal": 2000,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "650mm Artillery Cannon I": {
    "tracking": 8.352,
    "optimal": 16100,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "720mm Howitzer Artillery I": {
    "tracking": 6.688,
    "optimal": 20000,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Dual 425mm AutoCannon I": {
    "tracking": 5.7132,
    "optimal": 3200,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 650mm Repeating Cannon I": {
    "tracking": 4.968,
    "optimal": 3600,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "800mm Repeating Cannon I": {
    "tracking": 4.32,
    "optimal": 4000,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1200mm Artillery Cannon I": {
    "tracking": 1.125,
    "optimal": 32200,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1400mm Howitzer Artillery I": {
    "tracking": 0.9,
    "optimal": 40000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "75mm Gatling Rail I": {
    "tracking": 136.5,
    "optimal": 6000,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Light Electron Blaster I": {
    "tracking": 438,
    "optimal": 1000,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Light Ion Blaster I": {
    "tracking": 403.2,
    "optimal": 1250,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Light Neutron Blaster I": {
    "tracking": 379.8,
    "optimal": 1500,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "150mm Railgun I": {
    "tracking": 73.5,
    "optimal": 12000,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Heavy Electron Blaster I": {
    "tracking": 46.08,
    "optimal": 2000,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dual 150mm Railgun I": {
    "tracking": 10.8,
    "optimal": 10800,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Heavy Neutron Blaster I": {
    "tracking": 38.4,
    "optimal": 3000,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Heavy Ion Blaster I": {
    "tracking": 42.24,
    "optimal": 2500,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "250mm Railgun I": {
    "tracking": 5.904,
    "optimal": 21600,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Electron Blaster Cannon I": {
    "tracking": 6,
    "optimal": 4000,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Dual 250mm Railgun I": {
    "tracking": 1.90179,
    "optimal": 21600,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Neutron Blaster Cannon I": {
    "tracking": 5.196,
    "optimal": 6000,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "425mm Railgun I": {
    "tracking": 1.04598,
    "optimal": 43200,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Ion Blaster Cannon I": {
    "tracking": 5.52,
    "optimal": 5000,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "1200mm Artillery Cannon II": {
    "tracking": 1.125,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "125mm Gatling AutoCannon II": {
    "tracking": 417,
    "optimal": 960,
    "falloff": 4300,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "150mm Light AutoCannon II": {
    "tracking": 362,
    "optimal": 1080,
    "falloff": 4730,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "200mm AutoCannon II": {
    "tracking": 315,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "220mm Vulcan AutoCannon II": {
    "tracking": 38.8608,
    "optimal": 2160,
    "falloff": 9933,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "250mm Light Artillery Cannon II": {
    "tracking": 80,
    "optimal": 9660,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "425mm AutoCannon II": {
    "tracking": 33.792,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "650mm Artillery Cannon II": {
    "tracking": 8.352,
    "optimal": 19320,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "800mm Repeating Cannon II": {
    "tracking": 4.32,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 180mm AutoCannon II": {
    "tracking": 44.68992,
    "optimal": 1920,
    "falloff": 9030,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Dual 425mm AutoCannon II": {
    "tracking": 5.7132,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 650mm Repeating Cannon II": {
    "tracking": 4.968,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1400mm Howitzer Artillery II": {
    "tracking": 0.9,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "720mm Howitzer Artillery II": {
    "tracking": 6.688,
    "optimal": 24000,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "280mm Howitzer Artillery II": {
    "tracking": 64,
    "optimal": 12000,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Dual Heavy Beam Laser II": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Light Beam Laser II": {
    "tracking": 117,
    "optimal": 11550,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Light Pulse Laser II": {
    "tracking": 273.75,
    "optimal": 5670,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Focused Medium Beam Laser II": {
    "tracking": 12.096,
    "optimal": 23100,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Gatling Pulse Laser II": {
    "tracking": 308.125,
    "optimal": 5040,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Heavy Beam Laser II": {
    "tracking": 9.504,
    "optimal": 26400,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Small Focused Beam Laser II": {
    "tracking": 90,
    "optimal": 13200,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Pulse Laser II": {
    "tracking": 246.25,
    "optimal": 6300,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Mega Beam Laser II": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Pulse Laser II": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Tachyon Beam Laser II": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "150mm Railgun II": {
    "tracking": 73.5,
    "optimal": 14400,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "250mm Railgun II": {
    "tracking": 5.904,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "425mm Railgun II": {
    "tracking": 1.04598,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "75mm Gatling Rail II": {
    "tracking": 136.5,
    "optimal": 7200,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Dual 150mm Railgun II": {
    "tracking": 10.8,
    "optimal": 12960,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dual 250mm Railgun II": {
    "tracking": 1.90179,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Electron Blaster Cannon II": {
    "tracking": 6,
    "optimal": 4800,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Heavy Electron Blaster II": {
    "tracking": 46.08,
    "optimal": 2400,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Heavy Ion Blaster II": {
    "tracking": 42.24,
    "optimal": 3000,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Heavy Neutron Blaster II": {
    "tracking": 38.4,
    "optimal": 3600,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Ion Blaster Cannon II": {
    "tracking": 5.52,
    "optimal": 6000,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Light Electron Blaster II": {
    "tracking": 438,
    "optimal": 1200,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Light Ion Blaster II": {
    "tracking": 403.2,
    "optimal": 1500,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Light Neutron Blaster II": {
    "tracking": 379.8,
    "optimal": 1800,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Neutron Blaster Cannon II": {
    "tracking": 5.196,
    "optimal": 7200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Quad Light Beam Laser II": {
    "tracking": 23.328,
    "optimal": 10560,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Medium Pulse Laser II": {
    "tracking": 28.8,
    "optimal": 11340,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Pulse Laser II": {
    "tracking": 26,
    "optimal": 12600,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "CONCORD Ion Siege Blaster": {
    "tracking": 0.045885,
    "optimal": 22000,
    "falloff": 25000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "CONCORD Dual 1000mm Railgun": {
    "tracking": 0.019201875,
    "optimal": 132000,
    "falloff": 32000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "CONCORD Dual Giga Pulse Laser": {
    "tracking": 0.04041072,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "CONCORD Dual Giga Beam Laser": {
    "tracking": 0.022911326,
    "optimal": 110000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "CONCORD Quad 3500mm Siege Artillery": {
    "tracking": 0.017955,
    "optimal": 103400,
    "falloff": 90000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "CONCORD Hexa 2500mm Repeating Cannon": {
    "tracking": 0.04359075,
    "optimal": 27500,
    "falloff": 28800,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Dual Heavy Pulse Laser II": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Gatling Modal Laser I": {
    "tracking": 308.125,
    "optimal": 4620,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Gatling Afocal Laser I": {
    "tracking": 308.125,
    "optimal": 4410,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Gatling Modulated Energy Beam I": {
    "tracking": 308.125,
    "optimal": 5040,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Gatling Anode Particle Stream I": {
    "tracking": 308.125,
    "optimal": 4830,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Modal Pulse Laser I": {
    "tracking": 273.75,
    "optimal": 5198,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Afocal Pulse Laser I": {
    "tracking": 273.75,
    "optimal": 4961,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Modulated Pulse Energy Beam I": {
    "tracking": 273.75,
    "optimal": 5670,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Anode Pulse Particle Stream I": {
    "tracking": 273.75,
    "optimal": 5434,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Modal Light Laser I": {
    "tracking": 117,
    "optimal": 10588,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Afocal Light Laser I": {
    "tracking": 117,
    "optimal": 10107,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Modulated Light Energy Beam I": {
    "tracking": 117,
    "optimal": 11550,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dual Anode Light Particle Stream I": {
    "tracking": 117,
    "optimal": 11069,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Modal Pulse Laser I": {
    "tracking": 246.25,
    "optimal": 5775,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Afocal Pulse Laser I": {
    "tracking": 246.25,
    "optimal": 5513,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Modulated Pulse Energy Beam I": {
    "tracking": 246.25,
    "optimal": 6300,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Anode Pulse Particle Stream I": {
    "tracking": 246.25,
    "optimal": 6038,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Modal Laser I": {
    "tracking": 90,
    "optimal": 12100,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Afocal Laser I": {
    "tracking": 90,
    "optimal": 11550,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Modulated Energy Beam I": {
    "tracking": 90,
    "optimal": 13200,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Small Focused Anode Particle Stream I": {
    "tracking": 90,
    "optimal": 12650,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Quad Modal Light Laser I": {
    "tracking": 23.328,
    "optimal": 9680,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Quad Afocal Light Laser I": {
    "tracking": 23.328,
    "optimal": 9240,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Quad Modulated Light Energy Beam I": {
    "tracking": 23.328,
    "optimal": 10560,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Quad Anode Light Particle Stream I": {
    "tracking": 23.328,
    "optimal": 10120,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Modal Pulse Laser I": {
    "tracking": 28.8,
    "optimal": 10395,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Afocal Pulse Laser I": {
    "tracking": 28.8,
    "optimal": 9923,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Modulated Pulse Energy Beam I": {
    "tracking": 28.8,
    "optimal": 11340,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Anode Pulse Particle Stream I": {
    "tracking": 28.8,
    "optimal": 10868,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Modal Medium Laser I": {
    "tracking": 12.096,
    "optimal": 21175,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Afocal Medium Laser I": {
    "tracking": 12.096,
    "optimal": 20213,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Modulated Medium Energy Beam I": {
    "tracking": 12.096,
    "optimal": 23100,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Focused Anode Medium Particle Stream I": {
    "tracking": 12.096,
    "optimal": 22138,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Modal Pulse Laser I": {
    "tracking": 26,
    "optimal": 11550,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Afocal Pulse Laser I": {
    "tracking": 26,
    "optimal": 11025,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Modulated Pulse Energy Beam I": {
    "tracking": 26,
    "optimal": 12600,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Anode Pulse Particle Stream I": {
    "tracking": 26,
    "optimal": 12075,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Modal Laser I": {
    "tracking": 9.504,
    "optimal": 24200,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Afocal Laser I": {
    "tracking": 9.504,
    "optimal": 23100,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Modulated Energy Beam I": {
    "tracking": 9.504,
    "optimal": 26400,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Heavy Anode Particle Stream I": {
    "tracking": 9.504,
    "optimal": 25300,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Dual Heavy Modal Pulse Laser I": {
    "tracking": 3.75,
    "optimal": 20790,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Heavy Afocal Pulse Laser I": {
    "tracking": 3.75,
    "optimal": 19845,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Heavy Modulated Pulse Energy Beam I": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Heavy Anode Pulse Particle Stream I": {
    "tracking": 3.75,
    "optimal": 21735,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Modal Heavy Laser I": {
    "tracking": 1.75,
    "optimal": 38500,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Afocal Heavy Laser I": {
    "tracking": 1.75,
    "optimal": 36750,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Modulated Heavy Energy Beam I": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dual Anode Heavy Particle Stream I": {
    "tracking": 1.75,
    "optimal": 40250,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Modal Pulse Laser I": {
    "tracking": 3.375,
    "optimal": 23100,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Afocal Pulse Laser I": {
    "tracking": 3.375,
    "optimal": 22050,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Modulated Pulse Energy Beam I": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Anode Pulse Particle Stream I": {
    "tracking": 3.375,
    "optimal": 24150,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Modal Laser I": {
    "tracking": 1.53125,
    "optimal": 44000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Afocal Laser I": {
    "tracking": 1.53125,
    "optimal": 42000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Modulated Energy Beam I": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mega Anode Particle Stream I": {
    "tracking": 1.53125,
    "optimal": 46000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Tachyon Modal Laser I": {
    "tracking": 1.39205,
    "optimal": 48400,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Tachyon Afocal Laser I": {
    "tracking": 1.39205,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Tachyon Modulated Energy Beam I": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Tachyon Anode Particle Stream I": {
    "tracking": 1.39205,
    "optimal": 50600,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "75mm Prototype Gauss Gun": {
    "tracking": 136.5,
    "optimal": 7200,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "75mm 'Scout' Accelerator Cannon": {
    "tracking": 136.5,
    "optimal": 6600,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "75mm Carbide Railgun I": {
    "tracking": 136.5,
    "optimal": 6300,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "75mm Compressed Coil Gun I": {
    "tracking": 136.5,
    "optimal": 6900,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "150mm Prototype Gauss Gun": {
    "tracking": 73.5,
    "optimal": 14400,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "150mm 'Scout' Accelerator Cannon": {
    "tracking": 73.5,
    "optimal": 13200,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "150mm Carbide Railgun I": {
    "tracking": 73.5,
    "optimal": 12600,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "150mm Compressed Coil Gun I": {
    "tracking": 73.5,
    "optimal": 13800,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Dual 150mm Prototype Gauss Gun": {
    "tracking": 10.8,
    "optimal": 12960,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dual 150mm 'Scout' Accelerator Cannon": {
    "tracking": 10.8,
    "optimal": 11880,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dual 150mm Carbide Railgun I": {
    "tracking": 10.8,
    "optimal": 11340,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dual 150mm Compressed Coil Gun I": {
    "tracking": 10.8,
    "optimal": 12420,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "250mm Prototype Gauss Gun": {
    "tracking": 5.904,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "250mm 'Scout' Accelerator Cannon": {
    "tracking": 5.904,
    "optimal": 23760,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "250mm Carbide Railgun I": {
    "tracking": 5.904,
    "optimal": 22680,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "250mm Compressed Coil Gun I": {
    "tracking": 5.904,
    "optimal": 24840,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dual 250mm Prototype Gauss Gun": {
    "tracking": 1.90179,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Dual 250mm 'Scout' Accelerator Cannon": {
    "tracking": 1.90179,
    "optimal": 23760,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Dual 250mm Carbide Railgun I": {
    "tracking": 1.90179,
    "optimal": 22680,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Dual 250mm Compressed Coil Gun I": {
    "tracking": 1.90179,
    "optimal": 24840,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "425mm Prototype Gauss Gun": {
    "tracking": 1.04598,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "425mm 'Scout' Accelerator Cannon": {
    "tracking": 1.04598,
    "optimal": 47520,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "425mm Carbide Railgun I": {
    "tracking": 1.04598,
    "optimal": 45360,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "425mm Compressed Coil Gun I": {
    "tracking": 1.04598,
    "optimal": 49680,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Modal Light Electron Particle Accelerator I": {
    "tracking": 438,
    "optimal": 1200,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Limited Light Electron Blaster I": {
    "tracking": 438,
    "optimal": 1100,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Regulated Light Electron Phase Cannon I": {
    "tracking": 438,
    "optimal": 1050,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Anode Light Electron Particle Cannon I": {
    "tracking": 438,
    "optimal": 1150,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Modal Light Ion Particle Accelerator I": {
    "tracking": 403.2,
    "optimal": 1500,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Limited Light Ion Blaster I": {
    "tracking": 403.2,
    "optimal": 1375,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Regulated Light Ion Phase Cannon I": {
    "tracking": 403.2,
    "optimal": 1312,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Anode Light Ion Particle Cannon I": {
    "tracking": 403.2,
    "optimal": 1437,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Modal Light Neutron Particle Accelerator I": {
    "tracking": 379.8,
    "optimal": 1800,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Limited Light Neutron Blaster I": {
    "tracking": 379.8,
    "optimal": 1650,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Regulated Light Neutron Phase Cannon I": {
    "tracking": 379.8,
    "optimal": 1575,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Anode Light Neutron Particle Cannon I": {
    "tracking": 379.8,
    "optimal": 1725,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Modal Electron Particle Accelerator I": {
    "tracking": 46.08,
    "optimal": 2400,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Limited Electron Blaster I": {
    "tracking": 46.08,
    "optimal": 2200,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Regulated Electron Phase Cannon I": {
    "tracking": 46.08,
    "optimal": 2100,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Anode Electron Particle Cannon I": {
    "tracking": 46.08,
    "optimal": 2300,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Modal Ion Particle Accelerator I": {
    "tracking": 42.24,
    "optimal": 3000,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Limited Ion Blaster I": {
    "tracking": 42.24,
    "optimal": 2750,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Regulated Ion Phase Cannon I": {
    "tracking": 42.24,
    "optimal": 2625,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Anode Ion Particle Cannon I": {
    "tracking": 42.24,
    "optimal": 2875,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Modal Neutron Particle Accelerator I": {
    "tracking": 38.4,
    "optimal": 3600,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Limited Neutron Blaster I": {
    "tracking": 38.4,
    "optimal": 3300,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Regulated Neutron Phase Cannon I": {
    "tracking": 38.4,
    "optimal": 3150,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Anode Neutron Particle Cannon I": {
    "tracking": 38.4,
    "optimal": 3450,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Modal Mega Electron Particle Accelerator I": {
    "tracking": 6,
    "optimal": 4800,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Limited Electron Blaster Cannon I": {
    "tracking": 6,
    "optimal": 4400,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Regulated Mega Electron Phase Cannon I": {
    "tracking": 6,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Anode Mega Electron Particle Cannon I": {
    "tracking": 6,
    "optimal": 4600,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Modal Mega Neutron Particle Accelerator I": {
    "tracking": 5.196,
    "optimal": 7200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Limited Mega Neutron Blaster I": {
    "tracking": 5.196,
    "optimal": 6600,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Regulated Mega Neutron Phase Cannon I": {
    "tracking": 5.196,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Anode Mega Neutron Particle Cannon I": {
    "tracking": 5.196,
    "optimal": 6900,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Modal Mega Ion Particle Accelerator I": {
    "tracking": 5.52,
    "optimal": 6000,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Limited Mega Ion Blaster I": {
    "tracking": 5.52,
    "optimal": 5500,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Regulated Mega Ion Phase Cannon I": {
    "tracking": 5.52,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Anode Mega Ion Particle Cannon I": {
    "tracking": 5.52,
    "optimal": 5750,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "125mm Light 'Scout' Autocannon I": {
    "tracking": 417,
    "optimal": 960,
    "falloff": 4300,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "125mm Light Carbine Repeating Cannon I": {
    "tracking": 417,
    "optimal": 840,
    "falloff": 4300,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "125mm Light Gallium Machine Gun": {
    "tracking": 417,
    "optimal": 880,
    "falloff": 4300,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "125mm Light Prototype Automatic Cannon": {
    "tracking": 417,
    "optimal": 920,
    "falloff": 4300,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "150mm Light 'Scout' Autocannon I": {
    "tracking": 362,
    "optimal": 1080,
    "falloff": 4730,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "150mm Light Carbine Repeating Cannon I": {
    "tracking": 362,
    "optimal": 945,
    "falloff": 4730,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "150mm Light Gallium Machine Gun": {
    "tracking": 362,
    "optimal": 990,
    "falloff": 4730,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "150mm Light Prototype Automatic Cannon": {
    "tracking": 362,
    "optimal": 1035,
    "falloff": 4730,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "200mm Light 'Scout' Autocannon I": {
    "tracking": 315,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "200mm Light Carbine Repeating Cannon I": {
    "tracking": 315,
    "optimal": 1050,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "200mm Light Gallium Machine Gun": {
    "tracking": 315,
    "optimal": 1100,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "200mm Light Prototype Automatic Cannon": {
    "tracking": 315,
    "optimal": 1150,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "250mm Light 'Scout' Artillery I": {
    "tracking": 80,
    "optimal": 9660,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "250mm Light Carbine Howitzer I": {
    "tracking": 80,
    "optimal": 8453,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "250mm Light Gallium Cannon": {
    "tracking": 80,
    "optimal": 8855,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "250mm Light Prototype Siege Cannon": {
    "tracking": 80,
    "optimal": 9258,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Dual 180mm 'Scout' Autocannon I": {
    "tracking": 44.68992,
    "optimal": 1920,
    "falloff": 9030,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Dual 180mm Carbine Repeating Cannon I": {
    "tracking": 44.68992,
    "optimal": 1680,
    "falloff": 9030,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Dual 180mm Gallium Machine Gun": {
    "tracking": 44.68992,
    "optimal": 1760,
    "falloff": 9030,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Dual 180mm Prototype Automatic Cannon": {
    "tracking": 44.68992,
    "optimal": 1840,
    "falloff": 9030,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "220mm Medium 'Scout' Autocannon I": {
    "tracking": 38.8608,
    "optimal": 2160,
    "falloff": 9933,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "220mm Medium Carbine Repeating Cannon I": {
    "tracking": 38.8608,
    "optimal": 1890,
    "falloff": 9933,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "220mm Medium Gallium Machine Gun": {
    "tracking": 38.8608,
    "optimal": 1980,
    "falloff": 9933,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "220mm Medium Prototype Automatic Cannon": {
    "tracking": 38.8608,
    "optimal": 2070,
    "falloff": 9933,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "425mm Medium 'Scout' Autocannon I": {
    "tracking": 33.792,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "425mm Medium Carbine Repeating Cannon I": {
    "tracking": 33.792,
    "optimal": 2100,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "425mm Medium Gallium Machine Gun": {
    "tracking": 33.792,
    "optimal": 2200,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "425mm Medium Prototype Automatic Cannon": {
    "tracking": 33.792,
    "optimal": 2300,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "650mm Medium 'Scout' Artillery I": {
    "tracking": 8.352,
    "optimal": 19320,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "650mm Medium Carbine Howitzer I": {
    "tracking": 8.352,
    "optimal": 16905,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "650mm Medium Gallium Cannon": {
    "tracking": 8.352,
    "optimal": 17710,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "650mm Medium Prototype Siege Cannon": {
    "tracking": 8.352,
    "optimal": 18515,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Dual 425mm 'Scout' Autocannon I": {
    "tracking": 5.7132,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 425mm Carbine Repeating Cannon I": {
    "tracking": 5.7132,
    "optimal": 3360,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 425mm Gallium Machine Gun": {
    "tracking": 5.7132,
    "optimal": 3520,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 425mm Prototype Automatic Cannon": {
    "tracking": 5.7132,
    "optimal": 3680,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 650mm 'Scout' Repeating Cannon I": {
    "tracking": 4.968,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 650mm Carbine Repeating Cannon I": {
    "tracking": 4.968,
    "optimal": 3780,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 650mm Gallium Repeating Cannon": {
    "tracking": 4.968,
    "optimal": 3960,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual 650mm Prototype Automatic Cannon": {
    "tracking": 4.968,
    "optimal": 4140,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "800mm Heavy 'Scout' Repeating Cannon I": {
    "tracking": 4.32,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "800mm Heavy Carbine Repeating Cannon I": {
    "tracking": 4.32,
    "optimal": 4200,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "800mm Heavy Gallium Repeating Cannon": {
    "tracking": 4.32,
    "optimal": 4400,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "800mm Heavy Prototype Automatic Cannon": {
    "tracking": 4.32,
    "optimal": 4600,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1200mm Heavy 'Scout' Artillery I": {
    "tracking": 1.125,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1200mm Heavy Carbine Howitzer I": {
    "tracking": 1.125,
    "optimal": 33810,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1200mm Heavy Gallium Cannon": {
    "tracking": 1.125,
    "optimal": 35420,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1200mm Heavy Prototype Siege Cannon": {
    "tracking": 1.125,
    "optimal": 37030,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "280mm 'Scout' Artillery I": {
    "tracking": 64,
    "optimal": 12000,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "280mm Carbine Howitzer I": {
    "tracking": 64,
    "optimal": 10500,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "280mm Gallium Cannon": {
    "tracking": 64,
    "optimal": 11000,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "280mm Prototype Siege Cannon": {
    "tracking": 64,
    "optimal": 11500,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "720mm 'Scout' Artillery I": {
    "tracking": 6.688,
    "optimal": 24000,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "720mm Carbine Howitzer I": {
    "tracking": 6.688,
    "optimal": 21000,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "720mm Gallium Cannon": {
    "tracking": 6.688,
    "optimal": 22000,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "720mm Prototype Siege Cannon": {
    "tracking": 6.688,
    "optimal": 23000,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "1400mm 'Scout' Artillery I": {
    "tracking": 0.9,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1400mm Carbine Howitzer I": {
    "tracking": 0.9,
    "optimal": 42000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1400mm Gallium Cannon": {
    "tracking": 0.9,
    "optimal": 44000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1400mm Prototype Siege Cannon": {
    "tracking": 0.9,
    "optimal": 46000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "125mm Railgun I": {
    "tracking": 89.25,
    "optimal": 9000,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "125mm Railgun II": {
    "tracking": 89.25,
    "optimal": 10800,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "125mm 'Scout' Accelerator Cannon": {
    "tracking": 89.25,
    "optimal": 9900,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "125mm Carbide Railgun I": {
    "tracking": 89.25,
    "optimal": 9450,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "125mm Compressed Coil Gun I": {
    "tracking": 89.25,
    "optimal": 10350,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "125mm Prototype Gauss Gun": {
    "tracking": 89.25,
    "optimal": 10800,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "200mm Railgun I": {
    "tracking": 7.2,
    "optimal": 16200,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "200mm Railgun II": {
    "tracking": 7.2,
    "optimal": 19440,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "350mm Railgun I": {
    "tracking": 1.26828,
    "optimal": 32400,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "350mm Railgun II": {
    "tracking": 1.26828,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Domination 125mm Autocannon": {
    "tracking": 417,
    "optimal": 960,
    "falloff": 4300,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Domination 1200mm Artillery": {
    "tracking": 1.125,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Domination 1400mm Howitzer Artillery": {
    "tracking": 0.9,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Domination 150mm Autocannon": {
    "tracking": 362,
    "optimal": 1080,
    "falloff": 4730,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Domination 200mm Autocannon": {
    "tracking": 315,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Domination 220mm Autocannon": {
    "tracking": 38.8608,
    "optimal": 2160,
    "falloff": 9933,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Domination 250mm Artillery": {
    "tracking": 80,
    "optimal": 9660,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Domination 280mm Howitzer Artillery": {
    "tracking": 64,
    "optimal": 12000,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Domination 425mm Autocannon": {
    "tracking": 33.792,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Domination 650mm Artillery": {
    "tracking": 8.352,
    "optimal": 19320,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Domination 720mm Howitzer Artillery": {
    "tracking": 6.688,
    "optimal": 24000,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Domination 800mm Repeating Cannon": {
    "tracking": 4.32,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Domination Dual 180mm Autocannon": {
    "tracking": 44.68992,
    "optimal": 1920,
    "falloff": 9030,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Domination Dual 425mm Autocannon": {
    "tracking": 5.7132,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Domination Dual 650mm Repeating Cannon": {
    "tracking": 4.968,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dark Blood Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dark Blood Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dark Blood Dual Light Beam Laser": {
    "tracking": 117,
    "optimal": 12032,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dark Blood Dual Light Pulse Laser": {
    "tracking": 273.75,
    "optimal": 5906,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dark Blood Focused Medium Beam Laser": {
    "tracking": 12.096,
    "optimal": 24063,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Dark Blood Focused Medium Pulse Laser": {
    "tracking": 28.8,
    "optimal": 11813,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Dark Blood Gatling Pulse Laser": {
    "tracking": 308.125,
    "optimal": 5250,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dark Blood Heavy Beam Laser": {
    "tracking": 9.504,
    "optimal": 27500,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Dark Blood Heavy Pulse Laser": {
    "tracking": 26,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Dark Blood Small Focused Beam Laser": {
    "tracking": 90,
    "optimal": 13750,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dark Blood Small Focused Pulse Laser": {
    "tracking": 246.25,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Dark Blood Mega Beam Laser": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dark Blood Mega Pulse Laser": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dark Blood Tachyon Beam Laser": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Dark Blood Quad Beam Laser": {
    "tracking": 23.328,
    "optimal": 11000,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "True Sansha Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "True Sansha Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "True Sansha Dual Light Beam Laser": {
    "tracking": 117,
    "optimal": 12032,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "True Sansha Dual Light Pulse Laser": {
    "tracking": 273.75,
    "optimal": 5906,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "True Sansha Focused Medium Beam Laser": {
    "tracking": 12.096,
    "optimal": 24063,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "True Sansha Focused Medium Pulse Laser": {
    "tracking": 28.8,
    "optimal": 11813,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "True Sansha Gatling Pulse Laser": {
    "tracking": 308.125,
    "optimal": 5250,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "True Sansha Heavy Beam Laser": {
    "tracking": 9.504,
    "optimal": 27500,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "True Sansha Heavy Pulse Laser": {
    "tracking": 26,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "True Sansha Small Focused Beam Laser": {
    "tracking": 90,
    "optimal": 13750,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "True Sansha Small Focused Pulse Laser": {
    "tracking": 246.25,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "True Sansha Mega Beam Laser": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "True Sansha Mega Pulse Laser": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "True Sansha Quad Beam Laser": {
    "tracking": 23.328,
    "optimal": 11000,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "True Sansha Tachyon Beam Laser": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Shadow Serpentis 125mm Railgun": {
    "tracking": 89.25,
    "optimal": 10800,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Dread Guristas 125mm Railgun": {
    "tracking": 89.25,
    "optimal": 11700,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Shadow Serpentis 150mm Railgun": {
    "tracking": 73.5,
    "optimal": 14400,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Dread Guristas 150mm Railgun": {
    "tracking": 73.5,
    "optimal": 15600,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Shadow Serpentis 200mm Railgun": {
    "tracking": 7.2,
    "optimal": 16200,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dread Guristas 200mm Railgun": {
    "tracking": 7.2,
    "optimal": 21060,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Shadow Serpentis 250mm Railgun": {
    "tracking": 5.904,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dread Guristas 250mm Railgun": {
    "tracking": 5.904,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Shadow Serpentis 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Dread Guristas 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 42120,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Shadow Serpentis 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Dread Guristas 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 56160,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Shadow Serpentis Dual 150mm Railgun": {
    "tracking": 10.8,
    "optimal": 12960,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dread Guristas Dual 150mm Railgun": {
    "tracking": 10.8,
    "optimal": 14040,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Shadow Serpentis Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Dread Guristas Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Shadow Serpentis Heavy Electron Blaster": {
    "tracking": 46.08,
    "optimal": 2100,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Shadow Serpentis Heavy Ion Blaster": {
    "tracking": 42.24,
    "optimal": 2625,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Shadow Serpentis Light Electron Blaster": {
    "tracking": 438,
    "optimal": 1050,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Shadow Serpentis Light Ion Blaster": {
    "tracking": 403.2,
    "optimal": 1312,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Shadow Serpentis Light Neutron Blaster": {
    "tracking": 379.8,
    "optimal": 1575,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Shadow Serpentis Electron Blaster Cannon": {
    "tracking": 6,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Shadow Serpentis Ion Blaster Cannon": {
    "tracking": 5.52,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Shadow Serpentis Neutron Blaster Cannon": {
    "tracking": 5.196,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Shadow Serpentis Heavy Neutron Blaster": {
    "tracking": 38.4,
    "optimal": 3150,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Dread Guristas 75mm Railgun": {
    "tracking": 136.5,
    "optimal": 7800,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Shadow Serpentis 75mm Railgun": {
    "tracking": 136.5,
    "optimal": 7200,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "200mm Carbide Railgun I": {
    "tracking": 7.2,
    "optimal": 17010,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "200mm 'Scout' Accelerator Cannon": {
    "tracking": 7.2,
    "optimal": 17820,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "200mm Compressed Coil Gun I": {
    "tracking": 7.2,
    "optimal": 18630,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "200mm Prototype Gauss Gun": {
    "tracking": 7.2,
    "optimal": 19440,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "350mm Carbide Railgun I": {
    "tracking": 1.26828,
    "optimal": 34020,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "350mm 'Scout' Accelerator Cannon": {
    "tracking": 1.26828,
    "optimal": 35640,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "350mm Compressed Coil Gun I": {
    "tracking": 1.26828,
    "optimal": 37260,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "350mm Prototype Gauss Gun": {
    "tracking": 1.26828,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Tuvan's Modified Electron Blaster Cannon": {
    "tracking": 6,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Cormack's Modified Electron Blaster Cannon": {
    "tracking": 6,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Cormack's Modified Ion Blaster Cannon": {
    "tracking": 5.52,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Tuvan's Modified Ion Blaster Cannon": {
    "tracking": 5.52,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Tuvan's Modified Neutron Blaster Cannon": {
    "tracking": 5.196,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Cormack's Modified Neutron Blaster Cannon": {
    "tracking": 5.196,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Brynn's Modified 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Setele's Modified 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Kaikka's Modified 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 42120,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Vepas' Modified 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 44226,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Estamel's Modified 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 46332,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Brynn's Modified 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Setele's Modified 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Kaikka's Modified 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 56160,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Vepas' Modified 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 58968,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Estamel's Modified 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 61776,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Brynn's Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Setele's Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Kaikka's Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Vepas' Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 29484,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Estamel's Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 30888,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Selynne's Modified Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Chelm's Modified Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Raysere's Modified Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Draclira's Modified Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Tairei's Modified Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Ahremen's Modified Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Brokara's Modified Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Vizan's Modified Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Selynne's Modified Mega Beam Laser": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Chelm's Modified Mega Beam Laser": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Raysere's Modified Mega Beam Laser": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Draclira's Modified Mega Beam Laser": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Tairei's Modified Mega Pulse Laser": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Ahremen's Modified Mega Pulse Laser": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Brokara's Modified Mega Pulse Laser": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Vizan's Modified Mega Pulse Laser": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Selynne's Modified Tachyon Beam Laser": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Chelm's Modified Tachyon Beam Laser": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Raysere's Modified Tachyon Beam Laser": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Draclira's Modified Tachyon Beam Laser": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Mizuro's Modified 800mm Repeating Cannon": {
    "tracking": 4.32,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Gotan's Modified 800mm Repeating Cannon": {
    "tracking": 4.32,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Hakim's Modified 1200mm Artillery Cannon": {
    "tracking": 1.125,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Tobias' Modified 1200mm Artillery Cannon": {
    "tracking": 1.125,
    "optimal": 33600,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Hakim's Modified 1400mm Howitzer Artillery": {
    "tracking": 0.9,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Tobias' Modified 1400mm Howitzer Artillery": {
    "tracking": 0.9,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Mizuro's Modified Dual 425mm AutoCannon": {
    "tracking": 5.7132,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Gotan's Modified Dual 425mm AutoCannon": {
    "tracking": 5.7132,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Mizuro's Modified Dual 650mm Repeating Cannon": {
    "tracking": 4.968,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Gotan's Modified Dual 650mm Repeating Cannon": {
    "tracking": 4.968,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Caldari Navy Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Caldari Navy Dual 150mm Railgun": {
    "tracking": 10.8,
    "optimal": 14040,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Caldari Navy 75mm Railgun": {
    "tracking": 136.5,
    "optimal": 7800,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Caldari Navy 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 56160,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Caldari Navy 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 42120,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Caldari Navy 250mm Railgun": {
    "tracking": 5.904,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Caldari Navy 200mm Railgun": {
    "tracking": 7.2,
    "optimal": 21060,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Caldari Navy 150mm Railgun": {
    "tracking": 73.5,
    "optimal": 15600,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Caldari Navy 125mm Railgun": {
    "tracking": 89.25,
    "optimal": 11700,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Federation Navy Neutron Blaster Cannon": {
    "tracking": 5.196,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Federation Navy Light Neutron Blaster": {
    "tracking": 379.8,
    "optimal": 1575,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Federation Navy Light Ion Blaster": {
    "tracking": 403.2,
    "optimal": 1312,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Federation Navy Light Electron Blaster": {
    "tracking": 438,
    "optimal": 1050,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Federation Navy Ion Blaster Cannon": {
    "tracking": 5.52,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Federation Navy Heavy Neutron Blaster": {
    "tracking": 38.4,
    "optimal": 3150,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Federation Navy Heavy Ion Blaster": {
    "tracking": 42.24,
    "optimal": 2625,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Federation Navy Heavy Electron Blaster": {
    "tracking": 46.08,
    "optimal": 2100,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Federation Navy Electron Blaster Cannon": {
    "tracking": 6,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Federation Navy Dual 250mm Railgun": {
    "tracking": 1.90179,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Federation Navy Dual 150mm Railgun": {
    "tracking": 10.8,
    "optimal": 12960,
    "falloff": 5400,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Federation Navy 75mm Railgun": {
    "tracking": 136.5,
    "optimal": 7200,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Federation Navy 425mm Railgun": {
    "tracking": 1.04598,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Federation Navy 350mm Railgun": {
    "tracking": 1.26828,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Federation Navy 250mm Railgun": {
    "tracking": 5.904,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Federation Navy 200mm Railgun": {
    "tracking": 7.2,
    "optimal": 16200,
    "falloff": 9000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Federation Navy 150mm Railgun": {
    "tracking": 73.5,
    "optimal": 14400,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Federation Navy 125mm Railgun": {
    "tracking": 89.25,
    "optimal": 10800,
    "falloff": 5000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Ammatar Navy Tachyon Beam Laser": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Ammatar Navy Quad Beam Laser": {
    "tracking": 23.328,
    "optimal": 11000,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Ammatar Navy Mega Pulse Laser": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Ammatar Navy Mega Beam Laser": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Ammatar Navy Small Focused Pulse Laser": {
    "tracking": 246.25,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Ammatar Navy Small Focused Beam Laser": {
    "tracking": 90,
    "optimal": 13750,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Ammatar Navy Heavy Pulse Laser": {
    "tracking": 26,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Ammatar Navy Heavy Beam Laser": {
    "tracking": 9.504,
    "optimal": 27500,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Ammatar Navy Gatling Pulse Laser": {
    "tracking": 308.125,
    "optimal": 5250,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Ammatar Navy Focused Medium Pulse Laser": {
    "tracking": 28.8,
    "optimal": 11813,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Ammatar Navy Focused Medium Beam Laser": {
    "tracking": 12.096,
    "optimal": 24063,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Ammatar Navy Dual Light Pulse Laser": {
    "tracking": 273.75,
    "optimal": 5906,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Ammatar Navy Dual Light Beam Laser": {
    "tracking": 117,
    "optimal": 12032,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Ammatar Navy Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Ammatar Navy Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Imperial Navy Tachyon Beam Laser": {
    "tracking": 1.39205,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Imperial Navy Quad Beam Laser": {
    "tracking": 23.328,
    "optimal": 11000,
    "falloff": 1000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Imperial Navy Mega Pulse Laser": {
    "tracking": 3.375,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Imperial Navy Mega Beam Laser": {
    "tracking": 1.53125,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Imperial Navy Small Focused Pulse Laser": {
    "tracking": 246.25,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Imperial Navy Small Focused Beam Laser": {
    "tracking": 90,
    "optimal": 13750,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Imperial Navy Heavy Pulse Laser": {
    "tracking": 26,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Imperial Navy Heavy Beam Laser": {
    "tracking": 9.504,
    "optimal": 27500,
    "falloff": 8000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Imperial Navy Gatling Pulse Laser": {
    "tracking": 308.125,
    "optimal": 5250,
    "falloff": 1000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Imperial Navy Focused Medium Pulse Laser": {
    "tracking": 28.8,
    "optimal": 11813,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Imperial Navy Focused Medium Beam Laser": {
    "tracking": 12.096,
    "optimal": 24063,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Imperial Navy Dual Light Pulse Laser": {
    "tracking": 273.75,
    "optimal": 5906,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Imperial Navy Dual Light Beam Laser": {
    "tracking": 117,
    "optimal": 12032,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Imperial Navy Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Imperial Navy Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Republic Fleet 125mm Autocannon": {
    "tracking": 417,
    "optimal": 960,
    "falloff": 4300,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Republic Fleet 1200mm Artillery": {
    "tracking": 1.125,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Republic Fleet 1400mm Howitzer Artillery": {
    "tracking": 0.9,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Republic Fleet 150mm Autocannon": {
    "tracking": 362,
    "optimal": 1080,
    "falloff": 4730,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Republic Fleet 200mm Autocannon": {
    "tracking": 315,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Republic Fleet 220mm Autocannon": {
    "tracking": 38.8608,
    "optimal": 2160,
    "falloff": 9933,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Republic Fleet 250mm Artillery": {
    "tracking": 80,
    "optimal": 9660,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Republic Fleet 280mm Howitzer Artillery": {
    "tracking": 64,
    "optimal": 12000,
    "falloff": 8750,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Republic Fleet 425mm Autocannon": {
    "tracking": 33.792,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Republic Fleet 650mm Artillery": {
    "tracking": 8.352,
    "optimal": 19320,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Republic Fleet 720mm Howitzer Artillery": {
    "tracking": 6.688,
    "optimal": 24000,
    "falloff": 17500,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Republic Fleet 800mm Repeating Cannon": {
    "tracking": 4.32,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Republic Fleet Dual 180mm Autocannon": {
    "tracking": 44.68992,
    "optimal": 1920,
    "falloff": 9030,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Republic Fleet Dual 425mm Autocannon": {
    "tracking": 5.7132,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Republic Fleet Dual 650mm Repeating Cannon": {
    "tracking": 4.968,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Dual Giga Pulse Laser I": {
    "tracking": 0.0384864,
    "optimal": 42000,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Dual Giga Beam Laser I": {
    "tracking": 0.02182031,
    "optimal": 100000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Dual 1000mm Railgun I": {
    "tracking": 0.0182875,
    "optimal": 120000,
    "falloff": 32000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Ion Siege Blaster I": {
    "tracking": 0.0437,
    "optimal": 20000,
    "falloff": 25000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Hexa 2500mm Repeating Cannon I": {
    "tracking": 0.041515,
    "optimal": 25000,
    "falloff": 28800,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Quad 3500mm Siege Artillery I": {
    "tracking": 0.0171,
    "optimal": 94000,
    "falloff": 90000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "150mm 'Musket' Railgun": {
    "tracking": 73.5,
    "optimal": 12000,
    "falloff": 6000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "250mm 'Flintlock' Railgun": {
    "tracking": 5.904,
    "optimal": 21600,
    "falloff": 10800,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "425mm 'Popper' Railgun": {
    "tracking": 1.04598,
    "optimal": 43200,
    "falloff": 21600,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "200mm Light 'Jolt' Autocannon I": {
    "tracking": 315,
    "optimal": 1000,
    "falloff": 5676,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "250mm Light 'Jolt' Artillery I": {
    "tracking": 80,
    "optimal": 8050,
    "falloff": 9625,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "280mm 'Jolt' Artillery I": {
    "tracking": 64,
    "optimal": 10000,
    "falloff": 9625,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "425mm Medium 'Jolt' Autocannon I": {
    "tracking": 33.792,
    "optimal": 2000,
    "falloff": 11920,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "650mm Medium 'Jolt' Artillery I": {
    "tracking": 8.352,
    "optimal": 16100,
    "falloff": 19250,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "720mm 'Jolt' Artillery I": {
    "tracking": 6.688,
    "optimal": 20000,
    "falloff": 19250,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "800mm Heavy 'Jolt' Repeating Cannon I": {
    "tracking": 4.32,
    "optimal": 4000,
    "falloff": 22704,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1200mm Heavy 'Jolt' Artillery I": {
    "tracking": 1.125,
    "optimal": 32200,
    "falloff": 38500,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "1400mm 'Jolt' Artillery I": {
    "tracking": 0.9,
    "optimal": 40000,
    "falloff": 38500,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "'Corporate' Light Electron Blaster I": {
    "tracking": 438,
    "optimal": 1200,
    "falloff": 1500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "'Dealer' Light Ion Blaster I": {
    "tracking": 403.2,
    "optimal": 1500,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "'Racket' Light Neutron Blaster I": {
    "tracking": 379.8,
    "optimal": 1800,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "'Slither' Heavy Electron Blaster I": {
    "tracking": 46.08,
    "optimal": 2400,
    "falloff": 3000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "'Hooligan' Heavy Ion Blaster I": {
    "tracking": 42.24,
    "optimal": 3000,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "'Hustler' Heavy Neutron Blaster I": {
    "tracking": 38.4,
    "optimal": 3600,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "'Swindler' Electron Blaster Cannon I": {
    "tracking": 6,
    "optimal": 4800,
    "falloff": 6000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "'Felon' Ion Blaster Cannon I": {
    "tracking": 5.52,
    "optimal": 6000,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "'Underhand' Neutron Blaster Cannon I": {
    "tracking": 5.196,
    "optimal": 7200,
    "falloff": 10000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "'Mace' Dual Light Beam Laser I": {
    "tracking": 117,
    "optimal": 9625,
    "falloff": 2400,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "'Longbow' Small Focused Pulse Laser I": {
    "tracking": 246.25,
    "optimal": 5250,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "'Gauntlet' Small Focused Beam Laser I": {
    "tracking": 90,
    "optimal": 11000,
    "falloff": 3000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "'Crossbow' Focused Medium Beam Laser I": {
    "tracking": 12.096,
    "optimal": 19250,
    "falloff": 7200,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "'Joust' Heavy Pulse Laser I": {
    "tracking": 26,
    "optimal": 10500,
    "falloff": 6000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "'Arquebus' Heavy Beam Laser I": {
    "tracking": 9.504,
    "optimal": 22000,
    "falloff": 9600,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "'Halberd' Mega Pulse Laser I": {
    "tracking": 3.375,
    "optimal": 21000,
    "falloff": 12000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "'Catapult' Mega Beam Laser I": {
    "tracking": 1.53125,
    "optimal": 40000,
    "falloff": 19200,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "'Ballista' Tachyon Beam Laser I": {
    "tracking": 1.39205,
    "optimal": 44000,
    "falloff": 24000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Polarized Small Focused Pulse Laser": {
    "tracking": 283.188,
    "optimal": 5040,
    "falloff": 2000,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Polarized Heavy Pulse Laser": {
    "tracking": 29.90016,
    "optimal": 10080,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Polarized Mega Pulse Laser": {
    "tracking": 3.8813,
    "optimal": 20160,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Energy Turret"
  },
  "Polarized Light Neutron Blaster": {
    "tracking": 436.77,
    "optimal": 1440,
    "falloff": 1600,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Polarized Heavy Neutron Blaster": {
    "tracking": 44.16,
    "optimal": 2880,
    "falloff": 4000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Polarized Neutron Blaster Cannon": {
    "tracking": 5.9754,
    "optimal": 5760,
    "falloff": 8000,
    "chargeSize": 3,
    "turretSkill": "Large Hybrid Turret"
  },
  "Polarized 200mm AutoCannon": {
    "tracking": 362.25,
    "optimal": 960,
    "falloff": 4128,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Polarized 425mm AutoCannon": {
    "tracking": 38.8608,
    "optimal": 1920,
    "falloff": 8669,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Polarized 800mm Repeating Cannon": {
    "tracking": 4.968,
    "optimal": 3840,
    "falloff": 16512,
    "chargeSize": 3,
    "turretSkill": "Large Projectile Turret"
  },
  "Quad 800mm Repeating Cannon I": {
    "tracking": 1.92,
    "optimal": 20000,
    "falloff": 23000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Quad Mega Pulse Laser I": {
    "tracking": 1.5,
    "optimal": 33000,
    "falloff": 16000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Triple Neutron Blaster Cannon I": {
    "tracking": 2.3,
    "optimal": 16000,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Quad Mega Pulse Laser II": {
    "tracking": 1.5,
    "optimal": 36300,
    "falloff": 16000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Modulated Compact Quad Mega Pulse Laser": {
    "tracking": 1.5,
    "optimal": 33000,
    "falloff": 16000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Dual Giga Pulse Laser II": {
    "tracking": 0.0384864,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Dual Giga Beam Laser II": {
    "tracking": 0.02182031,
    "optimal": 110000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Triple Neutron Blaster Cannon II": {
    "tracking": 2.3,
    "optimal": 17600,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Regulated Compact Triple Neutron Blaster Cannon": {
    "tracking": 2.3,
    "optimal": 16000,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Ion Siege Blaster II": {
    "tracking": 0.0437,
    "optimal": 22000,
    "falloff": 25000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Dual 1000mm Railgun II": {
    "tracking": 0.0182875,
    "optimal": 132000,
    "falloff": 32000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Quad 800mm Repeating Cannon II": {
    "tracking": 1.92,
    "optimal": 22000,
    "falloff": 23000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Compact Carbine Quad 800mm Repeating Cannon": {
    "tracking": 1.92,
    "optimal": 20000,
    "falloff": 23000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Hexa 2500mm Repeating Cannon II": {
    "tracking": 0.041515,
    "optimal": 27500,
    "falloff": 28800,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Quad 3500mm Siege Artillery II": {
    "tracking": 0.0171,
    "optimal": 103400,
    "falloff": 90000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Modal Enduring Quad Mega Pulse Laser": {
    "tracking": 1.5,
    "optimal": 33000,
    "falloff": 16000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Anode Scoped Quad Mega Pulse Laser": {
    "tracking": 1.5,
    "optimal": 34650,
    "falloff": 16000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Afocal Precise Quad Mega Pulse Laser": {
    "tracking": 1.575,
    "optimal": 33000,
    "falloff": 16000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Dark Blood Quad Mega Pulse Laser": {
    "tracking": 1.575,
    "optimal": 36300,
    "falloff": 16000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "True Sansha Quad Mega Pulse Laser": {
    "tracking": 1.575,
    "optimal": 36300,
    "falloff": 16000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Modal Enduring Triple Neutron Blaster Cannon": {
    "tracking": 2.3,
    "optimal": 16000,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Anode Scoped Triple Neutron Blaster Cannon": {
    "tracking": 2.3,
    "optimal": 16800,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Limited Precise Triple Neutron Blaster Cannon": {
    "tracking": 2.415,
    "optimal": 16000,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Shadow Serpentis Triple Neutron Blaster Cannon": {
    "tracking": 2.415,
    "optimal": 17600,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Ample Gallium Quad 800mm Repeating Cannon": {
    "tracking": 1.92,
    "optimal": 20000,
    "falloff": 23000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Scout Scoped Quad 800mm Repeating Cannon": {
    "tracking": 1.92,
    "optimal": 21000,
    "falloff": 23000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Prototype Precise Quad 800mm Repeating Cannon": {
    "tracking": 2.016,
    "optimal": 20000,
    "falloff": 23000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Domination Quad 800mm Repeating Cannon": {
    "tracking": 2.016,
    "optimal": 22000,
    "falloff": 23000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Modulated Compact Dual Giga Pulse Laser": {
    "tracking": 0.0384864,
    "optimal": 42000,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Modal Enduring Dual Giga Pulse Laser": {
    "tracking": 0.0384864,
    "optimal": 42000,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Anode Scoped Dual Giga Pulse Laser": {
    "tracking": 0.0384864,
    "optimal": 44100,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Afocal Precise Dual Giga Pulse Laser": {
    "tracking": 0.04041072,
    "optimal": 42000,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Dark Blood Dual Giga Pulse Laser": {
    "tracking": 0.04041072,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "True Sansha Dual Giga Pulse Laser": {
    "tracking": 0.04041072,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Modulated Compact Dual Giga Beam Laser": {
    "tracking": 0.02182031,
    "optimal": 100000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Modal Enduring Dual Giga Beam Laser": {
    "tracking": 0.02182031,
    "optimal": 100000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Anode Scoped Dual Giga Beam Laser": {
    "tracking": 0.02182031,
    "optimal": 105000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Afocal Precise Dual Giga Beam Laser": {
    "tracking": 0.022911326,
    "optimal": 100000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Dark Blood Dual Giga Beam Laser": {
    "tracking": 0.022911326,
    "optimal": 110000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "True Sansha Dual Giga Beam Laser": {
    "tracking": 0.022911326,
    "optimal": 110000,
    "falloff": 42000,
    "chargeSize": 4,
    "turretSkill": "Capital Energy Turret"
  },
  "Regulated Compact Ion Siege Blaster": {
    "tracking": 0.0437,
    "optimal": 20000,
    "falloff": 25000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Modal Enduring Ion Siege Blaster": {
    "tracking": 0.0437,
    "optimal": 20000,
    "falloff": 25000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Anode Scoped Ion Siege Blaster": {
    "tracking": 0.0437,
    "optimal": 21000,
    "falloff": 25000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Limited Precise Ion Siege Blaster": {
    "tracking": 0.045885,
    "optimal": 20000,
    "falloff": 25000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Shadow Serpentis Ion Siege Blaster": {
    "tracking": 0.045885,
    "optimal": 22000,
    "falloff": 25000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Carbide Compact Dual 1000mm Railgun": {
    "tracking": 0.0182875,
    "optimal": 120000,
    "falloff": 32000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Compressed Enduring Dual 1000mm Railgun": {
    "tracking": 0.0182875,
    "optimal": 120000,
    "falloff": 32000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Scout Scoped Dual 1000mm Railgun": {
    "tracking": 0.0182875,
    "optimal": 126000,
    "falloff": 32000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Prototype Precise Dual 1000mm Railgun": {
    "tracking": 0.019201875,
    "optimal": 120000,
    "falloff": 32000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Shadow Serpentis Dual 1000mm Railgun": {
    "tracking": 0.019201875,
    "optimal": 132000,
    "falloff": 32000,
    "chargeSize": 4,
    "turretSkill": "Capital Hybrid Turret"
  },
  "Carbine Compact Hexa 2500mm Repeating Cannon": {
    "tracking": 0.041515,
    "optimal": 25000,
    "falloff": 28800,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Gallium Ample Hexa 2500mm Repeating Cannon": {
    "tracking": 0.041515,
    "optimal": 25000,
    "falloff": 28800,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Scout Scoped Hexa 2500mm Repeating Cannon": {
    "tracking": 0.041515,
    "optimal": 26250,
    "falloff": 28800,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Prototype Precise Hexa 2500mm Repeating Cannon": {
    "tracking": 0.04359075,
    "optimal": 25000,
    "falloff": 28800,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Domination Hexa 2500mm Repeating Cannon": {
    "tracking": 0.04359075,
    "optimal": 27500,
    "falloff": 28800,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Carbide Compact Quad 3500mm Siege Artillery": {
    "tracking": 0.0171,
    "optimal": 94000,
    "falloff": 90000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Gallium Ample Quad 3500mm Siege Artillery": {
    "tracking": 0.0171,
    "optimal": 94000,
    "falloff": 90000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Scout Scoped Quad 3500mm Siege Artillery": {
    "tracking": 0.0171,
    "optimal": 98700,
    "falloff": 90000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Prototype Precise Quad 3500mm Siege Artillery": {
    "tracking": 0.017955,
    "optimal": 94000,
    "falloff": 90000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Domination Quad 3500mm Siege Artillery": {
    "tracking": 0.017955,
    "optimal": 103400,
    "falloff": 90000,
    "chargeSize": 4,
    "turretSkill": "Capital Projectile Turret"
  },
  "Asine's Modified Light Neutron Blaster": {
    "tracking": 379.8,
    "optimal": 1800,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Hybrid Turret"
  },
  "Gara's Modified Heavy Neutron Blaster": {
    "tracking": 38.4,
    "optimal": 3600,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Hybrid Turret"
  },
  "Ramaku's Modified 200mm AutoCannon": {
    "tracking": 315,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1,
    "turretSkill": "Small Projectile Turret"
  },
  "Sila's Modified 425mm Autocannon": {
    "tracking": 33.792,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2,
    "turretSkill": "Medium Projectile Turret"
  },
  "Makra's Modified Small Focused Pulse Laser": {
    "tracking": 246.25,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Usaras' Modified Small Focused Pulse Laser": {
    "tracking": 246.25,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1,
    "turretSkill": "Small Energy Turret"
  },
  "Ryhad's Modified Heavy Pulse Laser": {
    "tracking": 26,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  },
  "Nija's Modified Heavy Pulse Laser": {
    "tracking": 26,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2,
    "turretSkill": "Medium Energy Turret"
  }
} as unknown as Readonly<Record<string, TurretStats>>;

export const CHARGES = {
  "Carbonized Lead S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Nuclear S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Proton S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Depleted Uranium S": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Titanium Sabot S": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Fusion S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Phased Plasma S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "EMP S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Carbonized Lead M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Nuclear M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Proton M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Depleted Uranium M": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Titanium Sabot M": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Fusion M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Phased Plasma M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "EMP M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Carbonized Lead L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Nuclear L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Proton L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Depleted Uranium L": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Titanium Sabot L": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Fusion L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Phased Plasma L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "EMP L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Iron Charge S": {
    "rangeMultiplier": 1.6
  },
  "Tungsten Charge S": {
    "rangeMultiplier": 1.4
  },
  "Iridium Charge S": {
    "rangeMultiplier": 1.2
  },
  "Lead Charge S": {
    "rangeMultiplier": 1
  },
  "Thorium Charge S": {
    "rangeMultiplier": 0.875
  },
  "Uranium Charge S": {
    "rangeMultiplier": 0.75
  },
  "Plutonium Charge S": {
    "rangeMultiplier": 0.625
  },
  "Antimatter Charge S": {
    "rangeMultiplier": 0.5
  },
  "Iron Charge M": {
    "rangeMultiplier": 1.6
  },
  "Tungsten Charge M": {
    "rangeMultiplier": 1.4
  },
  "Iridium Charge M": {
    "rangeMultiplier": 1.2
  },
  "Lead Charge M": {
    "rangeMultiplier": 1
  },
  "Thorium Charge M": {
    "rangeMultiplier": 0.875
  },
  "Uranium Charge M": {
    "rangeMultiplier": 0.75
  },
  "Plutonium Charge M": {
    "rangeMultiplier": 0.625
  },
  "Antimatter Charge M": {
    "rangeMultiplier": 0.5
  },
  "Iron Charge L": {
    "rangeMultiplier": 1.6
  },
  "Tungsten Charge L": {
    "rangeMultiplier": 1.4
  },
  "Iridium Charge L": {
    "rangeMultiplier": 1.2
  },
  "Lead Charge L": {
    "rangeMultiplier": 1
  },
  "Thorium Charge L": {
    "rangeMultiplier": 0.875
  },
  "Uranium Charge L": {
    "rangeMultiplier": 0.75
  },
  "Plutonium Charge L": {
    "rangeMultiplier": 0.625
  },
  "Antimatter Charge L": {
    "rangeMultiplier": 0.5
  },
  "Radio S": {
    "rangeMultiplier": 1.6
  },
  "Microwave S": {
    "rangeMultiplier": 1.4
  },
  "Infrared S": {
    "rangeMultiplier": 1.2
  },
  "Standard S": {
    "rangeMultiplier": 1
  },
  "Ultraviolet S": {
    "rangeMultiplier": 0.875
  },
  "Xray S": {
    "rangeMultiplier": 0.75
  },
  "Gamma S": {
    "rangeMultiplier": 0.625
  },
  "Multifrequency S": {
    "rangeMultiplier": 0.5
  },
  "Radio M": {
    "rangeMultiplier": 1.6
  },
  "Microwave M": {
    "rangeMultiplier": 1.4
  },
  "Infrared M": {
    "rangeMultiplier": 1.2
  },
  "Standard M": {
    "rangeMultiplier": 1
  },
  "Ultraviolet M": {
    "rangeMultiplier": 0.875
  },
  "Xray M": {
    "rangeMultiplier": 0.75
  },
  "Gamma M": {
    "rangeMultiplier": 0.625
  },
  "Multifrequency M": {
    "rangeMultiplier": 0.5
  },
  "Radio L": {
    "rangeMultiplier": 1.6
  },
  "Microwave L": {
    "rangeMultiplier": 1.4
  },
  "Infrared L": {
    "rangeMultiplier": 1.2
  },
  "Standard L": {
    "rangeMultiplier": 1
  },
  "Ultraviolet L": {
    "rangeMultiplier": 0.875
  },
  "Xray L": {
    "rangeMultiplier": 0.75
  },
  "Gamma L": {
    "rangeMultiplier": 0.625
  },
  "Multifrequency L": {
    "rangeMultiplier": 0.5
  },
  "Gleam S": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Aurora S": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Scorch S": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1.4
  },
  "Conflagration S": {
    "trackingMultiplier": 0.7,
    "rangeMultiplier": 0.5
  },
  "Hail S": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.5,
    "falloffMultiplier": 0.75
  },
  "Void S": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.75,
    "falloffMultiplier": 0.5
  },
  "Null S": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1.4,
    "falloffMultiplier": 1.4
  },
  "Spike S": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Javelin S": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Barrage S": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1,
    "falloffMultiplier": 1.5
  },
  "Quake S": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Tremor S": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Quake L": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Tremor L": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Quake M": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Tremor M": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Barrage M": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1,
    "falloffMultiplier": 1.5
  },
  "Barrage L": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1,
    "falloffMultiplier": 1.5
  },
  "Hail M": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.5,
    "falloffMultiplier": 0.75
  },
  "Hail L": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.5,
    "falloffMultiplier": 0.75
  },
  "Null M": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1.4,
    "falloffMultiplier": 1.4
  },
  "Null L": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1.4,
    "falloffMultiplier": 1.4
  },
  "Void M": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.75,
    "falloffMultiplier": 0.5
  },
  "Void L": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.75,
    "falloffMultiplier": 0.5
  },
  "Javelin M": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Javelin L": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Spike M": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Spike L": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Conflagration M": {
    "trackingMultiplier": 0.7,
    "rangeMultiplier": 0.5
  },
  "Conflagration L": {
    "trackingMultiplier": 0.7,
    "rangeMultiplier": 0.5
  },
  "Scorch M": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1.4
  },
  "Scorch L": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1.4
  },
  "Aurora M": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Aurora L": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Gleam M": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Gleam L": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Antimatter Charge XL": {
    "rangeMultiplier": 0.5
  },
  "Iridium Charge XL": {
    "rangeMultiplier": 1.2
  },
  "Iron Charge XL": {
    "rangeMultiplier": 1.6
  },
  "Lead Charge XL": {
    "rangeMultiplier": 1
  },
  "Plutonium Charge XL": {
    "rangeMultiplier": 0.625
  },
  "Thorium Charge XL": {
    "rangeMultiplier": 0.875
  },
  "Tungsten Charge XL": {
    "rangeMultiplier": 1.4
  },
  "Uranium Charge XL": {
    "rangeMultiplier": 0.75
  },
  "Carbonized Lead XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Depleted Uranium XL": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "EMP XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Fusion XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Nuclear XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Phased Plasma XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Proton XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Titanium Sabot XL": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Gamma XL": {
    "rangeMultiplier": 0.625
  },
  "Infrared XL": {
    "rangeMultiplier": 1.2
  },
  "Microwave XL": {
    "rangeMultiplier": 1.4
  },
  "Multifrequency XL": {
    "rangeMultiplier": 0.5
  },
  "Radio XL": {
    "rangeMultiplier": 1.6
  },
  "Standard XL": {
    "rangeMultiplier": 1
  },
  "Ultraviolet XL": {
    "rangeMultiplier": 0.875
  },
  "Xray XL": {
    "rangeMultiplier": 0.75
  },
  "Shadow Iron Charge S": {
    "rangeMultiplier": 1.6
  },
  "Shadow Tungsten Charge S": {
    "rangeMultiplier": 1.4
  },
  "Shadow Iridium Charge S": {
    "rangeMultiplier": 1.2
  },
  "Shadow Lead Charge S": {
    "rangeMultiplier": 1
  },
  "Arch Angel Carbonized Lead S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Nuclear S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Proton S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Depleted Uranium S": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Sanshas Radio S": {
    "rangeMultiplier": 1.6
  },
  "Sanshas Microwave S": {
    "rangeMultiplier": 1.4
  },
  "Sanshas Infrared S": {
    "rangeMultiplier": 1.2
  },
  "Sanshas Standard S": {
    "rangeMultiplier": 1
  },
  "Arch Angel Titanium Sabot S": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Arch Angel Fusion S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel Phased Plasma S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel EMP S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel Carbonized Lead M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Nuclear M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Proton M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Depleted Uranium M": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Arch Angel Titanium Sabot M": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Arch Angel Fusion M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel Phased Plasma M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel EMP M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Sanshas Radio M": {
    "rangeMultiplier": 1.6
  },
  "Sanshas Microwave M": {
    "rangeMultiplier": 1.4
  },
  "Sanshas Infrared M": {
    "rangeMultiplier": 1.2
  },
  "Sanshas Standard M": {
    "rangeMultiplier": 1
  },
  "Sanshas Radio L": {
    "rangeMultiplier": 1.6
  },
  "Sanshas Microwave L": {
    "rangeMultiplier": 1.4
  },
  "Sanshas Infrared L": {
    "rangeMultiplier": 1.2
  },
  "Sanshas Standard L": {
    "rangeMultiplier": 1
  },
  "Sanshas Radio XL": {
    "rangeMultiplier": 1.6
  },
  "Sanshas Microwave XL": {
    "rangeMultiplier": 1.4
  },
  "Sanshas Infrared XL": {
    "rangeMultiplier": 1.2
  },
  "Sanshas Standard XL": {
    "rangeMultiplier": 1
  },
  "Shadow Thorium Charge S": {
    "rangeMultiplier": 0.875
  },
  "Shadow Uranium Charge S": {
    "rangeMultiplier": 0.75
  },
  "Shadow Plutonium Charge S": {
    "rangeMultiplier": 0.625
  },
  "Shadow Antimatter Charge S": {
    "rangeMultiplier": 0.5
  },
  "Shadow Iron Charge M": {
    "rangeMultiplier": 1.6
  },
  "Shadow Tungsten Charge M": {
    "rangeMultiplier": 1.4
  },
  "Shadow Iridium Charge M": {
    "rangeMultiplier": 1.2
  },
  "Shadow Lead Charge M": {
    "rangeMultiplier": 1
  },
  "Shadow Thorium Charge M": {
    "rangeMultiplier": 0.875
  },
  "Shadow Uranium Charge M": {
    "rangeMultiplier": 0.75
  },
  "Shadow Plutonium Charge M": {
    "rangeMultiplier": 0.625
  },
  "Shadow Antimatter Charge M": {
    "rangeMultiplier": 0.5
  },
  "Arch Angel Carbonized Lead L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Nuclear L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Proton L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Depleted Uranium L": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Arch Angel Titanium Sabot L": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Arch Angel Fusion L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel Phased Plasma L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel EMP L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel Carbonized Lead XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Depleted Uranium XL": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Arch Angel EMP XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel Fusion XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel Nuclear XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Phased Plasma XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Arch Angel Proton XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Arch Angel Titanium Sabot XL": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Domination Carbonized Lead S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Nuclear S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Proton S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Depleted Uranium S": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Domination Titanium Sabot S": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Domination Fusion S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Phased Plasma S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination EMP S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Carbonized Lead M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Nuclear M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Proton M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Depleted Uranium M": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Domination Titanium Sabot M": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Domination Fusion M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Phased Plasma M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination EMP M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Carbonized Lead L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Nuclear L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Proton L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Depleted Uranium L": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Domination Titanium Sabot L": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Domination Fusion L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Phased Plasma L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination EMP L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Carbonized Lead XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Depleted Uranium XL": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Domination EMP XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Fusion XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Nuclear XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Phased Plasma XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Domination Proton XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Domination Titanium Sabot XL": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Sanshas Ultraviolet S": {
    "rangeMultiplier": 0.875
  },
  "Sanshas Xray S": {
    "rangeMultiplier": 0.75
  },
  "Sanshas Gamma S": {
    "rangeMultiplier": 0.625
  },
  "Sanshas Multifrequency S": {
    "rangeMultiplier": 0.5
  },
  "Sanshas Ultraviolet M": {
    "rangeMultiplier": 0.875
  },
  "Sanshas Xray M": {
    "rangeMultiplier": 0.75
  },
  "Sanshas Gamma M": {
    "rangeMultiplier": 0.625
  },
  "Sanshas Multifrequency M": {
    "rangeMultiplier": 0.5
  },
  "Sanshas Ultraviolet L": {
    "rangeMultiplier": 0.875
  },
  "Sanshas Xray L": {
    "rangeMultiplier": 0.75
  },
  "Sanshas Gamma L": {
    "rangeMultiplier": 0.625
  },
  "Sanshas Multifrequency L": {
    "rangeMultiplier": 0.5
  },
  "Sanshas Ultraviolet XL": {
    "rangeMultiplier": 0.875
  },
  "Sanshas Xray XL": {
    "rangeMultiplier": 0.75
  },
  "Sanshas Gamma XL": {
    "rangeMultiplier": 0.625
  },
  "Sanshas Multifrequency XL": {
    "rangeMultiplier": 0.5
  },
  "True Sanshas Radio S": {
    "rangeMultiplier": 1.6
  },
  "True Sanshas Microwave S": {
    "rangeMultiplier": 1.4
  },
  "True Sanshas Infrared S": {
    "rangeMultiplier": 1.2
  },
  "True Sanshas Standard S": {
    "rangeMultiplier": 1
  },
  "True Sanshas Ultraviolet S": {
    "rangeMultiplier": 0.875
  },
  "True Sanshas Xray S": {
    "rangeMultiplier": 0.75
  },
  "True Sanshas Gamma S": {
    "rangeMultiplier": 0.625
  },
  "True Sanshas Multifrequency S": {
    "rangeMultiplier": 0.5
  },
  "True Sanshas Radio M": {
    "rangeMultiplier": 1.6
  },
  "True Sanshas Microwave M": {
    "rangeMultiplier": 1.4
  },
  "True Sanshas Infrared M": {
    "rangeMultiplier": 1.2
  },
  "True Sanshas Standard M": {
    "rangeMultiplier": 1
  },
  "True Sanshas Ultraviolet M": {
    "rangeMultiplier": 0.875
  },
  "True Sanshas Xray M": {
    "rangeMultiplier": 0.75
  },
  "True Sanshas Gamma M": {
    "rangeMultiplier": 0.625
  },
  "True Sanshas Multifrequency M": {
    "rangeMultiplier": 0.5
  },
  "True Sanshas Radio L": {
    "rangeMultiplier": 1.6
  },
  "True Sanshas Microwave L": {
    "rangeMultiplier": 1.4
  },
  "True Sanshas Infrared L": {
    "rangeMultiplier": 1.2
  },
  "True Sanshas Standard L": {
    "rangeMultiplier": 1
  },
  "True Sanshas Ultraviolet L": {
    "rangeMultiplier": 0.875
  },
  "True Sanshas Xray L": {
    "rangeMultiplier": 0.75
  },
  "True Sanshas Gamma L": {
    "rangeMultiplier": 0.625
  },
  "True Sanshas Multifrequency L": {
    "rangeMultiplier": 0.5
  },
  "True Sanshas Radio XL": {
    "rangeMultiplier": 1.6
  },
  "True Sanshas Microwave XL": {
    "rangeMultiplier": 1.4
  },
  "True Sanshas Infrared XL": {
    "rangeMultiplier": 1.2
  },
  "True Sanshas Standard XL": {
    "rangeMultiplier": 1
  },
  "True Sanshas Ultraviolet XL": {
    "rangeMultiplier": 0.875
  },
  "True Sanshas Xray XL": {
    "rangeMultiplier": 0.75
  },
  "True Sanshas Gamma XL": {
    "rangeMultiplier": 0.625
  },
  "True Sanshas Multifrequency XL": {
    "rangeMultiplier": 0.5
  },
  "Shadow Iron Charge L": {
    "rangeMultiplier": 1.6
  },
  "Shadow Tungsten Charge L": {
    "rangeMultiplier": 1.4
  },
  "Shadow Iridium Charge L": {
    "rangeMultiplier": 1.2
  },
  "Shadow Lead Charge L": {
    "rangeMultiplier": 1
  },
  "Shadow Thorium Charge L": {
    "rangeMultiplier": 0.875
  },
  "Shadow Uranium Charge L": {
    "rangeMultiplier": 0.75
  },
  "Shadow Plutonium Charge L": {
    "rangeMultiplier": 0.625
  },
  "Shadow Antimatter Charge L": {
    "rangeMultiplier": 0.5
  },
  "Shadow Antimatter Charge XL": {
    "rangeMultiplier": 0.5
  },
  "Shadow Iridium Charge XL": {
    "rangeMultiplier": 1.2
  },
  "Shadow Iron Charge XL": {
    "rangeMultiplier": 1.6
  },
  "Shadow Lead Charge XL": {
    "rangeMultiplier": 1
  },
  "Shadow Plutonium Charge XL": {
    "rangeMultiplier": 0.625
  },
  "Shadow Thorium Charge XL": {
    "rangeMultiplier": 0.875
  },
  "Shadow Tungsten Charge XL": {
    "rangeMultiplier": 1.4
  },
  "Shadow Uranium Charge XL": {
    "rangeMultiplier": 0.75
  },
  "Guardian Iron Charge S": {
    "rangeMultiplier": 1.6
  },
  "Guardian Tungsten Charge S": {
    "rangeMultiplier": 1.4
  },
  "Guardian Iridium Charge S": {
    "rangeMultiplier": 1.2
  },
  "Guardian Lead Charge S": {
    "rangeMultiplier": 1
  },
  "Guardian Thorium Charge S": {
    "rangeMultiplier": 0.875
  },
  "Guardian Uranium Charge S": {
    "rangeMultiplier": 0.75
  },
  "Guardian Plutonium Charge S": {
    "rangeMultiplier": 0.625
  },
  "Guardian Antimatter Charge S": {
    "rangeMultiplier": 0.5
  },
  "Guardian Iron Charge M": {
    "rangeMultiplier": 1.6
  },
  "Guardian Tungsten Charge M": {
    "rangeMultiplier": 1.4
  },
  "Guardian Iridium Charge M": {
    "rangeMultiplier": 1.2
  },
  "Guardian Lead Charge M": {
    "rangeMultiplier": 1
  },
  "Guardian Thorium Charge M": {
    "rangeMultiplier": 0.875
  },
  "Guardian Uranium Charge M": {
    "rangeMultiplier": 0.75
  },
  "Guardian Plutonium Charge M": {
    "rangeMultiplier": 0.625
  },
  "Guardian Antimatter Charge M": {
    "rangeMultiplier": 0.5
  },
  "Guardian Iron Charge L": {
    "rangeMultiplier": 1.6
  },
  "Guardian Tungsten Charge L": {
    "rangeMultiplier": 1.4
  },
  "Guardian Iridium Charge L": {
    "rangeMultiplier": 1.2
  },
  "Guardian Lead Charge L": {
    "rangeMultiplier": 1
  },
  "Guardian Thorium Charge L": {
    "rangeMultiplier": 0.875
  },
  "Guardian Uranium Charge L": {
    "rangeMultiplier": 0.75
  },
  "Guardian Plutonium Charge L": {
    "rangeMultiplier": 0.625
  },
  "Guardian Antimatter Charge L": {
    "rangeMultiplier": 0.5
  },
  "Guardian Antimatter Charge XL": {
    "rangeMultiplier": 0.5
  },
  "Guardian Iridium Charge XL": {
    "rangeMultiplier": 1.2
  },
  "Guardian Iron Charge XL": {
    "rangeMultiplier": 1.6
  },
  "Guardian Lead Charge XL": {
    "rangeMultiplier": 1
  },
  "Guardian Plutonium Charge XL": {
    "rangeMultiplier": 0.625
  },
  "Guardian Thorium Charge XL": {
    "rangeMultiplier": 0.875
  },
  "Guardian Tungsten Charge XL": {
    "rangeMultiplier": 1.4
  },
  "Guardian Uranium Charge XL": {
    "rangeMultiplier": 0.75
  },
  "Blood Radio S": {
    "rangeMultiplier": 1.6
  },
  "Blood Microwave S": {
    "rangeMultiplier": 1.4
  },
  "Blood Infrared S": {
    "rangeMultiplier": 1.2
  },
  "Blood Standard S": {
    "rangeMultiplier": 1
  },
  "Blood Ultraviolet S": {
    "rangeMultiplier": 0.875
  },
  "Blood Xray S": {
    "rangeMultiplier": 0.75
  },
  "Blood Gamma S": {
    "rangeMultiplier": 0.625
  },
  "Blood Multifrequency S": {
    "rangeMultiplier": 0.5
  },
  "Blood Microwave M": {
    "rangeMultiplier": 1.4
  },
  "Blood Infrared M": {
    "rangeMultiplier": 1.2
  },
  "Blood Standard M": {
    "rangeMultiplier": 1
  },
  "Blood Ultraviolet M": {
    "rangeMultiplier": 0.875
  },
  "Blood Xray M": {
    "rangeMultiplier": 0.75
  },
  "Blood Gamma M": {
    "rangeMultiplier": 0.625
  },
  "Blood Multifrequency M": {
    "rangeMultiplier": 0.5
  },
  "Blood Radio L": {
    "rangeMultiplier": 1.6
  },
  "Blood Microwave L": {
    "rangeMultiplier": 1.4
  },
  "Blood Infrared L": {
    "rangeMultiplier": 1.2
  },
  "Blood Standard L": {
    "rangeMultiplier": 1
  },
  "Blood Ultraviolet L": {
    "rangeMultiplier": 0.875
  },
  "Blood Xray L": {
    "rangeMultiplier": 0.75
  },
  "Blood Gamma L": {
    "rangeMultiplier": 0.625
  },
  "Blood Multifrequency L": {
    "rangeMultiplier": 0.5
  },
  "Blood Radio XL": {
    "rangeMultiplier": 1.6
  },
  "Blood Microwave XL": {
    "rangeMultiplier": 1.4
  },
  "Blood Infrared XL": {
    "rangeMultiplier": 1.2
  },
  "Blood Standard XL": {
    "rangeMultiplier": 1
  },
  "Blood Ultraviolet XL": {
    "rangeMultiplier": 0.875
  },
  "Blood Xray XL": {
    "rangeMultiplier": 0.75
  },
  "Blood Gamma XL": {
    "rangeMultiplier": 0.625
  },
  "Blood Multifrequency XL": {
    "rangeMultiplier": 0.5
  },
  "Dark Blood Radio S": {
    "rangeMultiplier": 1.6
  },
  "Dark Blood Microwave S": {
    "rangeMultiplier": 1.4
  },
  "Dark Blood Infrared S": {
    "rangeMultiplier": 1.2
  },
  "Dark Blood Standard S": {
    "rangeMultiplier": 1
  },
  "Dark Blood Ultraviolet S": {
    "rangeMultiplier": 0.875
  },
  "Dark Blood Xray S": {
    "rangeMultiplier": 0.75
  },
  "Dark Blood Gamma S": {
    "rangeMultiplier": 0.625
  },
  "Dark Blood Multifrequency S": {
    "rangeMultiplier": 0.5
  },
  "Dark Blood Radio M": {
    "rangeMultiplier": 1.6
  },
  "Dark Blood Microwave M": {
    "rangeMultiplier": 1.4
  },
  "Dark Blood Infrared M": {
    "rangeMultiplier": 1.2
  },
  "Dark Blood Standard M": {
    "rangeMultiplier": 1
  },
  "Dark Blood Ultraviolet M": {
    "rangeMultiplier": 0.875
  },
  "Dark Blood Xray M": {
    "rangeMultiplier": 0.75
  },
  "Dark Blood Gamma M": {
    "rangeMultiplier": 0.625
  },
  "Dark Blood Multifrequency M": {
    "rangeMultiplier": 0.5
  },
  "Dark Blood Radio L": {
    "rangeMultiplier": 1.6
  },
  "Dark Blood Microwave L": {
    "rangeMultiplier": 1.4
  },
  "Dark Blood Infrared L": {
    "rangeMultiplier": 1.2
  },
  "Dark Blood Standard L": {
    "rangeMultiplier": 1
  },
  "Dark Blood Ultraviolet L": {
    "rangeMultiplier": 0.875
  },
  "Dark Blood Xray L": {
    "rangeMultiplier": 0.75
  },
  "Dark Blood Gamma L": {
    "rangeMultiplier": 0.625
  },
  "Dark Blood Multifrequency L": {
    "rangeMultiplier": 0.5
  },
  "Dark Blood Radio XL": {
    "rangeMultiplier": 1.6
  },
  "Dark Blood Microwave XL": {
    "rangeMultiplier": 1.4
  },
  "Dark Blood Infrared XL": {
    "rangeMultiplier": 1.2
  },
  "Dark Blood Standard XL": {
    "rangeMultiplier": 1
  },
  "Dark Blood Ultraviolet XL": {
    "rangeMultiplier": 0.875
  },
  "Dark Blood Xray XL": {
    "rangeMultiplier": 0.75
  },
  "Dark Blood Gamma XL": {
    "rangeMultiplier": 0.625
  },
  "Dark Blood Multifrequency XL": {
    "rangeMultiplier": 0.5
  },
  "Guristas Iron Charge S": {
    "rangeMultiplier": 1.6
  },
  "Guristas Tungsten Charge S": {
    "rangeMultiplier": 1.4
  },
  "Guristas Iridium Charge S": {
    "rangeMultiplier": 1.2
  },
  "Guristas Lead Charge S": {
    "rangeMultiplier": 1
  },
  "Guristas Thorium Charge S": {
    "rangeMultiplier": 0.875
  },
  "Guristas Uranium Charge S": {
    "rangeMultiplier": 0.75
  },
  "Guristas Plutonium Charge S": {
    "rangeMultiplier": 0.625
  },
  "Guristas Antimatter Charge S": {
    "rangeMultiplier": 0.5
  },
  "Guristas Iron Charge M": {
    "rangeMultiplier": 1.6
  },
  "Guristas Tungsten Charge M": {
    "rangeMultiplier": 1.4
  },
  "Guristas Iridium Charge M": {
    "rangeMultiplier": 1.2
  },
  "Guristas Lead Charge M": {
    "rangeMultiplier": 1
  },
  "Guristas Thorium Charge M": {
    "rangeMultiplier": 0.875
  },
  "Guristas Uranium Charge M": {
    "rangeMultiplier": 0.75
  },
  "Guristas Plutonium Charge M": {
    "rangeMultiplier": 0.625
  },
  "Guristas Antimatter Charge M": {
    "rangeMultiplier": 0.5
  },
  "Guristas Iron Charge L": {
    "rangeMultiplier": 1.6
  },
  "Guristas Tungsten Charge L": {
    "rangeMultiplier": 1.4
  },
  "Guristas Iridium Charge L": {
    "rangeMultiplier": 1.2
  },
  "Guristas Lead Charge L": {
    "rangeMultiplier": 1
  },
  "Guristas Thorium Charge L": {
    "rangeMultiplier": 0.875
  },
  "Guristas Uranium Charge L": {
    "rangeMultiplier": 0.75
  },
  "Guristas Plutonium Charge L": {
    "rangeMultiplier": 0.625
  },
  "Guristas Antimatter Charge L": {
    "rangeMultiplier": 0.5
  },
  "Guristas Antimatter Charge XL": {
    "rangeMultiplier": 0.5
  },
  "Guristas Iridium Charge XL": {
    "rangeMultiplier": 1.2
  },
  "Guristas Iron Charge XL": {
    "rangeMultiplier": 1.6
  },
  "Guristas Lead Charge XL": {
    "rangeMultiplier": 1
  },
  "Guristas Plutonium Charge XL": {
    "rangeMultiplier": 0.625
  },
  "Guristas Thorium Charge XL": {
    "rangeMultiplier": 0.875
  },
  "Guristas Tungsten Charge XL": {
    "rangeMultiplier": 1.4
  },
  "Guristas Uranium Charge XL": {
    "rangeMultiplier": 0.75
  },
  "Dread Guristas Iron Charge S": {
    "rangeMultiplier": 1.6
  },
  "Dread Guristas Tungsten Charge S": {
    "rangeMultiplier": 1.4
  },
  "Dread Guristas Iridium Charge S": {
    "rangeMultiplier": 1.2
  },
  "Dread Guristas Lead Charge S": {
    "rangeMultiplier": 1
  },
  "Dread Guristas Thorium Charge S": {
    "rangeMultiplier": 0.875
  },
  "Dread Guristas Uranium Charge S": {
    "rangeMultiplier": 0.75
  },
  "Dread Guristas Plutonium Charge S": {
    "rangeMultiplier": 0.625
  },
  "Dread Guristas Antimatter Charge S": {
    "rangeMultiplier": 0.5
  },
  "Dread Guristas Iron Charge M": {
    "rangeMultiplier": 1.6
  },
  "Dread Guristas Tungsten Charge M": {
    "rangeMultiplier": 1.4
  },
  "Dread Guristas Iridium Charge M": {
    "rangeMultiplier": 1.2
  },
  "Dread Guristas Lead Charge M": {
    "rangeMultiplier": 1
  },
  "Dread Guristas Thorium Charge M": {
    "rangeMultiplier": 0.875
  },
  "Dread Guristas Uranium Charge M": {
    "rangeMultiplier": 0.75
  },
  "Dread Guristas Plutonium Charge M": {
    "rangeMultiplier": 0.625
  },
  "Dread Guristas Antimatter Charge M": {
    "rangeMultiplier": 0.5
  },
  "Dread Guristas Iron Charge L": {
    "rangeMultiplier": 1.6
  },
  "Dread Guristas Tungsten Charge L": {
    "rangeMultiplier": 1.4
  },
  "Dread Guristas Iridium Charge L": {
    "rangeMultiplier": 1.2
  },
  "Dread Guristas Lead Charge L": {
    "rangeMultiplier": 1
  },
  "Dread Guristas Thorium Charge L": {
    "rangeMultiplier": 0.875
  },
  "Dread Guristas Uranium Charge L": {
    "rangeMultiplier": 0.75
  },
  "Dread Guristas Plutonium Charge L": {
    "rangeMultiplier": 0.625
  },
  "Dread Guristas Antimatter Charge L": {
    "rangeMultiplier": 0.5
  },
  "Dread Guristas Antimatter Charge XL": {
    "rangeMultiplier": 0.5
  },
  "Dread Guristas Iridium Charge XL": {
    "rangeMultiplier": 1.2
  },
  "Dread Guristas Iron Charge XL": {
    "rangeMultiplier": 1.6
  },
  "Dread Guristas Lead Charge XL": {
    "rangeMultiplier": 1
  },
  "Dread Guristas Plutonium Charge XL": {
    "rangeMultiplier": 0.625
  },
  "Dread Guristas Thorium Charge XL": {
    "rangeMultiplier": 0.875
  },
  "Dread Guristas Tungsten Charge XL": {
    "rangeMultiplier": 1.4
  },
  "Dread Guristas Uranium Charge XL": {
    "rangeMultiplier": 0.75
  },
  "Blood Radio M": {
    "rangeMultiplier": 1.6
  },
  "Caldari Navy Antimatter Charge L": {
    "rangeMultiplier": 0.5
  },
  "Republic Fleet EMP L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet EMP M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet EMP S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet EMP XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Fusion L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Fusion M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Fusion S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Fusion XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Nuclear L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Nuclear M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Nuclear S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Nuclear XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Phased Plasma L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Phased Plasma XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Phased Plasma M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Phased Plasma S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.5
  },
  "Republic Fleet Proton L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Proton M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Proton S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Proton XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Titanium Sabot L": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Republic Fleet Titanium Sabot M": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Republic Fleet Titanium Sabot S": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Republic Fleet Titanium Sabot XL": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Federation Navy Antimatter Charge S": {
    "rangeMultiplier": 0.5
  },
  "Federation Navy Plutonium Charge S": {
    "rangeMultiplier": 0.625
  },
  "Federation Navy Uranium Charge S": {
    "rangeMultiplier": 0.75
  },
  "Federation Navy Thorium Charge S": {
    "rangeMultiplier": 0.875
  },
  "Federation Navy Lead Charge S": {
    "rangeMultiplier": 1
  },
  "Federation Navy Iridium Charge S": {
    "rangeMultiplier": 1.2
  },
  "Federation Navy Tungsten Charge S": {
    "rangeMultiplier": 1.4
  },
  "Federation Navy Iron Charge S": {
    "rangeMultiplier": 1.6
  },
  "Federation Navy Antimatter Charge M": {
    "rangeMultiplier": 0.5
  },
  "Federation Navy Plutonium Charge M": {
    "rangeMultiplier": 0.625
  },
  "Federation Navy Uranium Charge M": {
    "rangeMultiplier": 0.75
  },
  "Federation Navy Thorium Charge M": {
    "rangeMultiplier": 0.875
  },
  "Federation Navy Lead Charge M": {
    "rangeMultiplier": 1
  },
  "Federation Navy Iridium Charge M": {
    "rangeMultiplier": 1.2
  },
  "Federation Navy Tungsten Charge M": {
    "rangeMultiplier": 1.4
  },
  "Federation Navy Iron Charge M": {
    "rangeMultiplier": 1.6
  },
  "Federation Navy Antimatter Charge L": {
    "rangeMultiplier": 0.5
  },
  "Federation Navy Plutonium Charge L": {
    "rangeMultiplier": 0.625
  },
  "Federation Navy Uranium Charge L": {
    "rangeMultiplier": 0.75
  },
  "Federation Navy Thorium Charge L": {
    "rangeMultiplier": 0.875
  },
  "Federation Navy Lead Charge L": {
    "rangeMultiplier": 1
  },
  "Federation Navy Iridium Charge L": {
    "rangeMultiplier": 1.2
  },
  "Federation Navy Tungsten Charge L": {
    "rangeMultiplier": 1.4
  },
  "Federation Navy Iron Charge L": {
    "rangeMultiplier": 1.6
  },
  "Caldari Navy Antimatter Charge S": {
    "rangeMultiplier": 0.5
  },
  "Caldari Navy Plutonium Charge S": {
    "rangeMultiplier": 0.625
  },
  "Caldari Navy Uranium Charge S": {
    "rangeMultiplier": 0.75
  },
  "Caldari Navy Thorium Charge S": {
    "rangeMultiplier": 0.875
  },
  "Caldari Navy Lead Charge S": {
    "rangeMultiplier": 1
  },
  "Caldari Navy Iridium Charge S": {
    "rangeMultiplier": 1.2
  },
  "Caldari Navy Tungsten Charge S": {
    "rangeMultiplier": 1.4
  },
  "Caldari Navy Iron Charge S": {
    "rangeMultiplier": 1.6
  },
  "Caldari Navy Antimatter Charge M": {
    "rangeMultiplier": 0.5
  },
  "Caldari Navy Plutonium Charge M": {
    "rangeMultiplier": 0.625
  },
  "Caldari Navy Uranium Charge M": {
    "rangeMultiplier": 0.75
  },
  "Caldari Navy Thorium Charge M": {
    "rangeMultiplier": 0.875
  },
  "Caldari Navy Lead Charge M": {
    "rangeMultiplier": 1
  },
  "Caldari Navy Iridium Charge M": {
    "rangeMultiplier": 1.2
  },
  "Caldari Navy Tungsten Charge M": {
    "rangeMultiplier": 1.4
  },
  "Caldari Navy Iron Charge M": {
    "rangeMultiplier": 1.6
  },
  "Caldari Navy Plutonium Charge L": {
    "rangeMultiplier": 0.625
  },
  "Caldari Navy Uranium Charge L": {
    "rangeMultiplier": 0.75
  },
  "Caldari Navy Thorium Charge L": {
    "rangeMultiplier": 0.875
  },
  "Caldari Navy Lead Charge L": {
    "rangeMultiplier": 1
  },
  "Caldari Navy Iridium Charge L": {
    "rangeMultiplier": 1.2
  },
  "Caldari Navy Tungsten Charge L": {
    "rangeMultiplier": 1.4
  },
  "Caldari Navy Iron Charge L": {
    "rangeMultiplier": 1.6
  },
  "Imperial Navy Multifrequency S": {
    "rangeMultiplier": 0.5
  },
  "Imperial Navy Gamma S": {
    "rangeMultiplier": 0.625
  },
  "Imperial Navy Xray S": {
    "rangeMultiplier": 0.75
  },
  "Imperial Navy Ultraviolet S": {
    "rangeMultiplier": 0.875
  },
  "Imperial Navy Standard S": {
    "rangeMultiplier": 1
  },
  "Imperial Navy Infrared S": {
    "rangeMultiplier": 1.2
  },
  "Imperial Navy Microwave S": {
    "rangeMultiplier": 1.4
  },
  "Imperial Navy Radio S": {
    "rangeMultiplier": 1.6
  },
  "Imperial Navy Multifrequency M": {
    "rangeMultiplier": 0.5
  },
  "Imperial Navy Gamma M": {
    "rangeMultiplier": 0.625
  },
  "Imperial Navy Xray M": {
    "rangeMultiplier": 0.75
  },
  "Imperial Navy Ultraviolet M": {
    "rangeMultiplier": 0.875
  },
  "Imperial Navy Standard M": {
    "rangeMultiplier": 1
  },
  "Imperial Navy Infrared M": {
    "rangeMultiplier": 1.2
  },
  "Imperial Navy Microwave M": {
    "rangeMultiplier": 1.4
  },
  "Imperial Navy Radio M": {
    "rangeMultiplier": 1.6
  },
  "Imperial Navy Multifrequency L": {
    "rangeMultiplier": 0.5
  },
  "Imperial Navy Gamma L": {
    "rangeMultiplier": 0.625
  },
  "Imperial Navy Xray L": {
    "rangeMultiplier": 0.75
  },
  "Imperial Navy Ultraviolet L": {
    "rangeMultiplier": 0.875
  },
  "Imperial Navy Standard L": {
    "rangeMultiplier": 1
  },
  "Imperial Navy Infrared L": {
    "rangeMultiplier": 1.2
  },
  "Imperial Navy Microwave L": {
    "rangeMultiplier": 1.4
  },
  "Imperial Navy Radio L": {
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Carbonized Lead L": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Carbonized Lead M": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Carbonized Lead S": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Carbonized Lead XL": {
    "trackingMultiplier": 1.05,
    "rangeMultiplier": 1.6
  },
  "Republic Fleet Depleted Uranium L": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Republic Fleet Depleted Uranium M": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Republic Fleet Depleted Uranium S": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Republic Fleet Depleted Uranium XL": {
    "trackingMultiplier": 1.2,
    "rangeMultiplier": 1
  },
  "Hail XL": {
    "trackingMultiplier": 0.7,
    "rangeMultiplier": 0.5,
    "falloffMultiplier": 0.75
  },
  "Barrage XL": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1,
    "falloffMultiplier": 1.4
  },
  "Tremor XL": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Quake XL": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Void XL": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.75,
    "falloffMultiplier": 0.5
  },
  "Null XL": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1.4,
    "falloffMultiplier": 1.4
  },
  "Javelin XL": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Spike XL": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Scorch XL": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 1.4
  },
  "Conflagration XL": {
    "trackingMultiplier": 0.7,
    "rangeMultiplier": 0.5
  },
  "Gleam XL": {
    "trackingMultiplier": 1.25,
    "rangeMultiplier": 0.25
  },
  "Aurora XL": {
    "trackingMultiplier": 0.25,
    "rangeMultiplier": 1.8
  },
  "Tetryon Exotic Plasma S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.7
  },
  "Tetryon Exotic Plasma M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.7
  },
  "Tetryon Exotic Plasma L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.7
  },
  "Baryon Exotic Plasma S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 1.1
  },
  "Meson Exotic Plasma S": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 1.8
  },
  "Occult S": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.6
  },
  "Mystic S": {
    "trackingMultiplier": 0.5,
    "rangeMultiplier": 1.5
  },
  "Baryon Exotic Plasma M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 1.1
  },
  "Meson Exotic Plasma M": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 1.8
  },
  "Occult M": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.6
  },
  "Mystic M": {
    "trackingMultiplier": 0.5,
    "rangeMultiplier": 1.5
  },
  "Baryon Exotic Plasma L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 1.1
  },
  "Meson Exotic Plasma L": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 1.8
  },
  "Occult L": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.6
  },
  "Mystic L": {
    "trackingMultiplier": 0.5,
    "rangeMultiplier": 1.5
  },
  "Baryon Exotic Plasma XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 1.1
  },
  "Tetryon Exotic Plasma XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 0.7
  },
  "Meson Exotic Plasma XL": {
    "trackingMultiplier": 1,
    "rangeMultiplier": 1.6
  },
  "Mystic XL": {
    "trackingMultiplier": 0.5,
    "rangeMultiplier": 1.5
  },
  "Occult XL": {
    "trackingMultiplier": 0.75,
    "rangeMultiplier": 0.6
  }
} as unknown as Readonly<Record<string, ChargeStats>>;

export const HULL_BONUSES = {
  "Slasher": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Rifter": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Reaper": [
    {
      "attribute": "maxVelocity",
      "magnitude": 10
    }
  ],
  "Tristan": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Ibis": [
    {
      "attribute": "turretOptimal",
      "magnitude": 20,
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Atron": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Immolator": [
    {
      "attribute": "turretTracking",
      "magnitude": 22.5,
      "turretSkill": "Small Energy Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 30,
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Echo": [
    {
      "attribute": "turretTracking",
      "magnitude": 22.5,
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 22.5,
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 22.5,
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Stabber": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Cruiser",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Thorax": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Rupture": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Minmatar Cruiser",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Megathron": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Battleship",
      "turretSkill": "Large Hybrid Turret"
    }
  ],
  "Apocalypse": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Battleship",
      "turretSkill": "Large Energy Turret"
    }
  ],
  "Badger": [
    {
      "attribute": "agility",
      "magnitude": -5
    }
  ],
  "Tayra": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Caldari Hauler"
    }
  ],
  "Nereus": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Gallente Hauler"
    }
  ],
  "Hoarder": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Minmatar Hauler"
    }
  ],
  "Mammoth": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Minmatar Hauler"
    }
  ],
  "Wreathe": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Minmatar Hauler"
    }
  ],
  "Kryos": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Epithal": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Miasmos": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Iteron Mark V": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Erebus": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Bestower": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Amarr Hauler"
    }
  ],
  "Utu": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 50,
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Adrestia": [
    {
      "attribute": "maxVelocity",
      "magnitude": 25
    },
    {
      "attribute": "turretTracking",
      "magnitude": 50,
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 50,
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Revenant": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Malice": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Leviathan": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Naga": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Battlecruiser",
      "turretSkill": "Large Hybrid Turret"
    }
  ],
  "Talos": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Battlecruiser",
      "turretSkill": "Large Hybrid Turret"
    }
  ],
  "Tornado": [
    {
      "attribute": "turretFalloff",
      "magnitude": 7.5,
      "skill": "Minmatar Battlecruiser",
      "turretSkill": "Large Projectile Turret"
    }
  ],
  "Miasmos Quafe Ultra Edition": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Miasmos Quafe Ultramarine Edition": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Helios": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Frigate"
    }
  ],
  "Raptor": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Frigate",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Cheetah": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Minmatar Frigate"
    }
  ],
  "Crusader": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Interceptors",
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Claw": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Stiletto": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Taranis": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Interceptors",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Ares": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Wolf": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Assault Frigates",
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Harpy": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Frigate",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Assault Frigates",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Retribution": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Assault Frigates",
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Avatar": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Gold Magnate": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Silver Magnate": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Lachesis": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Recon Ships",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Vagabond": [
    {
      "attribute": "turretFalloff",
      "magnitude": 12.5,
      "skill": "Heavy Assault Cruisers",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Zealot": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Heavy Assault Cruisers",
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Eagle": [
    {
      "attribute": "turretOptimal",
      "magnitude": 7.5,
      "skill": "Caldari Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 5,
      "skill": "Heavy Assault Cruisers",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Broadsword": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Heavy Interdiction Cruisers",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Devoter": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Heavy Interdiction Cruisers",
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Phobos": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Heavy Interdiction Cruisers",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Deimos": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Heavy Assault Cruisers",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Ishkur": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Assault Frigates",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Enyo": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Assault Frigates",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Assault Frigates",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Crane": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Caldari Hauler"
    }
  ],
  "Bustard": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Caldari Hauler"
    }
  ],
  "Prorator": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Amarr Hauler"
    }
  ],
  "Prowler": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Minmatar Hauler"
    }
  ],
  "Viator": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Occator": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Mastodon": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Minmatar Hauler"
    }
  ],
  "Impel": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Amarr Hauler"
    }
  ],
  "Megathron Federate Issue": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Battleship",
      "turretSkill": "Large Hybrid Turret"
    }
  ],
  "Ferox": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Battlecruiser",
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Brutix": [
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Coercer": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Energy Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Amarr Destroyer",
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Cormorant": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Destroyer",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Caldari Destroyer",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Catalyst": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Destroyer",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Destroyer",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Thrasher": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Minmatar Destroyer",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Imperial Navy Slicer": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Frigate",
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Omen Navy Issue": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Cruiser",
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Stabber Fleet Issue": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Minmatar Cruiser",
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 5,
      "skill": "Minmatar Cruiser",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Phantasm": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Amarr Cruiser",
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Cynabal": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Vigilant": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Apocalypse Navy Issue": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Battleship",
      "turretSkill": "Large Energy Turret"
    }
  ],
  "Megathron Navy Issue": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Battleship",
      "turretSkill": "Large Hybrid Turret"
    }
  ],
  "Nightmare": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Amarr Battleship",
      "turretSkill": "Large Energy Turret"
    }
  ],
  "Machariel": [
    {
      "attribute": "turretFalloff",
      "magnitude": 7.5,
      "skill": "Gallente Battleship",
      "turretSkill": "Large Projectile Turret"
    }
  ],
  "Vindicator": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Battleship",
      "turretSkill": "Large Hybrid Turret"
    }
  ],
  "Republic Fleet Firetail": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 5,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Federation Navy Comet": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Vexor Navy Issue": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Succubus": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Amarr Frigate",
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Daredevil": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Dramiel": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Revelation": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Naglfar": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Moros": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Phoenix": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Sigil": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Amarr Hauler"
    }
  ],
  "Providence": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Amarr Freighter"
    }
  ],
  "Charon": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Caldari Freighter"
    }
  ],
  "Obelisk": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Freighter"
    }
  ],
  "Fenrir": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Minmatar Freighter"
    }
  ],
  "Redeemer": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Black Ops",
      "turretSkill": "Large Energy Turret"
    }
  ],
  "Panther": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Black Ops",
      "turretSkill": "Large Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 7.5,
      "skill": "Black Ops",
      "turretSkill": "Large Projectile Turret"
    }
  ],
  "Sleipnir": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Command Ships",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Vulture": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Battlecruiser",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Sabre": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Interdictors",
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Minmatar Destroyer",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Eris": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Destroyer",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Astarte": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Command Ships",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Hel": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Archon": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Ragnarok": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Thanatos": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Nyx": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Chimera": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Wyvern": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Aeon": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Nidhoggur": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Rokh": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Battleship",
      "turretSkill": "Large Hybrid Turret"
    }
  ],
  "Harbinger": [
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Energy Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Hurricane": [
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Rorqual": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Paladin": [
    {
      "attribute": "turretOptimal",
      "magnitude": 5,
      "skill": "Amarr Battleship",
      "turretSkill": "Large Energy Turret"
    }
  ],
  "Kronos": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Marauders",
      "turretSkill": "Large Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Battleship",
      "turretSkill": "Large Hybrid Turret"
    }
  ],
  "Vargur": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Marauders",
      "turretSkill": "Large Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 5,
      "skill": "Minmatar Battleship",
      "turretSkill": "Large Projectile Turret"
    }
  ],
  "Rhea": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Caldari Freighter"
    }
  ],
  "Nomad": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Minmatar Freighter"
    }
  ],
  "Anshar": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Gallente Freighter"
    }
  ],
  "Ark": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Amarr Freighter"
    }
  ],
  "Exequror Navy Issue": [
    {
      "attribute": "turretFalloff",
      "magnitude": 7.5,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Freki": [
    {
      "attribute": "turretFalloff",
      "magnitude": 50,
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Mimir": [
    {
      "attribute": "maxVelocity",
      "magnitude": 25
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 50,
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Typhoon Fleet Issue": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Minmatar Battleship",
      "turretSkill": "Large Projectile Turret"
    }
  ],
  "Miasmos Amastris Edition": [
    {
      "attribute": "maxVelocity",
      "magnitude": 5,
      "skill": "Gallente Hauler"
    }
  ],
  "Algos": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Destroyer",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Violator": [
    {
      "attribute": "turretTracking",
      "magnitude": 22.5,
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 30,
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Brutix Navy Issue": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Battlecruiser",
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Harbinger Navy Issue": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Amarr Battlecruiser",
      "turretSkill": "Medium Energy Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Energy Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Hurricane Fleet Issue": [
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Minmatar Battlecruiser",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Moracha": [
    {
      "attribute": "turretFalloff",
      "magnitude": 15,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Chremoas": [
    {
      "attribute": "turretTracking",
      "magnitude": 15,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Stratios": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Nestor": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Large Energy Turret"
    }
  ],
  "Stratios Emergency Responder": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Bowhead": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "ORE Freighter"
    }
  ],
  "Svipul": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Minmatar Tactical Destroyer",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Hecate": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Tactical Destroyer",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Imp": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Amarr Frigate",
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Fiend": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Amarr Cruiser",
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Apostle": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Minokawa": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Lif": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Ninazu": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Vehement": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Vendetta": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Vanquisher": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Molok": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Dagon": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Chemosh": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Caedes": [
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "skill": "Amarr Frigate",
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Pacifier": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Frigate",
      "turretSkill": "Small Energy Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Enforcer": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Cruiser",
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Cruiser",
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Marshal": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Battleship",
      "turretSkill": "Large Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Battleship",
      "turretSkill": "Large Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Battleship",
      "turretSkill": "Large Energy Turret"
    }
  ],
  "Virtuoso": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Victor": [
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Monitor": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Gallente Cruiser"
    }
  ],
  "Loggerhead": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Caiman": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Komodo": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Zirnitra": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Ferox Navy Issue": [
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 5,
      "skill": "Caldari Battlecruiser",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Prophecy Navy Issue": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Battlecruiser",
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Naglfar Fleet Issue": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Coercer Navy Issue": [
    {
      "attribute": "turretFalloff",
      "magnitude": 50,
      "turretSkill": "Small Energy Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Energy Turret"
    }
  ],
  "Revelation Navy Issue": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Moros Navy Issue": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 5,
      "skill": "Gallente Dreadnought",
      "turretSkill": "Capital Hybrid Turret"
    }
  ],
  "Phoenix Navy Issue": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Thrasher Fleet Issue": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 50,
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Cormorant Navy Issue": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Destroyer",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 50,
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Catalyst Navy Issue": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 50,
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Hubris": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Bane": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Karura": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 5,
      "skill": "Caldari Dreadnought",
      "turretSkill": "Capital Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Caldari Dreadnought",
      "turretSkill": "Capital Hybrid Turret"
    }
  ],
  "Valravn": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Dreadnought",
      "turretSkill": "Capital Projectile Turret"
    }
  ],
  "Cybele": [
    {
      "attribute": "maxVelocity",
      "magnitude": 30
    },
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Heavy Assault Cruisers",
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Heavy Assault Cruisers",
      "turretSkill": "Medium Hybrid Turret"
    }
  ],
  "Mekubal": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Destroyer",
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Destroyer",
      "turretSkill": "Small Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 50,
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Khizriel": [
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Battlecruiser",
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Shapash": [
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Assault Frigates",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Assault Frigates",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Azariel": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Dreadnought",
      "turretSkill": "Capital Projectile Turret"
    },
    {
      "attribute": "turretTracking",
      "magnitude": 5,
      "skill": "Gallente Dreadnought",
      "turretSkill": "Capital Projectile Turret"
    }
  ],
  "Avalanche": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Sidewinder": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Frigate",
      "turretSkill": "Small Hybrid Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Frigate",
      "turretSkill": "Small Energy Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Frigate",
      "turretSkill": "Small Projectile Turret"
    }
  ],
  "Cenotaph": [
    {
      "attribute": "turretFalloff",
      "magnitude": 25,
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 25,
      "turretSkill": "Medium Projectile Turret"
    }
  ],
  "Cobra": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Cruiser",
      "turretSkill": "Medium Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Cruiser",
      "turretSkill": "Medium Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Cruiser",
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Python": [
    {
      "attribute": "turretTracking",
      "magnitude": 7.5,
      "skill": "Gallente Battleship",
      "turretSkill": "Large Hybrid Turret"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Minmatar Battleship",
      "turretSkill": "Large Projectile Turret"
    },
    {
      "attribute": "turretOptimal",
      "magnitude": 10,
      "skill": "Amarr Battleship",
      "turretSkill": "Large Energy Turret"
    }
  ],
  "Sarathiel": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    },
    {
      "attribute": "turretFalloff",
      "magnitude": 10,
      "skill": "Gallente Dreadnought",
      "turretSkill": "Capital Projectile Turret"
    }
  ],
  "Odysseus": [
    {
      "attribute": "turretOptimal",
      "magnitude": 50,
      "turretSkill": "Medium Energy Turret"
    }
  ],
  "Algos Navy Issue": [
    {
      "attribute": "turretTracking",
      "magnitude": 10,
      "skill": "Gallente Destroyer",
      "turretSkill": "Small Hybrid Turret"
    }
  ],
  "Salvation": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Simurgh": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Gaia": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ],
  "Ymir": [
    {
      "attribute": "agility",
      "magnitude": -5,
      "skill": "Advanced Spaceship Command"
    }
  ]
} as unknown as Readonly<Record<string, readonly HullBonus[]>>;

export const DRONES = {
  "'Aergia' Hobgoblin SW-300": true,
  "'Augmented' Acolyte": true,
  "'Augmented' Berserker": true,
  "'Augmented' Hammerhead": true,
  "'Augmented' Hobgoblin": true,
  "'Augmented' Hornet": true,
  "'Augmented' Ice Harvesting Drone": true,
  "'Augmented' Infiltrator": true,
  "'Augmented' Mining Drone": true,
  "'Augmented' Ogre": true,
  "'Augmented' Praetor": true,
  "'Augmented' Valkyrie": true,
  "'Augmented' Vespa": true,
  "'Augmented' Warrior": true,
  "'Augmented' Wasp": true,
  "'Dunk' Salvage Drone": true,
  "'Excavator' Ice Harvesting Drone": true,
  "'Excavator' Mining Drone": true,
  "'Integrated' Acolyte": true,
  "'Integrated' Berserker": true,
  "'Integrated' Hammerhead": true,
  "'Integrated' Hobgoblin": true,
  "'Integrated' Hornet": true,
  "'Integrated' Infiltrator": true,
  "'Integrated' Ogre": true,
  "'Integrated' Praetor": true,
  "'Integrated' Valkyrie": true,
  "'Integrated' Vespa": true,
  "'Integrated' Warrior": true,
  "'Integrated' Wasp": true,
  "'Subverted' JVN-UC49": true,
  "Acolyte EV-300": true,
  "Acolyte I": true,
  "Acolyte II": true,
  "Acolyte TD-300": true,
  "Arabellata SW-900-I": true,
  "Aralez": true,
  "Atlas SD-900-I": true,
  "Berserker I": true,
  "Berserker II": true,
  "Berserker SW-900": true,
  "Berserker TP-900": true,
  "Bouncer I": true,
  "Bouncer II": true,
  "Caldari Navy Hornet": true,
  "Caldari Navy Vespa": true,
  "Caldari Navy Warden": true,
  "Caldari Navy Wasp": true,
  "Civilian Hobgoblin": true,
  "Civilian Mining Drone": true,
  "Curator I": true,
  "Curator II": true,
  "Darter TP-600-I": true,
  "Federation Navy Garde": true,
  "Federation Navy Hammerhead": true,
  "Federation Navy Hobgoblin": true,
  "Federation Navy Ogre": true,
  "Garde I": true,
  "Garde II": true,
  "Gecko": true,
  "Hammerhead I": true,
  "Hammerhead II": true,
  "Hammerhead SD-600": true,
  "Harvester Mining Drone": true,
  "Heavy Armor Maintenance Bot I": true,
  "Heavy Armor Maintenance Bot II": true,
  "Heavy Hull Maintenance Bot I": true,
  "Heavy Hull Maintenance Bot II": true,
  "Heavy Mutated Drone": true,
  "Heavy Shield Maintenance Bot I": true,
  "Heavy Shield Maintenance Bot II": true,
  "Hobgoblin I": true,
  "Hobgoblin II": true,
  "Hobgoblin SD-300": true,
  "Hornet EC-300": true,
  "Hornet I": true,
  "Hornet II": true,
  "Humboldt EC-900-I": true,
  "Huntsman SW-600-I": true,
  "Ice Harvesting Drone I": true,
  "Ice Harvesting Drone II": true,
  "Immaculate TD-600-I": true,
  "Imperial Navy Acolyte": true,
  "Imperial Navy Curator": true,
  "Imperial Navy Infiltrator": true,
  "Imperial Navy Praetor": true,
  "Infiltrator EV-600": true,
  "Infiltrator I": true,
  "Infiltrator II": true,
  "Infiltrator TD-600": true,
  "Inshore EC-300-I": true,
  "Light Armor Maintenance Bot I": true,
  "Light Armor Maintenance Bot II": true,
  "Light Hull Maintenance Bot I": true,
  "Light Hull Maintenance Bot II": true,
  "Light Mutated Drone": true,
  "Light Shield Maintenance Bot I": true,
  "Light Shield Maintenance Bot II": true,
  "Luna SD-600-I": true,
  "Medium Armor Maintenance Bot I": true,
  "Medium Armor Maintenance Bot II": true,
  "Medium Hull Maintenance Bot I": true,
  "Medium Hull Maintenance Bot II": true,
  "Medium Mutated Drone": true,
  "Medium Shield Maintenance Bot I": true,
  "Medium Shield Maintenance Bot II": true,
  "Meganeura TP-900-I": true,
  "Mining Drone I": true,
  "Mining Drone II": true,
  "Mosquito EV-600-I": true,
  "Mutated 'Excavator' Ice Harvesting Drone": true,
  "Mutated 'Excavator' Mining Drone": true,
  "Mutated Ice Harvesting Drone": true,
  "Mutated Mining Drone": true,
  "Nertic EC-600-I": true,
  "Ogre I": true,
  "Ogre II": true,
  "Ogre SD-900": true,
  "Orbweaver SW-300-I": true,
  "Praetor EV-900": true,
  "Praetor I": true,
  "Praetor II": true,
  "Praetor TD-900": true,
  "Prototype 'Pluto' Ice Harvesting Drone": true,
  "Prototype 'Pluto' Mining Drone": true,
  "Republic Fleet Berserker": true,
  "Republic Fleet Bouncer": true,
  "Republic Fleet Valkyrie": true,
  "Republic Fleet Warrior": true,
  "Salvage Drone I": true,
  "Salvage Drone II": true,
  "Sentry Mutated Drone": true,
  "Skimmer TP-300-I": true,
  "Stellate TD-300-I": true,
  "Stigmella SD-300-I": true,
  "Tabanida EV-900-I": true,
  "Tick EV-300-I": true,
  "Torafugu TD-900-I": true,
  "Valkyrie I": true,
  "Valkyrie II": true,
  "Valkyrie SW-600": true,
  "Valkyrie TP-600": true,
  "Vespa EC-600": true,
  "Vespa I": true,
  "Vespa II": true,
  "Warden I": true,
  "Warden II": true,
  "Warrior I": true,
  "Warrior II": true,
  "Warrior SW-300": true,
  "Warrior TP-300": true,
  "Wasp EC-900": true,
  "Wasp I": true,
  "Wasp II": true
} as unknown as Readonly<Record<string, true>>;
