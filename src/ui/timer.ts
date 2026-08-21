export type TimeoutId = number;
export type IntervalId = number;

export interface Timer {
  setTimeout(callback: () => void, ms: number): TimeoutId;
  clearTimeout(id: TimeoutId): void;
  setInterval(callback: () => void, ms: number): IntervalId;
  clearInterval(id: IntervalId): void;
}

export class DefaultTimer implements Timer {
  setTimeout(callback: () => void, ms: number): TimeoutId {
    return Number(setTimeout(callback, ms));
  }

  clearTimeout(id: TimeoutId): void {
    clearTimeout(id);
  }

  setInterval(callback: () => void, ms: number): IntervalId {
    return Number(setInterval(callback, ms));
  }

  clearInterval(id: IntervalId): void {
    clearInterval(id);
  }
}
