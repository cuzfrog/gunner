import type { PresetFittings } from "../../../fitting";
import type { PresetHull } from "../../../gamedata/presets";
import type { ShipNameLanguage, Ships } from "../../../ships";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";

export interface HullDatalist {
  populate(): void;
}

export class HullDatalistImpl implements HullDatalist {
  private readonly hullOptions: HTMLElement;
  private readonly presetFittings: PresetFittings;
  private readonly ships: Ships;
  private readonly i18n: I18n;

  constructor(hullOptions: HTMLElement, presetFittings: PresetFittings, ships: Ships, i18n: I18n, events: UiEvents) {
    this.hullOptions = hullOptions;
    this.presetFittings = presetFittings;
    this.ships = ships;
    this.i18n = i18n;
    events.onLanguageChanged(() => this.populate());
  }

  populate(): void {
    const datalist = this.hullOptions;
    const language = this.i18n.current() as ShipNameLanguage;
    const labels = this.presetFittings.listHulls()
      .map((hull) => this.labelFor(hull, language))
      .sort((a, b) => a.localeCompare(b));
    datalist.innerHTML = "";
    for (const label of labels) {
      const el = document.createElement("option");
      el.value = label;
      el.textContent = label;
      datalist.appendChild(el);
    }
  }

  private labelFor(hull: PresetHull, language: ShipNameLanguage): string {
    const profile = this.ships.findHullById(hull.id);
    return profile ? this.ships.hullView(profile, language).name : hull.label;
  }
}
