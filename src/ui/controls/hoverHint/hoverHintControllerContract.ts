import type { HintContentProvider } from "./hintContentProvider";

export interface HoverHintController {
  registerContentProvider(key: string, provider: HintContentProvider): void;
  refresh(): void;
  dispose(): void;
}
