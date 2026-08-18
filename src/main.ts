import { asValue } from "awilix";
import { registerAppModule } from "./app";
import { container } from "./container";
import { registerSimModule } from "./sim";
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
      replace: (url: string) => window.history.replaceState(null, "", url),
    }),
    clipboard: asValue(window.navigator.clipboard),
  });
  registerUiModule(container);
  registerSimModule(container);
  container.register({ simConfig: asValue(container.cradle.controls.getConfig()) });
  registerAppModule(container);

  container.cradle.app.start();
}

main();
