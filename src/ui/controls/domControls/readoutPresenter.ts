import type { EngineView } from "../../../sim";
import type { I18n } from "../../i18n";
import type { ViewStream } from "../../viewStream";
import type { EngagementReadout } from "../engagementReadout";
import type { EffectiveReadout } from "../effectiveReadout";

export interface DefenseReadout {
  updateAssessments(view: EngineView): void;
  updateDefenseView(view: EngineView["defenseRuntime"]): void;
  updateEffectiveSig(side: "shipA" | "shipB", sig: number): void;
}

export interface ReadoutPresenter {
  setPlaying(playing: boolean): void;
  flush(): void;
}

interface ReadoutPresenterDeps {
  readonly viewStream: ViewStream;
  readonly engagementReadout: EngagementReadout;
  readonly effectiveReadout: EffectiveReadout;
  readonly defenseReadout: DefenseReadout;
  readonly i18n: I18n;
  readonly now: () => number;
}

const READOUT_INTERVAL_MS = 50;

export class ReadoutPresenterImpl implements ReadoutPresenter {
  private readonly viewStream: ViewStream;
  private readonly engagementReadout: EngagementReadout;
  private readonly effectiveReadout: EffectiveReadout;
  private readonly defenseReadout: DefenseReadout;
  private readonly i18n: I18n;
  private readonly now: () => number;
  private cachedView?: EngineView;
  private playing = false;
  private lastApplyMs = -Infinity;

  constructor(deps: ReadoutPresenterDeps) {
    this.viewStream = deps.viewStream;
    this.engagementReadout = deps.engagementReadout;
    this.effectiveReadout = deps.effectiveReadout;
    this.defenseReadout = deps.defenseReadout;
    this.i18n = deps.i18n;
    this.now = deps.now;
    this.viewStream.onViewUpdated((view) => this.onReadouts(view));
  }

  setPlaying(playing: boolean): void {
    if (!playing && this.playing) this.flush();
    this.playing = playing;
    if (playing) this.lastApplyMs = this.now() - READOUT_INTERVAL_MS;
  }

  flush(): void {
    if (this.cachedView) {
      this.applyReadouts(this.cachedView);
      this.lastApplyMs = this.now();
    }
  }

  private onReadouts(view: EngineView): void {
    this.cachedView = view;
    this.defenseReadout.updateDefenseView(view.defenseRuntime);
    this.applyReadoutsIfReady();
  }

  private applyReadoutsIfReady(): void {
    const now = this.now();
    if (this.playing && now - this.lastApplyMs < READOUT_INTERVAL_MS) return;
    if (!this.cachedView) return;
    this.applyReadouts(this.cachedView);
    this.lastApplyMs = now;
  }

  private applyReadouts(view: EngineView): void {
    this.engagementReadout.update(view, (key) => this.i18n.t(key));
    this.effectiveReadout.update(view.readouts);
    this.defenseReadout.updateAssessments(view);
    this.defenseReadout.updateEffectiveSig("shipA", view.snapshot.shipA.sig ?? 1);
    this.defenseReadout.updateEffectiveSig("shipB", view.snapshot.shipB.sig ?? 1);
  }
}
