import { pngDimensions } from "./pngDimensions";

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

describe("pngDimensions", () => {
  test("reads width and height from the IHDR chunk", () => {
    expect(pngDimensions(pngBytes(64, 64))).toEqual({ width: 64, height: 64 });
    expect(pngDimensions(pngBytes(16, 16))).toEqual({ width: 16, height: 16 });
    expect(pngDimensions(pngBytes(512, 256))).toEqual({ width: 512, height: 256 });
  });

  test("parses a view into a larger buffer (non-zero byteOffset)", () => {
    const backing = new Uint8Array(64);
    const view = pngBytes(48, 32);
    backing.set(view, 16);
    expect(pngDimensions(backing.subarray(16, 16 + view.length))).toEqual({ width: 48, height: 32 });
  });

  test("rejects a non-PNG signature", () => {
    const bytes = pngBytes(64, 64);
    bytes[0] = 0x00;
    expect(pngDimensions(bytes)).toBeUndefined();
  });

  test("rejects a truncated buffer", () => {
    const bytes = pngBytes(64, 64);
    expect(pngDimensions(bytes.subarray(0, 20))).toBeUndefined();
    expect(pngDimensions(new Uint8Array(0))).toBeUndefined();
  });

  test("rejects a buffer whose first chunk is not IHDR", () => {
    const bytes = pngBytes(64, 64);
    bytes.set([0x49, 0x44, 0x41, 0x54], 12);
    expect(pngDimensions(bytes)).toBeUndefined();
  });

  test("rejects a zero dimension", () => {
    expect(pngDimensions(pngBytes(0, 64))).toBeUndefined();
    expect(pngDimensions(pngBytes(64, 0))).toBeUndefined();
  });
});
