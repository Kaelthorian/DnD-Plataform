"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");

function functionBlock(name) {
  const start = html.indexOf(`    function ${name}(`);
  assert.notStrictEqual(start, -1, `missing ${name}`);
  const next = html.indexOf("\n    function ", start + 1);
  return html.slice(start, next === -1 ? html.length : next);
}

const notifier = functionBlock("notifyEquipmentCombatStateChanged");
const scheduler = functionBlock("scheduleEquipmentMutationRefresh");
const flush = functionBlock("flushEquipmentMutationRefresh");
const setEquipped = functionBlock("setEquipped");
const setVersatileTwoHanded = functionBlock("setVersatileTwoHanded");
const pruneEquippedItems = functionBlock("pruneEquippedItems");
const toggleEquipped = functionBlock("toggleEquipped");
const addItem = functionBlock("addItemToEquipment");
const removeItem = functionBlock("removeItemFromEquipment");
const updateEquipmentPanel = functionBlock("updateEquipmentPanel");
const derivedInput = functionBlock("handleDerivedStatInput");
const derivedStats = functionBlock("updateDerivedStats");
const equippedAbilityScores = functionBlock("equippedAbilityScoreOverrides");
const restoreAbilityScores = functionBlock("restoreEquippedAbilityScoreOverrides");
const applyAbilityScores = functionBlock("applyEquippedAbilityScoreOverrides");
const defenseSources = functionBlock("selectedDefenseSources");
const combatCommit = functionBlock("commitActiveCombatResolution");

assert.match(notifier, /scheduleEquipmentMutationRefresh\(\{ reason \}\)/, "equipment mutators should use the shared transaction scheduler");
assert.match(scheduler, /invalidateCombatActionCache\(reason\)/, "the transaction should invalidate the combat snapshot once");
assert.match(scheduler, /schedulePanelRefresh\(flushEquipmentMutationRefresh\)/, "equipment work should be deferred until after paint");
assert.match(flush, /withCombatCollectionMemo\(\(\) =>/, "one transaction should share parsed equipment and combat-derived data");
assert.match(flush, /updateDerivedStats\(\{ refreshPanels: false \}\)/, "equipment changes should refresh ability scores and passive defenses in the same transaction");
assert.match(flush, /updatePreparedSpellsPanel\(\{ refreshCombat: false \}\)/, "prepared attacks should not trigger a second combat refresh");
assert.match(flush, /refreshTurnActionsPanelIfVisible\(\)/, "an open Start Combat window should refresh once after the transaction");
assert.match(flush, /scheduleCombatActionCacheWarmup\(\)/, "a closed Start Combat window should warm its cache after the transaction");
assert.match(html, /globalThis\.dndEquipmentPerformance\s*=\s*\{/, "equipment transaction timings should be exposed for diagnostics");
assert.match(setEquipped, /notifyEquipmentCombatStateChanged\("equipment-unequipped"\)/, "unequipping should invalidate combat actions");
assert.match(setEquipped, /notifyEquipmentCombatStateChanged\("equipment-equipped"\)/, "equipping should invalidate combat actions");
assert.match(setVersatileTwoHanded, /notifyEquipmentCombatStateChanged\("equipment-versatile"\)/, "changing a Versatile grip should invalidate combat actions");
assert.match(pruneEquippedItems, /notifyEquipmentCombatStateChanged\("equipment-pruned"\)/, "quantity-driven equipment pruning should invalidate combat actions");
assert.match(pruneEquippedItems, /entries\.find\(/, "pruning should reuse the provided equipment snapshot");
assert.doesNotMatch(pruneEquippedItems, /equipmentEntries\(\)\.find\(/, "pruning should not reparse equipment for every equipped key");
assert.match(toggleEquipped, /setVersatileTwoHanded\(/, "the equipment toggle should route Versatile changes through the notifying mutator");
assert.match(toggleEquipped, /setEquipped\(/, "the equipment toggle should route equip changes through the notifying mutator");
assert.doesNotMatch(toggleEquipped, /updateEquipmentPanel\(|updateArmorClass\(|updatePreparedSpellsPanel\(|renderAlertsPanel\(|scheduleSave\(/, "equip clicks should not rebuild dependent UI synchronously");
assert.doesNotMatch(addItem, /dispatchEvent\(/, "adding an item should not emit duplicate synthetic field events");
assert.doesNotMatch(removeItem, /dispatchEvent\(/, "removing or consuming an item should not emit duplicate synthetic field events");
assert.match(addItem, /scheduleEquipmentMutationRefresh\(\{ reason: "equipment-added", derived: false \}\)/,
  "adding an unequipped item should schedule one transaction without a full derived-stat pass");
assert.match(removeItem, /scheduleEquipmentMutationRefresh\(\{ reason: "equipment-removed", derived: removedEquippedItem \}\)/,
  "removing should only recalculate derived item effects when the equipped copy disappears");
assert.match(updateEquipmentPanel, /const entries = equipmentEntries\(\)/, "the equipment panel should create one entry snapshot");
assert.match(updateEquipmentPanel, /pruneEquippedItems\(entries\)/, "the panel should pass its snapshot into pruning");
assert.match(derivedInput, /normalizedKey\.includes\("equipment"\)[\s\S]*?scheduleEquipmentMutationRefresh\([\s\S]*?return;/, "Equipment field events should bypass the global derived-stat pipeline");
assert.match(equippedAbilityScores, /itemMagicBonusesEnabled\(item\)/, "static scores must respect required attunement");
assert.match(equippedAbilityScores, /itemEquipmentModesMatch\(definition\.equipmentModes, slots\)/, "static scores must respect worn or held equipment state");
assert.match(restoreAbilityScores, /itemAbilityScoreBaseState\(\)/, "the score before an item override must be recoverable");
assert.match(applyAbilityScores, /const next = Math\.max\(adjusted, score \|\| 0\)/,
  "static score floors must combine without lowering a higher adjusted score");
assert.match(applyAbilityScores, /Math\.min\(next, bonus\.maximum\)/,
  "additive item ability bonuses must respect their declared maximum");
assert.ok(derivedStats.indexOf("restoreEquippedAbilityScoreOverrides()") < derivedStats.indexOf("applyRaceAbilityAdjustments()"),
  "the previous item override must be restored before permanent character bonuses are recalculated");
assert.ok(derivedStats.indexOf("applyRaceAbilityAdjustments()") < derivedStats.indexOf("applyEquippedAbilityScoreOverrides()"),
  "the item floor must apply after permanent character bonuses");
assert.match(defenseSources, /persistentDefenseProfile\?\.\(item\)/, "equipped persistent resistances should enter the visible defense summary");
assert.match(renderer, /function isEquipmentFieldEvent\(event\)/, "global listeners should identify Equipment field events");
assert.match(renderer, /scheduleUnlessEquipmentField\(event, schedulePreparedSpellsPanelRefresh\)/, "global prepared refreshes should defer to the equipment transaction");
assert.match(combatCommit, /const equipmentConsumed = Boolean\(action\.inventoryEntry \|\| action\.ammoEntry \|\| action\.itemResourceCost\)/, "combat should batch item, ammunition, and declared charge consumption");
assert.match(combatCommit, /if \(!equipmentConsumed\) \{[\s\S]*?updatePreparedSpellsPanel\(\)/, "combat should not duplicate equipment transaction refreshes");

console.log("transactional equipment refresh and cache wiring verified");
