import type { ProfileSettings } from "../userSettings";
import type { ChargeCatalog } from "../../fitting";
import type { SettingGuards } from "../settingGuards";
import type { Ships } from "../../ships";
import { ProfileTextParser } from "./profileTextParser";
import { ProfileTextSerializer } from "./profileTextSerializer";

export interface ProfileTextCodec {
  parse(text: string): ProfileSettings | undefined;
  serialize(settings: ProfileSettings): string;
  hasHeader(text: string): boolean;
}

export class LocalProfileTextCodec implements ProfileTextCodec {
  private readonly parser: ProfileTextParser;
  private readonly serializer = new ProfileTextSerializer();

  constructor(settingGuards: SettingGuards, ships: Ships, chargeCatalog: ChargeCatalog) {
    this.parser = new ProfileTextParser(settingGuards, ships, chargeCatalog);
  }

  parse(text: string): ProfileSettings | undefined {
    return this.parser.parse(text);
  }

  serialize(settings: ProfileSettings): string {
    return this.serializer.serialize(settings);
  }

  hasHeader(text: string): boolean {
    return this.parser.hasHeader(text);
  }
}
