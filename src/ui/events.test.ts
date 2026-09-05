import { IMPORTED_RIFTER } from "./testing";
import { DEFAULT_SETTINGS } from "../appstate/localSettingsStore.testSupport";
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
    events.emitConfigInvalidated();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("emitConfigInvalidated calls registered listeners", () => {
    const events = new UiEventsImpl();
    const listener = vi.fn();
    events.onConfigInvalidated(listener);
    events.emitConfigInvalidated();
    expect(listener).toHaveBeenCalled();
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
    events.emitConfigInvalidated();
    expect(language).toHaveBeenCalledTimes(1);
    expect(config).toHaveBeenCalled();
  });

  test("emitFittingImported passes side and imported fitting", () => {
    const events = new UiEventsImpl();
    const listener = vi.fn();
    events.onFittingImported(listener);
    events.emitFittingImported("shipA", IMPORTED_RIFTER);
    expect(listener).toHaveBeenCalledWith("shipA", IMPORTED_RIFTER);
  });

  test("offFittingImported removes a listener", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onFittingImported(a);
    events.onFittingImported(b);
    events.offFittingImported(a);
    events.emitFittingImported("shipB", IMPORTED_RIFTER);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("emitProfileLoaded and emitNewProfile emit to their listeners", () => {
    const events = new UiEventsImpl();
    const profileLoaded = vi.fn();
    const newProfile = vi.fn();
    events.onProfileLoaded(profileLoaded);
    events.onNewProfile(newProfile);
    events.emitProfileLoaded("brawler");
    events.emitNewProfile();
    expect(profileLoaded).toHaveBeenCalledWith("brawler");
    expect(newProfile).toHaveBeenCalled();
  });

  test("emitProfileDeleted calls its listeners", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onProfileDeleted(a);
    events.onProfileDeleted(b);
    events.offProfileDeleted(a);
    events.emitProfileDeleted();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("emitProfileTextLoaded passes settings", () => {
    const events = new UiEventsImpl();
    const listener = vi.fn();
    events.onProfileTextLoaded(listener);
    events.emitProfileTextLoaded(DEFAULT_SETTINGS);
    expect(listener).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  test("emitSessionRestored calls all registered listeners", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onSessionRestored(a);
    events.onSessionRestored(b);
    events.emitSessionRestored();
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("offSessionRestored removes a listener without affecting others", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onSessionRestored(a);
    events.onSessionRestored(b);
    events.offSessionRestored(a);
    events.emitSessionRestored();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("emitSessionReset calls all registered listeners", () => {
    const events = new UiEventsImpl();
    const listener = vi.fn();
    events.onSessionReset(listener);
    events.emitSessionReset();
    expect(listener).toHaveBeenCalled();
  });

  test("offSessionReset removes a listener", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onSessionReset(a);
    events.onSessionReset(b);
    events.offSessionReset(a);
    events.emitSessionReset();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("emitStartupDefaultsApplied calls all registered listeners", () => {
    const events = new UiEventsImpl();
    const listener = vi.fn();
    events.onStartupDefaultsApplied(listener);
    events.emitStartupDefaultsApplied();
    expect(listener).toHaveBeenCalled();
  });

  test("offStartupDefaultsApplied removes a listener", () => {
    const events = new UiEventsImpl();
    const a = vi.fn();
    const b = vi.fn();
    events.onStartupDefaultsApplied(a);
    events.onStartupDefaultsApplied(b);
    events.offStartupDefaultsApplied(a);
    events.emitStartupDefaultsApplied();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test("listeners for different session event types are independent", () => {
    const events = new UiEventsImpl();
    const restored = vi.fn();
    const reset = vi.fn();
    const defaultsApplied = vi.fn();
    events.onSessionRestored(restored);
    events.onSessionReset(reset);
    events.onStartupDefaultsApplied(defaultsApplied);
    events.emitSessionRestored();
    expect(restored).toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(defaultsApplied).not.toHaveBeenCalled();
    events.emitSessionReset();
    expect(reset).toHaveBeenCalled();
    events.emitStartupDefaultsApplied();
    expect(defaultsApplied).toHaveBeenCalled();
  });
});
