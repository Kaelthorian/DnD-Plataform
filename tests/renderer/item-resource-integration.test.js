"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src/app/renderer/i18n.js"), "utf8");

function functionBlock(source, name) {
  const startPattern = new RegExp(`^\\s*function ${name}\\(`, "m");
  const startMatch = startPattern.exec(source);
  assert.ok(startMatch, `missing ${name}`);
  const start = startMatch.index;
  const nextMatch = /^\s*function [A-Za-z0-9_$]+\(/m.exec(source.slice(start + startMatch[0].length));
  const end = nextMatch ? start + startMatch[0].length + nextMatch.index : source.length;
  return source.slice(start, end);
}

const itemResourceStateStore = functionBlock(html, "itemResourceStateStore");
const renderCatalogItemEntryText = functionBlock(html, "renderCatalogItemEntryText");
const refreshItemResourceControls = functionBlock(html, "refreshItemResourceControls");
const itemResourceInfo = functionBlock(html, "itemResourceInfo");
const adjustItemResource = functionBlock(html, "adjustItemResource");
const setItemAttuned = functionBlock(html, "setItemAttuned");
const appendItemResourceControl = functionBlock(html, "appendItemResourceControl");
const attachedSpellItemActionType = functionBlock(html, "attachedSpellItemActionType");
const itemDescriptionGrantsSpellCasting = functionBlock(html, "itemDescriptionGrantsSpellCasting");
const itemEffectStateStore = functionBlock(html, "itemEffectStateStore");
const setItemEffectActive = functionBlock(html, "setItemEffectActive");
const appendItemEffectControl = functionBlock(html, "appendItemEffectControl");
const chargedItemTurnActions = functionBlock(html, "chargedItemTurnActions");
const itemAttachedSpellsLine = functionBlock(html, "itemAttachedSpellsLine");
const validateItemResourceAction = functionBlock(html, "validateItemResourceAction");
const consumeItemResourceForAction = functionBlock(html, "consumeItemResourceForAction");
const commitCombat = functionBlock(html, "commitActiveCombatResolution");
const applyData = functionBlock(html, "applyData");

assert.match(html, /engine\/items\/item-resource-state\.js/);
assert.match(renderCatalogItemEntryText, /dndItemCatalog\?\.renderEntryText\?\.\(value, item\)/,
  "structured item details must preserve tables, rows, tags, and item placeholders");
assert.match(itemResourceStateStore, /sheetMeta\.itemResources/);
assert.match(applyData, /sheetMeta\.itemResources/,
  "saved item resource state must be restored with the character sheet");
assert.match(applyData, /sheetMeta\.itemEffects/,
  "guided item effects must survive save/load without inventing their rules");
assert.match(itemResourceInfo, /const catalogId = catalogItemId\(item\)/);
assert.match(itemResourceInfo, /ensureItemResourceState/);
assert.match(itemResourceInfo, /sheetMeta\.itemResources = ensured\.nextStore/);
assert.match(refreshItemResourceControls, /querySelectorAll\("\.item-resource-control\[data-catalog-id\]"\)/,
  "resource refresh must stay bounded to live controls");
assert.doesNotMatch(appendItemResourceControl, /document\.addEventListener/,
  "drawer renders must not leak document-level listeners");

assert.match(adjustItemResource, /itemRequiresAttunement\(item\) && !itemIsAttuned\(item\)/,
  "spending must be gated by required attunement");
assert.match(adjustItemResource, /!characterOwnsCatalogItem\(item\)/,
  "resource mutation must revalidate ownership at click/commit time");
assert.match(adjustItemResource, /adjustItemResourceState/);
assert.match(adjustItemResource, /reason: "item-resource-changed"/);
assert.match(adjustItemResource, /save: true/);
assert.match(setItemAttuned, /!characterOwnsCatalogItem\(item\)/,
  "unowned catalog records cannot acquire attunement state");
assert.match(itemEffectStateStore, /sheetMeta\.itemEffects/);
assert.match(setItemEffectActive, /!characterOwnsCatalogItem\(item\)/);
assert.match(setItemEffectActive, /delete itemEffectStateStore\(\)\[catalogId\]/,
  "guided effects must support explicit removal");
assert.match(appendItemEffectControl, /item\.effectManualGuidance/);
assert.match(appendItemEffectControl, /setItemEffectActive\(item, !itemEffectIsActive\(item\)\)/);

assert.match(appendItemResourceControl, /if \(!definition\)/,
  "non-numeric resources need an explicit manual branch");
assert.match(appendItemResourceControl, /t\("item\.resourceNonNumeric"/);
assert.match(appendItemResourceControl, /itemResourceRawGuidance\(item\)/,
  "raw recharge guidance must remain visible");
assert.match(appendItemResourceControl, /adjustItemResource\(item, -1\)/);
assert.match(appendItemResourceControl, /adjustItemResource\(item, 1\)/);
assert.match(appendItemResourceControl, /!characterOwnsCatalogItem\(item\)/,
  "resource controls must only appear for inventory items");

assert.match(html, /id: "inventory:charged-items"/);
assert.match(chargedItemTurnActions, /inferItemActionType|itemResourceActionType/);
assert.match(attachedSpellItemActionType, /findSpellByName/);
assert.match(attachedSpellItemActionType, /spellTimingActionType/,
  "each attached spell must derive its own Action, Bonus Action, or Reaction timing");
assert.match(itemDescriptionGrantsSpellCasting, /you can|you may|allows\? you to/);
assert.doesNotMatch(chargedItemTurnActions, /!type \|\| entry\.quantity/,
  "attached spells must not disappear merely because the item has no global action phrase");
assert.match(chargedItemTurnActions, /\(spell\.usage \|\| "always"\) === "always" && !grantsUnbucketedSpells/,
  "unbucketed spellbook contents must not become cast actions without a casting grant");
assert.match(chargedItemTurnActions, /declaredAttachedSpellChargeCost/);
assert.match(chargedItemTurnActions, /itemResourceCost: cost/);
assert.match(chargedItemTurnActions, /const attachedSpells = profile\?\.spells\?\.attached \|\| \[\]/);
assert.match(chargedItemTurnActions, /item\.actionManualTracking/,
  "daily/rest/will spell actions must remain explicitly manual");
assert.match(chargedItemTurnActions, /\.\.\.\(consumesCharges \? \{ itemResourceCatalogId: catalogId, itemResourceCost: cost \} : \{\}\)/,
  "only an explicit numeric charge cost may enter the transactional decrement path");
assert.match(chargedItemTurnActions, /RESOLUTION_STEPS\.selectTarget[\s\S]*RESOLUTION_STEPS\.applyEffect[\s\S]*RESOLUTION_STEPS\.confirmResult/,
  "item actions must require guided target/effect confirmation");
assert.match(chargedItemTurnActions, /item\.actionManualAdjudication/);
assert.match(itemAttachedSpellsLine, /spell\.usage \|\| "always"/);
assert.match(itemAttachedSpellsLine, /spell\.cost != null/);
assert.match(itemAttachedSpellsLine, /item\.spellUsageCost/,
  "every attached spell must expose its parsed usage and declared cost");

assert.match(validateItemResourceAction, /itemRequiresAttunement\(item\) && !itemIsAttuned\(item\)/);
assert.match(validateItemResourceAction, /!characterOwnsCatalogItem\(item\)/,
  "combat confirmation must reject an item removed after the action opened");
assert.match(validateItemResourceAction, /info\.current < cost/);
assert.match(consumeItemResourceForAction, /adjustItemResource\(validation\.item, -validation\.cost\)/);
assert.match(consumeItemResourceForAction, /validation\.cost <= 0\) return validation\.ok/,
  "manual-cost activations must never invent or decrement a charge cost");
{
  let adjustments = 0;
  const consumeManual = new Function(
    "validateItemResourceAction",
    "adjustItemResource",
    `${consumeItemResourceForAction}; return consumeItemResourceForAction({ itemActionCatalogId: "manual" });`
  );
  const result = consumeManual(
    () => ({ ok: true, item: {}, info: null, cost: 0 }),
    () => { adjustments += 1; return true; }
  );
  assert.strictEqual(result, true);
  assert.strictEqual(adjustments, 0, "a guided manual action must not decrement any resource");
}
const confirmedAt = commitCombat.indexOf("confirmCombatResolution(activeCombatResolution, actionPatch)");
const consumedAt = commitCombat.indexOf("consumeItemResourceForAction(action)");
assert.ok(confirmedAt >= 0 && consumedAt > confirmedAt,
  "declared charges may only be consumed after confirmed resolution");
assert.match(commitCombat, /const equipmentConsumed = Boolean\(action\.inventoryEntry \|\| action\.ammoEntry \|\| action\.itemResourceCost\)/,
  "charge commits must join the existing refresh transaction without replacing consumable or ammunition behavior");
assert.match(html, /const type = itemResourceActionType\(item\) \|\| ACTION_TYPES\.none/,
  "unknown consumable timing must remain a no-cost guided action instead of inventing an Action");
assert.match(html, /actionCost: \[itemResourceActionCost\(type\)\]\.filter\(Boolean\)/,
  "known timing spends its declared economy while unknown timing spends none");
assert.match(html, /if \(!item \|\| itemTypeAbbreviation\(item\) === "A" \|\| !isConsumableItem\(item\) \|\| entry\.quantity <= 0\) return \[\]/,
  "ammunition must only be consumed by a selected weapon attack, never by a standalone Use Ammo action");
assert.match(html, /const healingSentence = healing/,
  "only an unambiguous healing sentence may become an automatic consumable roll");

for (const key of [
  "item.resourceNonNumeric",
  "item.resourceManualRecharge",
  "item.actionRequiresAttunement",
  "item.actionManualAdjudication",
  "item.actionManualTracking",
  "item.spellUsageCost",
  "item.effectManualGuidance",
  "item.effectActivate",
  "item.effectDeactivate"
]) {
  const occurrences = i18n.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || [];
  assert.strictEqual(occurrences.length, 2, `${key} must exist in English and Spanish`);
}

console.log("Character Sheet item resource persistence and combat commit wiring verified");
