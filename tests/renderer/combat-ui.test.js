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
  "combatBoardMain",
  "combatInitiativeSplitter",
  "combatContextSplitter",
  "combatActionSplitter",
  "combatResolution",
  "combatLogList",
  "turnActionsResourcesDock",
  "combatMapViewport",
  "combatMapEmpty",
  "combatRestTitle",
  "combatLongRestButton",
  "combatShortRestButton",
  "combatLogTitle",
  "combatToggleInitiative",
  "combatToggleContext",
  "combatToggleActions"
].forEach((id) => assert.ok(html.includes(`id="${id}"`), `missing #${id}`));

[
  "appSidebar",
  "sidebarSheetButton",
  "sidebarFreeDiceButton",
  "sidebarMenuButton",
  "sidebarMenuPanel",
  "topControlsPanel",
  "appSettingsPanel",
  "longRestButton",
  "shortRestButton"
].forEach((id) => assert.ok(html.includes(`id="${id}"`), `missing sidebar integration #${id}`));

const sidebarOrder = ["sidebarSheetButton", "turnActionsButton", "sidebarNotesButton", "sidebarFreeDiceButton"]
  .map((id) => html.indexOf(`id="${id}"`));
assert.ok(sidebarOrder.every((index, position) => index >= 0 && (position === 0 || index > sidebarOrder[position - 1])), "sidebar buttons should follow sheet, combat, notes, dice order");

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
  "function combatActionIcon",
  "removeItemFromEquipment(action.ammoEntry, 1)"
].forEach((needle) => assert.ok(html.includes(needle), `missing combat integration: ${needle}`));

[
  "function combatTargetRoster",
  "function appendCombatTargetOptions",
  "dndLiveVttCombatTargetRoster",
  'document.createElement("select")',
  't("turn.targetParty")',
  't("turn.targetEnemies")',
  'option.dataset.targetName = name',
  'targetSelect.disabled = validTargetOptions.length === 0',
  'globalThis.dndLiveVttCombatTargetsChanged'
].forEach((needle) => assert.ok(html.includes(needle), `missing combat target selector integration: ${needle}`));

[
  "function combatResolutionStepCompleted",
  "function combatResolutionStepLabel",
  'turnActionsPanel?.classList.toggle("is-resolving"',
  "visibleResolutionSteps",
  "step !== RESOLUTION_STEPS.applyEffect",
  'className = "combat-resolution-workspace"',
  'className = "combat-resolution-column combat-resolution-column-left"',
  'className = "combat-resolution-column combat-resolution-column-right"',
  'className = "combat-resolution-section"',
  "confirm.disabled = !confirmation.ok"
].forEach((needle) => assert.ok(html.includes(needle), `missing focused combat resolution workspace: ${needle}`));

assert.ok(!html.includes('t("turn.knownAc")'), "Known AC should not be shown in Start Combat");
assert.ok(!html.includes('const acInput = document.createElement("input")'), "Known AC input should be removed from Start Combat");
assert.ok(!html.includes('class="combat-active-card"'), "active turn card should be removed from combat context");
assert.ok(!renderer.includes("combatActiveName"), "active turn name renderer should be removed from combat context");
assert.ok(!renderer.includes("combatActiveMeta"), "active turn metadata renderer should be removed from combat context");
assert.ok(renderer.includes('combatLongRestButton?.addEventListener("click", longRestSpellResources)'), "combat long rest button should reuse the long rest handler");
assert.ok(renderer.includes('combatShortRestButton?.addEventListener("click", shortRestResources)'), "combat short rest button should reuse the short rest handler");
assert.ok(styles.includes(".turn-actions-panel.is-resolving .turn-actions-body"), "action browser should hide while resolving an action");
assert.ok(styles.includes(".combat-resolution-step.is-current"), "current resolution step styling is missing");
assert.ok(styles.includes(".combat-resolution-step.is-complete"), "completed resolution step styling is missing");

assert.ok(renderer.includes("function liveVttCombatTargetRoster"), "live VTT target roster helper is missing");
assert.ok(renderer.includes("globalThis.dndLiveVttCombatTargetRoster = liveVttCombatTargetRoster"), "live VTT target roster is not exposed to Start Combat");
assert.ok(renderer.includes("function visibleLiveVttCombatParticipants"), "combat tracker participant helper is missing");
assert.ok(renderer.includes("visibleLiveVttCombatParticipants(state.combat)"), "combat target roster should use the combat tracker participants");
assert.ok(renderer.includes("const combatActive = Boolean(state?.combat?.active)"), "target roster should depend on combat state, not map rendering state");
assert.ok(!renderer.includes("Array.isArray(state.tokens) ? state.tokens"), "combat target roster should not use map-only tokens");
assert.ok(html.includes("function combatTargetRoster()"), "combat target roster helper is missing");
assert.ok(renderer.includes('roster.party.unshift({ id: "sheet:self", name: selfName })'), "combat target roster should always include the local character");
assert.ok(html.includes('id: "class:bonus:lay-on-hands"'), "Lay on Hands should be a combat action");
assert.ok(html.includes('type: ACTION_TYPES.bonus'), "Lay on Hands should consume a Bonus Action");
assert.ok(html.includes('function syncCombatMovementFromLiveVtt'), "VTT movement should refresh the combat economy");
assert.ok(html.includes('#turnActionsPanel, #combatResolution, .combat-resolution'), "Character Ready must not intercept combat resolution controls");
assert.ok(renderer.includes("function applyCombatPanelVisibility"), "combat panel visibility controller is missing");
assert.ok(renderer.includes("function toggleCombatPanel"), "combat panel toggle handler is missing");
assert.ok(html.includes("function renderTurnActionStatuses"), "combat status renderer is missing");
assert.ok(html.includes("function toggleCombatStatusPicker"), "combat status picker toggle is missing");
assert.ok(html.includes("function setCombatStatusPickerOpen"), "combat status picker opener is missing");
assert.ok(html.includes("createStatusCard(definition)"), "combat statuses should reuse the sheet status card");
assert.ok(html.includes("createStatusOption(definition)"), "combat status picker should reuse the sheet status options");
assert.ok(html.includes('statusDock.dataset.combatMode = "true"'), "combat should reuse the shared status dock");
assert.ok(!html.includes('className = "status-add-button"'), "the sheet status add launcher should be removed");
assert.ok(renderer.includes("live-vtt-hand-panel"), "combat VTT hand panel is missing");

[
  "globalThis.dndCombatBoardSurface",
  "function toggleTurnActionTranslations",
  "function renderTurnActionTranslatableText",
  'document.body.classList.add("combat-screen-open")',
  'turnActionsPanel?.classList.add("is-combat-screen")',
  "globalThis.dndCombatBoardSurface?.apply?.()"
].forEach((needle) => assert.ok(html.includes(needle), `missing full-screen combat integration: ${needle}`));

[
  "combat-board-main",
  "combat-action-dock",
  "combat-map-panel",
  "combat-initiative-panel",
  "combat-resource-sidebar-body",
  "combat-context-panel",
  'data-i18n="combat.mapTitle"'
].forEach((needle) => assert.ok(html.includes(needle), `missing combat board surface: ${needle}`));

[
  "function setLiveVttCombatSurface",
  "function startCombatBoardResize",
  "function moveCombatBoardResize",
  "function setupCombatBoardResize",
  "dnd-character-sheet-combat-board-v1",
  "function renderCombatInitiative",
  "function renderCombatBoard",
  "globalThis.dndCharacterSheetVttSurface",
  "refreshLayout",
  "renderCombatBoard(state.combat)"
].forEach((needle) => assert.ok(renderer.includes(needle), `missing live VTT combat board integration: ${needle}`));

assert.ok(html.includes('setAttribute("role", "tablist")'), "combat action tablist semantics are missing");
assert.ok(html.includes("let activeTurnActionCategory = ACTION_CATEGORIES.attacks"), "combat action tab state is missing");
assert.ok(html.includes("turn-actions-tab-panel"), "combat action tab panels are missing");

assert.ok(renderer.includes('turnActionsEndTurn?.addEventListener("click", requestEndCombatTurn)'), "End Turn is not wired");
assert.ok(renderer.includes('turnActionsTranslate?.addEventListener("click", () => toggleTurnActionTranslations().catch(console.error))'), "combat translation is not wired");
assert.ok(renderer.includes('combatLogClear?.addEventListener("click", clearCombatLog)'), "combat log clear is not wired");
assert.ok(!html.includes('id="turnActionsCollapse"'), "obsolete combat collapse control should be removed");
assert.ok(!html.includes('id="turnActionsClose"'), "obsolete combat close control should be removed");
assert.ok(!renderer.includes("turnActionsCollapse?.addEventListener"), "obsolete combat collapse listener should be removed");
assert.ok(!renderer.includes("turnActionsClose?.addEventListener"), "obsolete combat close listener should be removed");
assert.ok(!renderer.includes("startCombatWindowMove"), "combat should no longer be draggable as a popup");
assert.ok(!renderer.includes("startCombatWindowResize"), "combat should no longer be resizable as a popup");
assert.ok(styles.includes(".combat-resolution"), "resolution UI styles missing");
assert.ok(styles.includes(".combat-log-entry"), "combat log styles missing");
assert.ok(styles.includes(".combat-log-headline"), "combat log headline styles missing");
assert.ok(styles.includes(".turn-actions-resources-dock"), "combat resources sidebar styles missing");
assert.ok(styles.includes(".combat-rest-card"), "combat rest card styles missing");
assert.ok(styles.includes(".combat-rest-controls"), "combat rest controls styles missing");
assert.ok(styles.includes(".combat-action-icon"), "combat action icon styles missing");
assert.ok(styles.includes(".combat-board-splitter"), "combat vertical splitters styling is missing");
assert.ok(styles.includes(".combat-action-splitter"), "combat action splitter styling is missing");
assert.ok(styles.includes(".combat-board-resizing"), "combat resize interaction styling is missing");
assert.ok(styles.includes(".turn-actions-translate"), "combat translation styles missing");
assert.ok(styles.includes("var(--dm-amber)"), "DM Screen visual language is missing");
assert.ok(styles.includes(".turn-actions-panel.is-combat-screen"), "full-screen combat surface styles are missing");
assert.ok(styles.includes("body.combat-screen-open"), "combat screen overflow lock is missing");
assert.ok(styles.includes(".combat-map-viewport"), "combat map viewport styles are missing");
assert.ok(styles.includes('.live-vtt-window[data-combat-surface="true"]'), "live VTT combat portal styles are missing");
assert.ok(styles.includes(".combat-initiative-row[data-active=\"true\"]"), "initiative active row styling is missing");
assert.ok(styles.includes(".turn-actions-tabs"), "combat action tabs styling is missing");
assert.ok(styles.includes(".turn-actions-tab[aria-selected=\"true\"]"), "active combat action tab styling is missing");
assert.ok(styles.includes(".combat-panel-toggle"), "combat panel toggle styling is missing");
assert.ok(styles.includes(".combat-board-main.is-initiative-hidden"), "initiative panel collapse styling is missing");
assert.ok(styles.includes(".turn-actions-panel.is-actions-hidden"), "action panel collapse styling is missing");
assert.ok(styles.includes(".turn-actions-active-statuses"), "combat active status separation styling is missing");
assert.ok(styles.includes(".status-dock.is-combat-mode"), "shared combat status picker styling is missing");
assert.ok(styles.includes(".combat-board-main.is-context-hidden .combat-map-panel"), "VTT protection while hiding the log is missing");
assert.ok(styles.includes(".combat-resolution-column"), "two-column combat resolution styling is missing");
assert.ok(styles.includes('.live-vtt-window[data-combat-surface="true"] .live-vtt-hand-panel'), "combat VTT hand styling is missing");
assert.match(styles, /\.live-vtt-window\[data-combat-surface="true"\] \.live-vtt-hand-panel[\s\S]{0,220}position:\s*absolute[\s\S]{0,220}bottom:\s*12px/, "combat VTT hand panel should be a lower-right overlay");
assert.ok(styles.includes("@media (min-width: 721px) and (max-width: 1271px)"), "sheet sidebar spacing breakpoint is missing");
assert.ok(styles.includes(".app-sidebar"), "character sheet sidebar styles are missing");
assert.ok(styles.includes(".app-sidebar-dice-button"), "sidebar dice button styles are missing");
assert.ok(styles.includes(".sidebar-menu-panel"), "sidebar menu styles are missing");
assert.ok(renderer.includes("function setSidebarView"), "sidebar view state is not wired");
assert.ok(renderer.includes("sidebarMenuButton?.addEventListener(\"click\""), "sidebar menu toggle is not wired");
assert.ok(renderer.includes("sidebarSheetButton?.addEventListener(\"click\""), "player sheet navigation is not wired");
assert.ok(html.includes('id="sidebarFreeDiceButton"'), "sidebar free dice button is missing");
assert.ok(html.includes("toggleFreeDiceMenu()"), "free dice menu toggle is not wired");
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
