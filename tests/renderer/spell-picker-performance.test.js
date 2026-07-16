"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");

function functionBlock(name) {
  const start = html.indexOf(`    function ${name}(`);
  assert.notStrictEqual(start, -1, `missing ${name}`);
  const next = html.indexOf("\n    function ", start + 1);
  return html.slice(start, next === -1 ? html.length : next);
}

function rowPrelude(block) {
  return block.slice(0, block.indexOf("const row"));
}

const validationSnapshot = functionBlock("createSpellValidationSnapshot");
const snapshot = functionBlock("createSpellSelectionSnapshot");
const matchesSelection = functionBlock("spellMatchesSelection");
const managedRow = functionBlock("managedLearnSpellRow");
const bardRow = functionBlock("bardLearnSpellRow");
const wizardRow = functionBlock("wizardSpellListRow");
const cantripRow = functionBlock("cantripManagerRow");
const showDrawer = functionBlock("showSpellSelectionDrawer");

assert.strictEqual((validationSnapshot.match(/activeFeatSpellGrants\(\)/g) || []).length, 1, "one validation snapshot should collect feat grants once");
assert.strictEqual((validationSnapshot.match(/activeSubclassSpellGrants\(\)/g) || []).length, 1, "one validation snapshot should collect subclass grants once");
assert.match(snapshot, /createSpellValidationSnapshot\(\)/, "drawer snapshots should reuse the lightweight validation snapshot");
assert.match(snapshot, /selectedSpellCounts/, "snapshot should retain counts by spell level");
assert.match(snapshot, /spellLevelLimits/, "snapshot should retain spell limits by level");
assert.match(snapshot, /accessibleCantrips/, "snapshot should retain accessible cantrips");
assert.match(snapshot, /accessibleSpells/, "snapshot should retain accessible leveled spells");

assert.match(matchesSelection, /snapshot\?\.featSpellGrants/, "spell matching should reuse snapshotted feat grants");
assert.match(matchesSelection, /snapshot\?\.subclassSpellGrants/, "spell matching should reuse snapshotted subclass grants");
assert.doesNotMatch(rowPrelude(managedRow), /managedPreparedSpellLimit\(|getSelectedSpellCount\(|getSpellLevelLimit\(/, "managed rows must not recompute global limits");
assert.doesNotMatch(rowPrelude(bardRow), /selectedKnownSpellSet\(|selectedKnownSpellNames\(|bardKnownSpellLimit\(/, "Bard rows must use the render snapshot");
assert.doesNotMatch(rowPrelude(wizardRow), /wizardSpellbookSet\(|wizardSpellbookNames\(|wizardMaxSpellbookSpells\(/, "Wizard rows must use the render snapshot");
assert.doesNotMatch(rowPrelude(cantripRow), /selectedCantripSet\(|selectedCantripNames\(|cantripsKnownForCharacter\(/, "cantrip rows must use the render snapshot");

assert.strictEqual((showDrawer.match(/createSpellSelectionSnapshot\(\)/g) || []).length, 1, "drawer opening should create exactly one snapshot");
assert.match(showDrawer, /buildSpellSelectionDrawerContent\(field, selectedSpell, snapshot\)/, "the same snapshot should reach drawer content");
assert.match(showDrawer, /performance\?\.mark/, "drawer opening should expose a performance mark");
assert.match(html, /performance\?\.measure\?\.\("spell-picker-level-render"/, "level expansion should expose a performance measurement");

console.log("spell picker performance integration tests passed");
