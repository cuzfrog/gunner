import type { SdeDogmaEffectModifier } from "./dogmaTypes";

export interface SdeProjectionAttribute {
  readonly id: number;
  readonly name: string;
  readonly defaultValue: number;
  readonly highIsGood: boolean;
  readonly stackable: boolean;
}

export interface SdeProjectionEffect {
  readonly id: number;
  readonly name: string;
  readonly category: number;
  readonly modifiers: readonly SdeDogmaEffectModifier[];
}

export interface SdeProjectionTypeAttribute {
  readonly attributeId: number;
  readonly value: number;
}

export interface SdeProjectionType {
  readonly typeId: number;
  readonly groupId: number;
  readonly published: boolean;
  readonly attributes: readonly SdeProjectionTypeAttribute[];
  readonly effectIds: readonly number[];
}

export interface SdeProjection {
  readonly generatedAt: string;
  readonly attributes: Readonly<Record<string, SdeProjectionAttribute>>;
  readonly effects: Readonly<Record<string, SdeProjectionEffect>>;
  readonly types: Readonly<Record<string, SdeProjectionType>>;
}
