import { HINT_CANDIDATES, LORES, TIP_TEXT, type I18n, type Language } from "../../i18n";
import { UiEventsImpl } from "../../events";
import { HintRotatorImpl, type HintRotator } from "./hintRotator";
import type { IntervalId, TimeoutId, Timer } from "../../timer";

class FakeElement {
  textContent = "";
  hidden = false;
  offsetHeight = 10;
  style: Record<string, string> = {};
  classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() };
}

class ManualTimer implements Timer {
  private timeout?: { callback: () => void; id: number };
  private interval?: { callback: () => void; id: number };
  private nextId = 1;

  setTimeout(callback: () => void, _ms: number): TimeoutId {
    const id = this.nextId++;
    this.timeout = { callback, id };
    return id;
  }

  clearTimeout(): void {
    this.timeout = undefined;
  }

  setInterval(callback: () => void, _ms: number): IntervalId {
    const id = this.nextId++;
    this.interval = { callback, id };
    return id;
  }

  clearInterval(): void {
    this.interval = undefined;
  }

  runTimeout(): void {
    this.timeout?.callback();
  }

  runInterval(): void {
    this.interval?.callback();
  }
}

function fakeI18n(language: Language = "en"): I18n {
  let current = language;
  return {
    current: () => current,
    setLanguage: (l: Language) => {
      current = l;
    },
    t: (key: string) => key,
    translateDocument: () => {},
  } as unknown as I18n;
}

function createRotator(element: HTMLElement, timer: Timer, language: Language = "en"): HintRotator {
  return new HintRotatorImpl({
    element, i18n: fakeI18n(language), candidates: HINT_CANDIDATES, tipText: TIP_TEXT, lores: LORES, timer, events: new UiEventsImpl(),
  });
}

describe("HintRotator", () => {
  test("initially renders first hint with prefix in current language", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    createRotator(element, timer);
    expect(element.textContent).toBe("hint.prefix You can import a ship fitting from clipboard.");
    expect(element.classList.add).toHaveBeenCalledWith("hints-slide-is-hint");
  });

  test("refresh updates text when language changes", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const i18n = fakeI18n("en");
    const timer = new ManualTimer();
    const rotator = new HintRotatorImpl({
      element, i18n, candidates: HINT_CANDIDATES, tipText: TIP_TEXT, lores: LORES, timer, events: new UiEventsImpl(),
    });
    i18n.setLanguage("zh");
    rotator.refresh();
    expect(element.textContent).toBe("hint.prefix 你可以从剪贴板导入舰船装配。");
  });

  test("showNext advances from hint to tip to two lores and back to hint", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const rotator = createRotator(element, timer);
    const tip = "If you like this tool, may consider tip me in the game, thank you!";
    const expected = [
      { text: tip, cls: "hints-slide-is-tip" },
      { text: `hint.prefix ${LORES[0].text.en}`, cls: "hints-slide-is-lore" },
      { text: `hint.prefix ${LORES[1].text.en}`, cls: "hints-slide-is-lore" },
      { text: `hint.prefix ${HINT_CANDIDATES[1].text.en}`, cls: "hints-slide-is-hint" },
    ];
    for (const { text, cls } of expected) {
      rotator.showNext();
      expect(element.classList.remove).toHaveBeenLastCalledWith("is-active-hint");
      expect(element.classList.add).toHaveBeenLastCalledWith("is-exiting");
      timer.runTimeout();
      expect(element.textContent).toBe(text);
      expect(element.classList.add).toHaveBeenCalledWith(cls);
      expect(element.classList.add).toHaveBeenLastCalledWith("is-active-hint");
    }
  });

  test("showNext cycles through the full hint-tip-lore-lore pattern", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const rotator = createRotator(element, timer);
    const tip = "If you like this tool, may consider tip me in the game, thank you!";
    const total = 4 * Math.max(HINT_CANDIDATES.length, Math.ceil(LORES.length / 2));
    let hintIndex = 0;
    for (let i = 1; i < total; i++) {
      const slot = i % 4;
      rotator.showNext();
      expect(element.classList.add).toHaveBeenLastCalledWith("is-exiting");
      timer.runTimeout();
      if (slot === 0) {
        hintIndex = (hintIndex + 1) % HINT_CANDIDATES.length;
        expect(element.textContent).toBe(`hint.prefix ${HINT_CANDIDATES[hintIndex].text.en}`);
        expect(element.classList.add).toHaveBeenCalledWith("hints-slide-is-hint");
      } else if (slot === 1) {
        expect(element.textContent).toBe(tip);
        expect(element.classList.add).toHaveBeenCalledWith("hints-slide-is-tip");
      } else {
        const lore = LORES[(Math.floor(i / 4) * 2 + (slot - 2)) % LORES.length];
        expect(element.textContent).toBe(`hint.prefix ${lore.text.en}`);
        expect(element.classList.add).toHaveBeenCalledWith("hints-slide-is-lore");
      }
      expect(element.classList.add).toHaveBeenLastCalledWith("is-active-hint");
    }
  });

  test("interval schedules showNext", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    createRotator(element, timer);
    expect(element.textContent).toBe("hint.prefix You can import a ship fitting from clipboard.");
    timer.runInterval();
    timer.runTimeout();
    expect(element.textContent).toBe("If you like this tool, may consider tip me in the game, thank you!");
  });

  test("stop cancels the interval", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const rotator = createRotator(element, timer);
    rotator.stop();
    timer.runInterval();
    expect(element.textContent).toBe("hint.prefix You can import a ship fitting from clipboard.");
  });

  test("showNext applies and removes state classes in sequence", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const rotator = createRotator(element, timer);
    rotator.showNext();
    expect(element.classList.remove).toHaveBeenCalledWith("is-active-hint");
    expect(element.classList.add).toHaveBeenLastCalledWith("is-exiting");
    timer.runTimeout();
    expect(element.classList.remove).toHaveBeenCalledWith("hints-slide-is-hint", "hints-slide-is-tip", "hints-slide-is-lore");
    expect(element.classList.add).toHaveBeenCalledWith("is-entering");
    expect(element.classList.remove).toHaveBeenCalledWith("is-exiting");
    expect(element.classList.remove).toHaveBeenLastCalledWith("is-entering");
    expect(element.classList.add).toHaveBeenLastCalledWith("is-active-hint");
  });

  test("refresh updates tip text when current slide is a tip", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const i18n = fakeI18n("en");
    const timer = new ManualTimer();
    const rotator = new HintRotatorImpl({
      element, i18n, candidates: HINT_CANDIDATES, tipText: TIP_TEXT, lores: LORES, timer, events: new UiEventsImpl(),
    });
    rotator.showNext();
    timer.runTimeout();
    i18n.setLanguage("zh");
    rotator.refresh();
    expect(element.textContent).toBe("如果喜欢这个工具，可以在游戏中打赏我，谢谢！");
  });

  test("refresh updates lore text when current slide is a lore", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const i18n = fakeI18n("en");
    const timer = new ManualTimer();
    const rotator = new HintRotatorImpl({
      element, i18n, candidates: HINT_CANDIDATES, tipText: TIP_TEXT, lores: LORES, timer, events: new UiEventsImpl(),
    });
    rotator.showNext();
    timer.runTimeout();
    rotator.showNext();
    timer.runTimeout();
    i18n.setLanguage("zh");
    rotator.refresh();
    expect(element.textContent).toBe(`hint.prefix ${LORES[0].text.zh}`);
  });

  test("language changed refreshes the current slide", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const i18n = fakeI18n("en");
    const timer = new ManualTimer();
    const events = new UiEventsImpl();
    new HintRotatorImpl({
      element, i18n, candidates: HINT_CANDIDATES, tipText: TIP_TEXT, lores: LORES, timer, events,
    });
    i18n.setLanguage("zh");
    events.emitLanguageChanged();
    expect(element.textContent).toBe("hint.prefix 你可以从剪贴板导入舰船装配。");
  });
});
