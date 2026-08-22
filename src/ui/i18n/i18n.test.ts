import { I18nImpl } from "./i18nImpl";
import type { Language } from "./dictionaryTypes";

class FakeElement {
  private _text = "";
  private _title = "";
  private _placeholder = "";
  private _attributes = new Map<string, string>();

  getAttribute(name: string): string | null {
    return this._attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this._attributes.set(name, value);
    if (name === "title") this._title = value;
    if (name === "placeholder") this._placeholder = value;
  }

  get textContent(): string {
    return this._text;
  }

  set textContent(value: string) {
    this._text = value;
  }

  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
  }

  get placeholder(): string {
    return this._placeholder;
  }

  set placeholder(value: string) {
    this._placeholder = value;
  }
}

function fakeDocument(elements: FakeElement[] = []): Document {
  const docEl = { lang: "en" as string };
  return {
    documentElement: docEl as unknown as HTMLElement,
    querySelectorAll: () => elements as unknown as NodeListOf<Element>,
  } as unknown as Document;
}

let originalDocument: Document | undefined;

describe("I18nImpl", () => {
  beforeEach(() => {
    originalDocument = globalThis.document;
    globalThis.document = fakeDocument() as unknown as Document;
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      globalThis.document = originalDocument;
    }
  });

  test("translates known keys", () => {
    const i18n = new I18nImpl();
    expect(i18n.t("label.trackingSpeed")).toBe("Tracking speed");
    expect(i18n.t("button.play")).toBe("Start");
  });

  test("translates the midships mode label in every language", () => {
    const i18n = new I18nImpl();
    expect(i18n.t("mode.midships")).toBe("Midships");
    i18n.setLanguage("zh");
    expect(i18n.t("mode.midships")).toBe("正舵");
    i18n.setLanguage("ja");
    expect(i18n.t("mode.midships")).toBe("正舵");
  });

  test("returns the key when it is not in the dictionary", () => {
    const i18n = new I18nImpl();
    expect(i18n.t("unknown.key")).toBe("unknown.key");
  });

  test("switches to Chinese", () => {
    const i18n = new I18nImpl();
    i18n.setLanguage("zh" as Language);
    expect(i18n.current()).toBe("zh" as Language);
    expect(i18n.t("label.trackingSpeed")).toBe("跟踪速度");
  });

  test("switches to Japanese", () => {
    const i18n = new I18nImpl();
    i18n.setLanguage("ja" as Language);
    expect(i18n.t("label.trackingSpeed")).toBe("追跡速度");
  });

  test("uses full language names in every language", () => {
    const i18n = new I18nImpl();
    expect(i18n.t("lang.en")).toBe("English");
    expect(i18n.t("lang.zh")).toBe("中文");
    expect(i18n.t("lang.ja")).toBe("日本語");
  });

  test("translates maneuver aggressivity label and hint in every language", () => {
    const i18n = new I18nImpl();
    expect(i18n.t("label.maneuverAggressivity")).toBe("Maneuver aggressivity");
    expect(i18n.t("hint.maneuverAggressivity")).toContain("aggressively");
    i18n.setLanguage("zh" as Language);
    expect(i18n.t("label.maneuverAggressivity")).toBe("机动激进程度");
    expect(i18n.t("hint.maneuverAggressivity")).toContain("机动");
    i18n.setLanguage("ja" as Language);
    expect(i18n.t("label.maneuverAggressivity")).toBe("機動の積極さ");
    expect(i18n.t("hint.maneuverAggressivity")).toContain("機動");
  });

  test("translates the initial distance hint in every language", () => {
    const i18n = new I18nImpl();
    expect(i18n.t("hint.initialDistance")).toContain("reset");
    i18n.setLanguage("zh" as Language);
    expect(i18n.t("hint.initialDistance")).toContain("重置");
    i18n.setLanguage("ja" as Language);
    expect(i18n.t("hint.initialDistance")).toContain("リセット");
  });

  test("translateDocument sets text, placeholder, aria-label and title from data attributes", () => {
    const label = new FakeElement();
    label.setAttribute("data-i18n", "label.overload");
    const input = new FakeElement();
    input.setAttribute("data-i18n-placeholder", "hint.hullSearch");
    const group = new FakeElement();
    group.setAttribute("data-i18n-aria-label", "label.propulsion");
    const button = new FakeElement();
    button.setAttribute("data-i18n-title", "label.overload");
    globalThis.document = fakeDocument([label, input, group, button]) as unknown as Document;

    const i18n = new I18nImpl();
    i18n.translateDocument();

    expect(label.textContent).toBe("Overload");
    expect(input.placeholder).toBe("Type ship name…");
    expect(group.getAttribute("aria-label")).toBe("Propulsion");
    expect(button.title).toBe("Overload");
  });
});
