const assert = require("assert");

require("../../src/engine/resources/resource-state");
const restState = require("../../src/engine/rests/rest-state");
const shortRest = require("../../src/engine/rests/short-rest");
const longRest = require("../../src/engine/rests/long-rest");
const { exhaustionEffectsForLevel } = require("../../src/engine/conditions/statuses");

assert.deepStrictEqual(exhaustionEffectsForLevel(3), { d20TestPenalty: 6, speedBonus: -15, level: 3 });
assert.deepStrictEqual(exhaustionEffectsForLevel(99), { d20TestPenalty: 12, speedBonus: -30, level: 6 });

assert.strictEqual(shortRest.resolveShortRest({
  characterReady: true,
  shortRestActive: false,
  longRestActive: false,
  currentHitPoints: 0
}).reason, "zero-hit-points");

const oneDie = restState.spendHitDie({
  available: 2,
  total: 2,
  currentHitPoints: 8,
  maxHitPoints: 20,
  hitDieFaces: 10,
  constitutionModifier: 3,
  rng: () => 7
});
assert.deepStrictEqual(oneDie, {
  changed: true,
  reason: "",
  available: 1,
  total: 2,
  currentHitPoints: 18,
  healing: 10,
  roll: 7,
  requestedHealing: 10
});

const capped = restState.spendHitDie({
  available: 1,
  total: 1,
  currentHitPoints: 18,
  maxHitPoints: 20,
  hitDieFaces: 10,
  constitutionModifier: 3,
  rng: () => 7
});
assert.strictEqual(capped.currentHitPoints, 20);
assert.strictEqual(capped.healing, 2);

const negativeCon = restState.spendHitDie({
  available: 1,
  total: 1,
  currentHitPoints: 5,
  maxHitPoints: 20,
  hitDieFaces: 6,
  constitutionModifier: -3,
  rng: () => 1
});
assert.strictEqual(negativeCon.healing, 1);

const noDice = restState.spendHitDie({ available: 0, total: 2, currentHitPoints: 5, maxHitPoints: 20, hitDieFaces: 10, rng: () => 10 });
assert.strictEqual(noDice.changed, false);
assert.strictEqual(restState.normalizeHitDiceState({ available: -3, total: 99, characterLevel: 3, classHitDieFaces: 10 }).available, 0);
assert.deepStrictEqual(restState.normalizeHitDiceState({ available: 99, total: 4 }).available, 4);

const canStop = restState.spendHitDie({ available: 2, total: 2, currentHitPoints: 5, maxHitPoints: 20, hitDieFaces: 8, rng: () => 4 });
assert.strictEqual(canStop.available, 1);

const shortResources = shortRest.computeShortRestRecovery({
  resourceState: { "class|fighter|second wind": 1, "class|wizard|arcane recovery": 1 },
  recoverResourceKeys: ["class|fighter|second wind"],
  slotTotals: [2],
  remainingByLevel: { 1: 0 },
  restoreSpellSlots: false
});
assert.deepStrictEqual(shortResources.nextResourceState, { "class|wizard|arcane recovery": 1 });
assert.strictEqual(shortResources.spellSlotUpdates[0].remainingValue, "0");

const longResources = longRest.computeLongRestRecovery({
  resourceState: { short: 1, long: 1, unknown: 1 },
  recoverResourceKeys: ["long", "short"],
  slotTotals: [4],
  remainingByLevel: { 1: 0 },
  currentHitPoints: 8,
  maxHitPoints: 20,
  hitDiceTotal: 4,
  exhaustionLevel: 2,
  heroicInspiration: true
});
assert.deepStrictEqual(longResources.nextResourceState, { unknown: 1 });
assert.strictEqual(longResources.currentHitPoints, 20);
assert.deepStrictEqual(longResources.hitDice, { available: 4, total: 4 });
assert.strictEqual(longResources.exhaustionLevel, 1);
assert.strictEqual(longResources.clearTemporaryHitPoints, true);
assert.strictEqual(longResources.heroicInspiration, true);

assert.strictEqual(shortRest.computeShortRestRecovery({
  slotTotals: [2],
  remainingByLevel: { 1: 0 },
  restoreSpellSlots: true
}).spellSlotUpdates[0].remainingValue, "2");
assert.strictEqual(shortRest.computeShortRestRecovery({
  slotTotals: [2],
  remainingByLevel: { 1: 0 },
  restoreSpellSlots: false
}).spellSlotUpdates[0].remainingValue, "0");

const warlock = shortRest.computeShortRestRecovery({ slotTotals: [2], remainingByLevel: { 1: 0 }, restoreSpellSlots: true });
assert.strictEqual(warlock.spellSlotUpdates[0].remainingValue, "2");
const sorcerer = shortRest.computeShortRestRecovery({ slotTotals: [3], remainingByLevel: { 1: 0 }, restoreSpellSlots: false });
assert.strictEqual(sorcerer.spellSlotUpdates[0].remainingValue, "0");

assert.deepStrictEqual(restState.recoverResourceStateByRecharge({
  state: { short: 1, both: 1, long: 1, none: 1 },
  rest: "short",
  resources: [
    { key: "short", recharge: "Short Rest" },
    { key: "both", recharge: "Short or Long Rest" },
    { key: "long", recharge: "Long Rest" },
    { key: "none", recharge: "Custom" }
  ]
}), { state: { long: 1, none: 1 }, recoveredKeys: ["short", "both"] });

assert.deepStrictEqual(longRest.resolveLongRestInterruption({ elapsedMinutes: 60, reason: "initiative", shortRestRecovery: { ok: true } }), {
  interrupted: true,
  reason: "initiative",
  elapsedMinutes: 60,
  grantsShortRest: true,
  recovery: { ok: true }
});
assert.strictEqual(longRest.resolveLongRestInterruption({ elapsedMinutes: 59 }).grantsShortRest, false);
assert.strictEqual(shortRest.resolveShortRestInterruption({ reason: "damage" }).recovery, null);

const legacy = {
  featureUses: { a: -2, b: "3" },
  featurePools: { lay: -1 },
  sorceryPoints: { current: 99, maximum: 4 },
  temporarySpellSlots: { 1: 2, 2: 0 },
  exhaustionLevel: 8,
  longRestActive: true,
  activeStatuses: ["poisoned"]
};
const migrated = restState.normalizeSheetMeta(legacy, { characterLevel: 3, classHitDieFaces: 8 });
assert.deepStrictEqual(migrated.featureUses, { b: 3 });
assert.deepStrictEqual(migrated.featurePools, {});
assert.deepStrictEqual(migrated.sorceryPoints, { current: 4, maximum: 4 });
assert.deepStrictEqual(migrated.temporarySpellSlots, { 1: 2 });
assert.strictEqual(migrated.exhaustionLevel, 6);
assert.strictEqual(migrated.restState.kind, "long");
assert.deepStrictEqual(restState.normalizeSheetMeta(migrated, { characterLevel: 3, classHitDieFaces: 8 }), migrated);

assert.strictEqual(longRest.computeLongRestRecovery({ heroicInspiration: true }).heroicInspiration, true);
assert.strictEqual(longRest.computeLongRestRecovery({ heroicInspiration: false, human: true }).heroicInspiration, true);

console.log("rests.test.js passed");
