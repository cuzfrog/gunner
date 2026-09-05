import { ViewStreamImpl } from "./viewStream";
import type { EngineEvents, EngineView, EngagementEngine } from "../sim";

function makeEngine(): { engine: EngagementEngine; events: EngineEvents; emit: (view: EngineView) => void } {
  const viewUpdated = new Set<(view: EngineView) => void>();
  const events: EngineEvents = {
    onViewUpdated: (l) => viewUpdated.add(l),
    offViewUpdated: (l) => viewUpdated.delete(l),
    onShipDestroyed: vi.fn(),
    offShipDestroyed: vi.fn(),
  };
  const engine = vi.mocked<EngagementEngine>({
    reset: vi.fn(), update: vi.fn(), step: vi.fn(), view: vi.fn(), events: vi.fn(() => events),
    setDamageEnabled: vi.fn(), setRepairMode: vi.fn(), setRepairerActivation: vi.fn(), setRahActivation: vi.fn(),
  });
  return { engine, events, emit: (view) => { for (const l of Array.from(viewUpdated)) l(view); } };
}

const fakeView = {} as EngineView;

describe("ViewStreamImpl", () => {
  test("currentView is undefined before first publish", () => {
    const { engine } = makeEngine();
    const stream = new ViewStreamImpl(engine);
    expect(stream.currentView()).toBeUndefined();
  });

  test("caches and re-emits the latest view from engine events", () => {
    const { engine, emit } = makeEngine();
    const stream = new ViewStreamImpl(engine);
    const received: EngineView[] = [];
    stream.onViewUpdated((v) => received.push(v));
    emit(fakeView);
    expect(stream.currentView()).toBe(fakeView);
    expect(received).toEqual([fakeView]);
  });

  test("offViewUpdated stops delivery to that listener", () => {
    const { engine, emit } = makeEngine();
    const stream = new ViewStreamImpl(engine);
    const received: EngineView[] = [];
    const listener = (v: EngineView) => received.push(v);
    stream.onViewUpdated(listener);
    emit(fakeView);
    stream.offViewUpdated(listener);
    emit({} as EngineView);
    expect(received).toEqual([fakeView]);
  });

  test("fans out to multiple listeners", () => {
    const { engine, emit } = makeEngine();
    const stream = new ViewStreamImpl(engine);
    const a: EngineView[] = [];
    const b: EngineView[] = [];
    stream.onViewUpdated((v) => a.push(v));
    stream.onViewUpdated((v) => b.push(v));
    emit(fakeView);
    expect(a).toEqual([fakeView]);
    expect(b).toEqual([fakeView]);
  });
});
