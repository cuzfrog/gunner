import type { ShipId, TypeId } from "../../gamedata/ids";
import { TYPE_ICON_FILES } from "./typeIconFiles";
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
    const file = TYPE_ICON_FILES[typeId];
    return file !== undefined ? `images/${file}` : undefined;
  }
}
