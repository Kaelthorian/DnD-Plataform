const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");

assert.match(source, /const VTT_TOKEN_DRAG_PUBLISH_INTERVAL_MS = 50;/);
assert.match(source, /function sharedVttTargetKey\(note, page\)/);
assert.match(source, /function queueMapTokenDragPreviewPublish\(drag = null\)/);
assert.match(source, /function publishPendingMapTokenDragPreview\(\)/);
assert.match(source, /drag\.previewMarkerPositions = previewMarkerPositions;\s+queueMapTokenDragPreviewPublish\(drag\);/);
assert.match(source, /onMapTokenDragMove=\{updateDrag\}/);
assert.match(source, /onPointerMove=\{\(event\) => \{\s+onMapTokenDragMove\?\.\(event\);\s+event\.stopPropagation\(\);/);
assert.match(source, /onPointerUp=\{\(event\) => \{\s+onMapTokenDragEnd\?\.\(event\);\s+event\.stopPropagation\(\);/);
assert.match(source, /mapTokensShareSnapshot\(previewPage\.mapTokens, sourceViewport, \{\s+includeImage: \(\) => false\s+\}\)/);
assert.match(source, /liveSheet\.publishVttPatch\(\{\s+tokens,\s+markers: mapMarkersShareSnapshot\(previewPage\.mapMarkers, sourceViewport\),/);
assert.match(source, /publishedVttTargetKeyRef\.current !== targetKey/);

console.log("Live VTT token drag preview wiring verified.");
