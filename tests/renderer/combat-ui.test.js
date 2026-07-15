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

assert.ok(renderer.includes('turnActionsEndTurn?.addEventListener("click", requestEndCombatTurn)'), "End Turn is not wired");
assert.ok(renderer.includes('combatLogClear?.addEventListener("click", clearCombatLog)'), "combat log clear is not wired");
assert.ok(styles.includes(".combat-resolution"), "resolution UI styles missing");
assert.ok(styles.includes(".combat-log-entry"), "combat log styles missing");

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((code) => code.trim());
inlineScripts.forEach((code) => new Function(code));

console.log("combat renderer integration tests passed");
