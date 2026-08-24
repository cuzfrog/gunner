import type { ProfileSettings } from "../userSettings";
import { ProfileTextParser } from "./profileTextParser";
import { ProfileTextSerializer } from "./profileTextSerializer";

export interface ProfileTextCodec {
  parse(text: string): ProfileSettings | undefined;
  serialize(settings: ProfileSettings): string;
  hasHeader(text: string): boolean;
}

export class LocalProfileTextCodec implements ProfileTextCodec {
  private readonly parser = new ProfileTextParser();
  private readonly serializer = new ProfileTextSerializer();

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
