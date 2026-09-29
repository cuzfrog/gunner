import { disruptionEffectStrengths, missileEffectPercents, sensorEffectPercents, trackingEffectPercents } from "./scriptedEffect";

describe("disruptionEffectStrengths", () => {
  test("scales one strength by each script multiplier", () => {
    expect(disruptionEffectStrengths(35.5, { trackingMultiplier: 0.5, optimalMultiplier: 0.6, falloffMultiplier: 0.6 })).toEqual({ trackingPercent: 17.75, optimalPercent: 21.3, falloffPercent: 21.3 });
  });

  test("without a script every component keeps full strength", () => {
    expect(disruptionEffectStrengths(35.5, undefined)).toEqual({ trackingPercent: 35.5, optimalPercent: 35.5, falloffPercent: 35.5 });
  });
});

describe("trackingEffectPercents", () => {
  test("scales each base percent by its script multiplier", () => {
    expect(trackingEffectPercents(10, 15, 0, { trackingMultiplier: 1.5, optimalMultiplier: 0, falloffMultiplier: 2 })).toEqual({ trackingPercent: 15, optimalPercent: 0, falloffPercent: 0 });
  });

  test("without a script base percents pass through", () => {
    expect(trackingEffectPercents(10, 0, -5, undefined)).toEqual({ trackingPercent: 10, optimalPercent: 0, falloffPercent: -5 });
  });
});

describe("sensorEffectPercents", () => {
  test("scales scan resolution and targeting range by the script multipliers", () => {
    expect(sensorEffectPercents(10, 20, { scanResolutionMultiplier: 1.5, maxTargetRangeMultiplier: 0 })).toEqual({ scanResolutionPercent: 15, maxTargetRangePercent: 0 });
  });

  test("without a script base percents pass through", () => {
    expect(sensorEffectPercents(10, 20, undefined)).toEqual({ scanResolutionPercent: 10, maxTargetRangePercent: 20 });
  });
});

describe("missileEffectPercents", () => {
  test("scales each base percent by its script multiplier", () => {
    expect(missileEffectPercents(10, 8, 12, 6, { explosionRadiusMultiplier: 2, explosionVelocityMultiplier: 0.5, missileVelocityMultiplier: 1, flightTimeMultiplier: 0 })).toEqual({ explosionRadiusPercent: 20, explosionVelocityPercent: 4, missileVelocityPercent: 12, flightTimePercent: 0 });
  });

  test("without a script base percents pass through", () => {
    expect(missileEffectPercents(10, 8, 12, 6, undefined)).toEqual({ explosionRadiusPercent: 10, explosionVelocityPercent: 8, missileVelocityPercent: 12, flightTimePercent: 6 });
  });
});
