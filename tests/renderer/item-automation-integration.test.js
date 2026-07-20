"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");

for (const modulePath of [
  "../../engine/items/item-automation-schema.js",
  "../../engine/items/item-capability-compiler.js",
  "../../engine/items/item-automation-registry.js",
  "../../engine/effects/effect-state.js",
  "../../engine/effects/effect-lifecycle.js"
]) assert.ok(html.includes(modulePath), `${modulePath} must load before the inline renderer adapter`);

assert.match(renderer, /item-automation\.json/);
assert.match(renderer, /createItemAutomationRegistry/);
assert.match(renderer, /setItemAutomationRegistry/);
assert.match(html, /function itemCapabilityTurnActions\(entry\)/);
assert.match(html, /function itemCapabilityUseStateStore\(\)/, "one-use item capabilities must persist their spent state");
assert.match(html, /function activateItemCapabilityStatus\(action\)/, "item capabilities must be able to activate a removable sheet status");
assert.match(html, /itemCapabilityUses/, "one-use item capabilities must survive save and load");
assert.match(html, /function itemCapabilityPreparedSelections\(\)/,
  "item spells and damaging capabilities must be visible in Attacks and Spellcasting");
assert.match(html, /itemCapabilityPreparedSelections\(\)/);
assert.match(html, /itemGrantedSpell/);
assert.match(html, /action\.saveDc \|\| fieldValue\("SpellSaveDC/,
  "fixed item save DCs must override the character spell save DC");
assert.match(html, /action\.selfHealing\?\.kind === "equalToDamageDealt"/,
  "life-drain actions must apply healing only after committed damage");
assert.match(html, /function processItemAutomationRecoveryEvent\(event/);
assert.match(html, /processItemAutomationRecoveryEvent\("longRest"\)/);
assert.match(html, /processItemAutomationRecoveryEvent\("shortRest"\)/);
assert.doesNotMatch(html, /processItemAutomationRecoveryEvent\("dawn"\).*applyLongRestRecovery/s,
  "Long Rest must not silently process dawn recovery");
assert.match(html, /recordCombatDamageRolls/);
assert.match(html, /damageComponents/);
assert.match(html, /selectedAreaTargetIds/);
assert.match(html, /doesNotObscureVision/);
assert.match(html, /createItemCapabilityEffect/);
assert.match(html, /consumeItemCapabilityResources/);
assert.match(html, /validateItemCapabilityAction/);
assert.match(html, /function equippedAbilityScoreOverrides\(\)/);
assert.match(html, /function applyEquippedAbilityScoreOverrides\(\)/);
assert.match(html, /function activeItemModifiers\(\)/);
assert.match(html, /function equippedItemLanguages\(\)/);
assert.match(html, /function equippedItemBenefitLines\(\)/);
assert.match(html, /requirements\.raceExcludes/,
  "declarative modifiers should support race exclusions without item-name conditionals");
assert.match(html, /sheetMeta\.itemAbilityScoreBases/,
  "static item scores must retain the underlying score for unequip and save/load restoration");

const engineAndRenderer = [
  "src/engine/items/item-automation-schema.js",
  "src/engine/items/item-automation-registry.js",
  "src/engine/items/item-capability-compiler.js",
  "src/engine/items/item-resource-state.js",
  "src/engine/effects/effect-state.js",
  "src/engine/effects/effect-lifecycle.js",
  "src/engine/combat/action-definitions.js",
  "src/engine/combat/resolution-engine.js",
  "src/app/renderer/index.html"
].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
assert.doesNotMatch(engineAndRenderer, /item\.name\s*={2,3}\s*["']Devotee's Censer/i,
  "automation must not contain a Censer name conditional");

console.log("renderer declarative item automation integration verified");
