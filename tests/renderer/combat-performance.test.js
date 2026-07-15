"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "src/services/workers/item-data-worker.js"), "utf8");

assert.match(renderer, /let itemLookupByName = new Map\(\)/, "renderer should maintain an indexed item lookup");
assert.match(html, /itemLookupByName\.get\(/, "item lookup should use the index");
assert.doesNotMatch(html.match(/function findItemData[\s\S]*?\n    }/)?.[0] || "", /items\.filter\(/, "findItemData must not scan the complete catalog");
assert.match(html, /combatActionCacheRevision/, "combat action snapshots should be revisioned");
assert.match(html, /withCombatCollectionMemo/, "one collection pass should memoize repeated derivations");
assert.match(renderer, /runWithConcurrency\(pageMarkers, 2/, "PDF pages should render with bounded concurrency");
assert.doesNotMatch(renderer, /disableWorker:\s*true/, "PDF.js worker must remain enabled in the desktop renderer");
assert.match(worker, /v8\.serialize/, "item catalog worker should write a compiled cache");
assert.match(worker, /persistent-cache/, "worker should identify persistent cache hits");

console.log("combat performance integration tests passed");
