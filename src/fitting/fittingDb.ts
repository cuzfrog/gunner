// Generated from EVE Online SDE (2026-08-20). Do not edit by hand.
/* eslint-disable */

import type { HullTier } from "../ships";


export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
  readonly activeMassMultiplier: number;
}

export interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercentage?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly propulsion?: FittingPropulsionStats;
}

export interface TurretStats {
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
}

export interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
}


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
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "1MN Afterburner II": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.35,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "1MN Afterburner I": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.15,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "5MN Microwarpdrive II": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.1,
      "massAddition": 500000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "'Basic' Reinforced Bulkheads": {
    "massAddition": 200,
    "agilityMultiplier": 1.01
  },
  "'Basic' Nanofiber Internal Structure": {
    "massAddition": 100,
    "speedBonusPercent": 5.25,
    "agilityMultiplier": 0.8975
  },
  "Reinforced Bulkheads I": {
    "massAddition": 200,
    "agilityMultiplier": 1.03
  },
  "Reinforced Bulkheads II": {
    "massAddition": 200,
    "agilityMultiplier": 1.05
  },
  "'Basic' Inertial Stabilizers": {
    "massAddition": 200,
    "agilityMultiplier": 0.86
  },
  "Inertial Stabilizers I": {
    "massAddition": 200,
    "agilityMultiplier": 0.8325
  },
  "Inertial Stabilizers II": {
    "massAddition": 200,
    "agilityMultiplier": 0.8
  },
  "Nanofiber Internal Structure I": {
    "massAddition": 100,
    "speedBonusPercent": 7.75,
    "agilityMultiplier": 0.87
  },
  "Nanofiber Internal Structure II": {
    "massAddition": 100,
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
  "Medium Processor Overclocking Unit I": {
    "massAddition": 200
  },
  "Large Processor Overclocking Unit I": {
    "massAddition": 200
  },
  "Medium Processor Overclocking Unit II": {
    "massAddition": 200
  },
  "Large Processor Overclocking Unit II": {
    "massAddition": 200
  },
  "Type-D Restrained Inertial Stabilizers": {
    "massAddition": 200,
    "agilityMultiplier": 0.815
  },
  "Type-D Restrained Nanofiber Structure": {
    "massAddition": 100,
    "speedBonusPercent": 8.5,
    "agilityMultiplier": 0.855
  },
  "Type-D Restrained Reinforced Bulkheads": {
    "massAddition": 200,
    "agilityMultiplier": 1.01
  },
  "Mark I Compact Reinforced Bulkheads": {
    "massAddition": 200,
    "agilityMultiplier": 1.03
  },
  "500MN Cold-Gas Enduring Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.05,
      "massAddition": 50000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "100MN Monopropellant Enduring Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.25,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "5MN Cold-Gas Enduring Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.05,
      "massAddition": 500000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "5MN Y-T8 Compact Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.05,
      "massAddition": 500000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "50MN Cold-Gas Enduring Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.05,
      "massAddition": 5000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "1MN Y-S8 Compact Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.25,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "1MN Monopropellant Enduring Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.25,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "10MN Monopropellant Enduring Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.25,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Large Azeotropic Restrained Shield Extender": {
    "sigRadiusAdd": 15
  },
  "Small Azeotropic Restrained Shield Extender": {
    "sigRadiusAdd": 0
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
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "500MN Microwarpdrive I": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5,
      "massAddition": 50000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "10MN Afterburner I": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.15,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "10MN Afterburner II": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.35,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "100MN Afterburner I": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.15,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "100MN Afterburner II": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.35,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "50MN Microwarpdrive II": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.1,
      "massAddition": 5000000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "500MN Microwarpdrive II": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.1,
      "massAddition": 50000000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "Domination 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.45,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Shadow Serpentis 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.45,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Domination 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.45,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Shadow Serpentis 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.45,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Domination 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.45,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Shadow Serpentis 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.45,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Domination 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.12,
      "massAddition": 50000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Shadow Serpentis 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.12,
      "massAddition": 50000000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "Domination 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.12,
      "massAddition": 5000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Shadow Serpentis 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.12,
      "massAddition": 5000000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "Domination 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.12,
      "massAddition": 500000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Shadow Serpentis 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.12,
      "massAddition": 500000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "Domination Nanofiber Structure": {
    "massAddition": 100,
    "speedBonusPercent": 9.5,
    "agilityMultiplier": 0.84
  },
  "Mizuro's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.5,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Hakim's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.55,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gotan's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.6,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Tobias' Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.65,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Mizuro's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.14,
      "massAddition": 50000000,
      "sigBloom": 4.3,
      "activeMassMultiplier": 1
    }
  },
  "Hakim's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.16,
      "massAddition": 50000000,
      "sigBloom": 4.1,
      "activeMassMultiplier": 1
    }
  },
  "Gotan's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.18,
      "massAddition": 50000000,
      "sigBloom": 3.9,
      "activeMassMultiplier": 1
    }
  },
  "Tobias' Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.2,
      "massAddition": 50000000,
      "sigBloom": 3.5,
      "activeMassMultiplier": 1
    }
  },
  "Brynn's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.5,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Tuvan's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.55,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Setele's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.6,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Cormack's Modified 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.65,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Brynn's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.14,
      "massAddition": 50000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Tuvan's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.16,
      "massAddition": 50000000,
      "sigBloom": 4.3,
      "activeMassMultiplier": 1
    }
  },
  "Setele's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.18,
      "massAddition": 50000000,
      "sigBloom": 4.1,
      "activeMassMultiplier": 1
    }
  },
  "Cormack's Modified 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.2,
      "massAddition": 50000000,
      "sigBloom": 3.9,
      "activeMassMultiplier": 1
    }
  },
  "Republic Fleet 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.12,
      "massAddition": 500000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Republic Fleet 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.45,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Republic Fleet 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.12,
      "massAddition": 5000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Republic Fleet 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.45,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Republic Fleet 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.12,
      "massAddition": 50000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Republic Fleet 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.45,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Federation Navy 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.12,
      "massAddition": 500000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "Federation Navy 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.45,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Federation Navy 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.12,
      "massAddition": 5000000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "Federation Navy 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.45,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Federation Navy 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.12,
      "massAddition": 50000000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "Federation Navy 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.45,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Republic Fleet Nanofiber Structure": {
    "massAddition": 100,
    "speedBonusPercent": 9.5,
    "agilityMultiplier": 0.84
  },
  "Gistii C-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.5,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gistum C-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.5,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gist C-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.5,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gistii B-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.55,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gistum B-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.55,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gist B-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.55,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gistii A-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.6,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gistum A-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.6,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gist A-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.6,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gist X-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.65,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Coreli C-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.5,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Corelum C-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.5,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Core C-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.5,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Coreli B-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.55,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Corelum B-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.55,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Core B-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.55,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Coreli A-Type 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.6,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Corelum A-Type 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.6,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Core A-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.6,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Core X-Type 100MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.65,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Coreli C-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.14,
      "massAddition": 500000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Corelum C-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.14,
      "massAddition": 5000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Core C-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.14,
      "massAddition": 50000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Coreli B-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.16,
      "massAddition": 500000,
      "sigBloom": 4.3,
      "activeMassMultiplier": 1
    }
  },
  "Corelum B-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.16,
      "massAddition": 5000000,
      "sigBloom": 4.3,
      "activeMassMultiplier": 1
    }
  },
  "Core B-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.16,
      "massAddition": 50000000,
      "sigBloom": 4.3,
      "activeMassMultiplier": 1
    }
  },
  "Coreli A-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.18,
      "massAddition": 500000,
      "sigBloom": 4.1,
      "activeMassMultiplier": 1
    }
  },
  "Corelum A-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.18,
      "massAddition": 5000000,
      "sigBloom": 4.1,
      "activeMassMultiplier": 1
    }
  },
  "Core A-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.18,
      "massAddition": 50000000,
      "sigBloom": 4.1,
      "activeMassMultiplier": 1
    }
  },
  "Core X-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.2,
      "massAddition": 50000000,
      "sigBloom": 3.9,
      "activeMassMultiplier": 1
    }
  },
  "Gistii C-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.14,
      "massAddition": 500000,
      "sigBloom": 4.3,
      "activeMassMultiplier": 1
    }
  },
  "Gistum C-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.14,
      "massAddition": 5000000,
      "sigBloom": 4.3,
      "activeMassMultiplier": 1
    }
  },
  "Gist C-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.14,
      "massAddition": 50000000,
      "sigBloom": 4.3,
      "activeMassMultiplier": 1
    }
  },
  "Gistii B-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.16,
      "massAddition": 500000,
      "sigBloom": 4.1,
      "activeMassMultiplier": 1
    }
  },
  "Gistum B-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.16,
      "massAddition": 5000000,
      "sigBloom": 4.1,
      "activeMassMultiplier": 1
    }
  },
  "Gist B-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.16,
      "massAddition": 50000000,
      "sigBloom": 4.1,
      "activeMassMultiplier": 1
    }
  },
  "Gistii A-Type 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.18,
      "massAddition": 500000,
      "sigBloom": 3.9,
      "activeMassMultiplier": 1
    }
  },
  "Gistum A-Type 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.18,
      "massAddition": 5000000,
      "sigBloom": 3.9,
      "activeMassMultiplier": 1
    }
  },
  "Gist A-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.18,
      "massAddition": 50000000,
      "sigBloom": 3.9,
      "activeMassMultiplier": 1
    }
  },
  "Gist X-Type 500MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.2,
      "massAddition": 50000000,
      "sigBloom": 3.5,
      "activeMassMultiplier": 1
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
  "Small 'Trapper' Shield Extender": {
    "sigRadiusAdd": 0
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
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "10MN Analog Booster Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.35,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "100MN Analog Booster Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.35,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "5MN Digital Booster Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.1,
      "massAddition": 500000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "50MN Digital Booster Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.1,
      "massAddition": 5000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "500MN Digital Booster Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.1,
      "massAddition": 50000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "Synthetic Hull Conversion Reinforced Bulkheads": {
    "massAddition": 200,
    "agilityMultiplier": 1.03
  },
  "Synthetic Hull Conversion Inertial Stabilizers": {
    "massAddition": 200,
    "agilityMultiplier": 0.8
  },
  "Synthetic Hull Conversion Nanofiber Structure": {
    "massAddition": 100,
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
      "sigBloom": 0,
      "activeMassMultiplier": 1
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
    "massAddition": 200
  },
  "Large Explosive Armor Reinforcer I": {
    "massAddition": 200
  },
  "Large Kinetic Armor Reinforcer I": {
    "massAddition": 200
  },
  "Large Thermal Armor Reinforcer I": {
    "massAddition": 200
  },
  "Large Trimark Armor Pump I": {
    "massAddition": 200
  },
  "Large Auxiliary Nano Pump I": {
    "massAddition": 200
  },
  "Large Nanobot Accelerator I": {
    "massAddition": 200
  },
  "Large Remote Repair Augmentor I": {
    "massAddition": 200
  },
  "Large Core Defense Capacitor Safeguard I": {
    "massAddition": 200
  },
  "Large Drone Control Range Augmentor I": {
    "massAddition": 200
  },
  "Large Drone Repair Augmentor I": {
    "massAddition": 200
  },
  "Large Drone Scope Chip I": {
    "massAddition": 200
  },
  "Large Drone Speed Augmentor I": {
    "massAddition": 200
  },
  "Large Drone Durability Enhancer I": {
    "massAddition": 200
  },
  "Large Drone Mining Augmentor I": {
    "massAddition": 200
  },
  "Large Sentry Damage Augmentor I": {
    "massAddition": 200
  },
  "Large Stasis Drone Augmentor I": {
    "massAddition": 200
  },
  "Large Signal Disruption Amplifier I": {
    "massAddition": 200
  },
  "Large Liquid Cooled Electronics I": {
    "massAddition": 200
  },
  "Large Capacitor Control Circuit I": {
    "massAddition": 200
  },
  "Large Egress Port Maximizer I": {
    "massAddition": 200
  },
  "Large Powergrid Subroutine Maximizer I": {
    "massAddition": 200
  },
  "Large Semiconductor Memory Cell I": {
    "massAddition": 200
  },
  "Large Ancillary Current Router I": {
    "massAddition": 200
  },
  "Large Energy Discharge Elutriation I": {
    "massAddition": 200
  },
  "Large Energy Ambit Extension I": {
    "massAddition": 200
  },
  "Large Energy Locus Coordinator I": {
    "massAddition": 200
  },
  "Large Energy Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Large Algid Energy Administrations Unit I": {
    "massAddition": 200
  },
  "Large Energy Burst Aerator I": {
    "massAddition": 200
  },
  "Large Energy Collision Accelerator I": {
    "massAddition": 200
  },
  "Large Hybrid Discharge Elutriation I": {
    "massAddition": 200
  },
  "Large Hybrid Ambit Extension I": {
    "massAddition": 200
  },
  "Large Hybrid Locus Coordinator I": {
    "massAddition": 200
  },
  "Large Hybrid Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Large Algid Hybrid Administrations Unit I": {
    "massAddition": 200
  },
  "Large Hybrid Burst Aerator I": {
    "massAddition": 200
  },
  "Large Hybrid Collision Accelerator I": {
    "massAddition": 200
  },
  "Large Hydraulic Bay Thrusters I": {
    "massAddition": 200
  },
  "Large Warhead Rigor Catalyst I": {
    "massAddition": 200
  },
  "Large Rocket Fuel Cache Partition I": {
    "massAddition": 200
  },
  "Large Bay Loading Accelerator I": {
    "massAddition": 200
  },
  "Large Warhead Flare Catalyst I": {
    "massAddition": 200
  },
  "Large Warhead Calefaction Catalyst I": {
    "massAddition": 200
  },
  "Large Projectile Ambit Extension I": {
    "massAddition": 200
  },
  "Large Projectile Locus Coordinator I": {
    "massAddition": 200
  },
  "Large Projectile Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Large Projectile Burst Aerator I": {
    "massAddition": 200
  },
  "Large Projectile Collision Accelerator I": {
    "massAddition": 200
  },
  "Large Dynamic Fuel Valve I": {
    "massAddition": 200
  },
  "Large Low Friction Nozzle Joints I": {
    "massAddition": 200,
    "agilityMultiplier": 0.883
  },
  "Large Auxiliary Thrusters I": {
    "massAddition": 200,
    "speedBonusPercent": 7.25
  },
  "Large Engine Thermal Shielding I": {
    "massAddition": 200
  },
  "Large Warp Core Optimizer I": {
    "massAddition": 200
  },
  "Large Hyperspatial Velocity Optimizer I": {
    "massAddition": 200
  },
  "Large Polycarbon Engine Housing I": {
    "massAddition": 200,
    "speedBonusPercent": 5.5,
    "agilityMultiplier": 0.909
  },
  "Large Cargohold Optimization I": {
    "massAddition": 200
  },
  "Large EM Shield Reinforcer I": {
    "massAddition": 200
  },
  "Large Explosive Shield Reinforcer I": {
    "massAddition": 200
  },
  "Large Kinetic Shield Reinforcer I": {
    "massAddition": 200
  },
  "Large Thermal Shield Reinforcer I": {
    "massAddition": 200
  },
  "Large Core Defense Field Purger I": {
    "massAddition": 200
  },
  "Large Core Defense Operational Solidifier I": {
    "massAddition": 200
  },
  "Large Core Defense Field Extender I": {
    "massAddition": 200
  },
  "Large Core Defense Charge Economizer I": {
    "massAddition": 200
  },
  "Large Targeting Systems Stabilizer I": {
    "massAddition": 200
  },
  "Large Particle Dispersion Augmentor I": {
    "massAddition": 200
  },
  "Large Particle Dispersion Projector I": {
    "massAddition": 200
  },
  "Large Inverted Signal Field Projector I": {
    "massAddition": 200
  },
  "Large Tracking Diagnostic Subroutines I": {
    "massAddition": 200
  },
  "Large EM Armor Reinforcer II": {
    "massAddition": 200
  },
  "Large Explosive Armor Reinforcer II": {
    "massAddition": 200
  },
  "Large Kinetic Armor Reinforcer II": {
    "massAddition": 200
  },
  "Large Thermal Armor Reinforcer II": {
    "massAddition": 200
  },
  "Large Auxiliary Nano Pump II": {
    "massAddition": 200
  },
  "Large Nanobot Accelerator II": {
    "massAddition": 200
  },
  "Large Remote Repair Augmentor II": {
    "massAddition": 200
  },
  "Large Trimark Armor Pump II": {
    "massAddition": 200
  },
  "Large Cargohold Optimization II": {
    "massAddition": 200
  },
  "Large Dynamic Fuel Valve II": {
    "massAddition": 200
  },
  "Large Engine Thermal Shielding II": {
    "massAddition": 200
  },
  "Large Low Friction Nozzle Joints II": {
    "massAddition": 200,
    "agilityMultiplier": 0.86
  },
  "Large Polycarbon Engine Housing II": {
    "massAddition": 200,
    "speedBonusPercent": 6.6,
    "agilityMultiplier": 0.89
  },
  "Large Auxiliary Thrusters II": {
    "massAddition": 200,
    "speedBonusPercent": 8.75
  },
  "Large Warp Core Optimizer II": {
    "massAddition": 200
  },
  "Large Hyperspatial Velocity Optimizer II": {
    "massAddition": 200
  },
  "Large Drone Control Range Augmentor II": {
    "massAddition": 200
  },
  "Large Drone Durability Enhancer II": {
    "massAddition": 200
  },
  "Large Drone Mining Augmentor II": {
    "massAddition": 200
  },
  "Large Drone Repair Augmentor II": {
    "massAddition": 200
  },
  "Large Drone Scope Chip II": {
    "massAddition": 200
  },
  "Large Drone Speed Augmentor II": {
    "massAddition": 200
  },
  "Large Sentry Damage Augmentor II": {
    "massAddition": 200
  },
  "Large Stasis Drone Augmentor II": {
    "massAddition": 200
  },
  "Large Signal Disruption Amplifier II": {
    "massAddition": 200
  },
  "Large Liquid Cooled Electronics II": {
    "massAddition": 200
  },
  "Large Particle Dispersion Augmentor II": {
    "massAddition": 200
  },
  "Large Inverted Signal Field Projector II": {
    "massAddition": 200
  },
  "Large Tracking Diagnostic Subroutines II": {
    "massAddition": 200
  },
  "Large Particle Dispersion Projector II": {
    "massAddition": 200
  },
  "Large Targeting Systems Stabilizer II": {
    "massAddition": 200
  },
  "Large Egress Port Maximizer II": {
    "massAddition": 200
  },
  "Large Ancillary Current Router II": {
    "massAddition": 200
  },
  "Large Powergrid Subroutine Maximizer II": {
    "massAddition": 200
  },
  "Large Capacitor Control Circuit II": {
    "massAddition": 200
  },
  "Large Semiconductor Memory Cell II": {
    "massAddition": 200
  },
  "Large Energy Discharge Elutriation II": {
    "massAddition": 200
  },
  "Large Energy Burst Aerator II": {
    "massAddition": 200
  },
  "Large Energy Collision Accelerator II": {
    "massAddition": 200
  },
  "Large Algid Energy Administrations Unit II": {
    "massAddition": 200
  },
  "Large Energy Ambit Extension II": {
    "massAddition": 200
  },
  "Large Energy Locus Coordinator II": {
    "massAddition": 200
  },
  "Large Energy Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Large Hybrid Discharge Elutriation II": {
    "massAddition": 200
  },
  "Large Hybrid Burst Aerator II": {
    "massAddition": 200
  },
  "Large Hybrid Collision Accelerator II": {
    "massAddition": 200
  },
  "Large Algid Hybrid Administrations Unit II": {
    "massAddition": 200
  },
  "Large Hybrid Ambit Extension II": {
    "massAddition": 200
  },
  "Large Hybrid Locus Coordinator II": {
    "massAddition": 200
  },
  "Large Hybrid Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Large Bay Loading Accelerator II": {
    "massAddition": 200
  },
  "Large Warhead Flare Catalyst II": {
    "massAddition": 200
  },
  "Large Warhead Rigor Catalyst II": {
    "massAddition": 200
  },
  "Large Hydraulic Bay Thrusters II": {
    "massAddition": 200
  },
  "Large Rocket Fuel Cache Partition II": {
    "massAddition": 200
  },
  "Large Warhead Calefaction Catalyst II": {
    "massAddition": 200
  },
  "Large Projectile Collision Accelerator II": {
    "massAddition": 200
  },
  "Large Projectile Ambit Extension II": {
    "massAddition": 200
  },
  "Large Projectile Burst Aerator II": {
    "massAddition": 200
  },
  "Large Projectile Locus Coordinator II": {
    "massAddition": 200
  },
  "Large Projectile Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Large EM Shield Reinforcer II": {
    "massAddition": 200
  },
  "Large Explosive Shield Reinforcer II": {
    "massAddition": 200
  },
  "Large Kinetic Shield Reinforcer II": {
    "massAddition": 200
  },
  "Large Thermal Shield Reinforcer II": {
    "massAddition": 200
  },
  "Large Core Defense Capacitor Safeguard II": {
    "massAddition": 200
  },
  "Large Core Defense Charge Economizer II": {
    "massAddition": 200
  },
  "Large Core Defense Field Extender II": {
    "massAddition": 200
  },
  "Large Core Defense Field Purger II": {
    "massAddition": 200
  },
  "Large Core Defense Operational Solidifier II": {
    "massAddition": 200
  },
  "Small Processor Overclocking Unit I": {
    "massAddition": 200
  },
  "Small Processor Overclocking Unit II": {
    "massAddition": 200
  },
  "Capital Auxiliary Nano Pump I": {
    "massAddition": 200
  },
  "Capital Nanobot Accelerator II": {
    "massAddition": 200
  },
  "Small Remote Repair Augmentor I": {
    "massAddition": 200
  },
  "Thukker Small Shield Extender": {
    "sigRadiusAdd": 0
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
  "Small Trimark Armor Pump I": {
    "massAddition": 200
  },
  "Capital Trimark Armor Pump I": {
    "massAddition": 200
  },
  "Small EM Armor Reinforcer I": {
    "massAddition": 200
  },
  "Medium EM Armor Reinforcer I": {
    "massAddition": 200
  },
  "Capital EM Armor Reinforcer I": {
    "massAddition": 200
  },
  "Small EM Armor Reinforcer II": {
    "massAddition": 200
  },
  "Medium EM Armor Reinforcer II": {
    "massAddition": 200
  },
  "Capital EM Armor Reinforcer II": {
    "massAddition": 200
  },
  "Small Explosive Armor Reinforcer I": {
    "massAddition": 200
  },
  "Medium Explosive Armor Reinforcer I": {
    "massAddition": 200
  },
  "Capital Explosive Armor Reinforcer I": {
    "massAddition": 200
  },
  "Small Explosive Armor Reinforcer II": {
    "massAddition": 200
  },
  "Medium Explosive Armor Reinforcer II": {
    "massAddition": 200
  },
  "Capital Explosive Armor Reinforcer II": {
    "massAddition": 200
  },
  "Small Kinetic Armor Reinforcer I": {
    "massAddition": 200
  },
  "Medium Kinetic Armor Reinforcer I": {
    "massAddition": 200
  },
  "Capital Kinetic Armor Reinforcer I": {
    "massAddition": 200
  },
  "Small Kinetic Armor Reinforcer II": {
    "massAddition": 200
  },
  "Medium Kinetic Armor Reinforcer II": {
    "massAddition": 200
  },
  "Capital Kinetic Armor Reinforcer II": {
    "massAddition": 200
  },
  "Small Thermal Armor Reinforcer I": {
    "massAddition": 200
  },
  "Medium Thermal Armor Reinforcer I": {
    "massAddition": 200
  },
  "Capital Thermal Armor Reinforcer I": {
    "massAddition": 200
  },
  "Small Thermal Armor Reinforcer II": {
    "massAddition": 200
  },
  "Medium Thermal Armor Reinforcer II": {
    "massAddition": 200
  },
  "Capital Thermal Armor Reinforcer II": {
    "massAddition": 200
  },
  "Small Auxiliary Nano Pump I": {
    "massAddition": 200
  },
  "Medium Auxiliary Nano Pump I": {
    "massAddition": 200
  },
  "Capital Auxiliary Nano Pump II": {
    "massAddition": 200
  },
  "Small Auxiliary Nano Pump II": {
    "massAddition": 200
  },
  "Medium Auxiliary Nano Pump II": {
    "massAddition": 200
  },
  "Medium Trimark Armor Pump I": {
    "massAddition": 200
  },
  "Small Trimark Armor Pump II": {
    "massAddition": 200
  },
  "Medium Trimark Armor Pump II": {
    "massAddition": 200
  },
  "Capital Trimark Armor Pump II": {
    "massAddition": 200
  },
  "Small Nanobot Accelerator I": {
    "massAddition": 200
  },
  "Medium Nanobot Accelerator I": {
    "massAddition": 200
  },
  "Capital Nanobot Accelerator I": {
    "massAddition": 200
  },
  "Small Nanobot Accelerator II": {
    "massAddition": 200
  },
  "Medium Nanobot Accelerator II": {
    "massAddition": 200
  },
  "Medium Remote Repair Augmentor I": {
    "massAddition": 200
  },
  "Capital Remote Repair Augmentor I": {
    "massAddition": 200
  },
  "Small Remote Repair Augmentor II": {
    "massAddition": 200
  },
  "Medium Remote Repair Augmentor II": {
    "massAddition": 200
  },
  "Capital Remote Repair Augmentor II": {
    "massAddition": 200
  },
  "Small Auxiliary Thrusters I": {
    "massAddition": 200,
    "speedBonusPercent": 7.25
  },
  "Medium Auxiliary Thrusters I": {
    "massAddition": 200,
    "speedBonusPercent": 7.25
  },
  "Capital Auxiliary Thrusters I": {
    "massAddition": 200,
    "speedBonusPercent": 7.25
  },
  "Small Auxiliary Thrusters II": {
    "massAddition": 200,
    "speedBonusPercent": 8.75
  },
  "Medium Auxiliary Thrusters II": {
    "massAddition": 200,
    "speedBonusPercent": 8.75
  },
  "Capital Auxiliary Thrusters II": {
    "massAddition": 200,
    "speedBonusPercent": 8.75
  },
  "Small Cargohold Optimization I": {
    "massAddition": 200
  },
  "Medium Cargohold Optimization I": {
    "massAddition": 200
  },
  "Capital Cargohold Optimization I": {
    "massAddition": 200
  },
  "Small Cargohold Optimization II": {
    "massAddition": 200
  },
  "Medium Cargohold Optimization II": {
    "massAddition": 200
  },
  "Capital Cargohold Optimization II": {
    "massAddition": 200
  },
  "Small Dynamic Fuel Valve I": {
    "massAddition": 200
  },
  "Medium Dynamic Fuel Valve I": {
    "massAddition": 200
  },
  "Capital Dynamic Fuel Valve I": {
    "massAddition": 200
  },
  "Small Dynamic Fuel Valve II": {
    "massAddition": 200
  },
  "Medium Dynamic Fuel Valve II": {
    "massAddition": 200
  },
  "Capital Dynamic Fuel Valve II": {
    "massAddition": 200
  },
  "Small Engine Thermal Shielding I": {
    "massAddition": 200
  },
  "Medium Engine Thermal Shielding I": {
    "massAddition": 200
  },
  "Capital Engine Thermal Shielding I": {
    "massAddition": 200
  },
  "Small Engine Thermal Shielding II": {
    "massAddition": 200
  },
  "Medium Engine Thermal Shielding II": {
    "massAddition": 200
  },
  "Capital Engine Thermal Shielding II": {
    "massAddition": 200
  },
  "Small Low Friction Nozzle Joints I": {
    "massAddition": 200,
    "agilityMultiplier": 0.883
  },
  "Medium Low Friction Nozzle Joints I": {
    "massAddition": 200,
    "agilityMultiplier": 0.883
  },
  "Capital Low Friction Nozzle Joints I": {
    "massAddition": 200,
    "agilityMultiplier": 0.883
  },
  "Small Hyperspatial Velocity Optimizer I": {
    "massAddition": 200
  },
  "Medium Hyperspatial Velocity Optimizer I": {
    "massAddition": 200
  },
  "Capital Hyperspatial Velocity Optimizer I": {
    "massAddition": 200
  },
  "Small Hyperspatial Velocity Optimizer II": {
    "massAddition": 200
  },
  "Medium Hyperspatial Velocity Optimizer II": {
    "massAddition": 200
  },
  "Capital Hyperspatial Velocity Optimizer II": {
    "massAddition": 200
  },
  "Small Low Friction Nozzle Joints II": {
    "massAddition": 200,
    "agilityMultiplier": 0.86
  },
  "Medium Low Friction Nozzle Joints II": {
    "massAddition": 200,
    "agilityMultiplier": 0.86
  },
  "Capital Low Friction Nozzle Joints II": {
    "massAddition": 200,
    "agilityMultiplier": 0.86
  },
  "Small Polycarbon Engine Housing I": {
    "massAddition": 200,
    "speedBonusPercent": 5.5,
    "agilityMultiplier": 0.909
  },
  "Medium Polycarbon Engine Housing I": {
    "massAddition": 200,
    "speedBonusPercent": 5.5,
    "agilityMultiplier": 0.909
  },
  "Capital Polycarbon Engine Housing I": {
    "massAddition": 200,
    "agilityMultiplier": 0.909
  },
  "Small Polycarbon Engine Housing II": {
    "massAddition": 200,
    "speedBonusPercent": 6.6,
    "agilityMultiplier": 0.89
  },
  "Medium Polycarbon Engine Housing II": {
    "massAddition": 200,
    "speedBonusPercent": 6.6,
    "agilityMultiplier": 0.89
  },
  "Capital Polycarbon Engine Housing II": {
    "massAddition": 200,
    "agilityMultiplier": 0.89
  },
  "Small Warp Core Optimizer I": {
    "massAddition": 200
  },
  "Medium Warp Core Optimizer I": {
    "massAddition": 200
  },
  "Capital Warp Core Optimizer I": {
    "massAddition": 200
  },
  "Small Warp Core Optimizer II": {
    "massAddition": 200
  },
  "Medium Warp Core Optimizer II": {
    "massAddition": 200
  },
  "Capital Warp Core Optimizer II": {
    "massAddition": 200
  },
  "Small Liquid Cooled Electronics I": {
    "massAddition": 200
  },
  "Medium Liquid Cooled Electronics I": {
    "massAddition": 200
  },
  "Capital Liquid Cooled Electronics I": {
    "massAddition": 200
  },
  "Small Liquid Cooled Electronics II": {
    "massAddition": 200
  },
  "Medium Liquid Cooled Electronics II": {
    "massAddition": 200
  },
  "Capital Liquid Cooled Electronics II": {
    "massAddition": 200
  },
  "Small Signal Disruption Amplifier I": {
    "massAddition": 200
  },
  "Medium Signal Disruption Amplifier I": {
    "massAddition": 200
  },
  "Capital Signal Disruption Amplifier I": {
    "massAddition": 200
  },
  "Small Signal Disruption Amplifier II": {
    "massAddition": 200
  },
  "Medium Signal Disruption Amplifier II": {
    "massAddition": 200
  },
  "Capital Signal Disruption Amplifier II": {
    "massAddition": 200
  },
  "Small Inverted Signal Field Projector I": {
    "massAddition": 200
  },
  "Medium Inverted Signal Field Projector I": {
    "massAddition": 200
  },
  "Capital Inverted Signal Field Projector I": {
    "massAddition": 200
  },
  "Small Inverted Signal Field Projector II": {
    "massAddition": 200
  },
  "Medium Inverted Signal Field Projector II": {
    "massAddition": 200
  },
  "Capital Inverted Signal Field Projector II": {
    "massAddition": 200
  },
  "Small Particle Dispersion Augmentor I": {
    "massAddition": 200
  },
  "Medium Particle Dispersion Augmentor I": {
    "massAddition": 200
  },
  "Capital Particle Dispersion Augmentor I": {
    "massAddition": 200
  },
  "Small Particle Dispersion Augmentor II": {
    "massAddition": 200
  },
  "Medium Particle Dispersion Augmentor II": {
    "massAddition": 200
  },
  "Capital Particle Dispersion Augmentor II": {
    "massAddition": 200
  },
  "Small Particle Dispersion Projector I": {
    "massAddition": 200
  },
  "Medium Particle Dispersion Projector I": {
    "massAddition": 200
  },
  "Capital Particle Dispersion Projector I": {
    "massAddition": 200
  },
  "Small Particle Dispersion Projector II": {
    "massAddition": 200
  },
  "Medium Particle Dispersion Projector II": {
    "massAddition": 200
  },
  "Capital Particle Dispersion Projector II": {
    "massAddition": 200
  },
  "Small Targeting Systems Stabilizer I": {
    "massAddition": 200
  },
  "Medium Targeting Systems Stabilizer I": {
    "massAddition": 200
  },
  "Capital Targeting Systems Stabilizer I": {
    "massAddition": 200
  },
  "Small Targeting Systems Stabilizer II": {
    "massAddition": 200
  },
  "Medium Targeting Systems Stabilizer II": {
    "massAddition": 200
  },
  "Capital Targeting Systems Stabilizer II": {
    "massAddition": 200
  },
  "Small Tracking Diagnostic Subroutines I": {
    "massAddition": 200
  },
  "Medium Tracking Diagnostic Subroutines I": {
    "massAddition": 200
  },
  "Capital Tracking Diagnostic Subroutines I": {
    "massAddition": 200
  },
  "Small Tracking Diagnostic Subroutines II": {
    "massAddition": 200
  },
  "Medium Tracking Diagnostic Subroutines II": {
    "massAddition": 200
  },
  "Capital Tracking Diagnostic Subroutines II": {
    "massAddition": 200
  },
  "Small Ancillary Current Router I": {
    "massAddition": 200
  },
  "Medium Ancillary Current Router I": {
    "massAddition": 200
  },
  "Capital Ancillary Current Router I": {
    "massAddition": 200
  },
  "Small Ancillary Current Router II": {
    "massAddition": 200
  },
  "Medium Ancillary Current Router II": {
    "massAddition": 200
  },
  "Capital Ancillary Current Router II": {
    "massAddition": 200
  },
  "Small Capacitor Control Circuit I": {
    "massAddition": 200
  },
  "Medium Capacitor Control Circuit I": {
    "massAddition": 200
  },
  "Capital Capacitor Control Circuit I": {
    "massAddition": 200
  },
  "Small Capacitor Control Circuit II": {
    "massAddition": 200
  },
  "Medium Capacitor Control Circuit II": {
    "massAddition": 200
  },
  "Capital Capacitor Control Circuit II": {
    "massAddition": 200
  },
  "Small Egress Port Maximizer I": {
    "massAddition": 200
  },
  "Medium Egress Port Maximizer I": {
    "massAddition": 200
  },
  "Capital Egress Port Maximizer I": {
    "massAddition": 200
  },
  "Small Egress Port Maximizer II": {
    "massAddition": 200
  },
  "Medium Egress Port Maximizer II": {
    "massAddition": 200
  },
  "Capital Egress Port Maximizer II": {
    "massAddition": 200
  },
  "Small Powergrid Subroutine Maximizer I": {
    "massAddition": 200
  },
  "Medium Powergrid Subroutine Maximizer I": {
    "massAddition": 200
  },
  "Capital Powergrid Subroutine Maximizer I": {
    "massAddition": 200
  },
  "Small Powergrid Subroutine Maximizer II": {
    "massAddition": 200
  },
  "Medium Powergrid Subroutine Maximizer II": {
    "massAddition": 200
  },
  "Capital Powergrid Subroutine Maximizer II": {
    "massAddition": 200
  },
  "Small Semiconductor Memory Cell I": {
    "massAddition": 200
  },
  "Medium Semiconductor Memory Cell I": {
    "massAddition": 200
  },
  "Capital Semiconductor Memory Cell I": {
    "massAddition": 200
  },
  "Small Semiconductor Memory Cell II": {
    "massAddition": 200
  },
  "Medium Semiconductor Memory Cell II": {
    "massAddition": 200
  },
  "Capital Semiconductor Memory Cell II": {
    "massAddition": 200
  },
  "Small Algid Energy Administrations Unit I": {
    "massAddition": 200
  },
  "Medium Algid Energy Administrations Unit I": {
    "massAddition": 200
  },
  "Capital Algid Energy Administrations Unit I": {
    "massAddition": 200
  },
  "Small Algid Energy Administrations Unit II": {
    "massAddition": 200
  },
  "Medium Algid Energy Administrations Unit II": {
    "massAddition": 200
  },
  "Capital Algid Energy Administrations Unit II": {
    "massAddition": 200
  },
  "Small Energy Ambit Extension I": {
    "massAddition": 200
  },
  "Medium Energy Ambit Extension I": {
    "massAddition": 200
  },
  "Capital Energy Ambit Extension I": {
    "massAddition": 200
  },
  "Small Energy Ambit Extension II": {
    "massAddition": 200
  },
  "Medium Energy Ambit Extension II": {
    "massAddition": 200
  },
  "Capital Energy Ambit Extension II": {
    "massAddition": 200
  },
  "Small Energy Burst Aerator I": {
    "massAddition": 200
  },
  "Medium Energy Burst Aerator I": {
    "massAddition": 200
  },
  "Capital Energy Burst Aerator I": {
    "massAddition": 200
  },
  "Small Energy Burst Aerator II": {
    "massAddition": 200
  },
  "Medium Energy Burst Aerator II": {
    "massAddition": 200
  },
  "Capital Energy Burst Aerator II": {
    "massAddition": 200
  },
  "Small Energy Collision Accelerator I": {
    "massAddition": 200
  },
  "Medium Energy Collision Accelerator I": {
    "massAddition": 200
  },
  "Capital Energy Collision Accelerator I": {
    "massAddition": 200
  },
  "Small Energy Collision Accelerator II": {
    "massAddition": 200
  },
  "Medium Energy Collision Accelerator II": {
    "massAddition": 200
  },
  "Capital Energy Collision Accelerator II": {
    "massAddition": 200
  },
  "Small Energy Discharge Elutriation I": {
    "massAddition": 200
  },
  "Medium Energy Discharge Elutriation I": {
    "massAddition": 200
  },
  "Capital Energy Discharge Elutriation I": {
    "massAddition": 200
  },
  "Small Energy Discharge Elutriation II": {
    "massAddition": 200
  },
  "Medium Energy Discharge Elutriation II": {
    "massAddition": 200
  },
  "Capital Energy Discharge Elutriation II": {
    "massAddition": 200
  },
  "Small Energy Locus Coordinator I": {
    "massAddition": 200
  },
  "Medium Energy Locus Coordinator I": {
    "massAddition": 200
  },
  "Capital Energy Locus Coordinator I": {
    "massAddition": 200
  },
  "Small Energy Locus Coordinator II": {
    "massAddition": 200
  },
  "Medium Energy Locus Coordinator II": {
    "massAddition": 200
  },
  "Capital Energy Locus Coordinator II": {
    "massAddition": 200
  },
  "Small Energy Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Medium Energy Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Capital Energy Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Small Energy Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Medium Energy Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Capital Energy Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Small Algid Hybrid Administrations Unit I": {
    "massAddition": 200
  },
  "Medium Algid Hybrid Administrations Unit I": {
    "massAddition": 200
  },
  "Capital Algid Hybrid Administrations Unit I": {
    "massAddition": 200
  },
  "Small Algid Hybrid Administrations Unit II": {
    "massAddition": 200
  },
  "Medium Algid Hybrid Administrations Unit II": {
    "massAddition": 200
  },
  "Capital Algid Hybrid Administrations Unit II": {
    "massAddition": 200
  },
  "Small Hybrid Ambit Extension I": {
    "massAddition": 200
  },
  "Medium Hybrid Ambit Extension I": {
    "massAddition": 200
  },
  "Capital Hybrid Ambit Extension I": {
    "massAddition": 200
  },
  "Small Hybrid Ambit Extension II": {
    "massAddition": 200
  },
  "Medium Hybrid Ambit Extension II": {
    "massAddition": 200
  },
  "Capital Hybrid Ambit Extension II": {
    "massAddition": 200
  },
  "Small Hybrid Burst Aerator I": {
    "massAddition": 200
  },
  "Medium Hybrid Burst Aerator I": {
    "massAddition": 200
  },
  "Capital Hybrid Burst Aerator I": {
    "massAddition": 200
  },
  "Small Hybrid Burst Aerator II": {
    "massAddition": 200
  },
  "Medium Hybrid Burst Aerator II": {
    "massAddition": 200
  },
  "Capital Hybrid Burst Aerator II": {
    "massAddition": 200
  },
  "Small Hybrid Collision Accelerator I": {
    "massAddition": 200
  },
  "Medium Hybrid Collision Accelerator I": {
    "massAddition": 200
  },
  "Capital Hybrid Collision Accelerator I": {
    "massAddition": 200
  },
  "Small Hybrid Collision Accelerator II": {
    "massAddition": 200
  },
  "Medium Hybrid Collision Accelerator II": {
    "massAddition": 200
  },
  "Capital Hybrid Collision Accelerator II": {
    "massAddition": 200
  },
  "Small Hybrid Discharge Elutriation I": {
    "massAddition": 200
  },
  "Medium Hybrid Discharge Elutriation I": {
    "massAddition": 200
  },
  "Capital Hybrid Discharge Elutriation I": {
    "massAddition": 200
  },
  "Small Hybrid Discharge Elutriation II": {
    "massAddition": 200
  },
  "Medium Hybrid Discharge Elutriation II": {
    "massAddition": 200
  },
  "Capital Hybrid Discharge Elutriation II": {
    "massAddition": 200
  },
  "Small Hybrid Locus Coordinator I": {
    "massAddition": 200
  },
  "Medium Hybrid Locus Coordinator I": {
    "massAddition": 200
  },
  "Capital Hybrid Locus Coordinator I": {
    "massAddition": 200
  },
  "Small Hybrid Locus Coordinator II": {
    "massAddition": 200
  },
  "Medium Hybrid Locus Coordinator II": {
    "massAddition": 200
  },
  "Capital Hybrid Locus Coordinator II": {
    "massAddition": 200
  },
  "Small Hybrid Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Medium Hybrid Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Capital Hybrid Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Small Hybrid Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Medium Hybrid Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Capital Hybrid Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Small Bay Loading Accelerator I": {
    "massAddition": 200
  },
  "Medium Bay Loading Accelerator I": {
    "massAddition": 200
  },
  "Capital Bay Loading Accelerator I": {
    "massAddition": 200
  },
  "Small Bay Loading Accelerator II": {
    "massAddition": 200
  },
  "Medium Bay Loading Accelerator II": {
    "massAddition": 200
  },
  "Capital Bay Loading Accelerator II": {
    "massAddition": 200
  },
  "Small Hydraulic Bay Thrusters I": {
    "massAddition": 200
  },
  "Medium Hydraulic Bay Thrusters I": {
    "massAddition": 200
  },
  "Capital Hydraulic Bay Thrusters I": {
    "massAddition": 200
  },
  "Small Hydraulic Bay Thrusters II": {
    "massAddition": 200
  },
  "Medium Hydraulic Bay Thrusters II": {
    "massAddition": 200
  },
  "Small Rocket Fuel Cache Partition I": {
    "massAddition": 200
  },
  "Medium Rocket Fuel Cache Partition I": {
    "massAddition": 200
  },
  "Capital Rocket Fuel Cache Partition I": {
    "massAddition": 200
  },
  "Small Rocket Fuel Cache Partition II": {
    "massAddition": 200
  },
  "Medium Rocket Fuel Cache Partition II": {
    "massAddition": 200
  },
  "Capital Rocket Fuel Cache Partition II": {
    "massAddition": 200
  },
  "Small Warhead Calefaction Catalyst I": {
    "massAddition": 200
  },
  "Medium Warhead Calefaction Catalyst I": {
    "massAddition": 200
  },
  "Capital Warhead Calefaction Catalyst I": {
    "massAddition": 200
  },
  "Small Warhead Calefaction Catalyst II": {
    "massAddition": 200
  },
  "Medium Warhead Calefaction Catalyst II": {
    "massAddition": 200
  },
  "Capital Warhead Calefaction Catalyst II": {
    "massAddition": 200
  },
  "Small Warhead Flare Catalyst I": {
    "massAddition": 200
  },
  "Medium Warhead Flare Catalyst I": {
    "massAddition": 200
  },
  "Capital Warhead Flare Catalyst I": {
    "massAddition": 200
  },
  "Small Warhead Flare Catalyst II": {
    "massAddition": 200
  },
  "Medium Warhead Flare Catalyst II": {
    "massAddition": 200
  },
  "Capital Warhead Flare Catalyst II": {
    "massAddition": 200
  },
  "Small Warhead Rigor Catalyst I": {
    "massAddition": 200
  },
  "Medium Warhead Rigor Catalyst I": {
    "massAddition": 200
  },
  "Capital Warhead Rigor Catalyst I": {
    "massAddition": 200
  },
  "Small Warhead Rigor Catalyst II": {
    "massAddition": 200
  },
  "Medium Warhead Rigor Catalyst II": {
    "massAddition": 200
  },
  "Capital Warhead Rigor Catalyst II": {
    "massAddition": 200
  },
  "Small Projectile Ambit Extension I": {
    "massAddition": 200
  },
  "Medium Projectile Ambit Extension I": {
    "massAddition": 200
  },
  "Capital Projectile Ambit Extension I": {
    "massAddition": 200
  },
  "Small Projectile Ambit Extension II": {
    "massAddition": 200
  },
  "Medium Projectile Ambit Extension II": {
    "massAddition": 200
  },
  "Capital Projectile Ambit Extension II": {
    "massAddition": 200
  },
  "Small Projectile Burst Aerator I": {
    "massAddition": 200
  },
  "Medium Projectile Burst Aerator I": {
    "massAddition": 200
  },
  "Capital Projectile Burst Aerator I": {
    "massAddition": 200
  },
  "Small Projectile Burst Aerator II": {
    "massAddition": 200
  },
  "Medium Projectile Burst Aerator II": {
    "massAddition": 200
  },
  "Capital Projectile Burst Aerator II": {
    "massAddition": 200
  },
  "Small Projectile Collision Accelerator I": {
    "massAddition": 200
  },
  "Medium Projectile Collision Accelerator I": {
    "massAddition": 200
  },
  "Capital Projectile Collision Accelerator I": {
    "massAddition": 200
  },
  "Small Projectile Collision Accelerator II": {
    "massAddition": 200
  },
  "Medium Projectile Collision Accelerator II": {
    "massAddition": 200
  },
  "Capital Projectile Collision Accelerator II": {
    "massAddition": 200
  },
  "Small Projectile Locus Coordinator I": {
    "massAddition": 200
  },
  "Medium Projectile Locus Coordinator I": {
    "massAddition": 200
  },
  "Capital Projectile Locus Coordinator I": {
    "massAddition": 200
  },
  "Small Projectile Locus Coordinator II": {
    "massAddition": 200
  },
  "Medium Projectile Locus Coordinator II": {
    "massAddition": 200
  },
  "Capital Projectile Locus Coordinator II": {
    "massAddition": 200
  },
  "Small Projectile Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Medium Projectile Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Capital Projectile Metastasis Adjuster I": {
    "massAddition": 200
  },
  "Small Projectile Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Medium Projectile Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Capital Projectile Metastasis Adjuster II": {
    "massAddition": 200
  },
  "Small EM Shield Reinforcer I": {
    "massAddition": 200
  },
  "Medium EM Shield Reinforcer I": {
    "massAddition": 200
  },
  "Capital EM Shield Reinforcer I": {
    "massAddition": 200
  },
  "Small EM Shield Reinforcer II": {
    "massAddition": 200
  },
  "Medium EM Shield Reinforcer II": {
    "massAddition": 200
  },
  "Capital EM Shield Reinforcer II": {
    "massAddition": 200
  },
  "Small Explosive Shield Reinforcer I": {
    "massAddition": 200
  },
  "Medium Explosive Shield Reinforcer I": {
    "massAddition": 200
  },
  "Capital Explosive Shield Reinforcer I": {
    "massAddition": 200
  },
  "Small Explosive Shield Reinforcer II": {
    "massAddition": 200
  },
  "Medium Explosive Shield Reinforcer II": {
    "massAddition": 200
  },
  "Capital Explosive Shield Reinforcer II": {
    "massAddition": 200
  },
  "Small Kinetic Shield Reinforcer I": {
    "massAddition": 200
  },
  "Medium Kinetic Shield Reinforcer I": {
    "massAddition": 200
  },
  "Capital Kinetic Shield Reinforcer I": {
    "massAddition": 200
  },
  "Small Kinetic Shield Reinforcer II": {
    "massAddition": 200
  },
  "Medium Kinetic Shield Reinforcer II": {
    "massAddition": 200
  },
  "Capital Kinetic Shield Reinforcer II": {
    "massAddition": 200
  },
  "Small Thermal Shield Reinforcer I": {
    "massAddition": 200
  },
  "Medium Thermal Shield Reinforcer I": {
    "massAddition": 200
  },
  "Capital Thermal Shield Reinforcer I": {
    "massAddition": 200
  },
  "Small Thermal Shield Reinforcer II": {
    "massAddition": 200
  },
  "Medium Thermal Shield Reinforcer II": {
    "massAddition": 200
  },
  "Capital Thermal Shield Reinforcer II": {
    "massAddition": 200
  },
  "Small Core Defense Capacitor Safeguard I": {
    "massAddition": 200
  },
  "Medium Core Defense Capacitor Safeguard I": {
    "massAddition": 200
  },
  "Capital Core Defense Capacitor Safeguard I": {
    "massAddition": 200
  },
  "Small Core Defense Capacitor Safeguard II": {
    "massAddition": 200
  },
  "Medium Core Defense Capacitor Safeguard II": {
    "massAddition": 200
  },
  "Capital Core Defense Capacitor Safeguard II": {
    "massAddition": 200
  },
  "Small Core Defense Charge Economizer I": {
    "massAddition": 200
  },
  "Medium Core Defense Charge Economizer I": {
    "massAddition": 200
  },
  "Capital Core Defense Charge Economizer I": {
    "massAddition": 200
  },
  "Small Core Defense Charge Economizer II": {
    "massAddition": 200
  },
  "Medium Core Defense Charge Economizer II": {
    "massAddition": 200
  },
  "Capital Core Defense Charge Economizer II": {
    "massAddition": 200
  },
  "Small Core Defense Field Extender I": {
    "massAddition": 200
  },
  "Medium Core Defense Field Extender I": {
    "massAddition": 200
  },
  "Capital Core Defense Field Extender I": {
    "massAddition": 200
  },
  "Small Core Defense Field Extender II": {
    "massAddition": 200
  },
  "Medium Core Defense Field Extender II": {
    "massAddition": 200
  },
  "Capital Core Defense Field Extender II": {
    "massAddition": 200
  },
  "Small Core Defense Field Purger I": {
    "massAddition": 200
  },
  "Medium Core Defense Field Purger I": {
    "massAddition": 200
  },
  "Capital Core Defense Field Purger I": {
    "massAddition": 200
  },
  "Small Core Defense Field Purger II": {
    "massAddition": 200
  },
  "Medium Core Defense Field Purger II": {
    "massAddition": 200
  },
  "Capital Core Defense Field Purger II": {
    "massAddition": 200
  },
  "Small Core Defense Operational Solidifier I": {
    "massAddition": 200
  },
  "Medium Core Defense Operational Solidifier I": {
    "massAddition": 200
  },
  "Capital Core Defense Operational Solidifier I": {
    "massAddition": 200
  },
  "Small Core Defense Operational Solidifier II": {
    "massAddition": 200
  },
  "Medium Core Defense Operational Solidifier II": {
    "massAddition": 200
  },
  "Capital Core Defense Operational Solidifier II": {
    "massAddition": 200
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
  "Small Drone Control Range Augmentor I": {
    "massAddition": 200
  },
  "Medium Drone Control Range Augmentor I": {
    "massAddition": 200
  },
  "Small Drone Control Range Augmentor II": {
    "massAddition": 200
  },
  "Medium Drone Control Range Augmentor II": {
    "massAddition": 200
  },
  "Small Drone Durability Enhancer I": {
    "massAddition": 200
  },
  "Medium Drone Durability Enhancer I": {
    "massAddition": 200
  },
  "Small Drone Durability Enhancer II": {
    "massAddition": 200
  },
  "Medium Drone Durability Enhancer II": {
    "massAddition": 200
  },
  "Small Drone Mining Augmentor I": {
    "massAddition": 200
  },
  "Medium Drone Mining Augmentor I": {
    "massAddition": 200
  },
  "Small Drone Mining Augmentor II": {
    "massAddition": 200
  },
  "Medium Drone Mining Augmentor II": {
    "massAddition": 200
  },
  "Small Drone Repair Augmentor I": {
    "massAddition": 200
  },
  "Medium Drone Repair Augmentor I": {
    "massAddition": 200
  },
  "Small Drone Repair Augmentor II": {
    "massAddition": 200
  },
  "Medium Drone Repair Augmentor II": {
    "massAddition": 200
  },
  "Small Drone Speed Augmentor I": {
    "massAddition": 200
  },
  "Medium Drone Speed Augmentor I": {
    "massAddition": 200
  },
  "Small Drone Speed Augmentor II": {
    "massAddition": 200
  },
  "Medium Drone Speed Augmentor II": {
    "massAddition": 200
  },
  "Small Drone Scope Chip I": {
    "massAddition": 200
  },
  "Medium Drone Scope Chip I": {
    "massAddition": 200
  },
  "Small Drone Scope Chip II": {
    "massAddition": 200
  },
  "Medium Drone Scope Chip II": {
    "massAddition": 200
  },
  "Small Sentry Damage Augmentor I": {
    "massAddition": 200
  },
  "Medium Sentry Damage Augmentor I": {
    "massAddition": 200
  },
  "Small Sentry Damage Augmentor II": {
    "massAddition": 200
  },
  "Medium Sentry Damage Augmentor II": {
    "massAddition": 200
  },
  "Small Stasis Drone Augmentor I": {
    "massAddition": 200
  },
  "Medium Stasis Drone Augmentor I": {
    "massAddition": 200
  },
  "Small Stasis Drone Augmentor II": {
    "massAddition": 200
  },
  "Medium Stasis Drone Augmentor II": {
    "massAddition": 200
  },
  "Capital Drone Control Range Augmentor I": {
    "massAddition": 200
  },
  "Capital Drone Control Range Augmentor II": {
    "massAddition": 200
  },
  "Capital Drone Durability Enhancer I": {
    "massAddition": 200
  },
  "Capital Drone Durability Enhancer II": {
    "massAddition": 200
  },
  "Capital Drone Mining Augmentor I": {
    "massAddition": 200
  },
  "Capital Drone Mining Augmentor II": {
    "massAddition": 200
  },
  "Capital Drone Repair Augmentor I": {
    "massAddition": 200
  },
  "Capital Drone Repair Augmentor II": {
    "massAddition": 200
  },
  "Capital Drone Scope Chip I": {
    "massAddition": 200
  },
  "Capital Drone Scope Chip II": {
    "massAddition": 200
  },
  "Capital Drone Speed Augmentor I": {
    "massAddition": 200
  },
  "Capital Drone Speed Augmentor II": {
    "massAddition": 200
  },
  "Capital Hydraulic Bay Thrusters II": {
    "massAddition": 200
  },
  "Capital Processor Overclocking Unit I": {
    "massAddition": 200
  },
  "Capital Processor Overclocking Unit II": {
    "massAddition": 200
  },
  "Capital Sentry Damage Augmentor I": {
    "massAddition": 200
  },
  "Capital Sentry Damage Augmentor II": {
    "massAddition": 200
  },
  "Capital Stasis Drone Augmentor I": {
    "massAddition": 200
  },
  "Capital Stasis Drone Augmentor II": {
    "massAddition": 200
  },
  "Small Transverse Bulkhead I": {
    "massAddition": 200
  },
  "Small Transverse Bulkhead II": {
    "massAddition": 200
  },
  "Medium Transverse Bulkhead I": {
    "massAddition": 200
  },
  "Medium Transverse Bulkhead II": {
    "massAddition": 200
  },
  "Large Transverse Bulkhead I": {
    "massAddition": 200
  },
  "Large Transverse Bulkhead II": {
    "massAddition": 200
  },
  "Capital Transverse Bulkhead I": {
    "massAddition": 200
  },
  "Capital Transverse Bulkhead II": {
    "massAddition": 200
  },
  "Small Higgs Anchor I": {
    "massAddition": 200,
    "massBonusPercentage": 100,
    "speedBonusPercent": -75,
    "agilityMultiplier": 0.44999999999999996
  },
  "Medium Higgs Anchor I": {
    "massAddition": 200,
    "massBonusPercentage": 100,
    "speedBonusPercent": -75,
    "agilityMultiplier": 0.44999999999999996
  },
  "Large Higgs Anchor I": {
    "massAddition": 200,
    "massBonusPercentage": 100,
    "speedBonusPercent": -75,
    "agilityMultiplier": 0.44999999999999996
  },
  "Capital Higgs Anchor I": {
    "massAddition": 200,
    "massBonusPercentage": 100,
    "speedBonusPercent": -75,
    "agilityMultiplier": 0.44999999999999996
  },
  "Domination Inertial Stabilizers": {
    "massAddition": 200,
    "agilityMultiplier": 0.795
  },
  "Shadow Serpentis Inertial Stabilizers": {
    "massAddition": 200,
    "agilityMultiplier": 0.785
  },
  "ORE Reinforced Bulkheads": {
    "massAddition": 200,
    "agilityMultiplier": 1.04
  },
  "Syndicate Reinforced Bulkheads": {
    "massAddition": 200,
    "agilityMultiplier": 1.02
  },
  "10MN Y-S8 Compact Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.25,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "100MN Y-S8 Compact Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 1.25,
      "massAddition": 50000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "5MN Quad LiF Restrained Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.05,
      "massAddition": 500000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "50MN Y-T8 Compact Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.05,
      "massAddition": 5000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "50MN Quad LiF Restrained Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.05,
      "massAddition": 5000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "500MN Y-T8 Compact Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.05,
      "massAddition": 50000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "500MN Quad LiF Restrained Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 150000000,
      "speedBonus": 5.05,
      "massAddition": 50000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
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
  "10000MN Afterburner I": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.15,
      "massAddition": 500000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "10000MN Y-S8 Compact Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.25,
      "massAddition": 500000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "10000MN Monopropellant Enduring Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.25,
      "massAddition": 500000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "10000MN Afterburner II": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.35,
      "massAddition": 500000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Domination 10000MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.45,
      "massAddition": 500000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Shadow Serpentis 10000MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 1.45,
      "massAddition": 500000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "50000MN Microwarpdrive I": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5,
      "massAddition": 500000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "50000MN Y-T8 Compact Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.05,
      "massAddition": 500000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "50000MN Quad LiF Restrained Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.05,
      "massAddition": 500000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "50000MN Cold-Gas Enduring Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.05,
      "massAddition": 500000000,
      "sigBloom": 5,
      "activeMassMultiplier": 1
    }
  },
  "50000MN Microwarpdrive II": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.1,
      "massAddition": 500000000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
    }
  },
  "Domination 50000MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.12,
      "massAddition": 500000000,
      "sigBloom": 4.5,
      "activeMassMultiplier": 1
    }
  },
  "Shadow Serpentis 50000MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 1500000000,
      "speedBonus": 5.12,
      "massAddition": 500000000,
      "sigBloom": 4.75,
      "activeMassMultiplier": 1
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
  "Small Command Processor I": {
    "massAddition": 200
  },
  "Medium Command Processor I": {
    "massAddition": 200
  },
  "Large Command Processor I": {
    "massAddition": 200
  },
  "Capital Command Processor I": {
    "massAddition": 200
  },
  "50MN Abyssal Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "5MN Abyssal Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "500MN Abyssal Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "large",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "1MN Abyssal Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "10MN Abyssal Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "100MN Abyssal Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "large",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Small Abyssal Shield Extender": {
    "massAddition": 1
  },
  "Medium Abyssal Shield Extender": {
    "massAddition": 1
  },
  "Large Abyssal Shield Extender": {
    "massAddition": 1
  },
  "Large Abyssal Armor Plates": {
    "massAddition": 1
  },
  "10000MN Abyssal Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "capital",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "50000MN Abyssal Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "capital",
      "thrust": 0,
      "speedBonus": 0,
      "massAddition": 0,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Asine's Modified 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.2,
      "massAddition": 500000,
      "sigBloom": 3.9,
      "activeMassMultiplier": 1
    }
  },
  "Ramaku's Modified 5MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 5.2,
      "massAddition": 500000,
      "sigBloom": 3.7,
      "activeMassMultiplier": 1
    }
  },
  "Sila's Modified 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.2,
      "massAddition": 5000000,
      "sigBloom": 3.7,
      "activeMassMultiplier": 1
    }
  },
  "Gara's Modified 50MN Microwarpdrive": {
    "propulsion": {
      "kind": "microwarpdrive",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 5.2,
      "massAddition": 5000000,
      "sigBloom": 3.9,
      "activeMassMultiplier": 1
    }
  },
  "Asine's Modified 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.65,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Ramaku's Modified 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.65,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Gara's Modified 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.65,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Sila's Modified 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.65,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Usaras' Modified 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.7,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Nija's Modified 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.7,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "True Sansha 1MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "small",
      "thrust": 1500000,
      "speedBonus": 1.475,
      "massAddition": 500000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "True Sansha 10MN Afterburner": {
    "propulsion": {
      "kind": "afterburner",
      "sizeTier": "medium",
      "thrust": 15000000,
      "speedBonus": 1.475,
      "massAddition": 5000000,
      "sigBloom": 0,
      "activeMassMultiplier": 1
    }
  },
  "Roden’s Modified Nanofiber Internal Structure": {
    "massAddition": 100,
    "speedBonusPercent": 10,
    "agilityMultiplier": 0.835
  },
  "Lorharyth’s Modified Inertial Stabilizer": {
    "massAddition": 200,
    "agilityMultiplier": 0.775
  }
} as unknown as Readonly<Record<string, FittingModuleStats>>;

export const TURRETS = {
  "Gatling Pulse Laser I": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 4200,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Dual Light Pulse Laser I": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 4725,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Light Beam Laser I": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 9625,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Small Focused Pulse Laser I": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Beam Laser I": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 11000,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Quad Light Beam Laser I": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 8800,
    "falloff": 1000,
    "chargeSize": 2
  },
  "Focused Medium Pulse Laser I": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 9450,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Focused Medium Beam Laser I": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 19250,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Heavy Pulse Laser I": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 10500,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Heavy Beam Laser I": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 22000,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Dual Heavy Pulse Laser I": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 18900,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Dual Heavy Beam Laser I": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 35000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Mega Pulse Laser I": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 21000,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Mega Beam Laser I": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 40000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Tachyon Beam Laser I": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 44000,
    "falloff": 20000,
    "chargeSize": 3
  },
  "125mm Gatling AutoCannon I": {
    "tracking": 417,
    "sigResolution": 40000,
    "optimal": 800,
    "falloff": 4300,
    "chargeSize": 1
  },
  "150mm Light AutoCannon I": {
    "tracking": 362,
    "sigResolution": 40000,
    "optimal": 900,
    "falloff": 4730,
    "chargeSize": 1
  },
  "200mm AutoCannon I": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1000,
    "falloff": 5160,
    "chargeSize": 1
  },
  "250mm Light Artillery Cannon I": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 8050,
    "falloff": 8750,
    "chargeSize": 1
  },
  "280mm Howitzer Artillery I": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 10000,
    "falloff": 8750,
    "chargeSize": 1
  },
  "Dual 180mm AutoCannon I": {
    "tracking": 44.68992,
    "sigResolution": 40000,
    "optimal": 1600,
    "falloff": 9030,
    "chargeSize": 2
  },
  "220mm Vulcan AutoCannon I": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 1800,
    "falloff": 9933,
    "chargeSize": 2
  },
  "425mm AutoCannon I": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2000,
    "falloff": 10836,
    "chargeSize": 2
  },
  "650mm Artillery Cannon I": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 16100,
    "falloff": 17500,
    "chargeSize": 2
  },
  "720mm Howitzer Artillery I": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 17500,
    "chargeSize": 2
  },
  "Dual 425mm AutoCannon I": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3200,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Dual 650mm Repeating Cannon I": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 3600,
    "falloff": 18920,
    "chargeSize": 3
  },
  "800mm Repeating Cannon I": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4000,
    "falloff": 20640,
    "chargeSize": 3
  },
  "1200mm Artillery Cannon I": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 32200,
    "falloff": 35000,
    "chargeSize": 3
  },
  "1400mm Howitzer Artillery I": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 40000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "75mm Gatling Rail I": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 6000,
    "falloff": 3000,
    "chargeSize": 1
  },
  "Light Electron Blaster I": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1000,
    "falloff": 1500,
    "chargeSize": 1
  },
  "Light Ion Blaster I": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1250,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Light Neutron Blaster I": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1500,
    "falloff": 2500,
    "chargeSize": 1
  },
  "150mm Railgun I": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 12000,
    "falloff": 6000,
    "chargeSize": 1
  },
  "Heavy Electron Blaster I": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2000,
    "falloff": 3000,
    "chargeSize": 2
  },
  "Dual 150mm Railgun I": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 10800,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Heavy Neutron Blaster I": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3000,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Heavy Ion Blaster I": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 2500,
    "falloff": 4000,
    "chargeSize": 2
  },
  "250mm Railgun I": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 21600,
    "falloff": 10800,
    "chargeSize": 2
  },
  "Electron Blaster Cannon I": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4000,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Dual 250mm Railgun I": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 21600,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Neutron Blaster Cannon I": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 6000,
    "falloff": 10000,
    "chargeSize": 3
  },
  "425mm Railgun I": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 43200,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Ion Blaster Cannon I": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 5000,
    "falloff": 8000,
    "chargeSize": 3
  },
  "1200mm Artillery Cannon II": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3
  },
  "125mm Gatling AutoCannon II": {
    "tracking": 417,
    "sigResolution": 40000,
    "optimal": 960,
    "falloff": 4300,
    "chargeSize": 1
  },
  "150mm Light AutoCannon II": {
    "tracking": 362,
    "sigResolution": 40000,
    "optimal": 1080,
    "falloff": 4730,
    "chargeSize": 1
  },
  "200mm AutoCannon II": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1
  },
  "220mm Vulcan AutoCannon II": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 2160,
    "falloff": 9933,
    "chargeSize": 2
  },
  "250mm Light Artillery Cannon II": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 9660,
    "falloff": 8750,
    "chargeSize": 1
  },
  "425mm AutoCannon II": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2
  },
  "650mm Artillery Cannon II": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 19320,
    "falloff": 17500,
    "chargeSize": 2
  },
  "800mm Repeating Cannon II": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3
  },
  "Dual 180mm AutoCannon II": {
    "tracking": 44.68992,
    "sigResolution": 40000,
    "optimal": 1920,
    "falloff": 9030,
    "chargeSize": 2
  },
  "Dual 425mm AutoCannon II": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Dual 650mm Repeating Cannon II": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3
  },
  "1400mm Howitzer Artillery II": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "720mm Howitzer Artillery II": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 24000,
    "falloff": 17500,
    "chargeSize": 2
  },
  "280mm Howitzer Artillery II": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 12000,
    "falloff": 8750,
    "chargeSize": 1
  },
  "Dual Heavy Beam Laser II": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Dual Light Beam Laser II": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 11550,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Light Pulse Laser II": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 5670,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Focused Medium Beam Laser II": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 23100,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Gatling Pulse Laser II": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 5040,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Heavy Beam Laser II": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 26400,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Small Focused Beam Laser II": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 13200,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Pulse Laser II": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6300,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Mega Beam Laser II": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Mega Pulse Laser II": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Tachyon Beam Laser II": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "150mm Railgun II": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 14400,
    "falloff": 6000,
    "chargeSize": 1
  },
  "250mm Railgun II": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 2
  },
  "425mm Railgun II": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3
  },
  "75mm Gatling Rail II": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 7200,
    "falloff": 3000,
    "chargeSize": 1
  },
  "Dual 150mm Railgun II": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 12960,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Dual 250mm Railgun II": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Electron Blaster Cannon II": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Heavy Electron Blaster II": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2400,
    "falloff": 3000,
    "chargeSize": 2
  },
  "Heavy Ion Blaster II": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 3000,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Heavy Neutron Blaster II": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3600,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Ion Blaster Cannon II": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 6000,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Light Electron Blaster II": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1200,
    "falloff": 1500,
    "chargeSize": 1
  },
  "Light Ion Blaster II": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1500,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Light Neutron Blaster II": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1800,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Neutron Blaster Cannon II": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 7200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Quad Light Beam Laser II": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 10560,
    "falloff": 1000,
    "chargeSize": 2
  },
  "Focused Medium Pulse Laser II": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 11340,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Heavy Pulse Laser II": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 12600,
    "falloff": 5000,
    "chargeSize": 2
  },
  "CONCORD Ion Siege Blaster": {
    "tracking": 0.045885,
    "sigResolution": 40000,
    "optimal": 22000,
    "falloff": 25000,
    "chargeSize": 4
  },
  "CONCORD Dual 1000mm Railgun": {
    "tracking": 0.019201875,
    "sigResolution": 40000,
    "optimal": 132000,
    "falloff": 32000,
    "chargeSize": 4
  },
  "CONCORD Dual Giga Pulse Laser": {
    "tracking": 0.04041072,
    "sigResolution": 40000,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 4
  },
  "CONCORD Dual Giga Beam Laser": {
    "tracking": 0.022911326,
    "sigResolution": 40000,
    "optimal": 110000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "CONCORD Quad 3500mm Siege Artillery": {
    "tracking": 0.017955,
    "sigResolution": 40000,
    "optimal": 103400,
    "falloff": 90000,
    "chargeSize": 4
  },
  "CONCORD Hexa 2500mm Repeating Cannon": {
    "tracking": 0.04359075,
    "sigResolution": 40000,
    "optimal": 27500,
    "falloff": 28800,
    "chargeSize": 4
  },
  "Dual Heavy Pulse Laser II": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Gatling Modal Laser I": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 4620,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Gatling Afocal Laser I": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 4410,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Gatling Modulated Energy Beam I": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 5040,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Gatling Anode Particle Stream I": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 4830,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Dual Modal Pulse Laser I": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 5198,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Afocal Pulse Laser I": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 4961,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Modulated Pulse Energy Beam I": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 5670,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Anode Pulse Particle Stream I": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 5434,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Modal Light Laser I": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 10588,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Afocal Light Laser I": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 10107,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Modulated Light Energy Beam I": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 11550,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dual Anode Light Particle Stream I": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 11069,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Small Focused Modal Pulse Laser I": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 5775,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Afocal Pulse Laser I": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 5513,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Modulated Pulse Energy Beam I": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6300,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Anode Pulse Particle Stream I": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6038,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Modal Laser I": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 12100,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Afocal Laser I": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 11550,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Modulated Energy Beam I": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 13200,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Small Focused Anode Particle Stream I": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 12650,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Quad Modal Light Laser I": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 9680,
    "falloff": 1000,
    "chargeSize": 2
  },
  "Quad Afocal Light Laser I": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 9240,
    "falloff": 1000,
    "chargeSize": 2
  },
  "Quad Modulated Light Energy Beam I": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 10560,
    "falloff": 1000,
    "chargeSize": 2
  },
  "Quad Anode Light Particle Stream I": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 10120,
    "falloff": 1000,
    "chargeSize": 2
  },
  "Focused Modal Pulse Laser I": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 10395,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Focused Afocal Pulse Laser I": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 9923,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Focused Modulated Pulse Energy Beam I": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 11340,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Focused Anode Pulse Particle Stream I": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 10868,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Focused Modal Medium Laser I": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 21175,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Focused Afocal Medium Laser I": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 20213,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Focused Modulated Medium Energy Beam I": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 23100,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Focused Anode Medium Particle Stream I": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 22138,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Heavy Modal Pulse Laser I": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 11550,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Heavy Afocal Pulse Laser I": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 11025,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Heavy Modulated Pulse Energy Beam I": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 12600,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Heavy Anode Pulse Particle Stream I": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 12075,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Heavy Modal Laser I": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 24200,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Heavy Afocal Laser I": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 23100,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Heavy Modulated Energy Beam I": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 26400,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Heavy Anode Particle Stream I": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 25300,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Dual Heavy Modal Pulse Laser I": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 20790,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Dual Heavy Afocal Pulse Laser I": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 19845,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Dual Heavy Modulated Pulse Energy Beam I": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Dual Heavy Anode Pulse Particle Stream I": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 21735,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Dual Modal Heavy Laser I": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 38500,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Dual Afocal Heavy Laser I": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 36750,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Dual Modulated Heavy Energy Beam I": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Dual Anode Heavy Particle Stream I": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 40250,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Mega Modal Pulse Laser I": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 23100,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Mega Afocal Pulse Laser I": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 22050,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Mega Modulated Pulse Energy Beam I": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Mega Anode Pulse Particle Stream I": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 24150,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Mega Modal Laser I": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 44000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Mega Afocal Laser I": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Mega Modulated Energy Beam I": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Mega Anode Particle Stream I": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 46000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Tachyon Modal Laser I": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 48400,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Tachyon Afocal Laser I": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Tachyon Modulated Energy Beam I": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Tachyon Anode Particle Stream I": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 50600,
    "falloff": 20000,
    "chargeSize": 3
  },
  "75mm Prototype Gauss Gun": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 7200,
    "falloff": 3000,
    "chargeSize": 1
  },
  "75mm 'Scout' Accelerator Cannon": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 6600,
    "falloff": 3000,
    "chargeSize": 1
  },
  "75mm Carbide Railgun I": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 6300,
    "falloff": 3000,
    "chargeSize": 1
  },
  "75mm Compressed Coil Gun I": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 6900,
    "falloff": 3000,
    "chargeSize": 1
  },
  "150mm Prototype Gauss Gun": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 14400,
    "falloff": 6000,
    "chargeSize": 1
  },
  "150mm 'Scout' Accelerator Cannon": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 13200,
    "falloff": 6000,
    "chargeSize": 1
  },
  "150mm Carbide Railgun I": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 12600,
    "falloff": 6000,
    "chargeSize": 1
  },
  "150mm Compressed Coil Gun I": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 13800,
    "falloff": 6000,
    "chargeSize": 1
  },
  "Dual 150mm Prototype Gauss Gun": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 12960,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Dual 150mm 'Scout' Accelerator Cannon": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 11880,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Dual 150mm Carbide Railgun I": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 11340,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Dual 150mm Compressed Coil Gun I": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 12420,
    "falloff": 5400,
    "chargeSize": 2
  },
  "250mm Prototype Gauss Gun": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 2
  },
  "250mm 'Scout' Accelerator Cannon": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 23760,
    "falloff": 10800,
    "chargeSize": 2
  },
  "250mm Carbide Railgun I": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 10800,
    "chargeSize": 2
  },
  "250mm Compressed Coil Gun I": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 24840,
    "falloff": 10800,
    "chargeSize": 2
  },
  "Dual 250mm Prototype Gauss Gun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Dual 250mm 'Scout' Accelerator Cannon": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 23760,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Dual 250mm Carbide Railgun I": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Dual 250mm Compressed Coil Gun I": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 24840,
    "falloff": 10800,
    "chargeSize": 3
  },
  "425mm Prototype Gauss Gun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3
  },
  "425mm 'Scout' Accelerator Cannon": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 47520,
    "falloff": 21600,
    "chargeSize": 3
  },
  "425mm Carbide Railgun I": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 45360,
    "falloff": 21600,
    "chargeSize": 3
  },
  "425mm Compressed Coil Gun I": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 49680,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Modal Light Electron Particle Accelerator I": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1200,
    "falloff": 1500,
    "chargeSize": 1
  },
  "Limited Light Electron Blaster I": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1100,
    "falloff": 1500,
    "chargeSize": 1
  },
  "Regulated Light Electron Phase Cannon I": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1050,
    "falloff": 1500,
    "chargeSize": 1
  },
  "Anode Light Electron Particle Cannon I": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1150,
    "falloff": 1500,
    "chargeSize": 1
  },
  "Modal Light Ion Particle Accelerator I": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1500,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Limited Light Ion Blaster I": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1375,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Regulated Light Ion Phase Cannon I": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1312,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Anode Light Ion Particle Cannon I": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1437,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Modal Light Neutron Particle Accelerator I": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1800,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Limited Light Neutron Blaster I": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1650,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Regulated Light Neutron Phase Cannon I": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1575,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Anode Light Neutron Particle Cannon I": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1725,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Modal Electron Particle Accelerator I": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2400,
    "falloff": 3000,
    "chargeSize": 2
  },
  "Limited Electron Blaster I": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2200,
    "falloff": 3000,
    "chargeSize": 2
  },
  "Regulated Electron Phase Cannon I": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2100,
    "falloff": 3000,
    "chargeSize": 2
  },
  "Anode Electron Particle Cannon I": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2300,
    "falloff": 3000,
    "chargeSize": 2
  },
  "Modal Ion Particle Accelerator I": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 3000,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Limited Ion Blaster I": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 2750,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Regulated Ion Phase Cannon I": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 2625,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Anode Ion Particle Cannon I": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 2875,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Modal Neutron Particle Accelerator I": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3600,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Limited Neutron Blaster I": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3300,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Regulated Neutron Phase Cannon I": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3150,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Anode Neutron Particle Cannon I": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3450,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Modal Mega Electron Particle Accelerator I": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Limited Electron Blaster Cannon I": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4400,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Regulated Mega Electron Phase Cannon I": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Anode Mega Electron Particle Cannon I": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4600,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Modal Mega Neutron Particle Accelerator I": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 7200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Limited Mega Neutron Blaster I": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 6600,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Regulated Mega Neutron Phase Cannon I": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Anode Mega Neutron Particle Cannon I": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 6900,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Modal Mega Ion Particle Accelerator I": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 6000,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Limited Mega Ion Blaster I": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 5500,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Regulated Mega Ion Phase Cannon I": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Anode Mega Ion Particle Cannon I": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 5750,
    "falloff": 8000,
    "chargeSize": 3
  },
  "125mm Light 'Scout' Autocannon I": {
    "tracking": 417,
    "sigResolution": 40000,
    "optimal": 960,
    "falloff": 4300,
    "chargeSize": 1
  },
  "125mm Light Carbine Repeating Cannon I": {
    "tracking": 417,
    "sigResolution": 40000,
    "optimal": 840,
    "falloff": 4300,
    "chargeSize": 1
  },
  "125mm Light Gallium Machine Gun": {
    "tracking": 417,
    "sigResolution": 40000,
    "optimal": 880,
    "falloff": 4300,
    "chargeSize": 1
  },
  "125mm Light Prototype Automatic Cannon": {
    "tracking": 417,
    "sigResolution": 40000,
    "optimal": 920,
    "falloff": 4300,
    "chargeSize": 1
  },
  "150mm Light 'Scout' Autocannon I": {
    "tracking": 362,
    "sigResolution": 40000,
    "optimal": 1080,
    "falloff": 4730,
    "chargeSize": 1
  },
  "150mm Light Carbine Repeating Cannon I": {
    "tracking": 362,
    "sigResolution": 40000,
    "optimal": 945,
    "falloff": 4730,
    "chargeSize": 1
  },
  "150mm Light Gallium Machine Gun": {
    "tracking": 362,
    "sigResolution": 40000,
    "optimal": 990,
    "falloff": 4730,
    "chargeSize": 1
  },
  "150mm Light Prototype Automatic Cannon": {
    "tracking": 362,
    "sigResolution": 40000,
    "optimal": 1035,
    "falloff": 4730,
    "chargeSize": 1
  },
  "200mm Light 'Scout' Autocannon I": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1
  },
  "200mm Light Carbine Repeating Cannon I": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1050,
    "falloff": 5160,
    "chargeSize": 1
  },
  "200mm Light Gallium Machine Gun": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1100,
    "falloff": 5160,
    "chargeSize": 1
  },
  "200mm Light Prototype Automatic Cannon": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1150,
    "falloff": 5160,
    "chargeSize": 1
  },
  "250mm Light 'Scout' Artillery I": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 9660,
    "falloff": 8750,
    "chargeSize": 1
  },
  "250mm Light Carbine Howitzer I": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 8453,
    "falloff": 8750,
    "chargeSize": 1
  },
  "250mm Light Gallium Cannon": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 8855,
    "falloff": 8750,
    "chargeSize": 1
  },
  "250mm Light Prototype Siege Cannon": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 9258,
    "falloff": 8750,
    "chargeSize": 1
  },
  "Dual 180mm 'Scout' Autocannon I": {
    "tracking": 44.68992,
    "sigResolution": 40000,
    "optimal": 1920,
    "falloff": 9030,
    "chargeSize": 2
  },
  "Dual 180mm Carbine Repeating Cannon I": {
    "tracking": 44.68992,
    "sigResolution": 40000,
    "optimal": 1680,
    "falloff": 9030,
    "chargeSize": 2
  },
  "Dual 180mm Gallium Machine Gun": {
    "tracking": 44.68992,
    "sigResolution": 40000,
    "optimal": 1760,
    "falloff": 9030,
    "chargeSize": 2
  },
  "Dual 180mm Prototype Automatic Cannon": {
    "tracking": 44.68992,
    "sigResolution": 40000,
    "optimal": 1840,
    "falloff": 9030,
    "chargeSize": 2
  },
  "220mm Medium 'Scout' Autocannon I": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 2160,
    "falloff": 9933,
    "chargeSize": 2
  },
  "220mm Medium Carbine Repeating Cannon I": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 1890,
    "falloff": 9933,
    "chargeSize": 2
  },
  "220mm Medium Gallium Machine Gun": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 1980,
    "falloff": 9933,
    "chargeSize": 2
  },
  "220mm Medium Prototype Automatic Cannon": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 2070,
    "falloff": 9933,
    "chargeSize": 2
  },
  "425mm Medium 'Scout' Autocannon I": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2
  },
  "425mm Medium Carbine Repeating Cannon I": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2100,
    "falloff": 10836,
    "chargeSize": 2
  },
  "425mm Medium Gallium Machine Gun": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2200,
    "falloff": 10836,
    "chargeSize": 2
  },
  "425mm Medium Prototype Automatic Cannon": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2300,
    "falloff": 10836,
    "chargeSize": 2
  },
  "650mm Medium 'Scout' Artillery I": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 19320,
    "falloff": 17500,
    "chargeSize": 2
  },
  "650mm Medium Carbine Howitzer I": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 16905,
    "falloff": 17500,
    "chargeSize": 2
  },
  "650mm Medium Gallium Cannon": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 17710,
    "falloff": 17500,
    "chargeSize": 2
  },
  "650mm Medium Prototype Siege Cannon": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 18515,
    "falloff": 17500,
    "chargeSize": 2
  },
  "Dual 425mm 'Scout' Autocannon I": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Dual 425mm Carbine Repeating Cannon I": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3360,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Dual 425mm Gallium Machine Gun": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3520,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Dual 425mm Prototype Automatic Cannon": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3680,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Dual 650mm 'Scout' Repeating Cannon I": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3
  },
  "Dual 650mm Carbine Repeating Cannon I": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 3780,
    "falloff": 18920,
    "chargeSize": 3
  },
  "Dual 650mm Gallium Repeating Cannon": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 3960,
    "falloff": 18920,
    "chargeSize": 3
  },
  "Dual 650mm Prototype Automatic Cannon": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 4140,
    "falloff": 18920,
    "chargeSize": 3
  },
  "800mm Heavy 'Scout' Repeating Cannon I": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3
  },
  "800mm Heavy Carbine Repeating Cannon I": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4200,
    "falloff": 20640,
    "chargeSize": 3
  },
  "800mm Heavy Gallium Repeating Cannon": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4400,
    "falloff": 20640,
    "chargeSize": 3
  },
  "800mm Heavy Prototype Automatic Cannon": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4600,
    "falloff": 20640,
    "chargeSize": 3
  },
  "1200mm Heavy 'Scout' Artillery I": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3
  },
  "1200mm Heavy Carbine Howitzer I": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 33810,
    "falloff": 35000,
    "chargeSize": 3
  },
  "1200mm Heavy Gallium Cannon": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 35420,
    "falloff": 35000,
    "chargeSize": 3
  },
  "1200mm Heavy Prototype Siege Cannon": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 37030,
    "falloff": 35000,
    "chargeSize": 3
  },
  "280mm 'Scout' Artillery I": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 12000,
    "falloff": 8750,
    "chargeSize": 1
  },
  "280mm Carbine Howitzer I": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 10500,
    "falloff": 8750,
    "chargeSize": 1
  },
  "280mm Gallium Cannon": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 11000,
    "falloff": 8750,
    "chargeSize": 1
  },
  "280mm Prototype Siege Cannon": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 11500,
    "falloff": 8750,
    "chargeSize": 1
  },
  "720mm 'Scout' Artillery I": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 24000,
    "falloff": 17500,
    "chargeSize": 2
  },
  "720mm Carbine Howitzer I": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 21000,
    "falloff": 17500,
    "chargeSize": 2
  },
  "720mm Gallium Cannon": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 22000,
    "falloff": 17500,
    "chargeSize": 2
  },
  "720mm Prototype Siege Cannon": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 23000,
    "falloff": 17500,
    "chargeSize": 2
  },
  "1400mm 'Scout' Artillery I": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "1400mm Carbine Howitzer I": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "1400mm Gallium Cannon": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 44000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "1400mm Prototype Siege Cannon": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 46000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "125mm Railgun I": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 9000,
    "falloff": 5000,
    "chargeSize": 1
  },
  "125mm Railgun II": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 10800,
    "falloff": 5000,
    "chargeSize": 1
  },
  "125mm 'Scout' Accelerator Cannon": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 9900,
    "falloff": 5000,
    "chargeSize": 1
  },
  "125mm Carbide Railgun I": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 9450,
    "falloff": 5000,
    "chargeSize": 1
  },
  "125mm Compressed Coil Gun I": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 10350,
    "falloff": 5000,
    "chargeSize": 1
  },
  "125mm Prototype Gauss Gun": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 10800,
    "falloff": 5000,
    "chargeSize": 1
  },
  "200mm Railgun I": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 16200,
    "falloff": 9000,
    "chargeSize": 2
  },
  "200mm Railgun II": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 19440,
    "falloff": 9000,
    "chargeSize": 2
  },
  "350mm Railgun I": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 32400,
    "falloff": 18000,
    "chargeSize": 3
  },
  "350mm Railgun II": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Domination 125mm Autocannon": {
    "tracking": 417,
    "sigResolution": 40000,
    "optimal": 960,
    "falloff": 4300,
    "chargeSize": 1
  },
  "Domination 1200mm Artillery": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3
  },
  "Domination 1400mm Howitzer Artillery": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "Domination 150mm Autocannon": {
    "tracking": 362,
    "sigResolution": 40000,
    "optimal": 1080,
    "falloff": 4730,
    "chargeSize": 1
  },
  "Domination 200mm Autocannon": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1
  },
  "Domination 220mm Autocannon": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 2160,
    "falloff": 9933,
    "chargeSize": 2
  },
  "Domination 250mm Artillery": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 9660,
    "falloff": 8750,
    "chargeSize": 1
  },
  "Domination 280mm Howitzer Artillery": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 12000,
    "falloff": 8750,
    "chargeSize": 1
  },
  "Domination 425mm Autocannon": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2
  },
  "Domination 650mm Artillery": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 19320,
    "falloff": 17500,
    "chargeSize": 2
  },
  "Domination 720mm Howitzer Artillery": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 24000,
    "falloff": 17500,
    "chargeSize": 2
  },
  "Domination 800mm Repeating Cannon": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3
  },
  "Domination Dual 180mm Autocannon": {
    "tracking": 44.68992,
    "sigResolution": 40000,
    "optimal": 1920,
    "falloff": 9030,
    "chargeSize": 2
  },
  "Domination Dual 425mm Autocannon": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Domination Dual 650mm Repeating Cannon": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3
  },
  "Dark Blood Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Dark Blood Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Dark Blood Dual Light Beam Laser": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 12032,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dark Blood Dual Light Pulse Laser": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 5906,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Dark Blood Focused Medium Beam Laser": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 24063,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Dark Blood Focused Medium Pulse Laser": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 11813,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Dark Blood Gatling Pulse Laser": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Dark Blood Heavy Beam Laser": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 27500,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Dark Blood Heavy Pulse Laser": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Dark Blood Small Focused Beam Laser": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 13750,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Dark Blood Small Focused Pulse Laser": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Dark Blood Mega Beam Laser": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Dark Blood Mega Pulse Laser": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Dark Blood Tachyon Beam Laser": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Dark Blood Quad Beam Laser": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 11000,
    "falloff": 1000,
    "chargeSize": 2
  },
  "True Sansha Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "True Sansha Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "True Sansha Dual Light Beam Laser": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 12032,
    "falloff": 2000,
    "chargeSize": 1
  },
  "True Sansha Dual Light Pulse Laser": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 5906,
    "falloff": 2000,
    "chargeSize": 1
  },
  "True Sansha Focused Medium Beam Laser": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 24063,
    "falloff": 6000,
    "chargeSize": 2
  },
  "True Sansha Focused Medium Pulse Laser": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 11813,
    "falloff": 4000,
    "chargeSize": 2
  },
  "True Sansha Gatling Pulse Laser": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 1000,
    "chargeSize": 1
  },
  "True Sansha Heavy Beam Laser": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 27500,
    "falloff": 8000,
    "chargeSize": 2
  },
  "True Sansha Heavy Pulse Laser": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2
  },
  "True Sansha Small Focused Beam Laser": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 13750,
    "falloff": 2500,
    "chargeSize": 1
  },
  "True Sansha Small Focused Pulse Laser": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1
  },
  "True Sansha Mega Beam Laser": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "True Sansha Mega Pulse Laser": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "True Sansha Quad Beam Laser": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 11000,
    "falloff": 1000,
    "chargeSize": 2
  },
  "True Sansha Tachyon Beam Laser": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Shadow Serpentis 125mm Railgun": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 10800,
    "falloff": 5000,
    "chargeSize": 1
  },
  "Dread Guristas 125mm Railgun": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 11700,
    "falloff": 5000,
    "chargeSize": 1
  },
  "Shadow Serpentis 150mm Railgun": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 14400,
    "falloff": 6000,
    "chargeSize": 1
  },
  "Dread Guristas 150mm Railgun": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 15600,
    "falloff": 6000,
    "chargeSize": 1
  },
  "Shadow Serpentis 200mm Railgun": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 16200,
    "falloff": 9000,
    "chargeSize": 2
  },
  "Dread Guristas 200mm Railgun": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 21060,
    "falloff": 9000,
    "chargeSize": 2
  },
  "Shadow Serpentis 250mm Railgun": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 2
  },
  "Dread Guristas 250mm Railgun": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 2
  },
  "Shadow Serpentis 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Dread Guristas 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 42120,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Shadow Serpentis 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Dread Guristas 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 56160,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Shadow Serpentis Dual 150mm Railgun": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 12960,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Dread Guristas Dual 150mm Railgun": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 14040,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Shadow Serpentis Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Dread Guristas Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Shadow Serpentis Heavy Electron Blaster": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2100,
    "falloff": 3000,
    "chargeSize": 2
  },
  "Shadow Serpentis Heavy Ion Blaster": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 2625,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Shadow Serpentis Light Electron Blaster": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1050,
    "falloff": 1500,
    "chargeSize": 1
  },
  "Shadow Serpentis Light Ion Blaster": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1312,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Shadow Serpentis Light Neutron Blaster": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1575,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Shadow Serpentis Electron Blaster Cannon": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Shadow Serpentis Ion Blaster Cannon": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Shadow Serpentis Neutron Blaster Cannon": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Shadow Serpentis Heavy Neutron Blaster": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3150,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Dread Guristas 75mm Railgun": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 7800,
    "falloff": 3000,
    "chargeSize": 1
  },
  "Shadow Serpentis 75mm Railgun": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 7200,
    "falloff": 3000,
    "chargeSize": 1
  },
  "200mm Carbide Railgun I": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 17010,
    "falloff": 9000,
    "chargeSize": 2
  },
  "200mm 'Scout' Accelerator Cannon": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 17820,
    "falloff": 9000,
    "chargeSize": 2
  },
  "200mm Compressed Coil Gun I": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 18630,
    "falloff": 9000,
    "chargeSize": 2
  },
  "200mm Prototype Gauss Gun": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 19440,
    "falloff": 9000,
    "chargeSize": 2
  },
  "350mm Carbide Railgun I": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 34020,
    "falloff": 18000,
    "chargeSize": 3
  },
  "350mm 'Scout' Accelerator Cannon": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 35640,
    "falloff": 18000,
    "chargeSize": 3
  },
  "350mm Compressed Coil Gun I": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 37260,
    "falloff": 18000,
    "chargeSize": 3
  },
  "350mm Prototype Gauss Gun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Tuvan's Modified Electron Blaster Cannon": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Cormack's Modified Electron Blaster Cannon": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Cormack's Modified Ion Blaster Cannon": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Tuvan's Modified Ion Blaster Cannon": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Tuvan's Modified Neutron Blaster Cannon": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Cormack's Modified Neutron Blaster Cannon": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Brynn's Modified 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Setele's Modified 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Kaikka's Modified 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 42120,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Vepas' Modified 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 44226,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Estamel's Modified 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 46332,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Brynn's Modified 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Setele's Modified 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Kaikka's Modified 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 56160,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Vepas' Modified 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 58968,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Estamel's Modified 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 61776,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Brynn's Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Setele's Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Kaikka's Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Vepas' Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 29484,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Estamel's Modified Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 30888,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Selynne's Modified Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Chelm's Modified Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Raysere's Modified Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Draclira's Modified Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Tairei's Modified Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Ahremen's Modified Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Brokara's Modified Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Vizan's Modified Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Selynne's Modified Mega Beam Laser": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Chelm's Modified Mega Beam Laser": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Raysere's Modified Mega Beam Laser": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Draclira's Modified Mega Beam Laser": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Tairei's Modified Mega Pulse Laser": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Ahremen's Modified Mega Pulse Laser": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Brokara's Modified Mega Pulse Laser": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Vizan's Modified Mega Pulse Laser": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Selynne's Modified Tachyon Beam Laser": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Chelm's Modified Tachyon Beam Laser": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Raysere's Modified Tachyon Beam Laser": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Draclira's Modified Tachyon Beam Laser": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Mizuro's Modified 800mm Repeating Cannon": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3
  },
  "Gotan's Modified 800mm Repeating Cannon": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3
  },
  "Hakim's Modified 1200mm Artillery Cannon": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3
  },
  "Tobias' Modified 1200mm Artillery Cannon": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 33600,
    "falloff": 35000,
    "chargeSize": 3
  },
  "Hakim's Modified 1400mm Howitzer Artillery": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "Tobias' Modified 1400mm Howitzer Artillery": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "Mizuro's Modified Dual 425mm AutoCannon": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Gotan's Modified Dual 425mm AutoCannon": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Mizuro's Modified Dual 650mm Repeating Cannon": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3
  },
  "Gotan's Modified Dual 650mm Repeating Cannon": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3
  },
  "Caldari Navy Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Caldari Navy Dual 150mm Railgun": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 14040,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Caldari Navy 75mm Railgun": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 7800,
    "falloff": 3000,
    "chargeSize": 1
  },
  "Caldari Navy 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 56160,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Caldari Navy 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 42120,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Caldari Navy 250mm Railgun": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 28080,
    "falloff": 10800,
    "chargeSize": 2
  },
  "Caldari Navy 200mm Railgun": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 21060,
    "falloff": 9000,
    "chargeSize": 2
  },
  "Caldari Navy 150mm Railgun": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 15600,
    "falloff": 6000,
    "chargeSize": 1
  },
  "Caldari Navy 125mm Railgun": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 11700,
    "falloff": 5000,
    "chargeSize": 1
  },
  "Federation Navy Neutron Blaster Cannon": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 6300,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Federation Navy Light Neutron Blaster": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1575,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Federation Navy Light Ion Blaster": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1312,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Federation Navy Light Electron Blaster": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1050,
    "falloff": 1500,
    "chargeSize": 1
  },
  "Federation Navy Ion Blaster Cannon": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Federation Navy Heavy Neutron Blaster": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3150,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Federation Navy Heavy Ion Blaster": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 2625,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Federation Navy Heavy Electron Blaster": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2100,
    "falloff": 3000,
    "chargeSize": 2
  },
  "Federation Navy Electron Blaster Cannon": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4200,
    "falloff": 6000,
    "chargeSize": 3
  },
  "Federation Navy Dual 250mm Railgun": {
    "tracking": 1.90179,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 3
  },
  "Federation Navy Dual 150mm Railgun": {
    "tracking": 10.8,
    "sigResolution": 40000,
    "optimal": 12960,
    "falloff": 5400,
    "chargeSize": 2
  },
  "Federation Navy 75mm Railgun": {
    "tracking": 136.5,
    "sigResolution": 40000,
    "optimal": 7200,
    "falloff": 3000,
    "chargeSize": 1
  },
  "Federation Navy 425mm Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 51840,
    "falloff": 21600,
    "chargeSize": 3
  },
  "Federation Navy 350mm Railgun": {
    "tracking": 1.26828,
    "sigResolution": 40000,
    "optimal": 38880,
    "falloff": 18000,
    "chargeSize": 3
  },
  "Federation Navy 250mm Railgun": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 25920,
    "falloff": 10800,
    "chargeSize": 2
  },
  "Federation Navy 200mm Railgun": {
    "tracking": 7.2,
    "sigResolution": 40000,
    "optimal": 16200,
    "falloff": 9000,
    "chargeSize": 2
  },
  "Federation Navy 150mm Railgun": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 14400,
    "falloff": 6000,
    "chargeSize": 1
  },
  "Federation Navy 125mm Railgun": {
    "tracking": 89.25,
    "sigResolution": 40000,
    "optimal": 10800,
    "falloff": 5000,
    "chargeSize": 1
  },
  "Ammatar Navy Tachyon Beam Laser": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Ammatar Navy Quad Beam Laser": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 11000,
    "falloff": 1000,
    "chargeSize": 2
  },
  "Ammatar Navy Mega Pulse Laser": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Ammatar Navy Mega Beam Laser": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Ammatar Navy Small Focused Pulse Laser": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Ammatar Navy Small Focused Beam Laser": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 13750,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Ammatar Navy Heavy Pulse Laser": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Ammatar Navy Heavy Beam Laser": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 27500,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Ammatar Navy Gatling Pulse Laser": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Ammatar Navy Focused Medium Pulse Laser": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 11813,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Ammatar Navy Focused Medium Beam Laser": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 24063,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Ammatar Navy Dual Light Pulse Laser": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 5906,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Ammatar Navy Dual Light Beam Laser": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 12032,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Ammatar Navy Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Ammatar Navy Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Imperial Navy Tachyon Beam Laser": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 52800,
    "falloff": 20000,
    "chargeSize": 3
  },
  "Imperial Navy Quad Beam Laser": {
    "tracking": 23.328,
    "sigResolution": 40000,
    "optimal": 11000,
    "falloff": 1000,
    "chargeSize": 2
  },
  "Imperial Navy Mega Pulse Laser": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 25200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "Imperial Navy Mega Beam Laser": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 16000,
    "chargeSize": 3
  },
  "Imperial Navy Small Focused Pulse Laser": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Imperial Navy Small Focused Beam Laser": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 13750,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Imperial Navy Heavy Pulse Laser": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Imperial Navy Heavy Beam Laser": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 27500,
    "falloff": 8000,
    "chargeSize": 2
  },
  "Imperial Navy Gatling Pulse Laser": {
    "tracking": 308.125,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 1000,
    "chargeSize": 1
  },
  "Imperial Navy Focused Medium Pulse Laser": {
    "tracking": 28.8,
    "sigResolution": 40000,
    "optimal": 11813,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Imperial Navy Focused Medium Beam Laser": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 24063,
    "falloff": 6000,
    "chargeSize": 2
  },
  "Imperial Navy Dual Light Pulse Laser": {
    "tracking": 273.75,
    "sigResolution": 40000,
    "optimal": 5906,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Imperial Navy Dual Light Beam Laser": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 12032,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Imperial Navy Dual Heavy Pulse Laser": {
    "tracking": 3.75,
    "sigResolution": 40000,
    "optimal": 22680,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Imperial Navy Dual Heavy Beam Laser": {
    "tracking": 1.75,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "Republic Fleet 125mm Autocannon": {
    "tracking": 417,
    "sigResolution": 40000,
    "optimal": 960,
    "falloff": 4300,
    "chargeSize": 1
  },
  "Republic Fleet 1200mm Artillery": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 38640,
    "falloff": 35000,
    "chargeSize": 3
  },
  "Republic Fleet 1400mm Howitzer Artillery": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 48000,
    "falloff": 35000,
    "chargeSize": 3
  },
  "Republic Fleet 150mm Autocannon": {
    "tracking": 362,
    "sigResolution": 40000,
    "optimal": 1080,
    "falloff": 4730,
    "chargeSize": 1
  },
  "Republic Fleet 200mm Autocannon": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1
  },
  "Republic Fleet 220mm Autocannon": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 2160,
    "falloff": 9933,
    "chargeSize": 2
  },
  "Republic Fleet 250mm Artillery": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 9660,
    "falloff": 8750,
    "chargeSize": 1
  },
  "Republic Fleet 280mm Howitzer Artillery": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 12000,
    "falloff": 8750,
    "chargeSize": 1
  },
  "Republic Fleet 425mm Autocannon": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2
  },
  "Republic Fleet 650mm Artillery": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 19320,
    "falloff": 17500,
    "chargeSize": 2
  },
  "Republic Fleet 720mm Howitzer Artillery": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 24000,
    "falloff": 17500,
    "chargeSize": 2
  },
  "Republic Fleet 800mm Repeating Cannon": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 20640,
    "chargeSize": 3
  },
  "Republic Fleet Dual 180mm Autocannon": {
    "tracking": 44.68992,
    "sigResolution": 40000,
    "optimal": 1920,
    "falloff": 9030,
    "chargeSize": 2
  },
  "Republic Fleet Dual 425mm Autocannon": {
    "tracking": 5.7132,
    "sigResolution": 40000,
    "optimal": 3840,
    "falloff": 17200,
    "chargeSize": 3
  },
  "Republic Fleet Dual 650mm Repeating Cannon": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 4320,
    "falloff": 18920,
    "chargeSize": 3
  },
  "Dual Giga Pulse Laser I": {
    "tracking": 0.0384864,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Dual Giga Beam Laser I": {
    "tracking": 0.02182031,
    "sigResolution": 40000,
    "optimal": 100000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "Dual 1000mm Railgun I": {
    "tracking": 0.0182875,
    "sigResolution": 40000,
    "optimal": 120000,
    "falloff": 32000,
    "chargeSize": 4
  },
  "Ion Siege Blaster I": {
    "tracking": 0.0437,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 25000,
    "chargeSize": 4
  },
  "Hexa 2500mm Repeating Cannon I": {
    "tracking": 0.041515,
    "sigResolution": 40000,
    "optimal": 25000,
    "falloff": 28800,
    "chargeSize": 4
  },
  "Quad 3500mm Siege Artillery I": {
    "tracking": 0.0171,
    "sigResolution": 40000,
    "optimal": 94000,
    "falloff": 90000,
    "chargeSize": 4
  },
  "150mm 'Musket' Railgun": {
    "tracking": 73.5,
    "sigResolution": 40000,
    "optimal": 12000,
    "falloff": 6000,
    "chargeSize": 1
  },
  "250mm 'Flintlock' Railgun": {
    "tracking": 5.904,
    "sigResolution": 40000,
    "optimal": 21600,
    "falloff": 10800,
    "chargeSize": 2
  },
  "425mm 'Popper' Railgun": {
    "tracking": 1.04598,
    "sigResolution": 40000,
    "optimal": 43200,
    "falloff": 21600,
    "chargeSize": 3
  },
  "200mm Light 'Jolt' Autocannon I": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1000,
    "falloff": 5676,
    "chargeSize": 1
  },
  "250mm Light 'Jolt' Artillery I": {
    "tracking": 80,
    "sigResolution": 40000,
    "optimal": 8050,
    "falloff": 9625,
    "chargeSize": 1
  },
  "280mm 'Jolt' Artillery I": {
    "tracking": 64,
    "sigResolution": 40000,
    "optimal": 10000,
    "falloff": 9625,
    "chargeSize": 1
  },
  "425mm Medium 'Jolt' Autocannon I": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2000,
    "falloff": 11920,
    "chargeSize": 2
  },
  "650mm Medium 'Jolt' Artillery I": {
    "tracking": 8.352,
    "sigResolution": 40000,
    "optimal": 16100,
    "falloff": 19250,
    "chargeSize": 2
  },
  "720mm 'Jolt' Artillery I": {
    "tracking": 6.688,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 19250,
    "chargeSize": 2
  },
  "800mm Heavy 'Jolt' Repeating Cannon I": {
    "tracking": 4.32,
    "sigResolution": 40000,
    "optimal": 4000,
    "falloff": 22704,
    "chargeSize": 3
  },
  "1200mm Heavy 'Jolt' Artillery I": {
    "tracking": 1.125,
    "sigResolution": 40000,
    "optimal": 32200,
    "falloff": 38500,
    "chargeSize": 3
  },
  "1400mm 'Jolt' Artillery I": {
    "tracking": 0.9,
    "sigResolution": 40000,
    "optimal": 40000,
    "falloff": 38500,
    "chargeSize": 3
  },
  "'Corporate' Light Electron Blaster I": {
    "tracking": 438,
    "sigResolution": 40000,
    "optimal": 1200,
    "falloff": 1500,
    "chargeSize": 1
  },
  "'Dealer' Light Ion Blaster I": {
    "tracking": 403.2,
    "sigResolution": 40000,
    "optimal": 1500,
    "falloff": 2000,
    "chargeSize": 1
  },
  "'Racket' Light Neutron Blaster I": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1800,
    "falloff": 2500,
    "chargeSize": 1
  },
  "'Slither' Heavy Electron Blaster I": {
    "tracking": 46.08,
    "sigResolution": 40000,
    "optimal": 2400,
    "falloff": 3000,
    "chargeSize": 2
  },
  "'Hooligan' Heavy Ion Blaster I": {
    "tracking": 42.24,
    "sigResolution": 40000,
    "optimal": 3000,
    "falloff": 4000,
    "chargeSize": 2
  },
  "'Hustler' Heavy Neutron Blaster I": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3600,
    "falloff": 5000,
    "chargeSize": 2
  },
  "'Swindler' Electron Blaster Cannon I": {
    "tracking": 6,
    "sigResolution": 40000,
    "optimal": 4800,
    "falloff": 6000,
    "chargeSize": 3
  },
  "'Felon' Ion Blaster Cannon I": {
    "tracking": 5.52,
    "sigResolution": 40000,
    "optimal": 6000,
    "falloff": 8000,
    "chargeSize": 3
  },
  "'Underhand' Neutron Blaster Cannon I": {
    "tracking": 5.196,
    "sigResolution": 40000,
    "optimal": 7200,
    "falloff": 10000,
    "chargeSize": 3
  },
  "'Mace' Dual Light Beam Laser I": {
    "tracking": 117,
    "sigResolution": 40000,
    "optimal": 9625,
    "falloff": 2400,
    "chargeSize": 1
  },
  "'Longbow' Small Focused Pulse Laser I": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 5250,
    "falloff": 3000,
    "chargeSize": 1
  },
  "'Gauntlet' Small Focused Beam Laser I": {
    "tracking": 90,
    "sigResolution": 40000,
    "optimal": 11000,
    "falloff": 3000,
    "chargeSize": 1
  },
  "'Crossbow' Focused Medium Beam Laser I": {
    "tracking": 12.096,
    "sigResolution": 40000,
    "optimal": 19250,
    "falloff": 7200,
    "chargeSize": 2
  },
  "'Joust' Heavy Pulse Laser I": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 10500,
    "falloff": 6000,
    "chargeSize": 2
  },
  "'Arquebus' Heavy Beam Laser I": {
    "tracking": 9.504,
    "sigResolution": 40000,
    "optimal": 22000,
    "falloff": 9600,
    "chargeSize": 2
  },
  "'Halberd' Mega Pulse Laser I": {
    "tracking": 3.375,
    "sigResolution": 40000,
    "optimal": 21000,
    "falloff": 12000,
    "chargeSize": 3
  },
  "'Catapult' Mega Beam Laser I": {
    "tracking": 1.53125,
    "sigResolution": 40000,
    "optimal": 40000,
    "falloff": 19200,
    "chargeSize": 3
  },
  "'Ballista' Tachyon Beam Laser I": {
    "tracking": 1.39205,
    "sigResolution": 40000,
    "optimal": 44000,
    "falloff": 24000,
    "chargeSize": 3
  },
  "Polarized Small Focused Pulse Laser": {
    "tracking": 283.188,
    "sigResolution": 40000,
    "optimal": 5040,
    "falloff": 2000,
    "chargeSize": 1
  },
  "Polarized Heavy Pulse Laser": {
    "tracking": 29.90016,
    "sigResolution": 40000,
    "optimal": 10080,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Polarized Mega Pulse Laser": {
    "tracking": 3.8813,
    "sigResolution": 40000,
    "optimal": 20160,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Polarized Light Neutron Blaster": {
    "tracking": 436.77,
    "sigResolution": 40000,
    "optimal": 1440,
    "falloff": 1600,
    "chargeSize": 1
  },
  "Polarized Heavy Neutron Blaster": {
    "tracking": 44.16,
    "sigResolution": 40000,
    "optimal": 2880,
    "falloff": 4000,
    "chargeSize": 2
  },
  "Polarized Neutron Blaster Cannon": {
    "tracking": 5.9754,
    "sigResolution": 40000,
    "optimal": 5760,
    "falloff": 8000,
    "chargeSize": 3
  },
  "Polarized 200mm AutoCannon": {
    "tracking": 362.25,
    "sigResolution": 40000,
    "optimal": 960,
    "falloff": 4128,
    "chargeSize": 1
  },
  "Polarized 425mm AutoCannon": {
    "tracking": 38.8608,
    "sigResolution": 40000,
    "optimal": 1920,
    "falloff": 8669,
    "chargeSize": 2
  },
  "Polarized 800mm Repeating Cannon": {
    "tracking": 4.968,
    "sigResolution": 40000,
    "optimal": 3840,
    "falloff": 16512,
    "chargeSize": 3
  },
  "Quad 800mm Repeating Cannon I": {
    "tracking": 1.92,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 23000,
    "chargeSize": 4
  },
  "Quad Mega Pulse Laser I": {
    "tracking": 1.5,
    "sigResolution": 40000,
    "optimal": 33000,
    "falloff": 16000,
    "chargeSize": 4
  },
  "Triple Neutron Blaster Cannon I": {
    "tracking": 2.3,
    "sigResolution": 40000,
    "optimal": 16000,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Quad Mega Pulse Laser II": {
    "tracking": 1.5,
    "sigResolution": 40000,
    "optimal": 36300,
    "falloff": 16000,
    "chargeSize": 4
  },
  "Modulated Compact Quad Mega Pulse Laser": {
    "tracking": 1.5,
    "sigResolution": 40000,
    "optimal": 33000,
    "falloff": 16000,
    "chargeSize": 4
  },
  "Dual Giga Pulse Laser II": {
    "tracking": 0.0384864,
    "sigResolution": 40000,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Dual Giga Beam Laser II": {
    "tracking": 0.02182031,
    "sigResolution": 40000,
    "optimal": 110000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "Triple Neutron Blaster Cannon II": {
    "tracking": 2.3,
    "sigResolution": 40000,
    "optimal": 17600,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Regulated Compact Triple Neutron Blaster Cannon": {
    "tracking": 2.3,
    "sigResolution": 40000,
    "optimal": 16000,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Ion Siege Blaster II": {
    "tracking": 0.0437,
    "sigResolution": 40000,
    "optimal": 22000,
    "falloff": 25000,
    "chargeSize": 4
  },
  "Dual 1000mm Railgun II": {
    "tracking": 0.0182875,
    "sigResolution": 40000,
    "optimal": 132000,
    "falloff": 32000,
    "chargeSize": 4
  },
  "Quad 800mm Repeating Cannon II": {
    "tracking": 1.92,
    "sigResolution": 40000,
    "optimal": 22000,
    "falloff": 23000,
    "chargeSize": 4
  },
  "Compact Carbine Quad 800mm Repeating Cannon": {
    "tracking": 1.92,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 23000,
    "chargeSize": 4
  },
  "Hexa 2500mm Repeating Cannon II": {
    "tracking": 0.041515,
    "sigResolution": 40000,
    "optimal": 27500,
    "falloff": 28800,
    "chargeSize": 4
  },
  "Quad 3500mm Siege Artillery II": {
    "tracking": 0.0171,
    "sigResolution": 40000,
    "optimal": 103400,
    "falloff": 90000,
    "chargeSize": 4
  },
  "Modal Enduring Quad Mega Pulse Laser": {
    "tracking": 1.5,
    "sigResolution": 40000,
    "optimal": 33000,
    "falloff": 16000,
    "chargeSize": 4
  },
  "Anode Scoped Quad Mega Pulse Laser": {
    "tracking": 1.5,
    "sigResolution": 40000,
    "optimal": 34650,
    "falloff": 16000,
    "chargeSize": 4
  },
  "Afocal Precise Quad Mega Pulse Laser": {
    "tracking": 1.575,
    "sigResolution": 40000,
    "optimal": 33000,
    "falloff": 16000,
    "chargeSize": 4
  },
  "Dark Blood Quad Mega Pulse Laser": {
    "tracking": 1.575,
    "sigResolution": 40000,
    "optimal": 36300,
    "falloff": 16000,
    "chargeSize": 4
  },
  "True Sansha Quad Mega Pulse Laser": {
    "tracking": 1.575,
    "sigResolution": 40000,
    "optimal": 36300,
    "falloff": 16000,
    "chargeSize": 4
  },
  "Modal Enduring Triple Neutron Blaster Cannon": {
    "tracking": 2.3,
    "sigResolution": 40000,
    "optimal": 16000,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Anode Scoped Triple Neutron Blaster Cannon": {
    "tracking": 2.3,
    "sigResolution": 40000,
    "optimal": 16800,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Limited Precise Triple Neutron Blaster Cannon": {
    "tracking": 2.415,
    "sigResolution": 40000,
    "optimal": 16000,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Shadow Serpentis Triple Neutron Blaster Cannon": {
    "tracking": 2.415,
    "sigResolution": 40000,
    "optimal": 17600,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Ample Gallium Quad 800mm Repeating Cannon": {
    "tracking": 1.92,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 23000,
    "chargeSize": 4
  },
  "Scout Scoped Quad 800mm Repeating Cannon": {
    "tracking": 1.92,
    "sigResolution": 40000,
    "optimal": 21000,
    "falloff": 23000,
    "chargeSize": 4
  },
  "Prototype Precise Quad 800mm Repeating Cannon": {
    "tracking": 2.016,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 23000,
    "chargeSize": 4
  },
  "Domination Quad 800mm Repeating Cannon": {
    "tracking": 2.016,
    "sigResolution": 40000,
    "optimal": 22000,
    "falloff": 23000,
    "chargeSize": 4
  },
  "Modulated Compact Dual Giga Pulse Laser": {
    "tracking": 0.0384864,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Modal Enduring Dual Giga Pulse Laser": {
    "tracking": 0.0384864,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Anode Scoped Dual Giga Pulse Laser": {
    "tracking": 0.0384864,
    "sigResolution": 40000,
    "optimal": 44100,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Afocal Precise Dual Giga Pulse Laser": {
    "tracking": 0.04041072,
    "sigResolution": 40000,
    "optimal": 42000,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Dark Blood Dual Giga Pulse Laser": {
    "tracking": 0.04041072,
    "sigResolution": 40000,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 4
  },
  "True Sansha Dual Giga Pulse Laser": {
    "tracking": 0.04041072,
    "sigResolution": 40000,
    "optimal": 46200,
    "falloff": 20000,
    "chargeSize": 4
  },
  "Modulated Compact Dual Giga Beam Laser": {
    "tracking": 0.02182031,
    "sigResolution": 40000,
    "optimal": 100000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "Modal Enduring Dual Giga Beam Laser": {
    "tracking": 0.02182031,
    "sigResolution": 40000,
    "optimal": 100000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "Anode Scoped Dual Giga Beam Laser": {
    "tracking": 0.02182031,
    "sigResolution": 40000,
    "optimal": 105000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "Afocal Precise Dual Giga Beam Laser": {
    "tracking": 0.022911326,
    "sigResolution": 40000,
    "optimal": 100000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "Dark Blood Dual Giga Beam Laser": {
    "tracking": 0.022911326,
    "sigResolution": 40000,
    "optimal": 110000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "True Sansha Dual Giga Beam Laser": {
    "tracking": 0.022911326,
    "sigResolution": 40000,
    "optimal": 110000,
    "falloff": 42000,
    "chargeSize": 4
  },
  "Regulated Compact Ion Siege Blaster": {
    "tracking": 0.0437,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 25000,
    "chargeSize": 4
  },
  "Modal Enduring Ion Siege Blaster": {
    "tracking": 0.0437,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 25000,
    "chargeSize": 4
  },
  "Anode Scoped Ion Siege Blaster": {
    "tracking": 0.0437,
    "sigResolution": 40000,
    "optimal": 21000,
    "falloff": 25000,
    "chargeSize": 4
  },
  "Limited Precise Ion Siege Blaster": {
    "tracking": 0.045885,
    "sigResolution": 40000,
    "optimal": 20000,
    "falloff": 25000,
    "chargeSize": 4
  },
  "Shadow Serpentis Ion Siege Blaster": {
    "tracking": 0.045885,
    "sigResolution": 40000,
    "optimal": 22000,
    "falloff": 25000,
    "chargeSize": 4
  },
  "Carbide Compact Dual 1000mm Railgun": {
    "tracking": 0.0182875,
    "sigResolution": 40000,
    "optimal": 120000,
    "falloff": 32000,
    "chargeSize": 4
  },
  "Compressed Enduring Dual 1000mm Railgun": {
    "tracking": 0.0182875,
    "sigResolution": 40000,
    "optimal": 120000,
    "falloff": 32000,
    "chargeSize": 4
  },
  "Scout Scoped Dual 1000mm Railgun": {
    "tracking": 0.0182875,
    "sigResolution": 40000,
    "optimal": 126000,
    "falloff": 32000,
    "chargeSize": 4
  },
  "Prototype Precise Dual 1000mm Railgun": {
    "tracking": 0.019201875,
    "sigResolution": 40000,
    "optimal": 120000,
    "falloff": 32000,
    "chargeSize": 4
  },
  "Shadow Serpentis Dual 1000mm Railgun": {
    "tracking": 0.019201875,
    "sigResolution": 40000,
    "optimal": 132000,
    "falloff": 32000,
    "chargeSize": 4
  },
  "Carbine Compact Hexa 2500mm Repeating Cannon": {
    "tracking": 0.041515,
    "sigResolution": 40000,
    "optimal": 25000,
    "falloff": 28800,
    "chargeSize": 4
  },
  "Gallium Ample Hexa 2500mm Repeating Cannon": {
    "tracking": 0.041515,
    "sigResolution": 40000,
    "optimal": 25000,
    "falloff": 28800,
    "chargeSize": 4
  },
  "Scout Scoped Hexa 2500mm Repeating Cannon": {
    "tracking": 0.041515,
    "sigResolution": 40000,
    "optimal": 26250,
    "falloff": 28800,
    "chargeSize": 4
  },
  "Prototype Precise Hexa 2500mm Repeating Cannon": {
    "tracking": 0.04359075,
    "sigResolution": 40000,
    "optimal": 25000,
    "falloff": 28800,
    "chargeSize": 4
  },
  "Domination Hexa 2500mm Repeating Cannon": {
    "tracking": 0.04359075,
    "sigResolution": 40000,
    "optimal": 27500,
    "falloff": 28800,
    "chargeSize": 4
  },
  "Carbide Compact Quad 3500mm Siege Artillery": {
    "tracking": 0.0171,
    "sigResolution": 40000,
    "optimal": 94000,
    "falloff": 90000,
    "chargeSize": 4
  },
  "Gallium Ample Quad 3500mm Siege Artillery": {
    "tracking": 0.0171,
    "sigResolution": 40000,
    "optimal": 94000,
    "falloff": 90000,
    "chargeSize": 4
  },
  "Scout Scoped Quad 3500mm Siege Artillery": {
    "tracking": 0.0171,
    "sigResolution": 40000,
    "optimal": 98700,
    "falloff": 90000,
    "chargeSize": 4
  },
  "Prototype Precise Quad 3500mm Siege Artillery": {
    "tracking": 0.017955,
    "sigResolution": 40000,
    "optimal": 94000,
    "falloff": 90000,
    "chargeSize": 4
  },
  "Domination Quad 3500mm Siege Artillery": {
    "tracking": 0.017955,
    "sigResolution": 40000,
    "optimal": 103400,
    "falloff": 90000,
    "chargeSize": 4
  },
  "Asine's Modified Light Neutron Blaster": {
    "tracking": 379.8,
    "sigResolution": 40000,
    "optimal": 1800,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Gara's Modified Heavy Neutron Blaster": {
    "tracking": 38.4,
    "sigResolution": 40000,
    "optimal": 3600,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Ramaku's Modified 200mm AutoCannon": {
    "tracking": 315,
    "sigResolution": 40000,
    "optimal": 1200,
    "falloff": 5160,
    "chargeSize": 1
  },
  "Sila's Modified 425mm Autocannon": {
    "tracking": 33.792,
    "sigResolution": 40000,
    "optimal": 2400,
    "falloff": 10836,
    "chargeSize": 2
  },
  "Makra's Modified Small Focused Pulse Laser": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Usaras' Modified Small Focused Pulse Laser": {
    "tracking": 246.25,
    "sigResolution": 40000,
    "optimal": 6563,
    "falloff": 2500,
    "chargeSize": 1
  },
  "Ryhad's Modified Heavy Pulse Laser": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2
  },
  "Nija's Modified Heavy Pulse Laser": {
    "tracking": 26,
    "sigResolution": 40000,
    "optimal": 13125,
    "falloff": 5000,
    "chargeSize": 2
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
