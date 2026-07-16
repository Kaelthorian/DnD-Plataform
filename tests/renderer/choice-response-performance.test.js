"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");

function functionBlock(source, name) {
  const start = source.indexOf(`    function ${name}(`);
  assert.notStrictEqual(start, -1, `missing ${name}`);
  const next = source.indexOf("\n    function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

const featureSetter = functionBlock(html, "setSelectedFeatureChoices");
const generalChoiceSetter = functionBlock(html, "setSelectedChoice");
const derivedScheduler = functionBlock(html, "scheduleDerivedChoiceRefresh");
const derivedStats = functionBlock(html, "updateDerivedStats");
const validationSnapshot = functionBlock(html, "createSpellValidationSnapshot");
const invalidSpellPrune = functionBlock(html, "pruneInvalidSpellSourceSelections");
const autoCantripSync = functionBlock(html, "syncAutoCantrips");
const preparedPanel = functionBlock(html, "updatePreparedSpellsPanel");
const equipmentPanel = functionBlock(html, "updateEquipmentPanel");
const spellRow = functionBlock(html, "spellPickerRow");
const raceChoiceDrawer = functionBlock(html, "buildRaceChoiceDrawerContent");
const featureDrawerScheduler = functionBlock(html, "scheduleFeatureChoiceDrawerRefresh");
const optionDescriptionScheduler = functionBlock(html, "scheduleOptionDescriptionRefresh");
const panelScheduler = functionBlock(renderer, "schedulePanelRefresh");
const afterPaint = functionBlock(renderer, "runAfterNextPaint");

assert.match(featureSetter, /scheduleDerivedChoiceRefresh\(\)/, "feature choices should schedule one derived refresh");
assert.doesNotMatch(featureSetter, /updateDerivedStats\(\)/, "feature choices must not block their input handler with derived stats");
assert.match(generalChoiceSetter, /scheduleDerivedChoiceRefresh\(\)/, "race/background choices should use the same scheduler");
assert.doesNotMatch(generalChoiceSetter, /updateDerivedStats\(\)/, "race/background choices must not run derived stats synchronously");
assert.match(derivedScheduler, /pendingDerivedChoiceRefresh/, "derived choice refreshes should coalesce");
assert.match(derivedScheduler, /runAfterNextPaint\(refresh\)/, "derived choices should allow a paint before heavy work");

assert.match(derivedStats, /withCombatCollectionMemo\(/, "one derived pass should reuse feature collection work");
assert.match(derivedStats, /createSpellValidationSnapshot\(\)/, "one derived pass should build one spell validation snapshot");
assert.match(derivedStats, /syncAutoCantrips\(spellValidationSnapshot\)/, "auto spells should reuse the validation snapshot");
assert.match(derivedStats, /pruneInvalidSpellSourceSelections\(spellValidationSnapshot\)/, "spell pruning should reuse the validation snapshot");
assert.match(validationSnapshot, /featSpellGrants/, "validation snapshot should retain feat spell grants");
assert.match(validationSnapshot, /subclassSpellGrants/, "validation snapshot should retain subclass spell grants");
assert.match(invalidSpellPrune, /spellMatchesSelection\(spell, level, snapshot\)/, "each filled spell should reuse snapshotted grants");
assert.strictEqual((autoCantripSync.match(/autoCantripNames\(/g) || []).length, 1, "auto-cantrip sync should calculate auto cantrips once");

assert.match(afterPaint, /requestAnimationFrame\(\(\) => setTimeout\(callback, 0\)\)/, "post-paint work should cross a paint and task boundary");
assert.match(panelScheduler, /runAfterNextPaint\(/, "panel rebuilds should happen after the immediate interaction paint");
assert.match(preparedPanel, /deferPanelRefreshUntilVisible\(preparedSpellsPanel/, "offscreen prepared spells should defer rendering");
assert.match(equipmentPanel, /deferPanelRefreshUntilVisible\(equipmentPanel/, "offscreen equipment should defer rendering");
assert.match(spellRow, /showOptimisticSpellPickerState\(/, "spell rows should show success before the full drawer rebuild");
assert.doesNotMatch(raceChoiceDrawer, /updateDerivedStats\(\)/, "race-choice drawer callbacks must not bypass the derived scheduler");
assert.match(raceChoiceDrawer, /runAfterNextPaint\(refresh\)/, "race-choice drawers should rebuild after the selected control paints");
assert.match(featureDrawerScheduler, /runAfterNextPaint\(refresh\)/, "complex feature drawers should rebuild after the selected control paints");
assert.match(optionDescriptionScheduler, /runAfterNextPaint\(refresh\)/, "class/background option descriptions should rebuild after the selected control paints");
assert.match(html, /optionType === "background" && activeSelectField\.value !== optionName\(option\)/, "background subchoices should not emit duplicate field events");
assert.match(html, /optionType === "class" && activeSelectField\.value !== optionName\(option\)/, "class proficiency choices should not emit duplicate field events");

console.log("choice response performance integration tests passed");
