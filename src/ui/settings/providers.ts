export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocationProvider {
  readonly href: string;
}

export class ClipboardUnavailableError extends Error {
  constructor() {
    super("Clipboard unavailable");
  }
}

export interface ClipboardProvider {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}
