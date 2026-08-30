import type { FittingDb } from "../../../gamedata/fittingDb";
import type { I18n } from "../../i18n";
import type { AmmoHintModel, AmmoHintRenderer } from "./ammoHintRenderer";
import { AmmoHintProviderImpl } from "./ammoHintProvider";

interface FakeElement {
  readonly tagName: string;
  getAttribute(name: string): string | null;
}

function fakeAnchor(value: string | null): HTMLElement {
  const attrs = new Map<string, string>();
  if (value !== null) attrs.set("data-value", value);
  return {
    tagName: "button",
    getAttribute: (name: string) => attrs.get(name) ?? null,
  } as unknown as HTMLElement;
}

function makeFittingDb(): FittingDb {
  return {
    charges: {
      "185": { id: "185" as never, name: "EMP S", rangeMultiplier: 0.5, emDamage: 9, thermalDamage: 0, kineticDamage: 1, explosiveDamage: 2 },
    },
    missiles: {
      "202": { damage: 375, damageType: "em", explosionRadius: 330, explosionVelocity: 69, damageReductionFactor: 0.882, maxVelocity: 4700, flightTime: 14, launcherGroup: 506, chargeGroup: 386, id: "202" as never, name: "Mjolnir Cruise Missile" },
    },
  } as unknown as FittingDb;
}

function makeI18n(): I18n {
  return { current: () => "en", setLanguage: () => {}, t: (key) => key, translateDocument: () => {} };
}

function makeRenderer(): { renderer: AmmoHintRenderer; models: AmmoHintModel[] } {
  const models: AmmoHintModel[] = [];
  const renderer: AmmoHintRenderer = {
    render: (model: AmmoHintModel, _container: HTMLElement) => { models.push(model); },
  };
  return { renderer, models };
}

describe("AmmoHintProviderImpl", () => {
  test("renders nothing when anchor has no data-value", () => {
    const { renderer, models } = makeRenderer();
    const provider = new AmmoHintProviderImpl({ fittingDb: makeFittingDb(), i18n: makeI18n(), ammoHintRenderer: renderer });
    provider.render(fakeAnchor(null), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("renders nothing when id is not in charges or missiles", () => {
    const { renderer, models } = makeRenderer();
    const provider = new AmmoHintProviderImpl({ fittingDb: makeFittingDb(), i18n: makeI18n(), ammoHintRenderer: renderer });
    provider.render(fakeAnchor("unknown"), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("builds charge model with damage types and modifiers", () => {
    const { renderer, models } = makeRenderer();
    const provider = new AmmoHintProviderImpl({ fittingDb: makeFittingDb(), i18n: makeI18n(), ammoHintRenderer: renderer });
    provider.render(fakeAnchor("185"), {} as HTMLElement);
    expect(models.length).toBe(1);
    const model = models[0];
    expect(model.typeRows.length).toBe(3);
    expect(model.typeRows[0].type).toBe("em");
    expect(model.typeRows[0].value).toBe(9);
    expect(model.typeRows[1].type).toBe("kinetic");
    expect(model.typeRows[1].value).toBe(1);
    expect(model.typeRows[2].type).toBe("explosive");
    expect(model.typeRows[2].value).toBe(2);
    expect(model.totalDamage).toBe(12);
    expect(model.modifiers).toEqual(["range x0.5"]);
  });

  test("builds missile model with single damage type", () => {
    const { renderer, models } = makeRenderer();
    const provider = new AmmoHintProviderImpl({ fittingDb: makeFittingDb(), i18n: makeI18n(), ammoHintRenderer: renderer });
    provider.render(fakeAnchor("202"), {} as HTMLElement);
    expect(models.length).toBe(1);
    const model = models[0];
    expect(model.typeRows.length).toBe(1);
    expect(model.typeRows[0].type).toBe("em");
    expect(model.typeRows[0].value).toBe(375);
    expect(model.totalDamage).toBe(375);
    expect(model.modifiers.length).toBe(0);
  });
});
