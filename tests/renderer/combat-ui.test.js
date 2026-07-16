const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/app/renderer/styles.css"), "utf8");

[
  "../../engine/combat/turn-economy.js",
  "../../engine/combat/action-definitions.js",
  "../../engine/combat/resolution-engine.js",
  "../../engine/combat/combat-log.js"
].forEach((source) => assert.ok(html.includes(`<script src="${source}"></script>`), `missing ${source}`));

[
  "turnActionsReactionOrb",
  "turnActionsMovementOrb",
  "turnActionsObjectOrb",
  "turnActionsAttacksOrb",
  "turnActionsEndTurn",
  "turnActionsHeader",
  "turnActionsCollapse",
  "combatResolution",
  "combatLogList"
].forEach((id) => assert.ok(html.includes(`id="${id}"`), `missing #${id}`));

[
  "function openCombatResolution",
  "function rollActiveCombatAttack",
  "function rollActiveCombatDamage",
  "function commitActiveCombatResolution",
  "function cancelActiveCombatResolution",
  "function renderCombatLog",
  "createAttackActionDefinition",
  "createSpellActionDefinition",
  "combatOptionalDamageChoices",
  "removeItemFromEquipment(action.ammoEntry, 1)"
].forEach((needle) => assert.ok(html.includes(needle), `missing combat integration: ${needle}`));

[
  "function normalizeCombatWindowLayout",
  "function applyCombatWindowLayout",
  "function toggleTurnActionsPanelCollapsed",
  "function startCombatWindowMove",
  "function startCombatWindowResize",
  "function handleCombatWindowPointerMove",
  "dnd-character-sheet-combat-window-v1",
  'data-combat-resize-edge="right"',
  'data-combat-resize-edge="bottom"',
  'data-combat-resize-edge="corner"'
].forEach((needle) => assert.ok(html.includes(needle), `missing floating combat window integration: ${needle}`));

assert.ok(renderer.includes('turnActionsEndTurn?.addEventListener("click", requestEndCombatTurn)'), "End Turn is not wired");
assert.ok(renderer.includes('combatLogClear?.addEventListener("click", clearCombatLog)'), "combat log clear is not wired");
assert.ok(renderer.includes('turnActionsCollapse?.addEventListener("click", toggleTurnActionsPanelCollapsed)'), "combat collapse is not wired");
assert.ok(renderer.includes('turnActionsHeader?.addEventListener("pointerdown", startCombatWindowMove)'), "combat drag is not wired");
assert.ok(renderer.includes('startCombatWindowResize(event, handle.dataset.combatResizeEdge || "corner")'), "combat resize is not wired");
assert.ok(styles.includes(".combat-resolution"), "resolution UI styles missing");
assert.ok(styles.includes(".combat-log-entry"), "combat log styles missing");
assert.ok(styles.includes(".turn-actions-panel.is-collapsed"), "combat collapsed styles missing");
assert.ok(styles.includes("var(--dm-amber)"), "DM Screen visual language is missing");

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((code) => code.trim());
inlineScripts.forEach((code) => new Function(code));

console.log("combat renderer integration tests passed");
