const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rendererSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/renderer.js"), "utf8");
const indexSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/index.html"), "utf8");
const dmScreenSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");
const serverSource = fs.readFileSync(path.join(__dirname, "../../src/services/live-sheet-server.js"), "utf8");

assert.match(dmScreenSource, /function mapCombatTimeline\(note, page\)/);
assert.match(dmScreenSource, /function advanceMapCombatTurn\(noteId, pageId\)/);
assert.match(dmScreenSource, /round: nextRound/);
assert.match(dmScreenSource, /combatTimeline=\{combatTimeline\}/);
assert.match(dmScreenSource, /combat: await mapCombatShareSnapshot|const combat = await mapCombatShareSnapshot/);
assert.match(rendererSource, /class="live-vtt-combat" aria-live="polite" hidden/);
assert.match(rendererSource, /function renderLiveVttCombat\(combat\)/);
assert.match(rendererSource, /currentRound = participants\.slice/);
assert.match(rendererSource, /\.live-vtt-combat-card\[data-active="true"\][\s\S]{0,240}border-color: #38bdf8[\s\S]{0,180}rgba\(56, 189, 248, 0\.88\)/);
assert.match(rendererSource, /nodes\.push\(divider, \.\.\.participants\.map/);
assert.match(serverSource, /function sanitizeVttCombat\(combat\)/);
assert.match(serverSource, /combat: sanitizeVttCombat\(payload\.combat\)/);
assert.match(rendererSource, /publicData\.__liveStatuses\s*=\s*Array\.isArray\(data\?\.__sheetMeta\?\.activeStatuses\)/, "the Live Sheet payload should expose only active status ids, not all private metadata");
assert.match(rendererSource, /payload\?\.type === "dm:sheet:patch"/, "the player should keep using the existing DM sheet-patch channel");
assert.match(rendererSource, /const openCombat = globalThis\.dndCharacterSheetCombatSurface\?\.open;/, "Live Sheet connection should open the combat surface");
assert.match(rendererSource, /elements\.root\.hidden = !liveVttCombatSurfaceActive/, "the VTT should stay hidden outside the combat surface");
assert.match(rendererSource, /elements\.root\.hidden = true/, "closing combat should hide the VTT instead of restoring a floating sheet");
assert.match(indexSource, /globalThis\.dndCharacterSheetCombatSurface = \{/, "combat surface API is missing");
assert.match(dmScreenSource, /function CharacterStatusBlock\(/, "live character notes should render a dedicated status section");
assert.match(dmScreenSource, /<CharacterDetailSection title=\{`Status/, "the status list should use the existing collapsible character-note surface");
assert.match(dmScreenSource, /function updateLiveCharacterStatuses\(noteId, statusIds\)/, "the DM should be able to update a connected character's statuses");
assert.match(dmScreenSource, /LIVE_STATUS_FIELD\s*=\s*"__liveStatuses"/, "the DM status editor should use the constrained Live Sheet status field");
assert.match(serverSource, /normalizedKey === "__liveStatuses"/, "the server should validate the structured status patch separately from sheet fields");

console.log("Live VTT combat timeline wiring verified.");
