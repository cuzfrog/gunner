import { decodeBase64, encodeBase64 } from "./urlCodec";

describe("urlCodec", () => {
  test("encodeBase64 and decodeBase64 round-trip objects", () => {
    const value = { version: 6, tracking: 0.32, sigRes: "S" };
    const encoded = encodeBase64(value);
    expect(JSON.parse(decodeBase64(encoded))).toEqual(value);
  });

  test("decodeBase64 inverts a known base64url string", () => {
    const encoded = Buffer.from('{"version":6}', "utf8").toString("base64url");
    expect(decodeBase64(encoded)).toEqual('{"version":6}');
  });
});
