export interface PngDimensions {
  readonly width: number;
  readonly height: number;
}

const SIGNATURE_LENGTH = 8;
const CHUNK_LENGTH_OFFSET = 8;
const CHUNK_TYPE_OFFSET = 12;
const WIDTH_OFFSET = 16;
const HEIGHT_OFFSET = 20;
const MIN_HEADER_LENGTH = 24;
const IHDR_CHUNK_BYTES = 0x49484452;

export function pngDimensions(bytes: Uint8Array): PngDimensions | undefined {
  if (bytes.length < MIN_HEADER_LENGTH || !hasPngSignature(bytes)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(CHUNK_LENGTH_OFFSET) !== 13 || view.getUint32(CHUNK_TYPE_OFFSET) !== IHDR_CHUNK_BYTES) return undefined;
  const width = view.getUint32(WIDTH_OFFSET);
  const height = view.getUint32(HEIGHT_OFFSET);
  if (width === 0 || height === 0) return undefined;
  return { width, height };
}

function hasPngSignature(bytes: Uint8Array): boolean {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}
