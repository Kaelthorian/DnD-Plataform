"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src/app/renderer/i18n.js"), "utf8");
const dmScreen = fs.readFileSync(path.join(root, "src/app/renderer/dm-screen/src/main.jsx"), "utf8");

function functionBlock(source, name) {
  const startPattern = new RegExp(`^\\s*function ${name}\\(`, "m");
  const startMatch = startPattern.exec(source);
  assert.ok(startMatch, `missing ${name}`);
  const start = startMatch.index;
  const nextMatch = /^\s*function [A-Za-z0-9_$]+\(/m.exec(source.slice(start + startMatch[0].length));
  const end = nextMatch ? start + startMatch[0].length + nextMatch.index : source.length;
  return source.slice(start, end);
}

const applyCatalog = functionBlock(renderer, "applyItemCatalogData");
const materializeVariant = functionBlock(renderer, "materializeSpecificItemVariant");
const catalogIndexEntries = functionBlock(renderer, "catalogIndexEntries");
const indexCatalogItem = functionBlock(renderer, "indexCatalogItem");
const pickerItems = functionBlock(html, "itemPickerItems");
const itemReferenceParts = functionBlock(html, "itemReferenceParts");
const itemEquipmentReference = functionBlock(html, "itemEquipmentReference");
const equipmentItemKey = functionBlock(html, "equipmentItemKey");
const missingHistoricalItem = functionBlock(html, "missingHistoricalItem");
const findItemData = functionBlock(html, "findItemData");
const addItemToEquipment = functionBlock(html, "addItemToEquipment");
const itemSpecificVariants = functionBlock(html, "itemSpecificVariants");
const appendVariantPicker = functionBlock(html, "appendItemVariantPicker");
const renderPickerDetail = functionBlock(html, "renderItemPickerDetail");
const selectPickerItem = functionBlock(html, "selectPickerItem");
const pruneEquippedItems = functionBlock(html, "pruneEquippedItems");
const equippedInSlot = functionBlock(html, "equippedInSlot");
const setEquipped = functionBlock(html, "setEquipped");
const updateEquipmentPanel = functionBlock(html, "updateEquipmentPanel");
const automationProfileForItem = functionBlock(html, "automationProfileForItem");
const itemRequiresAttunement = functionBlock(html, "itemRequiresAttunement");
const itemAttunementState = functionBlock(html, "itemAttunementState");
const setItemAttuned = functionBlock(html, "setItemAttuned");
const deterministicAttunementTagMatch = functionBlock(html, "deterministicAttunementTagMatch");
const itemAttunementEligibility = functionBlock(html, "itemAttunementEligibility");
const itemMagicBonusesEnabled = functionBlock(html, "itemMagicBonusesEnabled");
const weaponAttackSelection = functionBlock(html, "weaponAttackSelection");
const armorRuleFromItem = functionBlock(html, "armorRuleFromItem");
const splitRef = functionBlock(html, "splitRef");
const itemTypeData = functionBlock(html, "itemTypeData");
const itemTypeDescription = functionBlock(html, "itemTypeDescription");
const visibleItemPickerItems = functionBlock(html, "visibleItemPickerItems");
const isAccessoryItem = functionBlock(html, "isAccessoryItem");
const isConsumableItem = functionBlock(html, "isConsumableItem");
const canEquipToSlot = functionBlock(html, "canEquipToSlot");
const equippedHeldArmorClassBonus = functionBlock(html, "equippedHeldArmorClassBonus");
const equippedSavingThrowBonus = functionBlock(html, "equippedSavingThrowBonus");
const equippedSpellcastingBonuses = functionBlock(html, "equippedSpellcastingBonuses");
const itemEquipmentModesMatch = functionBlock(html, "itemEquipmentModesMatch");
const accessoryCanOccupyHand = functionBlock(html, "accessoryCanOccupyHand");
const ammunitionBaseName = functionBlock(html, "ammunitionBaseName");
const compatibleAmmunitionEntries = functionBlock(html, "compatibleAmmunitionEntries");
const ammunitionPackContent = functionBlock(html, "ammunitionPackContent");
const updateSpellcastingFields = functionBlock(html, "updateSpellcastingFields");
const selectedDefenseSources = functionBlock(html, "selectedDefenseSources");
const buildItemDrawerContent = functionBlock(html, "buildItemDrawerContent");
const dmItemPickerDescriptionSections = functionBlock(dmScreen, "itemPickerDescriptionSections");
const dmResourcePicker = functionBlock(dmScreen, "ResourcePicker");

// The app-owned `item` array is the only active top-level collection. The count
// guard makes a partial or accidentally merged catalog fail closed.
assert.match(applyCatalog, /activeSource = Array\.isArray\(itemData\?\.items\?\.item\) \? itemData\.items\.item : \[\]/);
assert.doesNotMatch(applyCatalog, /baseitem|itemGroup/,
  "base items and grouping templates must not inflate the active picker");
assert.match(applyCatalog, /expectedCount[^;]*:\s*2253/,
  "the renderer must retain the authoritative 2,253-record fallback");
assert.match(applyCatalog, /if \(items\.length !== expectedCount\) throw new Error/,
  "the renderer must reject an incomplete active catalog");
assert.match(pickerItems, /return items\s*\.filter\(\(item\) => !isCatalogItemUnavailable\(item\)\)/,
  "the picker must derive rows only from active top-level items");

const generatedCatalogPath = path.join(root, "src/data/items/items.json");
if (fs.existsSync(generatedCatalogPath)) {
  const generatedCatalog = JSON.parse(fs.readFileSync(generatedCatalogPath, "utf8"));
  assert.strictEqual(generatedCatalog.item?.length, 2253,
    "the generated active catalog must contain exactly 2,253 top-level records");
}

// Inventory keeps its legacy text representation, but new entries embed source
// and variant identity so equal display names remain distinct and idempotent.
assert.match(itemEquipmentReference, /const source = String\(item\.source \|\| "legacy"\)\.trim\(\)/);
assert.match(itemEquipmentReference, /variantToken !== "root" \|\| duplicateNameSource/);
assert.match(itemEquipmentReference, /return `\$\{item\.name\} \[\$\{source\}\$\{variantSuffix\}\]`/);
assert.match(itemReferenceParts, /suffix\[1\]\.split\("\|"\)/);
assert.match(itemReferenceParts, /hasStableReference: Boolean\([\s\S]*?catalogId/);
assert.match(equipmentItemKey, /if \(reference\.hasStableReference\)/);
assert.match(equipmentItemKey, /const stateSuffix = entry\?\.usedCopy \? "::used-copy" : ""/);
assert.match(equipmentItemKey, /return `catalog:\$\{catalogId\}\$\{stateSuffix\}`/);

// Specific variants stay below their 2,253 parent rows, while remaining
// independently indexed and selectable through the parent's detail panel.
assert.match(materializeVariant, /const specific = variant\?\.specificVariant/);
assert.match(materializeVariant, /catalogParentId:/);
assert.match(catalogIndexEntries, /const entries = \[item\]/);
assert.match(catalogIndexEntries, /entries\.push\(specific\)/);
assert.match(indexCatalogItem, /catalogIndexEntries\(item\)\.forEach/);
assert.match(itemSpecificVariants, /catalogIndexEntries\(item\)\s*\.slice\(1\)/);
assert.match(appendVariantPicker, /option\.value = catalogItemId\(variant\)/);
assert.match(appendVariantPicker, /const variant = itemLookupByCatalogId\.get\(select\.value\)/);
assert.match(appendVariantPicker, /if \(variant\) onSelectVariant\(variant\)/);
assert.match(renderPickerDetail, /appendItemVariantPicker\(detail, selectedPickerItem, selectPickerItem\)/);
assert.match(selectPickerItem, /itemPickerAdd\.disabled = !item \|\| isCatalogItemUnavailable\(item\)/);
assert.match(visibleItemPickerItems, /itemSpecificVariants\(item\)\.flatMap/,
  "specific variant names must make their parent discoverable without adding top-level rows");

// Retired or missing stable identities are unavailable for new selection, but
// stable historical inventory lines still resolve to a displayable sentinel.
assert.match(applyCatalog, /itemData\?\.items\?\.tombstone/);
assert.match(applyCatalog, /__catalogUnavailable: true/);
assert.match(applyCatalog, /retiredItems\.forEach\(indexCatalogItem\)/);
assert.match(missingHistoricalItem, /if \(!reference\.hasStableReference\) return null/);
assert.match(missingHistoricalItem, /removedFromCatalog: true/);
assert.match(findItemData, /itemLookupByCatalogId\.get\(reference\.catalogId\) \|\| missingHistoricalItem\(reference\)/);
assert.match(findItemData, /return missingHistoricalItem\(reference\)/);
assert.match(addItemToEquipment, /isCatalogItemUnavailable\(item\)\) return/,
  "unavailable records must not be addable to new inventories");

// Pruning marks a still-present historical equipment reference unavailable
// instead of deleting it. Clearing equipment removes only the equipped-state
// record; the inventory text remains until the user explicitly removes it.
assert.match(pruneEquippedItems, /if \(!item \|\| isCatalogItemUnavailable\(item\)\)/);
assert.match(pruneEquippedItems, /equippedItems\(\)\[key\] = \{ \.\.\.record, unavailable: true \}/);
assert.match(equippedInSlot, /!isCatalogItemUnavailable\(item\.item\)/,
  "an unavailable historical item must not occupy a live equipment slot");
assert.match(updateEquipmentPanel, /t\("item\.clearUnavailableEquipment"\)/);
assert.match(updateEquipmentPanel, /if \(unavailable && equipped\) equip\.addEventListener\("click", \(\) => setEquipped\(entry, item, ""\)\)/);
assert.match(setEquipped, /if \(!slot\) \{\s*delete equippedItems\(\)\[key\]/);
assert.doesNotMatch(setEquipped, /removeItemFromEquipment|equipmentLines|field\.value/,
  "clearing an unavailable equipped state must not delete inventory history");

// Canonical automation profiles feed combat and AC, while attunement is stored
// by catalog identity and gates magic bonuses until explicitly enabled.
assert.match(automationProfileForItem, /dndItemCatalog\?\.itemAutomationProfile\?\.\(item\)/);
assert.match(itemRequiresAttunement, /profile\.attunement\.required/);
assert.match(itemAttunementState, /sheetMeta\.itemAttunement/);
assert.match(setItemAttuned, /const catalogId = catalogItemId\(item\)/);
assert.match(setItemAttuned, /itemAttunementState\(\)\[catalogId\] = true/);
assert.match(deterministicAttunementTagMatch, /key === "class"/);
assert.match(deterministicAttunementTagMatch, /key === "race"/);
assert.match(deterministicAttunementTagMatch, /key === "background"/);
assert.match(deterministicAttunementTagMatch, /key === "spellcasting"/);
assert.match(itemAttunementEligibility, /hasManualCandidate/,
  "narrative attunement tags must remain an explicit guided check");
assert.match(setItemAttuned, /attuned && !eligibility\.eligible/);
assert.match(itemMagicBonusesEnabled, /!itemRequiresAttunement\(item\) \|\| itemIsAttuned\(item\)/);
assert.match(weaponAttackSelection, /const magicAttackBonus = itemWeaponAttackBonus\(item\)/);
assert.match(weaponAttackSelection, /const magicDamageBonus = itemWeaponDamageBonus\(item\)/);
assert.match(weaponAttackSelection, /const damageBonus = abilityDamageBonus \+ styleDamageBonus \+ magicDamageBonus/);
assert.match(armorRuleFromItem, /const bonus = itemArmorClassBonus\(item\)/);
assert.match(splitRef, /taggedReferenceParts/,
  "structured property/mastery references must preserve uid and note");
assert.match(itemTypeData, /resolveItemTypeMetadata/);
assert.match(itemTypeDescription, /renderCatalogItemEntryText\(entries, item\)/,
  "inherited item-type rules must be rendered alongside item entries");
assert.match(isAccessoryItem, /item\?\.wondrous === true/);
assert.match(isConsumableItem, /automationProfileForItem\(item\)\?\.consumable === true/);
assert.match(canEquipToSlot, /slot !== "accessory" && occupied/,
  "the accessory abstraction must allow multiple independently equipped worn items");
assert.match(equippedHeldArmorClassBonus, /itemHeldArmorClassBonus\(item\)/);
assert.match(html, /const heldBonus = equippedHeldArmorClassBonus\(\)/);
assert.match(equippedSavingThrowBonus, /savingThrowBonusProfile/);
assert.match(equippedSpellcastingBonuses, /spellcastingBonusProfile/);
assert.match(equippedSpellcastingBonuses, /profile\.abilities/);
assert.match(equippedSavingThrowBonus, /itemEquipmentModesMatch/);
assert.match(equippedSpellcastingBonuses, /itemEquipmentModesMatch/);
assert.match(itemEquipmentModesMatch, /equipmentModesMatch/);
assert.match(accessoryCanOccupyHand, /persistentEquipmentModes/);
assert.match(updateSpellcastingFields, /equippedSpellcastingBonuses\(ability\)/);
assert.match(ammunitionBaseName, /dndItemCatalog\?\.ammunitionBaseName\?\.\(item\)/,
  "ammunition compatibility must use the canonical engine mapping for named ammunition");
assert.match(compatibleAmmunitionEntries, /ammunition\.baseItem|ammunitionBaseName\(ammunition\)/);
assert.match(compatibleAmmunitionEntries, /itemTypeAbbreviation\(ammunition\) === "A"/);
assert.match(ammunitionPackContent, /item\.packContents\.length !== 1/);
assert.match(addItemToEquipment, /quantity \* ammunitionPack\.quantity/,
  "ammunition packs must expand into deterministic unit inventory before combat consumption");
assert.match(weaponAttackSelection, /itemWeaponAttackBonus\(ammunition\)/);
assert.match(weaponAttackSelection, /itemWeaponDamageBonus\(ammunition\)/);
assert.match(updateSpellcastingFields, /abilityModifierValue \+ itemBonuses\.saveDc/);
assert.match(updateSpellcastingFields, /abilityModifierValue \+ itemBonuses\.attack/);
assert.match(selectedDefenseSources, /uniqueEquippedCatalogItems\(\)\.forEach/);
assert.match(selectedDefenseSources, /persistentDefenseProfile/,
  "only contextually persistent item defenses may enter the passive summary");
assert.match(buildItemDrawerContent, /appendItemStat\(stats, t\("item\.bonuses"\), itemBonusLine\(item\)\)/);
assert.match(buildItemDrawerContent, /appendItemStat\(stats, t\("item\.chargesRecharge"\), itemChargesRechargeLine\(item\)\)/);
assert.match(buildItemDrawerContent, /appendItemAttunementControl\(root, item\)/);
assert.match(i18n, /"item\.unavailable":/);
assert.match(i18n, /"item\.attunement":/);
assert.match(i18n, /"item\.clearUnavailableEquipment":/);
assert.match(functionBlock(dmScreen, "splitTaggedValue"), /taggedReferenceParts/);
assert.match(functionBlock(dmScreen, "itemTypeMeta"), /resolveItemTypeMetadata/);
assert.match(functionBlock(dmScreen, "itemRuleSections"), /typeMeta\?\.entries/,
  "DM item detail must include inherited item-type rules");
assert.match(dmItemPickerDescriptionSections, /renderItemEntryText\(item\.entries, item\)/,
  "the DM item picker must retain the item's own description");
assert.match(dmItemPickerDescriptionSections, /sections\.push\(\.\.\.itemRuleSections\(item\)\)/,
  "the DM item picker must include inherited type, property, and mastery rules when entries are empty");
assert.match(dmItemPickerDescriptionSections, /itemGroupMemberNames\(item\)/,
  "item groups must expose their concrete options instead of showing a blank detail panel");
assert.match(dmResourcePicker, /selectedItemDescriptionSections\.map/,
  "clicking an item must render every available description section in the picker detail panel");
assert.match(dmResourcePicker, /No additional description is available for this catalog entry/,
  "the picker must explain genuinely empty catalog records instead of leaving a blank panel");

assert.match(functionBlock(dmScreen, "libraryEntrySearchText"), /itemSpecificVariants\(entry\)\.flatMap/,
  "DM search must discover child variants through their top-level parent");

console.log("Item catalog renderer integration contract verified");
