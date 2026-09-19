import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import type { createControlsEls } from "../elements";
import type { Side } from "../side";
import { FighterControllerImpl } from "./fighterController";
import type { FighterController, FighterEls } from "./fighterControllerContract";

export type { FighterController } from "./fighterControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerFighterModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipAFighterController: asFunction((deps: ControlsCradle) => createFighterController("shipA", deps)).singleton(),
    shipBFighterController: asFunction((deps: ControlsCradle) => createFighterController("shipB", deps)).singleton(),
    fighterControllers: asFunction(({ shipAFighterController, shipBFighterController }): Record<Side, FighterController> => ({
      shipA: shipAFighterController,
      shipB: shipBFighterController,
    })).singleton(),
  });
}

function createFighterController(side: Side, deps: ControlsCradle): FighterControllerImpl {
  return new FighterControllerImpl({
    side,
    els: collectFighterEls(deps.els, side),
    fittingImport: deps.fittingImport,
    fighterCatalog: deps.fighterCatalog,
    fighterLoadoutResolver: deps.fighterLoadoutResolver,
    fighterLoadoutValidator: deps.fighterLoadoutValidator,
    imageCatalog: deps.imageCatalog,
    i18n: deps.i18n,
    events: deps.uiEvents,
    popupGroup: deps.popupGroup,
  });
}

function collectFighterEls(els: ControlsElements, side: Side): FighterEls {
  const s = els[side];
  return {
    trigger: s.fighterTrigger,
    summary: s.fighterSummary,
    summaryIcon: s.fighterSummaryIcon,
    popup: s.fighterPopup,
    field: s.fighterField,
    optimal: s.fighterOptimal,
    falloff: s.fighterFalloff,
    damage: s.fighterDamage,
    cycleTime: s.fighterCycleTime,
    maxVelocity: s.fighterMaxVelocity,
    count: s.fighterCount,
    loadoutSection: s.fighterLoadoutSection,
    loadoutList: s.fighterLoadoutList,
    summaryBar: s.fighterSummaryBar,
    summarySquadrons: s.fighterSummarySquadrons,
    summaryCount: s.fighterSummaryCount,
    summaryHangar: s.fighterSummaryHangar,
    catalogSection: s.fighterCatalogSection,
    catalogLight: s.fighterCatalogLight,
    catalogHeavy: s.fighterCatalogHeavy,
    catalogSupport: s.fighterCatalogSupport,
  };
}
