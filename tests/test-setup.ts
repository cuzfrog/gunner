import {
  type Mock,
  setSystemTime as _bunSetSystemTime,
  vi as _bunVi,
  test as _test,
  expect as _expect,
  describe as _describe,
  afterAll as _afterAll,
  afterEach as _afterEach,
  beforeAll as _beforeAll,
  beforeEach as _beforeEach,
} from 'bun:test';

process.env.FORCE_COLOR = '1';

const _bunFn = _bunVi.fn;
const _bunSpyOn = _bunVi.spyOn;
const registeredMocks: Array<{ reset(): void }> = [];

// this is hacking for test setup, exempted from context rules.
const _vi = Object.assign(_bunVi, {
  mocked: <T>(item: T): T extends (...args: any[]) => any
    ? Mock<T>
    : T extends Record<string, any>
      ? { [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : T[K] }
      : T => item as never,
  fn: function <T extends (...args: any[]) => any>(implementation?: T): Mock<T> {
    const mock = _bunFn(implementation);
    registeredMocks.push({
      reset: function (): void {
        mock.mockReset();
        if (implementation !== undefined) mock.mockImplementation(implementation);
      },
    });
    return mock;
  },
  spyOn: function <T extends object, K extends keyof T>(obj: T, key: K): Mock<Extract<T[K], (...args: any[]) => any>> {
    const mock = _bunSpyOn(obj, key);
    registeredMocks.push({
      reset: function (): void {
        mock.mockRestore();
      },
    });
    return mock;
  },
  setSystemTime: function (now?: number | Date): void {
    _bunSetSystemTime(now);
  },
});

Object.assign(globalThis, {
  test: _test,
  expect: _expect,
  describe: _describe,
  beforeAll: _beforeAll,
  beforeEach: _beforeEach,
  afterEach: _afterEach,
  afterAll: _afterAll,
  vi: _vi,
});

beforeEach(() => {
  _vi.resetAllMocks();
  for (const mock of registeredMocks) mock.reset();
});

declare global {
  const test: typeof _test;
  const expect: typeof _expect;
  const describe: typeof _describe;
  const beforeAll: typeof _beforeAll;
  const beforeEach: typeof _beforeEach;
  const afterEach: typeof _afterEach;
  const afterAll: typeof _afterAll;

  const vi: typeof _vi;
}
