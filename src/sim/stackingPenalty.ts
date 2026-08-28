export interface StackingPenalty {
  apply(multipliers: readonly number[]): number;
}

export class StackingPenaltyImpl implements StackingPenalty {
  apply(multipliers: readonly number[]): number {
    const values = multipliers.filter((value) => value !== 1);
    const positive = values.filter((value) => value > 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));
    const negative = values.filter((value) => value < 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));

    let product = 1;
    for (const list of [positive, negative]) {
      for (let i = 0; i < list.length; i++) {
        const bonus = list[i];
        product *= 1 + (bonus - 1) * Math.exp(-(i * i) / STACKING_PENALTY_COEFFICIENT);
      }
    }
    return product;
  }
}

const STACKING_PENALTY_COEFFICIENT = 7.1289;
