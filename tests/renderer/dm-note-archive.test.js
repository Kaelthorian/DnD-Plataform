const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");

function functionBlock(name) {
  const startPattern = new RegExp(`^\\s*function ${name}\\(`, "m");
  const startMatch = startPattern.exec(source);
  assert.ok(startMatch, `missing ${name}`);
  const start = startMatch.index;
  const nextMatch = /^\s*function [A-Za-z0-9_$]+\(/m.exec(source.slice(start + startMatch[0].length));
  const end = nextMatch ? start + startMatch[0].length + nextMatch.index : source.length;
  return source.slice(start, end);
}

assert.match(source, /import "\.\.\/\.\.\/\.\.\/\.\.\/engine\/items\/item-catalog\.js"/);
assert.match(source, /function renderItemEntryText\(value, item = \{\}\)/);
assert.match(source, /itemCatalogEngine\?\.renderEntryText\?\.\(value, item\)/);
assert.match(functionBlock("itemPickerDescriptionSections"), /renderItemEntryText\(item\.entries, item\)/,
  "DM item detail must preserve structured tables and safe 5etools tags");
assert.match(functionBlock("ResourcePicker"), /itemPickerDescriptionSections\(selectedEntry\)/,
  "DM item picker must render the shared structured description sections");
assert.match(source, /function shouldOfferBoardNoteSave\(note\)/);
assert.match(source, /function monsterNoteHasPersistentEdits\(note\)/);
assert.match(source, /note\.monsterCustom \|\| String\(note\.titleOverride \|\| ""\)\.trim\(\)/);
assert.match(source, /normalizeMonsterTextNotes\(note\.monsterTextNotes\)\.length > 0/);
assert.match(source, /function createSavedBoardNote\(note,/);
assert.match(source, /function mergeSavedBoardNotes\(currentNotes, savedNotes\)/);
assert.match(source, /function SavedBoardNameConflictModal\(/);
assert.match(source, /function continuePendingNotesSave\(plan, requestedName = "", overwrite = false\)/);
assert.match(source, /normalizeSearch\(entry\.title\) === normalizeSearch\(title\)/);
assert.match(source, /savedBoardNoteId/);
assert.match(source, /function restoreSavedBoardNote\(savedNote, index = 0\)/);
assert.match(source, /let ITEM_ADDRESSABLE_LIBRARY = \[\]/);
assert.match(source, /let ITEM_CATALOG_BY_KEY = new Map\(\)/);
assert.match(source, /function materializeSpecificItemVariant\(parent, variant\)/);
assert.match(source, /function itemAddressableEntries\(items\)/);
assert.match(source, /function validateDmItemCatalog\(itemsData, topLevelItems, addressableItems\)/);
assert.match(source, /const expectedCount = Number\.isInteger\(declaredExpectedCount\) && declaredExpectedCount > 0 \? declaredExpectedCount : 1779/);
assert.match(source, /if \(!catalogId\) errors\.push\(`\$\{label\}: missing catalogId`\)/);
assert.match(source, /if \(!catalogKey\) errors\.push\(`\$\{label\}: missing catalogKey`\)/);
assert.match(source, /ITEM_ADDRESSABLE_LIBRARY = itemAddressableEntries\(ITEM_LIBRARY\)/);
assert.match(source, /validateDmItemCatalog\(loadedItemsData, ITEM_LIBRARY, ITEM_ADDRESSABLE_LIBRARY\)/);
assert.match(source, /ITEM_CATALOG_BY_ID = new Map\(ITEM_ADDRESSABLE_LIBRARY\.map/);
assert.match(source, /ITEM_CATALOG_BY_KEY = new Map\(ITEM_ADDRESSABLE_LIBRARY\.map/);
assert.match(source, /if \(catalogKey && ITEM_CATALOG_BY_KEY\.has\(catalogKey\)\) return ITEM_CATALOG_BY_KEY\.get\(catalogKey\)/);
assert.match(source, /if \(catalogId\) ref\.catalogId = catalogId/);
assert.match(source, /if \(catalogKey\) ref\.catalogKey = catalogKey/);
assert.match(source, /if \(entry\.catalogParentId\) ref\.parentCatalogId = String\(entry\.catalogParentId\)/);
assert.match(source, /const selectedTopLevelItem = isSpell \? null : itemTopLevelEntry\(selectedEntry\)/);
assert.match(source, /Specific variant \(\{specificVariants\.length\}\)/);
assert.match(source, /value=\{selectedEntry\.catalogParentId \? itemCatalogId\(selectedEntry\) : ""\}/);
assert.match(source, /selectedEntry\.catalogParentId \? "Sumar variante" : "Sumar item"/);
assert.match(source, /savedNotes: \[\]/);
assert.match(source, /parsed\.savedNotes\.map\(restoreSavedBoardNote\)\.filter\(Boolean\)/);
assert.match(source, /saveDmBoardState\(notes, view, savedNotes = \[\]\)/);
assert.match(source, /function requestNoteClose\(noteId, closeGroup\)/);
assert.match(source, /function tokenRemovalSaveCandidates\(entry, tokens\)/);
assert.match(source, /function removeMapTokens\(mapNoteId, pageId, tokenIds, savedNoteIds = new Map\(\)\)/);
assert.match(source, /function deleteSavedBoardNote\(savedNoteId\)/);
assert.match(source, /function pickTokenImportFiles\(\)/);
assert.match(source, /function addTokenImportFiles\(event\)/);
assert.match(source, /function confirmTokenImport\(image\)/);
assert.match(source, /aria-label="Importar imágenes de token"/);
assert.match(source, /contextMenuOpenGroups\.homebrew/);
assert.match(source, /<span>Homebrew<\/span>/);
assert.match(source, /function linkedMapTokenExistsInCollection\(note, notes\)/);
assert.match(source, /shouldOfferBoardNoteSave\(note\) && !linkedMapTokenExistsInCollection\(note, notes\)/);
assert.match(source, /function openSavedBoardNotes\(\)/);
assert.match(source, /<span>Load homebrew<\/span>/);
assert.match(source, /function SavedBoardNotesModal\(/);
assert.match(source, /const \[activeTab, setActiveTab\] = useState\("monster"\)/);
assert.match(source, /\["item", "Items"\]/);
assert.match(source, /\["monster", "Monsters"\]/);
assert.match(source, /\["spell", "Spells"\]/);
assert.match(source, /Buscar \{tabs\.find/);

const equipmentHarness = new Function(
  "sanitizeDisplayText",
  "itemVariantToken",
  "normalizeResourceName",
  "normalizeSearch",
  "isPlainObject",
  `${functionBlock("itemEquipmentReference")}
   ${functionBlock("characterEquipmentReferenceKey")}
   ${functionBlock("appendCharacterEquipmentItem")}
   return { itemEquipmentReference, appendCharacterEquipmentItem };`
)(
  (value, fallback = "") => String(value || "").replace(/\s+/g, " ").trim() || fallback,
  (item) => String(item?.catalogVariantToken || item?.variantToken || "").trim(),
  (value) => String(value || "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase(),
  (value) => String(value || "").trim().toLowerCase(),
  (value) => Boolean(value && typeof value === "object" && !Array.isArray(value))
);

const modernCloak = { name: "Cloak of Billowing", source: "XDMG", catalogVariantToken: "root" };
const legacyCloak = { name: "Cloak of Billowing", source: "WttHC", catalogVariantToken: "root" };
let equipmentText = equipmentHarness.appendCharacterEquipmentItem("", modernCloak);
assert.equal(equipmentText, "1 Cloak of Billowing [XDMG]");
assert.equal(equipmentHarness.appendCharacterEquipmentItem(equipmentText, modernCloak), equipmentText,
  "adding the same stable item reference twice must be idempotent");
equipmentText = equipmentHarness.appendCharacterEquipmentItem(equipmentText, legacyCloak);
assert.equal(equipmentText, "1 Cloak of Billowing [XDMG]\n1 Cloak of Billowing [WttHC]",
  "equal display names from different sources must remain independently addable");
assert.equal(
  equipmentHarness.itemEquipmentReference({
    name: "Adamantine Arrow",
    source: "XDMG",
    catalogVariantToken: "specific:arrow|xphb"
  }),
  "Adamantine Arrow [XDMG|specific:arrow|xphb]",
  "specific variants must preserve their complete stable token in character Equipment"
);
assert.match(source, /appendCharacterEquipmentItem\(characterEquipmentText\(targetNote\.character\), entry\)/,
  "the character item picker must pass the catalog record, not only its display name");
assert.match(source, /appendCharacterEquipmentItem\(characterEquipmentText\(targetNote\.character\), equipmentItem\)/,
  "item-note drops must pass the catalog record, not only its display name");

const itemCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../../src/data/items/items.json"), "utf8"));
const topLevelItems = Array.isArray(itemCatalog.item) ? itemCatalog.item : [];
const specificVariants = topLevelItems.flatMap((item) => (item.variants || []).map((variant) => variant.specificVariant).filter(Boolean));
const topLevelIds = new Set(topLevelItems.map((item) => item.catalogId));
const addressableIds = new Set([...topLevelItems, ...specificVariants].map((item) => item.catalogId));
assert.equal(topLevelItems.length, 1779, "DM picker source must stay at exactly 1,779 top-level rows");
assert.equal(specificVariants.length, 2431, "DM child selector must expose every specific item variant");
assert.equal(addressableIds.size, topLevelItems.length + specificVariants.length, "parents and child variants need unique addressable IDs");
assert.ok(specificVariants.every((item) => item.catalogId && item.catalogKey && item.catalogVariantToken && topLevelIds.has(item.catalogParentId)), "specific variants need stable identity metadata and a valid top-level parent");

console.log("DM note archive wiring verified.");
