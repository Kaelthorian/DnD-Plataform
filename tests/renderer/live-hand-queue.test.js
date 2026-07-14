const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rendererSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/renderer.js"), "utf8");
const serverSource = fs.readFileSync(path.join(__dirname, "../../src/services/live-sheet-server.js"), "utf8");

assert.match(rendererSource, /class="live-vtt-hand-panel" aria-live="polite"/);
assert.match(rendererSource, /function normalizeLiveVttHandQueue\(entries\)/);
assert.match(rendererSource, /function renderLiveVttHandQueue\(entries = liveVttHandQueue\)/);
assert.match(rendererSource, /ownHand\.position/);
assert.match(rendererSource, /payload\?\.type === "dm:hand:queue"/);
assert.match(rendererSource, /setLiveVttHandRaised\(Boolean\(payload\.raised\), payload\.reason \|\| "sync"\)/);
assert.match(serverSource, /type: "dm:hand:queue",\s+raisedHands/);
assert.match(serverSource, /reason: "dm",\s+raisedHands: this\.getRaisedHands\(\)/);
assert.match(serverSource, /reason: "self",\s+raisedHands: handResult\.raisedHands/);

console.log("Live player hand queue wiring verified.");
