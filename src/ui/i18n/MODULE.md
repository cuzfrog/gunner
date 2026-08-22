---
no-new-exports:
  - index.ts
---

# i18n

Text translation and language state.

The public surface is `Language`, `I18n`, and `I18N_DICTIONARY`. `I18nImpl` is exposed through the module index only so `src/ui/module.ts` can register it.
