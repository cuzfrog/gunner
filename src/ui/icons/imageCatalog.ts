import type { ShipId, TypeId } from "../../gamedata/ids";
import { ITEM_ICON_IDS } from "./iconIds";
import { DRONE_TYPE_IDS } from "./droneIconIds";
import { SHIP_IMAGE_FILES } from "./shipImageIds";

export interface ImageCatalog {
  shipImageUrl(shipId: ShipId): string | undefined;
  itemIconUrl(typeId: TypeId): string | undefined;
}

export class StaticImageCatalog implements ImageCatalog {
  shipImageUrl(shipId: ShipId): string | undefined {
    return SHIP_IMAGE_FILES[shipId];
  }

  itemIconUrl(typeId: TypeId): string | undefined {
    return resolveItemIconUrl(typeId);
  }
}

function resolveItemIconUrl(typeId: TypeId): string | undefined {
  const iconId = ITEM_ICON_IDS[typeId];
  if (iconId !== undefined) return `images/icons/${iconId}@1x.png`;
  const droneTypeId = DRONE_TYPE_IDS[typeId];
  if (droneTypeId !== undefined) return `images/icons/${droneTypeId}@1x.png`;
  return undefined;
}
