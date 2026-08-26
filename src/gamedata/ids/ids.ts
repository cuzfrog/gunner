declare const ShipIdBrand: unique symbol;
export type ShipId = string & { readonly [ShipIdBrand]: true };

export function toShipId(value: string): ShipId {
  if (/^\d+$/.test(value) || value.startsWith("legacy-")) return value as ShipId;
  throw new Error(`Invalid ShipId: ${value}`);
}

declare const HullTypeIdBrand: unique symbol;
export type HullTypeId = string & { readonly [HullTypeIdBrand]: true };

declare const FactionIdBrand: unique symbol;
export type FactionId = string & { readonly [FactionIdBrand]: true };

declare const TypeIdBrand: unique symbol;
export type TypeId = string & { readonly [TypeIdBrand]: true };

export function toTypeId(value: string): TypeId {
  if (/^\d+$/.test(value)) return value as TypeId;
  throw new Error(`Invalid TypeId: ${value}`);
}

