import type { LockState } from "../../../sim";
import { formatWithCommas } from "../controlsFormat";
import { html } from "../markup";

export interface LockStateHintModel {
  readonly lock: LockState;
  readonly effectiveRange: number | undefined;
  readonly maxLockedTargets: number | undefined;
}

export interface LockStateHintRendererDeps {
  readonly t: (key: string) => string;
}

export interface LockStateHintRenderer {
  render(model: LockStateHintModel, container: HTMLElement): void;
}

export class LockStateHintRendererImpl implements LockStateHintRenderer {
  private readonly t: (key: string) => string;

  constructor(deps: LockStateHintRendererDeps) {
    this.t = deps.t;
  }

  render(model: LockStateHintModel, container: HTMLElement): void {
    const t = this.t;
    const root = html`<div class="dps-hint"></div>` as unknown as HTMLElement;
    root.appendChild(renderRow(t("lockHint.status"), statusLabel(t, model.lock)));
    if (model.lock.status === "locking") {
      root.appendChild(renderRow(t("lockHint.progress"), `${Math.round(model.lock.progress * 100)}%`));
      root.appendChild(renderRow(t("lockHint.remaining"), `${model.lock.remaining.toFixed(1)}${t("unit.second")}`));
    }
    if (model.effectiveRange !== undefined) {
      root.appendChild(renderRow(t("lockHint.targetingRange"), `${formatWithCommas(model.effectiveRange)}${t("unit.meter")}`));
    }
    if (model.maxLockedTargets !== undefined) {
      root.appendChild(renderRow(t("lockHint.maxLockedTargets"), String(model.maxLockedTargets)));
    }
    if (!model.lock.inRange && model.lock.status !== "locked") {
      root.appendChild(renderRow(t("lockHint.outOfRange"), ""));
    }
    container.appendChild(root);
  }
}

function renderRow(label: string, value: string): HTMLElement {
  return html`<div class="dps-hint-row dps-hint-summary-row">
    <span class="dps-hint-label">${label}</span>
    <span class="dps-hint-value">${value}</span>
  </div>` as unknown as HTMLElement;
}

function statusLabel(t: (key: string) => string, lock: LockState): string {
  if (lock.status === "idle") return t("lockHint.idle");
  if (lock.status === "locking") return t("lockHint.locking");
  return t("lockHint.locked");
}
