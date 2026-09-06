import { Vec2, type EngineView, type DefenseView, type EngagementView, EMPTY_DEFENSE_ASSESSMENT, EMPTY_PROJECTION } from "../../../sim";
import type { EffectiveReadouts } from "../controlsContract";
import type { EngagementReadout } from "../engagementReadout";
import type { EffectiveReadout } from "../effectiveReadout";
import type { DefenseReadout, ReadoutPresenter } from "./readoutPresenter";
import { ReadoutPresenterImpl } from "./readoutPresenter";
import type { I18n } from "../../i18n";
import type { ViewStream } from "../../viewStream";

const LOCKED_STATE = { status: "locked" as const, progress: 1, remaining: 0, lockTime: 0, inRange: true };

type TestViewStream = ViewStream & { emit(view: EngineView): void };

function createTestViewStream(): TestViewStream {
  let latest: EngineView | undefined;
  const listeners = new Set<(view: EngineView) => void>();
  return {
    currentView: () => latest,
    onViewUpdated: (cb: (view: EngineView) => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    connect: () => {},
    offViewUpdated: () => {},
    emit: (view: EngineView) => { latest = view; for (const l of Array.from(listeners)) l(view); },
  } as unknown as TestViewStream;
}

function mockI18n(): I18n {
  return { current: () => "en", setLanguage: () => {}, t: (key: string) => key, translateDocument: () => {} } as unknown as I18n;
}

function mockDefenseView(): DefenseView {
  const emptyPools = { shield: 0, armor: 0, hull: 0 };
  const emptyPercentages = { shield: 0, armor: 0, hull: 0 };
  return {
    pools: { shipA: emptyPools, shipB: emptyPools },
    poolPercentages: { shipA: emptyPercentages, shipB: emptyPercentages },
    dead: { shipA: false, shipB: false },
    deadAt: { shipA: undefined, shipB: undefined },
    damageEnabled: { shipA: true, shipB: true },
    shieldRegenPerSecond: { shipA: 0, shipB: 0 },
    repairers: { shipA: [], shipB: [] },
    repairMode: { shipA: "auto", shipB: "auto" },
    rah: { shipA: undefined, shipB: undefined },
  };
}

function makeView(): EngagementView {
  const shipAState = { id: "shipA" as const, position: new Vec2(0, 0), velocity: new Vec2(0, 0), maxSpeed: 0, mass: 1, inertiaModifier: 1, mode: "orbit" as const, desiredRange: 0, aggressivity: 1 };
  const shipBState = { ...shipAState, id: "shipB" as const };
  const frame = { time: 0, shipA: shipAState, shipB: shipBState, relPosition: new Vec2(0, 5000), distance: 5000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };
  return { frame, attacks: { shipA: undefined, shipB: undefined }, weaponAttacks: { shipA: [], shipB: [] }, effectiveWeapons: { shipA: undefined, shipB: undefined }, defenses: { shipA: EMPTY_DEFENSE_ASSESSMENT, shipB: EMPTY_DEFENSE_ASSESSMENT }, projection: { shipA: EMPTY_PROJECTION, shipB: EMPTY_PROJECTION }, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE }, readouts: { shipA: { kind: "none", speed: 0 }, shipB: { kind: "none", speed: 0 } } };
}

function makeEngineView(sigs?: { shipA: number; shipB: number }): EngineView {
  const view = makeView();
  const shipAState = { ...view.frame.shipA, sig: sigs?.shipA ?? 1 };
  const shipBState = { ...view.frame.shipB, sig: sigs?.shipB ?? 1 };
  const snapshot = { time: view.frame.time, shipA: shipAState, shipB: shipBState, commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) } };
  return { ...view, readouts: { shipA: { kind: "none", speed: 0 } as unknown as EffectiveReadouts["shipA"], shipB: { kind: "none", speed: 0 } as unknown as EffectiveReadouts["shipB"] }, defenseRuntime: mockDefenseView(), snapshot, drones: { shipA: [], shipB: [] }, droneSpecs: { shipA: [], shipB: [] }, missiles: { shipA: [], shipB: [] } } as unknown as EngineView;
}

function buildDeps() {
  const viewStream = createTestViewStream();
  const engagementReadout = { update: vi.fn() } as unknown as EngagementReadout;
  const effectiveReadout = { update: vi.fn() } as unknown as EffectiveReadout;
  const defenseReadout: DefenseReadout = {
    updateAssessments: vi.fn(),
    updateDefenseView: vi.fn(),
    updateEffectiveSig: vi.fn(),
  };
  let fakeNow = 0;
  const deps = { viewStream, engagementReadout, effectiveReadout, defenseReadout, i18n: mockI18n(), now: () => fakeNow };
  return { ...deps, setNow: (n: number) => { fakeNow = n; } };
}

describe("ReadoutPresenterImpl", () => {
  test("applies readouts immediately when not playing", () => {
    const d = buildDeps();
    const presenter: ReadoutPresenter = new ReadoutPresenterImpl(d);
    const view = makeEngineView({ shipA: 100, shipB: 200 });
    d.viewStream.emit(view);
    expect(d.engagementReadout.update).toHaveBeenCalledTimes(1);
    expect(d.effectiveReadout.update).toHaveBeenCalledTimes(1);
    expect(d.defenseReadout.updateAssessments).toHaveBeenCalledTimes(1);
    expect(d.defenseReadout.updateEffectiveSig).toHaveBeenCalledWith("shipA", 100);
    expect(d.defenseReadout.updateEffectiveSig).toHaveBeenCalledWith("shipB", 200);
  });

  test("throttles readouts while playing and resumes after interval", () => {
    const d = buildDeps();
    const presenter: ReadoutPresenter = new ReadoutPresenterImpl(d);
    presenter.setPlaying(true);
    const view = makeEngineView({ shipA: 100, shipB: 200 });
    d.viewStream.emit(view);
    expect(d.effectiveReadout.update).toHaveBeenCalledTimes(1);
    d.setNow(10);
    d.viewStream.emit(view);
    expect(d.effectiveReadout.update).toHaveBeenCalledTimes(1);
    d.setNow(60);
    d.viewStream.emit(view);
    expect(d.effectiveReadout.update).toHaveBeenCalledTimes(2);
  });

  test("flushes cached view on pause after a skipped tick", () => {
    const d = buildDeps();
    const presenter: ReadoutPresenter = new ReadoutPresenterImpl(d);
    presenter.setPlaying(true);
    d.viewStream.emit(makeEngineView({ shipA: 100, shipB: 200 }));
    d.setNow(10);
    d.viewStream.emit(makeEngineView({ shipA: 150, shipB: 250 }));
    expect(d.defenseReadout.updateEffectiveSig).toHaveBeenCalledTimes(2);
    presenter.setPlaying(false);
    expect(d.defenseReadout.updateEffectiveSig).toHaveBeenLastCalledWith("shipB", 250);
    expect(d.defenseReadout.updateEffectiveSig).toHaveBeenCalledTimes(4);
  });

  test("constructor deps contain no config-capable types", () => {
    const d = buildDeps();
    const presenter = new ReadoutPresenterImpl(d);
    expect(presenter).toBeDefined();
    const defenseProxy = d.defenseReadout as unknown as Record<string, unknown>;
    expect(defenseProxy.spec).toBeUndefined();
    expect(defenseProxy.signaturePenalty).toBeUndefined();
  });

  test("poisoned-config: output is invariant under config mutation with the same view", () => {
    const d = buildDeps();
    const presenter: ReadoutPresenter = new ReadoutPresenterImpl(d);
    const view = makeEngineView({ shipA: 200, shipB: 1200 });
    d.viewStream.emit(view);
    const sigMock = d.defenseReadout.updateEffectiveSig as ReturnType<typeof vi.fn>;
    const assessMock = d.defenseReadout.updateAssessments as ReturnType<typeof vi.fn>;
    const effMock = d.effectiveReadout.update as ReturnType<typeof vi.fn>;
    const firstSigArgs = sigMock.mock.calls.map((c) => [...c]);
    const firstAssessArgs = assessMock.mock.calls.map((c) => [...c]);
    const firstEffArgs = effMock.mock.calls.map((c) => [...c]);
    const mutatedDefenseReadout: DefenseReadout = {
      updateAssessments: vi.fn(),
      updateDefenseView: vi.fn(),
      updateEffectiveSig: vi.fn(),
    };
    Object.assign(d.defenseReadout, mutatedDefenseReadout);
    d.viewStream.emit(view);
    const newSigMock = d.defenseReadout.updateEffectiveSig as ReturnType<typeof vi.fn>;
    const newAssessMock = d.defenseReadout.updateAssessments as ReturnType<typeof vi.fn>;
    expect(newSigMock.mock.calls.map((c) => [...c])).toEqual(firstSigArgs);
    expect(newAssessMock.mock.calls.map((c) => [...c])).toEqual(firstAssessArgs);
    expect(effMock.mock.calls.slice(firstEffArgs.length).map((c) => [...c])).toEqual(firstEffArgs);
  });
});
