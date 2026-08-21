import type { I18n, Language } from "./i18n";
import { HintRotator } from "./hintRotator";
import { HINT_CANDIDATES } from "./hints";
import type { IntervalId, TimeoutId, Timer } from "./timer";

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
  return new HintRotator({ element, i18n: fakeI18n(language), candidates: HINT_CANDIDATES, timer });
}

describe("HintRotator", () => {
  test("initially renders first active hint with prefix in current language", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    createRotator(element, timer);
    expect(element.textContent).toBe("hint.prefix You can import a ship fitting from clipboard.");
  });

  test("refresh updates text when language changes", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const i18n = fakeI18n("en");
    const rotator = new HintRotator({ element, i18n, candidates: HINT_CANDIDATES, timer: new ManualTimer() });
    i18n.setLanguage("zh");
    rotator.refresh();
    expect(element.textContent).toBe("hint.prefix 你可以从剪贴板导入舰船装配。");
  });

  test("showNext changes to a different active hint", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const rotator = createRotator(element, timer);
    rotator.showNext();
    timer.runTimeout();
    expect(element.textContent).toBe("hint.prefix 'Midships' means putting the rudder to the center position.");
  });

  test("showNext does not repeat the current hint", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const rotator = createRotator(element, timer);
    rotator.showNext();
    timer.runTimeout();
    const first = element.textContent;
    rotator.showNext();
    timer.runTimeout();
    expect(element.textContent).not.toBe(first);
  });

  test("showNext with one active hint does not change text", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const candidates = [HINT_CANDIDATES[0]];
    const rotator = new HintRotator({ element, i18n: fakeI18n(), candidates, timer });
    rotator.showNext();
    expect(element.textContent).toBe("hint.prefix You can import a ship fitting from clipboard.");
  });

  test("interval schedules showNext", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    createRotator(element, timer);
    expect(element.textContent).toBe("hint.prefix You can import a ship fitting from clipboard.");
    timer.runInterval();
    timer.runTimeout();
    expect(element.textContent).toBe("hint.prefix 'Midships' means putting the rudder to the center position.");
  });

  test("stop cancels the interval", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const rotator = createRotator(element, timer);
    rotator.stop();
    timer.runInterval();
    expect(element.textContent).toBe("hint.prefix You can import a ship fitting from clipboard.");
  });

  test("showNext applies and removes exit class and snaps below before sliding in", () => {
    const element = new FakeElement() as unknown as HTMLElement;
    const timer = new ManualTimer();
    const rotator = createRotator(element, timer);
    rotator.showNext();
    expect(element.classList.toggle).toHaveBeenCalledWith("hint-exit", true);
    timer.runTimeout();
    expect(element.classList.toggle).toHaveBeenCalledWith("hint-exit", false);
    expect(element.style.transition).toBe("");
    expect(element.style.transform).toBe("");
    expect(element.style.opacity).toBe("");
  });
});
