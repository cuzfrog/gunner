import { DRONE_ICON_ID, ITEM_ICON_IDS } from "./iconIds";
import { DRONE_TYPE_IDS } from "./droneIconIds";

export interface ImageCatalog {
  shipImageUrl(shipName: string): string;
  itemIconUrl(itemName: string): string | undefined;
  droneIconUrl(droneName?: string): string;
}

export class StaticImageCatalog implements ImageCatalog {
  shipImageUrl(shipName: string): string {
    return `images/ships/${shipName.replaceAll(" ", "_")}.webp`;
  }

  itemIconUrl(itemName: string): string | undefined {
    const id = ITEM_ICON_IDS[itemName];
    if (id === undefined) return undefined;
    return `images/icons/${id}@1x.png`;
  }

  droneIconUrl(droneName?: string): string {
    const id = droneName !== undefined ? DRONE_TYPE_IDS[droneName] : undefined;
    if (id === undefined) return `images/icons/${DRONE_ICON_ID}@1x.png`;
    return `images/icons/${id}@1x.png`;
  }
}
