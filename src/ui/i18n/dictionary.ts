import { EN } from "./dictionary-en";
import { JA } from "./dictionary-ja";
import { ZH } from "./dictionary-zh";
import type { Dictionary, Language, LanguageSlice } from "./dictionaryTypes";

function mergeDictionaries(en: LanguageSlice<"en">, zh: LanguageSlice<"zh">, ja: LanguageSlice<"ja">): Dictionary {
  const merged: Record<string, Record<Language, string>> = {};
  for (const key of Object.keys(en)) {
    const english = en[key];
    const chinese = zh[key];
    const japanese = ja[key];
    if (english && chinese && japanese) {
      merged[key] = { en: english.en, zh: chinese.zh, ja: japanese.ja };
    }
  }
  return merged;
}

export const I18N_DICTIONARY: Dictionary = mergeDictionaries(EN, ZH, JA);
