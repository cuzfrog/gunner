import { toTypeId } from "../src/gamedata/ids";
import type { SubsystemStats } from "../src/gamedata/fittingDb";
import { _computeDroneLimits } from "./validate-fittings";

const PROFILE = { droneCapacity: 75, droneBandwidth: 75 };

function subsystem(id: string, name: string): SubsystemStats {
  return { id: toTypeId(id), name, slotKind: "offensive", highSlots: 0, medSlots: 0, lowSlots: 0, turretHardpoints: 0, launcherHardpoints: 0 };
}

describe("_computeDroneLimits", () => {
  test("returns the hull limits when no subsystems are fitted", () => {
    expect(_computeDroneLimits(PROFILE, [])).toEqual({ capacity: 75, bandwidth: 75 });
  });

  test("adds subsystem flats from the fitting database", () => {
    const proteusDroneSynthesis = subsystem("45605", "Proteus Offensive - Drone Synthesis Projector");
    expect(_computeDroneLimits({ droneCapacity: 0, droneBandwidth: 0 }, [proteusDroneSynthesis])).toEqual({ capacity: 300, bandwidth: 125 });
    const lokiSupportProcessor = subsystem("45609", "Loki Offensive - Support Processor");
    expect(_computeDroneLimits({ droneCapacity: 0, droneBandwidth: 0 }, [lokiSupportProcessor])).toEqual({ capacity: 50, bandwidth: 25 });
  });

  test("sums flats across several subsystems", () => {
    const lokiSupportProcessor = subsystem("45609", "Loki Offensive - Support Processor");
    const lokiProjectileScoping = subsystem("45607", "Loki Offensive - Projectile Scoping Array");
    const limits = _computeDroneLimits({ droneCapacity: 0, droneBandwidth: 0 }, [lokiSupportProcessor, lokiProjectileScoping]);
    expect(limits.capacity).toBe(75);
    expect(limits.bandwidth).toBe(50);
  });

  test("yields zero limits on a T3 hull without subsystems", () => {
    expect(_computeDroneLimits({ droneCapacity: 0, droneBandwidth: 0 }, [])).toEqual({ capacity: 0, bandwidth: 0 });
  });
});
