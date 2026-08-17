import { asValue } from "awilix";
import { registerAppModule } from "./app";
import { container } from "./container";
import { registerSimModule } from "./sim";
import { registerUiModule } from "./ui";

function main(): void {
  const canvas = document.getElementById("scene");
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas element not found");

  container.register({ canvas: asValue(canvas) });
  registerSimModule(container);
  registerUiModule(container);
  container.register({ simConfig: asValue(container.cradle.controls.getConfig()) });
  registerSimModule(container);
  registerAppModule(container);

  container.cradle.app.start();
}

main();
