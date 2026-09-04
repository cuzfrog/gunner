import type { TypeId } from "../../gamedata/ids";

export interface StoredSelection {
  readonly moduleId: TypeId;
  readonly ammoId?: TypeId;
}

export interface SelectionSession {
  recall(key: string): StoredSelection | undefined;
  remember(key: string, value: StoredSelection): void;
  clear(): void;
}

export class SelectionSessionImpl implements SelectionSession {
  private readonly entries = new Map<string, StoredSelection>();

  recall(key: string): StoredSelection | undefined {
    return this.entries.get(key);
  }

  remember(key: string, value: StoredSelection): void {
    this.entries.set(key, value);
  }

  clear(): void {
    this.entries.clear();
  }
}
