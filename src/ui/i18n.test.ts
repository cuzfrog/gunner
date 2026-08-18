import { I18nImpl, type Language } from "./i18n";

class FakeElement {
  private _text = "";
  private _attributes = new Map<string, string>();

  getAttribute(name: string): string | null {
    return this._attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this._attributes.set(name, value);
  }

  get textContent(): string {
    return this._text;
  }

  set textContent(value: string) {
    this._text = value;
  }
}

function fakeDocument(): Document {
  const docEl = { lang: "en" as string };
  const elements: FakeElement[] = [];
  return {
    documentElement: docEl as unknown as HTMLElement,
    querySelectorAll: () => elements as unknown as NodeListOf<Element>,
  } as unknown as Document;
}

describe("I18nImpl", () => {
  test("translates known keys", () => {
    const i18n = new I18nImpl("en", fakeDocument());
    expect(i18n.t("label.trackingSpeed")).toBe("Tracking speed");
  });

  test("returns the key when it is not in the dictionary", () => {
    const i18n = new I18nImpl("en", fakeDocument());
    expect(i18n.t("unknown.key")).toBe("unknown.key");
  });

  test("switches to Chinese", () => {
    const i18n = new I18nImpl("en", fakeDocument());
    i18n.setLanguage("zh" as Language);
    expect(i18n.current()).toBe("zh" as Language);
    expect(i18n.t("label.trackingSpeed")).toBe("跟踪速度");
  });

  test("switches to Japanese", () => {
    const i18n = new I18nImpl("en", fakeDocument());
    i18n.setLanguage("ja" as Language);
    expect(i18n.t("label.trackingSpeed")).toBe("追跡速度");
  });

  test("uses full language names in every language", () => {
    const i18n = new I18nImpl("en", fakeDocument());
    expect(i18n.t("lang.en")).toBe("English");
    expect(i18n.t("lang.zh")).toBe("中文");
    expect(i18n.t("lang.ja")).toBe("日本語");
  });
});
