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

const notifier = functionBlock("notifyEquipmentCombatStateChanged");
const setEquipped = functionBlock("setEquipped");
const setVersatileTwoHanded = functionBlock("setVersatileTwoHanded");
const pruneEquippedItems = functionBlock("pruneEquippedItems");
const toggleEquipped = functionBlock("toggleEquipped");

assert.match(notifier, /invalidateCombatActionCache\(reason\)/, "equipment changes should invalidate the combat action snapshot");
assert.match(notifier, /scheduleTurnActionsPanelRefresh\(\)/, "equipment changes should refresh an open Start Combat window");
assert.match(notifier, /scheduleCombatActionCacheWarmup\(\)/, "equipment changes should warm the cache while Start Combat is closed");
assert.match(setEquipped, /notifyEquipmentCombatStateChanged\("equipment-unequipped"\)/, "unequipping should invalidate combat actions");
assert.match(setEquipped, /notifyEquipmentCombatStateChanged\("equipment-equipped"\)/, "equipping should invalidate combat actions");
assert.match(setVersatileTwoHanded, /notifyEquipmentCombatStateChanged\("equipment-versatile"\)/, "changing a Versatile grip should invalidate combat actions");
assert.match(pruneEquippedItems, /notifyEquipmentCombatStateChanged\("equipment-pruned"\)/, "quantity-driven equipment pruning should invalidate combat actions");
assert.match(toggleEquipped, /setVersatileTwoHanded\(/, "the equipment toggle should route Versatile changes through the notifying mutator");
assert.match(toggleEquipped, /setEquipped\(/, "the equipment toggle should route equip changes through the notifying mutator");

console.log("combat equipment cache refresh wiring verified");
