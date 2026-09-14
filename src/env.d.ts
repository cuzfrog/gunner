/// <reference types="astro/client" />

declare module "*.astro" {
  import type { AstroComponentFactory } from "astro/runtime/server/render/astro/factory";

  const component: AstroComponentFactory;
  export default component;
}
