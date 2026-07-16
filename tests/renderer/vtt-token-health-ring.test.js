const assert = require("assert");
const fs = require("fs");
const path = require("path");

const playerSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/renderer.js"), "utf8");
const dmSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");

assert.match(playerSource, /function liveVttHpRatio\(token\)/);
assert.match(playerSource, /health\.style\.setProperty\("--live-vtt-health-angle", `\$\{hpRatio \* 360\}deg`\)/);
assert.match(playerSource, /background: conic-gradient\(/);
assert.doesNotMatch(playerSource, /live-vtt-token-health-segment/);

assert.match(dmSource, /function mapTokenHpRatio\(token\)/);
assert.match(dmSource, /function MapTokenHealthRing\(\{ token \}\)/);
assert.match(dmSource, /data-token-health-ring="true"/);
assert.match(dmSource, /<MapTokenHealthRing token=\{token\} \/>/);

console.log("Player and DM VTT token health rings verified.");
