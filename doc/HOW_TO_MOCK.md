# Mock in test

## Example

```typescript
interface FooService {
  getName: (id: string) => string;
}

// mock interface type
const mockFooService = vi.mocked<FooService>({
  getName: vi.fn(),
});

// now you can call `mockFooService.getName.mock*`
```

## How does it work?

`vi.mocked` is added onto the global namespace in `tests/test-setup.ts`. The shim tracks every mock created via `vi.fn`/`vi.spyOn` and installs a global `beforeEach` that resets all of them between tests for max isolation: call history, sticky `mockReturnValue`, and the `mockReturnValueOnce` queue are wiped, and spies are uninstalled (original implementation restored). A factory implementation passed to `vi.fn(impl)` survives the reset — it is the mock's default behavior, not per-test state. (Bun's built-in `resetAllMocks` alone is not enough: it keeps sticky returns installed, hence the tracking.) So create mocks at file top, and configure behavior in `beforeEach` — never in `beforeAll`, where the global reset hook runs afterwards and silently undoes the configuration.

## Pattern: file-top mocks, reused across tests

Define mocks at the top of the test file, above `describe`. The same mock object is reused across every test in the file; only its behavior is reset between tests by the global `beforeEach`.

```typescript
const settingsStore = vi.mocked<SettingsStore>({
  load: vi.fn(),
  write: vi.fn(),
});
```

## Per-test and per-describe configuration

Because the global reset wipes everything, the file's `beforeEach` inside `describe` is the right place to set the default behavior for the suite:

```typescript
describe("createApp", () => {
  beforeEach(() => {
    settingsStore.load.mockReturnValue(DEFAULT_SETTINGS);
  });

  test("happy path uses default settings", () => {
    // settingsStore.load returns DEFAULT_SETTINGS
  });

  test("no model in settings throws", () => {
    settingsStore.load.mockReturnValueOnce({});
    // first call returns {}, subsequent calls fall back to DEFAULT_SETTINGS
  });
});
```

- `mockReturnValue` (sticky) — set in `beforeEach` for a default.
- `mockReturnValueOnce` (one-shot) — set in the test body to override the next call only.

## Do not import `bun:test`

All test utilities are on the global namespace. Use bare names, e.g.:
(`test`, `describe`, `expect`, `vi`, `vi.fn`, `vi.spyOn`).

## Faking time

- Pin "now" and drive timers: `vi.useFakeTimers({ now: <date-or-ms> })`, then `vi.advanceTimersByTime(ms)`. The pinned clock survives timer advancement — use this for elapsed/duration assertions. Restore with `vi.useRealTimers()` (in an `afterEach`).
- Pin "now" without faking timers: `vi.setSystemTime(<date-or-ms>)` fakes `Date.now()`/`new Date()` only; `vi.setSystemTime()` restores real time. Do not combine it with `vi.advanceTimersByTime`: it throws when fake timers are inactive, and otherwise resyncs the clock to the fake timers' `now` origin.
