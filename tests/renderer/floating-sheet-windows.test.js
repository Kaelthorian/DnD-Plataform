const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/app/renderer/styles.css"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src/app/renderer/i18n.js"), "utf8");

[
  'id="freeDiceMenu"',
  'id="itemDrawer"',
  "function createFloatingSheetWindowController",
  "function attachFloatingSheetWindow",
  'attachFloatingSheetWindow("free-dice"',
  'attachFloatingSheetWindow("character-statuses"',
  'attachFloatingSheetWindow("item-drawer"'
].forEach((needle) => assert.ok(html.includes(needle), `missing shared floating-window integration: ${needle}`));

assert.ok(html.includes("free-dice-menu floating-sheet-window"), "Free Dice does not use the shared window chrome");
assert.ok(html.includes('{ key: "8", label: "d8", expression: "d8", order: 8 }'), "Free Dice is missing d8");
assert.ok(i18n.includes('"dice.freeSubtitle": "D2, d3, d4, d6, d8, d10'), "Free Dice subtitle is missing d8");
assert.ok(html.includes("item-drawer floating-sheet-window"), "the shared left drawer does not use the floating window chrome");
assert.ok(html.includes('pickerHeader.className = "status-picker-header floating-sheet-window-header"'), "Character Statuses does not use the shared header");
assert.ok(html.includes('resizeCorner.className = "floating-sheet-window-resize floating-sheet-window-resize-corner app-resize-corner"'), "Character Statuses does not use the standard corner handle");

[
  ".floating-sheet-window-header",
  ".floating-sheet-window-collapse",
  ".floating-sheet-window-resize-right",
  ".floating-sheet-window-resize-bottom",
  ".floating-sheet-window-resize-corner",
  ".free-dice-menu.floating-sheet-window",
  ".item-drawer.floating-sheet-window",
  ".status-picker.floating-sheet-window"
].forEach((selector) => assert.ok(styles.includes(selector), `missing shared window style: ${selector}`));

assert.ok(i18n.includes('"window.collapse": "Collapse window"'), "English floating-window collapse label is missing");
assert.ok(i18n.includes('"window.expand": "Expand window"'), "English floating-window expand label is missing");
assert.ok(i18n.includes('"window.collapse": "Colapsar ventana"'), "Spanish floating-window collapse label is missing");
assert.ok(i18n.includes('"window.expand": "Expandir ventana"'), "Spanish floating-window expand label is missing");

assert.doesNotMatch(styles, /\.item-drawer\.spell-picker-drawer[\s\S]*?background-image:\s*var\(--sheet-background-image\)/, "spell drawers still reuse the character-sheet photo");
assert.doesNotMatch(styles, /\.item-drawer\.wizard-spellbook-drawer[\s\S]*?Spellbook\.png/, "wizard drawers still use the Spellbook photo");
assert.doesNotMatch(renderer, /setProperty\("--sheet-background-image"/, "renderer still publishes drawer background art");
assert.match(styles, /\.item-drawer\.floating-sheet-window \.item-drawer-body\s*\{[\s\S]*?background:\s*#171717;/, "drawer bodies do not use the DM Screen surface");
assert.match(styles, /\.item-drawer\.floating-sheet-window \.feature-list-button\.choice-complete\s*\{[\s\S]*?background:\s*#052e16;/, "completed choices do not use the dark DM Screen state");
assert.match(styles, /\.item-drawer\.floating-sheet-window \.feature-list-button\.choice-pending\s*\{[\s\S]*?background:\s*#450a0a;/, "pending choices do not use the dark DM Screen state");

assert.doesNotMatch(html, /if \(!isFreeDiceMenuOpen\(\)\) return;\s*if \(event\.target\?\.closest\?\.\("#freeDiceMenu"\)/, "Free Dice still closes on outside pointerdown");
assert.doesNotMatch(html, /if \(!statusDock \|\| statusDock\.dataset\.menuOpen !== "true"\) return;\s*if \(statusDock\.contains\(event\.target\)\) return;/, "Character Statuses still closes on outside pointerdown");

console.log("Shared floating sheet windows verified for drawers, Character Statuses, and Free Dice.");
