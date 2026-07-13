const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  SPELL_SLOT_CREATION_RULES,
  getMaximumSorceryPoints,
  ensureSorceryPointData,
  spendSorceryPoints,
  gainSorceryPoints,
  convertSpellSlotToSorceryPoints,
  createTemporarySpellSlot,
  restoreSorceryPointsOnLongRest,
  removeTemporarySpellSlots
} = require("../../src/engine/resources/sorcery-points");

assert.strictEqual(getMaximumSorceryPoints(1), 0, "Sorcery Points unlock at Sorcerer level 2");
assert.strictEqual(getMaximumSorceryPoints(2), 2);
assert.strictEqual(getMaximumSorceryPoints(12), 12);
assert.deepStrictEqual(ensureSorceryPointData(null, 5), { current: 5, maximum: 5 });
assert.deepStrictEqual(ensureSorceryPointData({ current: 0, maximum: 0 }, 2), { current: 2, maximum: 2 });
assert.deepStrictEqual(ensureSorceryPointData({ current: 99, maximum: 99 }, 5), { current: 5, maximum: 5 });
assert.deepStrictEqual(ensureSorceryPointData({ current: -4 }, 5), { current: 0, maximum: 5 });

const spent = spendSorceryPoints({ current: 5, maximum: 5 }, 2, 5);
assert.strictEqual(spent.success, true);
assert.deepStrictEqual(spent.data, { current: 3, maximum: 5 });
assert.strictEqual(spendSorceryPoints(spent.data, 4, 5).reason, "insufficient-points");

const gained = gainSorceryPoints({ current: 4, maximum: 5 }, 3, 5);
assert.strictEqual(gained.gained, 1, "gaining points must respect the maximum");
assert.deepStrictEqual(gained.data, { current: 5, maximum: 5 });

const converted = convertSpellSlotToSorceryPoints({
  data: { current: 1, maximum: 5 },
  sorcererLevel: 5,
  slotLevel: 3,
  remainingSlots: 2
});
assert.strictEqual(converted.success, true);
assert.strictEqual(converted.remainingSlots, 1);
assert.deepStrictEqual(converted.data, { current: 4, maximum: 5 });
assert.strictEqual(convertSpellSlotToSorceryPoints({ data: converted.data, sorcererLevel: 5, slotLevel: 3, remainingSlots: 0 }).reason, "slot-unavailable");
assert.strictEqual(convertSpellSlotToSorceryPoints({ data: { current: 4, maximum: 5 }, sorcererLevel: 5, slotLevel: 2, remainingSlots: 1 }).reason, "would-exceed-maximum");

assert.deepStrictEqual(SPELL_SLOT_CREATION_RULES[5], { cost: 7, minimumSorcererLevel: 9 });
const tooEarly = createTemporarySpellSlot({
  data: { current: 7, maximum: 7 },
  temporarySpellSlots: {},
  sorcererLevel: 7,
  slotLevel: 5
});
assert.strictEqual(tooEarly.reason, "sorcerer-level-too-low");

const created = createTemporarySpellSlot({
  data: { current: 5, maximum: 5 },
  temporarySpellSlots: { 1: 1 },
  sorcererLevel: 5,
  slotLevel: 3
});
assert.strictEqual(created.success, true);
assert.deepStrictEqual(created.data, { current: 0, maximum: 5 });
assert.deepStrictEqual(created.temporarySpellSlots, { 1: 1, 3: 1 });
assert.strictEqual(createTemporarySpellSlot({ data: created.data, temporarySpellSlots: created.temporarySpellSlots, sorcererLevel: 5, slotLevel: 1 }).reason, "insufficient-points");
assert.strictEqual(createTemporarySpellSlot({ data: { current: 20 }, temporarySpellSlots: {}, sorcererLevel: 20, slotLevel: 6 }).reason, "invalid-slot-level");

assert.deepStrictEqual(restoreSorceryPointsOnLongRest({ current: 0 }, 12), { current: 12, maximum: 12 });
assert.deepStrictEqual(removeTemporarySpellSlots({ 1: 2, 5: 1 }), {});

const rendererHtml = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/index.html"), "utf8");
assert.match(rendererHtml, /engine\/resources\/sorcery-points\.js/, "the sheet must load the Sorcery Point manager");
assert.match(rendererHtml, /slotTotals:\s*baseSpellSlotsForCharacter\(\)/, "Long Rest must restore base slots, not temporary slots");
assert.match(rendererHtml, /sheetMeta\.temporarySpellSlots\s*=\s*removeTemporarySpellSlots/, "Long Rest must remove temporary slots");
assert.match(rendererHtml, /function openSorceryPointManager\(/, "the SP orb must expose conversion and creation controls");
assert.match(rendererHtml, /function openQuickenedSpellPicker\(/, "Quickened Spell must expose a prepared spell picker");
assert.match(rendererHtml, /spendSheetSorceryPoints\(2\)/, "Quickened Spell must spend 2 SP through the central manager");

const optionalFeatures = JSON.parse(fs.readFileSync(path.join(__dirname, "../../vendor/5etools-src-main/data/optionalfeatures.json"), "utf8"));
const quickenedSpell = optionalFeatures.optionalfeature.find((feature) => feature.name === "Quickened Spell" && feature.source === "XPHB");
assert.strictEqual(quickenedSpell?.consumes?.amount, 2, "local 2024 data must retain Quickened Spell's 2 SP cost");

console.log("Sorcery Point engine tests passed.");
