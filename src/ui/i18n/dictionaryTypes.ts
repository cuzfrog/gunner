import type { Language } from "../../appstate";

export type { Language };
export type Dictionary = Readonly<Record<string, Readonly<Record<Language, string>>>>;
export type LanguageSlice<L extends Language> = Readonly<Record<string, Readonly<Record<L, string>>>>;
