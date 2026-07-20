"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const scriptPath = path.resolve(__dirname, "../../scripts/ensure-dm-screen-build.js");
const script = fs.readFileSync(scriptPath, "utf8");
const buildCache = require(scriptPath);
assert.match(script, /const cssSourceFiles = \[/, "DM build cache should track CSS inputs separately");
assert.match(script, /const jsSourceFiles = \[/, "DM build cache should track JS inputs separately");
assert.match(script, /outputNeedsBuild\(distCss, cssSourceFiles\)/, "CSS output should only compare against CSS sources");
assert.match(script, /outputsNeedBuild\(jsOutputFiles, jsSourceFiles\)/, "JS output should compare every generated chunk against its sources");
assert.doesNotMatch(script, /Math\.min\(getMtimeMs\(distCss\), getMtimeMs\(distJs\)\)/, "one stale output timestamp must not invalidate the other pipeline");
assert.equal(buildCache.jsSourceFiles.some((filePath) => filePath.endsWith(path.join("src", "data", "spells", "spells.json"))), true, "spell catalog changes must invalidate the DM JS bundle");
assert.equal(buildCache.jsSourceFiles.some((filePath) => filePath.endsWith(path.join("src", "engine", "spells", "spell-data.js"))), true, "shared spell helper changes must invalidate the DM JS bundle");
assert.equal(buildCache.jsSourceFiles.some((filePath) => filePath.endsWith(path.join("src", "engine", "items", "item-catalog.js"))), true, "shared item renderer changes must invalidate the DM JS bundle");
assert.equal(buildCache.jsOutputFiles.some((filePath) => filePath.endsWith(path.join("dist", "spells.js"))), true, "the generated spell chunk must be required");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-dm-build-cache-"));
try {
  const source = path.join(tempRoot, "source.js");
  const entry = path.join(tempRoot, "entry.js");
  const chunk = path.join(tempRoot, "chunk.js");
  fs.writeFileSync(source, "source");
  fs.writeFileSync(entry, "entry");
  fs.writeFileSync(chunk, "chunk");
  const oldTime = new Date(Date.now() - 20000);
  const newTime = new Date(Date.now() - 10000);
  fs.utimesSync(source, oldTime, oldTime);
  fs.utimesSync(entry, newTime, newTime);
  fs.utimesSync(chunk, newTime, newTime);
  assert.equal(buildCache.outputsNeedBuild([entry, chunk], [source]), false, "fresh entry and chunks should use the cache");
  fs.utimesSync(source, new Date(), new Date());
  assert.equal(buildCache.outputsNeedBuild([entry, chunk], [source]), true, "a newer imported source should invalidate every JS output");
  fs.rmSync(chunk);
  assert.equal(buildCache.outputsNeedBuild([entry, chunk], [source]), true, "a missing generated chunk should force a rebuild");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("DM Screen build cache tests passed");
