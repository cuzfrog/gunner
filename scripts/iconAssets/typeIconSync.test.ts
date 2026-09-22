import { syncTypeIcons, validateTypeIconBytes, verifyTypeIcons, type TypeIconFetchResult, type TypeIconFetcher, type TypeIconStore } from "./typeIconSync";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function pngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set(PNG_SIGNATURE, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function entriesFixture(): Record<string, string> {
  return { "100": "type-icons/100@1x.png", "101": "type-icons/101@1x.png", "200": "icons/26454@1x.png" };
}

const store = vi.mocked<TypeIconStore>({ fileNames: vi.fn((): readonly string[] => []), read: vi.fn(), write: vi.fn(), delete: vi.fn() });
const fetcher = vi.mocked<TypeIconFetcher>({ fetch: vi.fn(async (): Promise<TypeIconFetchResult> => ({ status: "ok", bytes: pngBytes(64, 64) })) });

describe("validateTypeIconBytes", () => {
  test("accepts a 64x64 PNG", () => {
    expect(validateTypeIconBytes(pngBytes(64, 64))).toBeUndefined();
  });

  test("rejects a 16x16 placeholder PNG", () => {
    expect(validateTypeIconBytes(pngBytes(16, 16))).toBe("dimensions 16x16 below minimum 32x32");
  });

  test("rejects non-PNG bytes", () => {
    expect(validateTypeIconBytes(new Uint8Array([1, 2, 3]))).toBe("not a valid PNG");
  });
});

describe("syncTypeIcons", () => {
  test("fetches and writes a missing target type icon", async () => {
    store.fileNames.mockReturnValue([]);
    fetcher.fetch.mockResolvedValue({ status: "ok", bytes: pngBytes(64, 64) });
    const report = await syncReport();
    expect(fetcher.fetch).toHaveBeenCalledWith(100);
    expect(fetcher.fetch).toHaveBeenCalledWith(101);
    expect(store.write).toHaveBeenCalledWith("100@1x.png", pngBytes(64, 64));
    expect(report.fetched).toEqual([100, 101]);
    expect(report.failed).toEqual([]);
    expect(report.pruned).toEqual([]);
  });

  test("re-fetches an on-disk file that fails validation", async () => {
    store.fileNames.mockReturnValue(["100@1x.png", "101@1x.png"]);
    store.read.mockImplementation((name) => (name === "100@1x.png" ? pngBytes(16, 16) : pngBytes(64, 64)));
    const report = await syncReport();
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    expect(fetcher.fetch).toHaveBeenCalledWith(100);
    expect(store.write).toHaveBeenCalledWith("100@1x.png", pngBytes(64, 64));
    expect(report.fetched).toEqual([100]);
  });

  test("skips valid on-disk files without fetching", async () => {
    store.fileNames.mockReturnValue(["100@1x.png", "101@1x.png"]);
    store.read.mockReturnValue(pngBytes(64, 64));
    const report = await syncReport();
    expect(fetcher.fetch).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
    expect(report.fetched).toEqual([]);
  });

  test("reports fetch failures without writing", async () => {
    store.fileNames.mockReturnValue([]);
    fetcher.fetch.mockImplementation(async (typeId): Promise<TypeIconFetchResult> => ({ status: "failed", reason: typeId === 100 ? "HTTP 404" : "boom" }));
    const report = await syncReport();
    expect(store.write).not.toHaveBeenCalled();
    expect(report.fetched).toEqual([]);
    expect(report.failed).toEqual([
      { typeId: 100, reason: "HTTP 404" },
      { typeId: 101, reason: "boom" },
    ]);
  });

  test("rejects fetched placeholder bytes without writing", async () => {
    store.fileNames.mockReturnValue([]);
    fetcher.fetch.mockResolvedValue({ status: "ok", bytes: pngBytes(16, 16) });
    const report = await syncReport();
    expect(store.write).not.toHaveBeenCalled();
    expect(report.fetched).toEqual([]);
    expect(report.failed).toEqual([
      { typeId: 100, reason: "dimensions 16x16 below minimum 32x32" },
      { typeId: 101, reason: "dimensions 16x16 below minimum 32x32" },
    ]);
  });

  test("prunes orphaned files only when requested", async () => {
    store.fileNames.mockReturnValue(["100@1x.png", "101@1x.png", "999@1x.png"]);
    store.read.mockReturnValue(pngBytes(64, 64));
    await syncReport({ prune: false });
    expect(store.delete).not.toHaveBeenCalled();
    await syncReport({ prune: true });
    expect(store.delete).toHaveBeenCalledWith("999@1x.png");
    expect(store.delete).not.toHaveBeenCalledWith("100@1x.png");
  });

  test("does not fetch or repair orphaned files", async () => {
    store.fileNames.mockReturnValue(["100@1x.png", "101@1x.png", "999@1x.png"]);
    store.read.mockReturnValue(pngBytes(64, 64));
    const report = await syncReport({ prune: true });
    expect(fetcher.fetch).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
    expect(store.delete).toHaveBeenCalledWith("999@1x.png");
    expect(report.fetched).toEqual([]);
    expect(report.pruned).toEqual(["999@1x.png"]);
  });

  test("skips types unavailable at the source without failing", async () => {
    store.fileNames.mockReturnValue([]);
    fetcher.fetch.mockImplementation(async (typeId): Promise<TypeIconFetchResult> => (typeId === 100 ? { status: "unavailable" } : { status: "ok", bytes: pngBytes(64, 64) }));
    const report = await syncReport();
    expect(store.write).toHaveBeenCalledTimes(1);
    expect(report.fetched).toEqual([101]);
    expect(report.unavailable).toEqual([100]);
    expect(report.failed).toEqual([]);
  });

  test("never touches entries outside the type-icons directory", async () => {
    store.fileNames.mockReturnValue([]);
    await syncReport();
    expect(store.write).not.toHaveBeenCalledWith("26454@1x.png", expect.anything());
    expect(fetcher.fetch).not.toHaveBeenCalledWith(200);
  });
});

describe("verifyTypeIcons", () => {
  test("reports invalid, missing, and orphaned files without writing", async () => {
    store.fileNames.mockReturnValue(["100@1x.png", "999@1x.png"]);
    store.read.mockReturnValue(pngBytes(16, 16));
    const problems = await verifyTypeIcons({ entries: entriesFixture(), store });
    expect(problems.invalid).toEqual([{ name: "100@1x.png", reason: "dimensions 16x16 below minimum 32x32" }]);
    expect(problems.missing).toEqual([101]);
    expect(problems.orphaned).toEqual(["999@1x.png"]);
    expect(store.write).not.toHaveBeenCalled();
    expect(store.delete).not.toHaveBeenCalled();
  });

  test("reports no problems for a consistent valid store", async () => {
    store.fileNames.mockReturnValue(["100@1x.png", "101@1x.png"]);
    store.read.mockReturnValue(pngBytes(64, 64));
    const problems = await verifyTypeIcons({ entries: entriesFixture(), store });
    expect(problems).toEqual({ invalid: [], missing: [], orphaned: [] });
  });
});

async function syncReport(overrides?: { prune?: boolean }) {
  return syncTypeIcons({ entries: entriesFixture(), store, fetcher, prune: overrides?.prune });
}
