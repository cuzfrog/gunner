import type { EngineView, EngagementEngine } from "../sim";

export interface ViewStream {
  onViewUpdated(listener: (view: EngineView) => void): void;
  offViewUpdated(listener: (view: EngineView) => void): void;
  currentView(): EngineView | undefined;
}

export class ViewStreamImpl implements ViewStream {
  private readonly listeners = new Set<(view: EngineView) => void>();
  private latest: EngineView | undefined;
  private readonly engineListener: (view: EngineView) => void;

  constructor(engine: EngagementEngine) {
    this.engineListener = (view) => {
      this.latest = view;
      for (const listener of Array.from(this.listeners)) listener(view);
    };
    engine.events().onViewUpdated(this.engineListener);
  }

  onViewUpdated(listener: (view: EngineView) => void): void { this.listeners.add(listener); }
  offViewUpdated(listener: (view: EngineView) => void): void { this.listeners.delete(listener); }
  currentView(): EngineView | undefined { return this.latest; }
}
