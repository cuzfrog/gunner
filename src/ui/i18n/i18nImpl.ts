import { I18N_DICTIONARY } from "./dictionary";
import type { Language } from "./dictionaryTypes";

export interface I18n {
  current(): Language;
  setLanguage(language: Language): void;
  t(key: string): string;
  translateDocument(): void;
}

export class I18nImpl implements I18n {
  private readonly document: Document;
  private language: Language;

  constructor() {
    this.language = "en";
    this.document = globalThis.document;
    this.document.documentElement.lang = this.language;
  }

  current(): Language {
    return this.language;
  }

  setLanguage(language: Language): void {
    this.language = language;
    this.document.documentElement.lang = this.language;
  }

  t(key: string): string {
    const entry = I18N_DICTIONARY[key];
    if (!entry) return key;
    return entry[this.language];
  }

  translateDocument(): void {
    for (const element of this.document.querySelectorAll("[data-i18n]")) {
      const key = element.getAttribute("data-i18n");
      if (key) setText(element, this.t(key));
    }
    for (const element of this.document.querySelectorAll("[data-i18n-placeholder]")) {
      const key = element.getAttribute("data-i18n-placeholder");
      if (key) (element as HTMLInputElement).placeholder = this.t(key);
    }
    for (const element of this.document.querySelectorAll("[data-i18n-aria-label]")) {
      const key = element.getAttribute("data-i18n-aria-label");
      if (key) element.setAttribute("aria-label", this.t(key));
    }
    for (const element of this.document.querySelectorAll("[data-i18n-title]")) {
      const key = element.getAttribute("data-i18n-title");
      if (key) (element as HTMLElement).title = this.t(key);
    }
  }
}

function setText(element: Element, text: string): void {
  element.textContent = text;
}
