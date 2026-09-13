import type { ClipboardProvider } from "../../../appstate";
import { FakeElement, fakeDocument, getFake } from "../testSupport";
import type { ExportController, FittingExportSource } from "./exportControllerContract";
import { ExportControllerImpl } from "./exportController";

const FITTING_A = "[Rifter, tackle]\nWarp Disruptor II";
const FITTING_B = "[Merlin, brawler]\nStasis Webifier II";

interface ExportOverrides {
  readonly clipboard?: Partial<ClipboardProvider>;
  readonly shipAFittingText?: string;
  readonly shipBFittingText?: string;
}

function makeSource(fittingText: string | undefined, showImportHint: () => void): FittingExportSource {
  return { fittingText, sections: { paste: { showImportHint } } };
}

function buildExportController(overrides: ExportOverrides = {}) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;

  const clipboard = vi.mocked<ClipboardProvider>({
    readText: vi.fn(async () => ""),
    writeText: vi.fn(async () => {}),
    ...overrides.clipboard,
  });

  const shipAHint = vi.fn();
  const shipBHint = vi.fn();
  const shipASide = makeSource(overrides.shipAFittingText, shipAHint);
  const shipBSide = makeSource(overrides.shipBFittingText, shipBHint);

  const controller = new ExportControllerImpl({ clipboard, shipASide, shipBSide });
  return { controller, clipboard, shipASide, shipBSide, shipAHint, shipBHint };
}

describe("ExportController", () => {
  test("copyFitting writes the shipA fitting text to the clipboard and shows copied", async () => {
    const { controller, clipboard, shipAHint } = buildExportController({ shipAFittingText: FITTING_A });
    await controller.copyFitting("shipA");
    expect(clipboard.writeText).toHaveBeenCalledWith(FITTING_A);
    expect(shipAHint).toHaveBeenCalledWith("status.copied");
  });

  test("copyFitting uses the target side source for shipB", async () => {
    const { controller, clipboard, shipAHint, shipBHint } = buildExportController({
      shipAFittingText: FITTING_A,
      shipBFittingText: FITTING_B,
    });
    await controller.copyFitting("shipB");
    expect(clipboard.writeText).toHaveBeenCalledWith(FITTING_B);
    expect(shipBHint).toHaveBeenCalledWith("status.copied");
    expect(shipAHint).not.toHaveBeenCalled();
  });

  test("copyFitting is a no-op without a fitting", async () => {
    const { controller, clipboard, shipAHint } = buildExportController({});
    await controller.copyFitting("shipA");
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(shipAHint).not.toHaveBeenCalled();
  });

  test("clipboard failure shows the failed hint", async () => {
    const { controller, shipAHint } = buildExportController({
      shipAFittingText: FITTING_A,
      clipboard: { writeText: vi.fn(async () => { throw new Error("denied"); }) },
    });
    await controller.copyFitting("shipA");
    expect(shipAHint).toHaveBeenCalledWith("status.failed", true);
  });
});
