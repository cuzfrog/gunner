import type { AutopilotMode } from "../../../sim";
import { isAutopilotMode } from "../../../sim";
import { num, setText } from "../controlsDom";
import {
  aggressivityFromPosition,
  parseManeuverAggressivity,
  positionFromAggressivity,
} from "../controlsFormat";
import type { SidePanel, SidePanelState } from "./sidePanelContract";

export interface NavSectionEls {
  readonly mode: HTMLSelectElement;
  readonly range: HTMLInputElement;
  readonly aggressivity: HTMLInputElement;
  readonly aggressivitySlider: HTMLInputElement;
  readonly aggressivityValue: HTMLElement;
}

export interface INavSection {
  capture(): Pick<SidePanelState, "mode" | "range" | "aggressivity">;
  restore(state: Pick<SidePanelState, "mode" | "range" | "aggressivity">): void;
  setEnabled(enabled: boolean): void;
}

export class NavSection implements INavSection {
  private readonly panel: SidePanel;
  private readonly els: NavSectionEls;

  constructor({ panel, els }: { panel: SidePanel; els: NavSectionEls }) {
    this.panel = panel;
    this.els = els;
    this.els.mode.addEventListener("input", () => this.onModeInput());
    this.els.range.addEventListener("input", () => this.panel.host.onConfigChange());
    this.els.aggressivitySlider.addEventListener("input", () => this.onSliderInput());
  }

  capture(): Pick<SidePanelState, "mode" | "range" | "aggressivity"> {
    return {
      mode: this.currentMode(),
      range: num(this.els.range),
      aggressivity: parseManeuverAggressivity(this.els.aggressivity),
    };
  }

  restore(state: Pick<SidePanelState, "mode" | "range" | "aggressivity">): void {
    this.els.mode.value = state.mode;
    this.els.range.value = String(state.range);
    const current = state.aggressivity;
    this.els.aggressivity.value = String(current);
    const pos = positionFromAggressivity(current);
    this.els.aggressivitySlider.value = String(pos);
    setText(this.els.aggressivityValue, current.toFixed(2));
    this.els.aggressivitySlider.style.setProperty("--fill", `${pos * 100}%`);
    this.els.aggressivitySlider.disabled = state.mode !== "maneuver";
  }

  setEnabled(enabled: boolean): void {
    this.els.mode.disabled = !enabled;
    this.els.range.disabled = !enabled;
    this.els.aggressivitySlider.disabled = !enabled || this.els.mode.value !== "maneuver";
  }

  private onModeInput(): void {
    this.els.aggressivitySlider.disabled = this.els.mode.value !== "maneuver";
    this.panel.host.onConfigChange();
  }

  private onSliderInput(): void {
    const pos = Number.parseFloat(this.els.aggressivitySlider.value);
    const value = Math.round(aggressivityFromPosition(pos) * 100) / 100;
    this.els.aggressivity.value = String(value);
    setText(this.els.aggressivityValue, value.toFixed(2));
    this.els.aggressivitySlider.style.setProperty("--fill", `${pos * 100}%`);
    this.panel.host.onConfigChange();
  }

  private currentMode(): AutopilotMode {
    const value = this.els.mode.value;
    if (!isAutopilotMode(value)) throw new Error(`Invalid autopilot mode: ${value}`);
    return value;
  }
}
