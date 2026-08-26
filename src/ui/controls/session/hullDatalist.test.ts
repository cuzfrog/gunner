import type { I18n } from "../../i18n";
import type { ShipId } from "../../../gamedata/ids";
import { HullDatalistImpl } from "./hullDatalist";
import { UiEventsImpl } from "../../events";
import { RIFTER, mockShips, mockPresetFittings, fakeDocument } from "../../testing";
import type { PresetFittings } from "../../../fitting";
import type { Ships } from "../../../ships";

function build() {
  globalThis.document = fakeDocument() as unknown as Document;
  const hullOptions = document.createElement("datalist");
  const presetFittings: PresetFittings = {
    ...mockPresetFittings(),
    listHulls: vi.fn(() => [{ id: RIFTER.id, label: RIFTER.name }]),
  };
  const ships: Ships = {
    ...mockShips(),
    findHullById: vi.fn((id: ShipId) => (id === RIFTER.id ? RIFTER : undefined)),
    hullView: vi.fn((profile, language) => ({
      name: language === "zh" ? "裂谷级" : profile.name,
      hullType: "Frigate",
      faction: "Minmatar Republic",
    })),
  };
  let current: "en" | "zh" | "ja" = "en";
  const i18n: I18n = {
    current: () => current,
    setLanguage: (language) => { current = language; },
    t: () => "",
    translateDocument: () => {},
  };
  const events = new UiEventsImpl();
  const datalist = new HullDatalistImpl(hullOptions, presetFittings, ships, i18n, events);
  return { datalist, hullOptions, i18n, events };
}

describe("HullDatalist", () => {
  test("populate renders options with localized hull names", () => {
    const { datalist, hullOptions } = build();
    datalist.populate();
    expect(hullOptions.children.length).toBe(1);
    const option = hullOptions.children[0] as HTMLOptionElement;
    expect(option.value).toBe("Rifter");
    expect(option.textContent).toBe("Rifter");
  });

  test("repopulates localized options when language changes", () => {
    const { datalist, hullOptions, i18n, events } = build();
    datalist.populate();
    i18n.setLanguage("zh");
    events.emitLanguageChanged();
    const option = hullOptions.children[0] as HTMLOptionElement;
    expect(option.value).toBe("裂谷级");
    expect(option.textContent).toBe("裂谷级");
  });
});
