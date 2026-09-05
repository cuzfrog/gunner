import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import type { PopupGroup } from "../popup";
import { PopupField } from "../shared";
import type { Side } from "../side";
import type { ModulesPopup, ModulesPopupEls } from "./modulesPopupControllerContract";

export class ModulesPopupImpl implements ModulesPopup {
  private readonly els: ModulesPopupEls;
  private readonly i18n: I18n;
  private readonly fields: Record<Side, PopupField>;
  private readonly closeCallbacks = new Map<Side, (() => void)[]>();

  constructor(deps: { els: ModulesPopupEls; popupGroup: PopupGroup; i18n: I18n; uiEvents: UiEvents }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.fields = {
      shipA: new PopupField({ els: deps.els.fields.shipA, popupGroup: deps.popupGroup, onClose: () => this.fireClose("shipA") }),
      shipB: new PopupField({ els: deps.els.fields.shipB, popupGroup: deps.popupGroup, onClose: () => this.fireClose("shipB") }),
    };
    this.applyLabels();
    this.syncEnabled();
    deps.uiEvents.onFittingImported(() => { this.fields.shipA.close(); this.fields.shipB.close(); });
    deps.uiEvents.onLanguageChanged(() => { this.applyLabels(); this.syncEnabled(); });
    this.observeSections();
  }

  registerOnClose(side: Side, fn: () => void): void {
    const list = this.closeCallbacks.get(side) ?? [];
    list.push(fn);
    this.closeCallbacks.set(side, list);
  }

  syncEnabled(): void {
    const emptyHint = this.i18n.t("title.modules.empty");
    this.fields.shipA.syncEnabledFromSections(emptyHint);
    this.fields.shipB.syncEnabledFromSections(emptyHint);
  }

  private applyLabels(): void {
    const label = this.i18n.t("label.modules");
    this.fields.shipA.applyLabel(label);
    this.fields.shipB.applyLabel(label);
  }

  private fireClose(side: Side): void {
    for (const fn of this.closeCallbacks.get(side) ?? []) fn();
  }

  private observeSections(): void {
    if (typeof MutationObserver === "undefined") return;
    for (const side of ["shipA", "shipB"] as const) {
      const observer = new MutationObserver(() => this.syncEnabled());
      observer.observe(this.els.fields[side].popup, { childList: true, attributes: true, attributeFilter: ["hidden"], subtree: true });
    }
  }
}
