import { asValue } from "awilix";
import { registerAppModule } from "./app";
import { container } from "./container";
import { registerGameDataModule } from "./gamedata";
import { registerFittingModule } from "./fitting";
import { registerShipsModule } from "./ships";
import { registerSimModule } from "./sim";
import { ClipboardUnavailableError } from "./appstate";
import { registerUiModule } from "./ui";

function main(): void {
  const canvas = document.getElementById("scene");
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas element not found");

  container.register({ canvas: asValue(canvas) });
  container.register({
    storage: asValue(localStorage),
    location: asValue({
      get href() {
        return window.location.href;
      },
    }),
    navigatorLanguage: asValue(window.navigator.language),
    clipboard: asValue({
      readText: readClipboardText,
      writeText: (text: string) => window.navigator.clipboard.writeText(text),
    }),
    now: asValue(() => performance.now()),
  });
  registerGameDataModule(container);
  registerShipsModule(container);
  registerFittingModule(container);
  // sim before ui: controls wiring resolves sessionCodec eagerly, which needs hitChance.
  registerSimModule(container);
  registerUiModule(container);
  container.register({ simConfig: asValue(container.cradle.controls.getConfig()) });
  registerAppModule(container);

  container.cradle.app.start();
}

main();

async function readClipboardText(): Promise<string> {
  try {
    if (window.navigator.clipboard?.readText) {
      return await window.navigator.clipboard.readText();
    }
  } catch {
    // Fall through to ClipboardUnavailableError.
  }
  throw new ClipboardUnavailableError();
}
