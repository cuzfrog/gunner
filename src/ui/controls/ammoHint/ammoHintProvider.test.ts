import type { FittingDb } from "../../../gamedata/fittingDb";
import type { Language } from "../../i18n";
import type { StatHintModel, StatHintRenderer } from "../statHint";
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

function makeRenderer(): { renderer: StatHintRenderer; models: StatHintModel[] } {
  const models: StatHintModel[] = [];
  const renderer: StatHintRenderer = {
    render: (model: StatHintModel, _container: HTMLElement) => { models.push(model); },
  };
  return { renderer, models };
}

function makeProvider(fittingDb: FittingDb = makeFittingDb()): { provider: AmmoHintProviderImpl; models: StatHintModel[] } {
  const { renderer, models } = makeRenderer();
  const i18n = { current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key: string) => key), translateDocument: vi.fn() };
  const provider = new AmmoHintProviderImpl({ fittingDb, i18n, statHintRenderer: renderer });
  return { provider, models };
}

describe("AmmoHintProviderImpl", () => {
  test("renders nothing when anchor has no data-value", () => {
    const { provider, models } = makeProvider();
    provider.render(fakeAnchor(null), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("renders nothing when id is not in charges or missiles", () => {
    const { provider, models } = makeProvider();
    provider.render(fakeAnchor("unknown"), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("builds charge model with total, damage types and range attribute", () => {
    const { provider, models } = makeProvider();
    provider.render(fakeAnchor("185"), {} as HTMLElement);
    expect(models.length).toBe(1);
    const model = models[0];
    expect(model.sections.length).toBe(2);
    const damage = model.sections[0];
    expect(damage.heading).toBe("dpsHint.damage");
    expect(damage.rows[0]).toEqual({ label: "ammoHint.total", value: "12", emphasis: true });
    expect(damage.rows[1]).toEqual({ label: "dpsHint.damageType.em", iconUrl: DAMAGE_EM_URL, value: "9" });
    expect(damage.rows[2]).toEqual({ label: "dpsHint.damageType.kinetic", iconUrl: DAMAGE_KINETIC_URL, value: "1" });
    expect(damage.rows[3]).toEqual({ label: "dpsHint.damageType.explosive", iconUrl: DAMAGE_EXPLOSIVE_URL, value: "2" });
    const attributes = model.sections[1];
    expect(attributes.heading).toBeUndefined();
    expect(attributes.rows).toEqual([{ label: "ammoHint.range", value: "x0.5" }]);
  });

  test("builds missile model with single damage type and missile attributes", () => {
    const { provider, models } = makeProvider();
    provider.render(fakeAnchor("202"), {} as HTMLElement);
    expect(models.length).toBe(1);
    const model = models[0];
    expect(model.sections.length).toBe(2);
    const damage = model.sections[0];
    expect(damage.rows.length).toBe(2);
    expect(damage.rows[0]).toEqual({ label: "ammoHint.total", value: "375", emphasis: true });
    expect(damage.rows[1]).toEqual({ label: "dpsHint.damageType.em", iconUrl: DAMAGE_EM_URL, value: "375" });
    const attributes = model.sections[1];
    expect(attributes.rows).toEqual([
      { label: "ammoHint.explosionRadius", value: "330" },
      { label: "ammoHint.explosionVelocity", value: "69" },
      { label: "ammoHint.missileVelocity", value: "4700" },
      { label: "ammoHint.flightTime", value: "14unit.second" },
    ]);
  });

  test("omits the attribute section when charge has default multipliers", () => {
    const db = {
      charges: { "9": { id: "9" as never, name: "Fusion S", emDamage: 0, thermalDamage: 0, kineticDamage: 2, explosiveDamage: 8 } },
    } as unknown as FittingDb;
    const { provider, models } = makeProvider(db);
    provider.render(fakeAnchor("9"), {} as HTMLElement);
    expect(models.length).toBe(1);
    expect(models[0].sections.length).toBe(1);
  });
});

const DAMAGE_EM_URL = "images/icons/damage-em.png";
const DAMAGE_KINETIC_URL = "images/icons/damage-kinetic.png";
const DAMAGE_EXPLOSIVE_URL = "images/icons/damage-explosive.png";
