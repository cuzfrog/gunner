import { toShipId, toTypeId, type ShipId, type TypeId } from "./ids";

describe("branded id constructors", () => {
  describe("toShipId", () => {
    test("accepts numeric type ids", () => {
      expect(toShipId("587")).toBe("587" as ShipId);
    });

    test("accepts legacy- prefixed ids", () => {
      expect(toShipId("legacy-eidolon")).toBe("legacy-eidolon" as ShipId);
    });

    test("rejects non-numeric, non-legacy ids", () => {
      expect(() => toShipId("Rifter")).toThrow("Invalid ShipId: Rifter");
    });

    test("rejects empty strings", () => {
      expect(() => toShipId("")).toThrow("Invalid ShipId: ");
    });
  });

  describe("toTypeId", () => {
    test("accepts numeric type ids", () => {
      expect(toTypeId("12608")).toBe("12608" as TypeId);
    });

    test("rejects non-numeric ids", () => {
      expect(() => toTypeId("Hail S")).toThrow("Invalid TypeId: Hail S");
    });

    test("rejects empty strings", () => {
      expect(() => toTypeId("")).toThrow("Invalid TypeId: ");
    });

    test("rejects legacy- prefixed ids", () => {
      expect(() => toTypeId("legacy-foo")).toThrow("Invalid TypeId: legacy-foo");
    });
  });
});
