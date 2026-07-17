const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rendererSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/renderer.js"), "utf8");
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

console.log("Live VTT combat timeline wiring verified.");
