import type { ShipId, TypeId } from "../../gamedata/ids";
import { ITEM_ICON_IDS } from "./iconIds";
import { DRONE_TYPE_IDS } from "./droneIconIds";
import { SHIP_IMAGE_FILES } from "./shipImageIds";

export interface ImageCatalog {
  shipImageUrl(shipId: ShipId): string | undefined;
  itemIconUrl(typeId: TypeId): string | undefined;
  droneIconUrl(typeId?: TypeId): string | undefined;
}

export class StaticImageCatalog implements ImageCatalog {
  shipImageUrl(shipId: ShipId): string | undefined {
    return SHIP_IMAGE_FILES[shipId];
  }

  itemIconUrl(typeId: TypeId): string | undefined {
    const id = ITEM_ICON_IDS[typeId];
    if (id === undefined) return undefined;
    return `images/icons/${id}@1x.png`;
  }

  droneIconUrl(typeId?: TypeId): string | undefined {
    if (typeId === undefined) return undefined;
    const id = DRONE_TYPE_IDS[typeId];
    if (id === undefined) return undefined;
    return `images/icons/${id}@1x.png`;
  }
}
