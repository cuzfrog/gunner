import { fakeDocument } from "../../testing";
import type { EngineView } from "../../../sim";
import type { ViewStream } from "../../viewStream";
import type { I18n, Language } from "../../i18n";
import type { ItemNameCatalog } from "../../../gamedata";
import type { StatHintModel, StatHintRenderer } from "../statHint";
import { toTypeId } from "../../../gamedata/ids";
import { PortraitEffectHintProviderImpl } from "./portraitEffectHintProvider";

function buildView(overrides: Partial<EngineView>): EngineView {
  return {
    weaponAttacks: { shipA: [], shipB: [] },
    incomingOffensiveModules: { shipA: [], shipB: [] },
    drones: { shipA: [], shipB: [] },
    droneSpecs: { shipA: [], shipB: [] },
    ...overrides,
  } as unknown as EngineView;
}

function createAnchor(attributes: Readonly<Record<string, string>>): HTMLElement {
  const document = fakeDocument();
  const anchor = document.createElement("div");
  for (const [name, value] of Object.entries(attributes)) anchor.setAttribute(name, value);
  return anchor as unknown as HTMLElement;
}

function buildProvider(view: EngineView | undefined) {
  const document = fakeDocument();
  globalThis.document = document;
  const container = document.createElement("div");
  const viewStream = vi.mocked<ViewStream>({
    connect: vi.fn(),
    onViewUpdated: vi.fn(),
    offViewUpdated: vi.fn(),
    currentView: vi.fn(() => view),
  });
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
    translateDocument: vi.fn(),
  });
  const itemNameCatalog = vi.mocked<ItemNameCatalog>({
    nameForId: vi.fn((id) => `name-${id}`),
  });
  const models: StatHintModel[] = [];
  const renderer = vi.mocked<StatHintRenderer>({
    render: vi.fn((model: StatHintModel) => models.push(model)),
  });
  const provider = new PortraitEffectHintProviderImpl({ viewStream, i18n, statHintRenderer: renderer, itemNameCatalog });
  return { provider, container, models, renderer, viewStream, i18n };
}

const MODULE_ID = toTypeId("100");

describe("PortraitEffectHintProviderImpl", () => {
  test("turret weapon icon shows applied and nominal DPS with application", () => {
    const view = buildView({
      weaponAttacks: { shipA: [{ weapon: { kind: "turret", moduleId: MODULE_ID }, assessment: { damage: { nominalDps: 200, appliedDps: 150 } } }], shipB: [] },
    } as unknown as EngineView);
    const { provider, container, models } = buildProvider(view);
    provider.render(createAnchor({ "data-hint-content": "portraitEffect", "data-side": "shipB", "data-effect-kind": "weapon", "data-weapon-kind": "turret", "data-module-id": "100" }), container);
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe("name-100");
    expect(models[0].subtitle).toBe("portrait.weapon.turret");
    expect(models[0].sections[0].rows).toEqual([
      { label: "appliedDpsHint.applied", value: "150.0 DPS", emphasis: true },
      { label: "appliedDpsHint.nominal", value: "200.0 DPS" },
      { label: "appliedDpsHint.application", value: "75%" },
    ]);
  });

  test("weapon icon under a portrait reads the opponent's attacks, not the portrait's own", () => {
    const view = buildView({
      weaponAttacks: { shipA: [{ weapon: { kind: "turret", moduleId: MODULE_ID }, assessment: { damage: { nominalDps: 10, appliedDps: 5 } } }], shipB: [{ weapon: { kind: "turret", moduleId: MODULE_ID }, assessment: { damage: { nominalDps: 200, appliedDps: 150 } } }] },
    } as unknown as EngineView);
    const { provider, container, models } = buildProvider(view);
    provider.render(createAnchor({ "data-side": "shipA", "data-effect-kind": "weapon", "data-weapon-kind": "turret", "data-module-id": "100" }), container);
    expect(models[0].sections[0].rows[0]).toEqual({ label: "appliedDpsHint.applied", value: "150.0 DPS", emphasis: true });
  });

  test("drone weapon icon sums its groups and shows the active drone count", () => {
    const droneModuleId = toTypeId("2454");
    const view = buildView({
      weaponAttacks: { shipA: [
        { weapon: { kind: "drone", moduleId: droneModuleId }, assessment: { damage: { nominalDps: 60, appliedDps: 30 } } },
        { weapon: { kind: "drone", moduleId: toTypeId("999") }, assessment: { damage: { nominalDps: 500, appliedDps: 500 } } },
      ], shipB: [] },
      drones: { shipA: [{ aliveCount: 2 }, { aliveCount: 9 }], shipB: [] },
      droneSpecs: { shipA: [{ kind: "drone", moduleId: droneModuleId, droneCount: 5 }, { kind: "drone", moduleId: toTypeId("999"), droneCount: 10 }], shipB: [] },
    } as unknown as EngineView);
    const { provider, container, models } = buildProvider(view);
    provider.render(createAnchor({ "data-side": "shipB", "data-effect-kind": "weapon", "data-weapon-kind": "drone", "data-module-id": "2454" }), container);
    expect(models).toHaveLength(1);
    expect(models[0].subtitle).toBe("portrait.weapon.drone");
    expect(models[0].sections[0].rows).toEqual([
      { label: "appliedDpsHint.applied", value: "30.0 DPS", emphasis: true },
      { label: "appliedDpsHint.nominal", value: "60.0 DPS" },
      { label: "appliedDpsHint.application", value: "50%" },
      { label: "portraitEffect.activeDrones", value: "2/5" },
    ]);
  });

  test("ewar icon shows the effect text as a statement row", () => {
    const view = buildView({
      incomingOffensiveModules: { shipA: [{ category: "ewar", family: "web", moduleId: MODULE_ID, speedMultiplier: 0.4 }], shipB: [] },
    } as unknown as EngineView);
    const { provider, container, models } = buildProvider(view);
    provider.render(createAnchor({ "data-side": "shipA", "data-effect-kind": "ewar", "data-ewar-family": "web", "data-module-id": "100" }), container);
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe("name-100");
    expect(models[0].sections[0].rows).toEqual([{ value: "ewar.hover.web 60%", statement: true }]);
  });

  test("repairer icon shows layer, repair per second and per cycle", () => {
    const view = buildView({
      defenseRuntime: { repairers: { shipA: [{ layer: "armor", hpPerSecond: 61.25, hpPerCycle: 245 }], shipB: [] } },
    } as unknown as EngineView);
    const { provider, container, models } = buildProvider(view);
    provider.render(createAnchor({ "data-side": "shipA", "data-effect-kind": "repairer", "data-repairer-index": "0", "data-module-id": "100" }), container);
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe("name-100");
    expect(models[0].subtitle).toBe("defense.layer.armor");
    expect(models[0].sections[0].rows).toEqual([
      { label: "defense.repairPerSecond", value: "61.3" },
      { label: "portraitEffect.repairPerCycle", value: "245.0" },
    ]);
  });

  test("RAH icon shows current adaptive resists", () => {
    const view = buildView({
      defenseRuntime: { rah: { shipA: { resists: { em: 0.675, thermal: 0.5, kinetic: 0.3, explosive: 0.1 } }, shipB: undefined } },
    } as unknown as EngineView);
    const { provider, container, models } = buildProvider(view);
    provider.render(createAnchor({ "data-side": "shipA", "data-effect-kind": "rah", "data-module-id": "100" }), container);
    expect(models).toHaveLength(1);
    expect(models[0].subtitle).toBe("defense.rah");
    expect(models[0].sections[0].heading).toBe("defense.resists");
    expect(models[0].sections[0].rows).toEqual([
      { label: "dpsHint.damageType.em", value: "68%" },
      { label: "dpsHint.damageType.thermal", value: "50%" },
      { label: "dpsHint.damageType.kinetic", value: "30%" },
      { label: "dpsHint.damageType.explosive", value: "10%" },
    ]);
  });

  test("renders nothing when the view is missing", () => {
    const { provider, container, renderer } = buildProvider(undefined);
    provider.render(createAnchor({ "data-side": "shipA", "data-effect-kind": "rah", "data-module-id": "100" }), container);
    expect(renderer.render).not.toHaveBeenCalled();
  });

  test("renders nothing for an unknown effect kind or missing attributes", () => {
    const view = buildView({});
    const { provider, container, renderer } = buildProvider(view);
    provider.render(createAnchor({ "data-side": "shipA", "data-effect-kind": "unknown", "data-module-id": "100" }), container);
    provider.render(createAnchor({ "data-effect-kind": "rah", "data-module-id": "100" }), container);
    provider.render(createAnchor({ "data-side": "shipA", "data-effect-kind": "rah" }), container);
    expect(renderer.render).not.toHaveBeenCalled();
  });

  test("renders nothing when the weapon module has no attacks in the view", () => {
    const view = buildView({});
    const { provider, container, renderer } = buildProvider(view);
    provider.render(createAnchor({ "data-side": "shipA", "data-effect-kind": "weapon", "data-weapon-kind": "turret", "data-module-id": "100" }), container);
    expect(renderer.render).not.toHaveBeenCalled();
  });
});
