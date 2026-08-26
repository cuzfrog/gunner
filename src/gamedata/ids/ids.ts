declare const ShipIdBrand: unique symbol;
export type ShipId = string & { readonly [ShipIdBrand]: true };

declare const HullTypeIdBrand: unique symbol;
export type HullTypeId = string & { readonly [HullTypeIdBrand]: true };

declare const FactionIdBrand: unique symbol;
export type FactionId = string & { readonly [FactionIdBrand]: true };

declare const TypeIdBrand: unique symbol;
export type TypeId = string & { readonly [TypeIdBrand]: true };

