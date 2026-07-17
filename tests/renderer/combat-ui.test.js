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
  "turnActionsTranslate",
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
  "function combatTargetRoster",
  "function appendCombatTargetOptions",
  "dndLiveVttCombatTargetRoster",
  'document.createElement("select")',
  't("turn.targetParty")',
  't("turn.targetEnemies")'
].forEach((needle) => assert.ok(html.includes(needle), `missing combat target selector integration: ${needle}`));

[
  "function combatResolutionStepCompleted",
  "function combatResolutionStepLabel",
  'turnActionsPanel?.classList.toggle("is-resolving"',
  "visibleResolutionSteps",
  "step !== RESOLUTION_STEPS.applyEffect",
  'className = "combat-resolution-workspace"',
  'className = "combat-resolution-section"',
  "confirm.disabled = !confirmation.ok"
].forEach((needle) => assert.ok(html.includes(needle), `missing focused combat resolution workspace: ${needle}`));

assert.ok(!html.includes('t("turn.knownAc")'), "Known AC should not be shown in Start Combat");
assert.ok(!html.includes('const acInput = document.createElement("input")'), "Known AC input should be removed from Start Combat");
assert.ok(styles.includes(".turn-actions-panel.is-resolving .turn-actions-body"), "action browser should hide while resolving an action");
assert.ok(styles.includes(".combat-resolution-step.is-current"), "current resolution step styling is missing");
assert.ok(styles.includes(".combat-resolution-step.is-complete"), "completed resolution step styling is missing");

assert.ok(renderer.includes("function liveVttCombatTargetRoster"), "live VTT target roster helper is missing");
assert.ok(renderer.includes("globalThis.dndLiveVttCombatTargetRoster = liveVttCombatTargetRoster"), "live VTT target roster is not exposed to Start Combat");

[
  "function normalizeCombatWindowLayout",
  "function applyCombatWindowLayout",
  "function toggleTurnActionsPanelCollapsed",
  "function startCombatWindowMove",
  "function startCombatWindowResize",
  "function handleCombatWindowPointerMove",
  "function toggleTurnActionTranslations",
  "function renderTurnActionTranslatableText",
  "dnd-character-sheet-combat-window-v1",
  'data-combat-resize-edge="right"',
  'data-combat-resize-edge="bottom"',
  'data-combat-resize-edge="corner"'
].forEach((needle) => assert.ok(html.includes(needle), `missing floating combat window integration: ${needle}`));

assert.ok(renderer.includes('turnActionsEndTurn?.addEventListener("click", requestEndCombatTurn)'), "End Turn is not wired");
assert.ok(renderer.includes('turnActionsTranslate?.addEventListener("click", () => toggleTurnActionTranslations().catch(console.error))'), "combat translation is not wired");
assert.ok(renderer.includes('combatLogClear?.addEventListener("click", clearCombatLog)'), "combat log clear is not wired");
assert.ok(renderer.includes('turnActionsCollapse?.addEventListener("click", toggleTurnActionsPanelCollapsed)'), "combat collapse is not wired");
assert.ok(renderer.includes('turnActionsHeader?.addEventListener("pointerdown", startCombatWindowMove)'), "combat drag is not wired");
assert.ok(renderer.includes('startCombatWindowResize(event, handle.dataset.combatResizeEdge || "corner")'), "combat resize is not wired");
assert.ok(styles.includes(".combat-resolution"), "resolution UI styles missing");
assert.ok(styles.includes(".combat-log-entry"), "combat log styles missing");
assert.ok(styles.includes(".turn-actions-panel.is-collapsed"), "combat collapsed styles missing");
assert.ok(styles.includes(".turn-actions-translate"), "combat translation styles missing");
assert.ok(styles.includes("var(--dm-amber)"), "DM Screen visual language is missing");
assert.match(styles, /\.turn-actions-orb\s*\{[\s\S]*?min-width:\s*34px[\s\S]*?max-width:\s*34px[\s\S]*?flex:\s*0 0 34px/, "top combat orbs should keep a fixed size");

const equipmentProviderStart = html.indexOf('id: "equipment:attacks"');
const equipmentProviderEnd = html.indexOf('id: "inventory:consumables"', equipmentProviderStart);
assert.ok(equipmentProviderStart >= 0 && equipmentProviderEnd > equipmentProviderStart, "equipment attack provider missing");
const equipmentProvider = html.slice(equipmentProviderStart, equipmentProviderEnd);
assert.ok(equipmentProvider.includes("turnActionWeaponSummary(row)"), "weapon actions should use the compact combat summary");
assert.ok(equipmentProvider.includes("detail: weaponSummary"), "weapon cards should show only the compact summary");
assert.ok(equipmentProvider.includes("description: weaponSummary"), "weapon resolution should retain the compact summary");
assert.ok(!equipmentProvider.includes("row.properties"), "weapon cards should not show the full property list");
assert.ok(!equipmentProvider.includes("row.description"), "weapon cards should not show the full item description");
const weaponSummaryStart = html.indexOf("function turnActionWeaponSummary(");
const weaponSummaryEnd = html.indexOf("\n    function ", weaponSummaryStart + 1);
const weaponSummary = html.slice(weaponSummaryStart, weaponSummaryEnd);
assert.ok(weaponSummary.includes('t("turn.weaponDamage"'), "weapon summary should include localized damage and type");
assert.ok(weaponSummary.includes('t("turn.weaponRange"'), "weapon summary should include localized range");

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((code) => code.trim());
inlineScripts.forEach((code) => new Function(code));

console.log("combat renderer integration tests passed");
