---
no-new-exports:
  - i18nImpl.ts
  - messages/hintMessages.ts
  - messages/loreMessages.ts
  - module.ts
  - dictionary-ja.ts
  - dictionary.ts
  - dictionary-en.ts
  - i18n.test.ts
  - dictionary-zh.ts
  - index.ts
  - dictionaryTypes.ts
---


# i18n

Text translation, language state, and localized hint/lore content data. The public surface is `Language`, `I18n`, `I18N_DICTIONARY`, `SlideText`, `HINT_CANDIDATES`, `TIP_TEXT`, `LORES`, and `registerI18nModule`. `I18nImpl` is registered by `module.ts` under the key `i18n`. The `messages/` data files are consumed by the `hints` rotator.
Gate note (drone/fighter bay UI): dictionaries gained the drone/fighter bay/launch keys (`drone.bayTitle`, `drone.launched`, `drone.launchAll`, `drone.recallAll`, stepper aria-labels, and the fighter set) and lost the replaced `drone.activeLoadout`/`drone.count`/`fighter.activeLoadout`/`fighter.count` keys. Body changes only.
