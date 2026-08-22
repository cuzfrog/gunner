import type { SlideText } from "./hintMessages";
import { LORES_A } from "./loreMessagesA";
import { LORES_B } from "./loreMessagesB";

export const LORES: readonly SlideText[] = [...LORES_A, ...LORES_B] as const;
