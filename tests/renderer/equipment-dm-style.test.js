"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/app/renderer/styles.css"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src/app/renderer/i18n.js"), "utf8");

function functionBlock(name) {
  const start = html.indexOf(`    function ${name}(`);
  assert.notStrictEqual(start, -1, `missing ${name}`);
  const next = html.indexOf("\n    function ", start + 1);
  return html.slice(start, next === -1 ? html.length : next);
}

assert.match(html, /class="item-picker-browser"/, "the item picker should have a dedicated browser pane");
assert.match(html, /class="item-picker-detail-panel"/, "the item picker should have a dedicated detail pane");
assert.match(html, /id="itemPickerCount"/, "the picker should expose its filtered item count");
assert.match(html, /id="itemPickerDetail"/, "the picker should render selected item details in-place");
assert.match(html, /data-i18n="item\.addSelected"/, "the picker should use the explicit add-item action label");
assert.match(renderer, /const itemPickerDetail = document\.getElementById\("itemPickerDetail"\)/, "renderer wiring should capture the detail pane");
assert.match(renderer, /function refreshItemDrawerElements\(\)/, "renderer wiring should be able to refresh the drawer elements after the sheet shell changes");

const renderList = functionBlock("renderItemPickerList");
const renderDetail = functionBlock("renderItemPickerDetail");
const selectItem = functionBlock("selectPickerItem");
const createAddButton = functionBlock("createAddEquipmentButton");
const createPanel = functionBlock("createEquipmentPanel");

assert.match(renderList, /visibleItemPickerItems\(\)/, "the list should share one filtered result set");
assert.match(renderList, /itemPickerCount\.textContent/, "the list should update the visible result count");
assert.match(renderList, /renderItemPickerDetail\(\)/, "list refreshes should keep the detail pane synchronized");
assert.match(renderDetail, /buildItemDrawerContent\(selectedPickerItem\)/, "the in-place detail should reuse the canonical item renderer");
assert.doesNotMatch(selectItem, /showItemDrawer\(/, "selecting a picker row should not open a second floating drawer");
assert.match(html, /function showDrawer\(title, meta, body, drawerClass = ""\) \{\s+if \(!refreshItemDrawerElements\(\)\)/, "item inspection should refresh drawer elements before writing its title or description");
assert.match(html, /function appendText\(parent, className, text, tagName = "div", \{ allowEmpty = false \} = \{\}\)/, "item detail controls should be able to retain empty status nodes for later updates");
assert.match(html, /item-resource-status", "", "p", \{ allowEmpty: true \}/, "item resource status should create its initial empty node");
assert.match(html, /item-effect-control[\s\S]*?item-section-body", "", "p", \{ allowEmpty: true \}/, "item effect status should create its initial empty node");
assert.match(createAddButton, /fieldByLayerKey\(layer, "Equipment"\)/, "the item launcher should live in the inventory header");
assert.match(createAddButton, /button\.textContent = t\("item\.addShort"\)/, "the item launcher should have a visible localized action label");
assert.match(createPanel, /equipment-panel dm-equipment-panel/, "the sheet inventory should opt into the DM-style surface");

assert.match(styles, /\.item-picker\s*\{[\s\S]*?grid-template-columns:\s*minmax\(360px, 420px\) minmax\(0, 1fr\)/, "the picker should use the DM-style two-pane layout");
assert.match(styles, /\.item-picker-title\s*\{[\s\S]*?color:\s*#f59e0b/, "the picker title should use the amber DM accent");
assert.match(styles, /\.item-picker-add\s*\{[\s\S]*?background:\s*#f59e0b/, "the add action should use the amber DM treatment");
assert.match(styles, /\.equipment-panel\s*\{[\s\S]*?background:\s*transparent[\s\S]*?box-shadow:\s*none/, "the inventory list should preserve the sheet background");
assert.match(styles, /\.equipment-list\s*\{[\s\S]*?background:\s*transparent/, "the inventory rows should not restore an opaque list surface");
assert.match(styles, /\.equipment-name\s*\{[\s\S]*?overflow-wrap:\s*anywhere[\s\S]*?white-space:\s*normal/, "equipment names should wrap instead of being truncated");
assert.match(styles, /\.equipment-equip\.equipped\s*\{[\s\S]*?background:\s*#f59e0b/, "equipped items should have a visible amber state");
assert.match(styles, /\.add-equipment-button\s*\{[\s\S]*?color:\s*#f59e0b/, "the item launcher should match the DM accent");

assert.match(i18n, /"item\.addSelected": "Add item"/, "English should define the new add action");
assert.match(i18n, /"item\.addSelected": "Sumar item"/, "Spanish should define the new add action");
assert.match(i18n, /"item\.addShort": "\+ Sumar"/, "Spanish should define the compact inventory action");

console.log("DM-style equipment picker and inventory wiring verified");
