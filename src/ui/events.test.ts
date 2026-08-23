import { UiEventsImpl } from "./events";

describe("UiEvents", () => {
  test("emitLanguageChanged calls all registered listeners", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onLanguageChanged(a);
    events.onLanguageChanged(b);
    events.emitLanguageChanged();
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("a listener added during emitLanguageChanged does not fire in that emission", () => {
    const events = new UiEventsImpl();
    const late = vi.fn();
    events.onLanguageChanged(() => events.onLanguageChanged(late));
    events.emitLanguageChanged();
    expect(late).not.toHaveBeenCalled();
    events.emitLanguageChanged();
    expect(late).toHaveBeenCalled();
  });

  test("offLanguageChanged removes a listener without affecting others", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onLanguageChanged(a);
    events.onLanguageChanged(b);
    events.offLanguageChanged(a);
    events.emitLanguageChanged();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("offConfigInvalidated removes a listener without affecting others", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onConfigInvalidated(a);
    events.onConfigInvalidated(b);
    events.offConfigInvalidated(a);
    events.emitConfigInvalidated(false);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith(false);
  });

  test("emitConfigInvalidated passes the persist payload", () => {
    const events = new UiEventsImpl();
    const listener = vi.fn();
    events.onConfigInvalidated(listener);
    events.emitConfigInvalidated(true);
    expect(listener).toHaveBeenCalledWith(true);
    events.emitConfigInvalidated(false);
    expect(listener).toHaveBeenLastCalledWith(false);
  });

  test("offDisplayInvalidated removes a listener without affecting others", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onDisplayInvalidated(a);
    events.onDisplayInvalidated(b);
    events.offDisplayInvalidated(a);
    events.emitDisplayInvalidated();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("listeners for different event types are independent", () => {
    const events = new UiEventsImpl();
    const language = vi.fn();
    const config = vi.fn();
    events.onLanguageChanged(language);
    events.onConfigInvalidated(config);
    events.emitLanguageChanged();
    expect(language).toHaveBeenCalled();
    expect(config).not.toHaveBeenCalled();
    events.emitConfigInvalidated(true);
    expect(language).toHaveBeenCalledTimes(1);
    expect(config).toHaveBeenCalledWith(true);
  });
});
