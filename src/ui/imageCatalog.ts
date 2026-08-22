import { DRONE_ICON_ID, ITEM_ICON_IDS } from "../fitting";

export interface ImageCatalog {
  shipImageUrl(shipName: string): string;
  itemIconUrl(itemName: string): string | undefined;
  droneIconUrl(): string;
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

  droneIconUrl(): string {
    return `images/icons/${DRONE_ICON_ID}@1x.png`;
  }
}
