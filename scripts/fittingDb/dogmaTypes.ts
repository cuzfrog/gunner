export interface SdeDogmaAttribute {
  readonly attributeID: number;
  readonly name: string;
  readonly defaultValue?: number;
  readonly highIsGood?: number;
  readonly stackable?: number;
}

export interface SdeDogmaEffectModifier {
  readonly domain: string;
  readonly func: string;
  readonly modifiedAttributeID: number;
  readonly modifyingAttributeID: number;
  readonly operation: number;
  readonly skillTypeID?: number;
  readonly groupID?: number;
}

export interface SdeDogmaEffect {
  readonly effectID: number;
  readonly effectName?: string;
  readonly effectCategory: number;
  readonly modifierInfo?: readonly SdeDogmaEffectModifier[];
  readonly dischargeAttributeID?: number;
  readonly durationAttributeID?: number;
  readonly rangeAttributeID?: number;
  readonly falloffAttributeID?: number;
  readonly published?: number;
}

export interface SdeTypeDogma {
  readonly dogmaAttributes: readonly { readonly attributeID: number; readonly value: number }[];
  readonly dogmaEffects: readonly { readonly effectID: number; readonly isDefault?: number }[];
}

export interface SdeType {
  readonly typeID: number;
  readonly "typeName_en-us": string;
  readonly typeName_zh?: string;
  readonly typeName_ja?: string;
  readonly groupID: number;
  readonly published: number;
  readonly metaLevel?: number;
  readonly metaGroupID?: number;
  readonly volume?: number;
}

export interface SdeGroup {
  readonly groupID: number;
  readonly categoryID: number;
}

export const OPERATION_PRE_ASSIGN = 0;
export const OPERATION_ADD = 2;
export const OPERATION_POST_PERCENT = 6;
export const OPERATION_POST_PERCENT_DIV = 4;

export const FUNC_ITEM_MODIFIER = "ItemModifier";
export const FUNC_LOCATION_REQUIRED_SKILL = "LocationRequiredSkillModifier";
export const FUNC_LOCATION_GROUP = "LocationGroupModifier";
export const FUNC_OWNER_REQUIRED_SKILL = "OwnerRequiredSkillModifier";

export const EFFECT_CATEGORY_PASSIVE = 0;
export const EFFECT_CATEGORY_ACTIVE = 1;
export const EFFECT_CATEGORY_REMOTE = 2;
export const EFFECT_CATEGORY_ONLINE = 4;
export const EFFECT_CATEGORY_OVERLOAD = 5;
