const assert = require("assert");
require("../../src/engine/resources/resource-state");
const {
  computeSpellSlotFieldUpdates,
  computeLongRestRecovery,
  getLongRestTransition,
  resolveLongRest
} = require("../../src/engine/rests/long-rest");

assert.deepStrictEqual(computeSpellSlotFieldUpdates({
  slotTotals: [4, 3],
  remainingByLevel: { 1: "9", 2: "-1", 3: "not-a-number" }
}).slice(0, 3), [
  { level: 1, total: 4, totalValue: "4", remainingValue: "4" },
  { level: 2, total: 3, totalValue: "3", remainingValue: "0" },
  { level: 3, total: 0, totalValue: "", remainingValue: "" }
]);

assert.deepStrictEqual(computeLongRestRecovery({
  slotTotals: [4, 3],
  remainingByLevel: { 1: "1", 2: "0" },
  currentHitPoints: "8",
  maxHitPoints: "17"
}), {
  spellSlotUpdates: computeSpellSlotFieldUpdates({
    slotTotals: [4, 3],
    remainingByLevel: { 1: "1", 2: "0" },
    resetRemaining: true
  }),
  featureUses: {},
  nextResourceState: {},
  currentHitPoints: "17"
});

assert.deepStrictEqual(getLongRestTransition({
  characterReady: false,
  longRestActive: true
}), {
  nextLongRestActive: true,
  shouldRestoreResources: true
});

assert.deepStrictEqual(getLongRestTransition({
  characterReady: true,
  longRestActive: true
}), {
  nextLongRestActive: false,
  shouldRestoreResources: true
});

assert.deepStrictEqual(resolveLongRest({
  characterReady: true,
  longRestActive: false,
  slotTotals: [4, 3],
  remainingByLevel: { 1: "2", 2: "1" },
  currentHitPoints: "8",
  maxHitPoints: "17"
}), {
  nextLongRestActive: true,
  shouldRestoreResources: false,
  mode: "start",
  recovery: null
});

const instantLongRest = resolveLongRest({
  characterReady: false,
  longRestActive: false,
  slotTotals: [4],
  remainingByLevel: { 1: "0" },
  currentHitPoints: "3",
  maxHitPoints: "9"
});
assert.strictEqual(instantLongRest.mode, "instant");
assert.strictEqual(instantLongRest.shouldRestoreResources, true);
assert.deepStrictEqual(instantLongRest.recovery, {
  spellSlotUpdates: computeSpellSlotFieldUpdates({
    slotTotals: [4],
    remainingByLevel: { 1: "0" },
    resetRemaining: true
  }),
  featureUses: {},
  nextResourceState: {},
  currentHitPoints: "9"
});
