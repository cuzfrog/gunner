import { describe, expect, test } from "bun:test";
import { UnitAliveReadoutImpl, type UnitAliveEls, type UnitAliveSideEls } from "./unitAliveReadout";
import type { EngineView } from "../../../sim";
import { toTypeId } from "../../../gamedata/ids";

function els(): UnitAliveSideEls & { texts: () => { drone: string; fighter: string } } {
  const drone = { textContent: "" };
  const fighter = { textContent: "" };
  const shipA: UnitAliveEls = { droneAlive: drone as unknown as HTMLElement, fighterAlive: fighter as unknown as HTMLElement };
  const shipB: UnitAliveEls = { droneAlive: { textContent: "" } as unknown as HTMLElement, fighterAlive: { textContent: "" } as unknown as HTMLElement };
  return { shipA, shipB, texts: () => ({ drone: drone.textContent ?? "", fighter: fighter.textContent ?? "" }) };
}

function view(overrides: {
  readonly droneStates?: readonly { readonly aliveCount: number }[];
  readonly droneSpecs?: readonly { readonly droneCount: number }[];
  readonly fighterStates?: readonly { readonly aliveCount: number }[];
  readonly fighterSpecs?: readonly { readonly fighterCount: number }[];
} = {}): EngineView {
  return {
    drones: { shipA: overrides.droneStates ?? [], shipB: [] },
    droneSpecs: { shipA: overrides.droneSpecs ?? [], shipB: [] },
    fighters: { shipA: overrides.fighterStates ?? [], shipB: [] },
    fighterSpecs: { shipA: overrides.fighterSpecs ?? [], shipB: [] },
  } as unknown as EngineView;
}

describe("UnitAliveReadoutImpl", () => {
  test("reports alive over total per wing", () => {
    const box = els();
    const readout = new UnitAliveReadoutImpl(box);
    readout.update(view({
      droneStates: [{ aliveCount: 3 }, { aliveCount: 5 }],
      droneSpecs: [{ droneCount: 5 }, { droneCount: 5 }],
      fighterStates: [{ aliveCount: 4 }],
      fighterSpecs: [{ fighterCount: 6 }],
    }));
    expect(box.texts().drone).toBe("8/10");
    expect(box.texts().fighter).toBe("4/6");
  });

  test("shows a dash when the side fields no wing", () => {
    const box = els();
    const readout = new UnitAliveReadoutImpl(box);
    readout.update(view());
    expect(box.texts().drone).toBe("-");
    expect(box.texts().fighter).toBe("-");
  });

  test("an all-dead wing reads 0/total", () => {
    const box = els();
    const readout = new UnitAliveReadoutImpl(box);
    readout.update(view({ droneStates: [{ aliveCount: 0 }], droneSpecs: [{ droneCount: 5 }] }));
    expect(box.texts().drone).toBe("0/5");
  });

  test("re-renders on every update", () => {
    const box = els();
    const readout = new UnitAliveReadoutImpl(box);
    readout.update(view({ droneStates: [{ aliveCount: 5 }], droneSpecs: [{ droneCount: 5 }] }));
    readout.update(view({ droneStates: [{ aliveCount: 2 }], droneSpecs: [{ droneCount: 5 }] }));
    expect(box.texts().drone).toBe("2/5");
  });
});
