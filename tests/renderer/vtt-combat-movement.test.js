const assert = require("assert");
const fs = require("fs");
const path = require("path");

const dmSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");
const playerSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/renderer.js"), "utf8");
const indexSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/index.html"), "utf8");

assert.match(dmSource, /const MAP_TOKEN_SIZE = vttMovementEngine\.MASTER_TOKEN_SIZE;/);
assert.match(dmSource, /function mapTokenSpeedFeet\(token\)/);
assert.match(dmSource, /movementUsedFeet: vttMovementEngine.roundFeet/);
assert.match(dmSource, /movementRemainingFeet: timeline.movementRemainingFeet/);
assert.match(playerSource, /dndLiveVttCombatStateChanged/);
assert.match(indexSource, /movementRemainingFeet/);
assert.match(dmSource, /function startMapCombatTokenMove\(mapNoteId, pageId, tokenId, targetPoint\)/);
assert.match(dmSource, /vttMovementEngine\.resolveMovement\(\{/);
assert.match(dmSource, /mapCombatTokenKey\(page\?\.id, tokenId\)/);
assert.match(dmSource, /if \(mapCombatTimeline\(mapNote, page\)\.active\)|const combatActive = mapCombatTimeline\(mapNote, page\)\.active/);
assert.match(dmSource, /queueMapTokenDragPreviewPublish\(drag\);/);
assert.match(dmSource, /onMapCombatMoveRequest=\{startMapCombatTokenMove\}/);
assert.match(dmSource, /draggable=\{!combatTimeline\?\.active\}/);
assert.match(dmSource, /Movimiento \{vttMovementEngine\.formatFeet\(combatTimeline\.movementRemainingFeet\)\}/);
assert.match(dmSource, /1 token = 5 ft/);

assert.match(dmSource, /shapeDimensionsFeet\(marker\.width, marker\.height, MAP_TOKEN_SIZE\)/);
assert.match(dmSource, /border-t border-dashed border-white\/90/);
assert.match(dmSource, /border-l border-dashed border-white\/90/);
assert.match(dmSource, /function commitMapMarkerSizeFromMenu\(axis\)/);
assert.match(dmSource, /Ancho \(ft\)/);
assert.match(dmSource, /Alto \(ft\)/);
assert.match(dmSource, /mapUnitsFromFeet\(feet, MAP_TOKEN_SIZE\)/);
assert.match(playerSource, /live-vtt-marker-measurement-line-x/);
assert.match(playerSource, /live-vtt-marker-measurement-line-y/);
assert.match(playerSource, /vttMovementEngine\.shapeDimensionsFeet\(markerWidth, markerHeight\)/);
assert.match(playerSource, /left: calc\(100% \+ 4px\)/);
assert.match(indexSource, /engine\/combat\/vtt-movement\.js/);

console.log("VTT combat click movement and shared shape measurements verified.");
