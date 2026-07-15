"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const script = fs.readFileSync(path.resolve(__dirname, "../../scripts/ensure-dm-screen-build.js"), "utf8");
assert.match(script, /const cssSourceFiles = \[/, "DM build cache should track CSS inputs separately");
assert.match(script, /const jsSourceFiles = \[/, "DM build cache should track JS inputs separately");
assert.match(script, /outputNeedsBuild\(distCss, cssSourceFiles\)/, "CSS output should only compare against CSS sources");
assert.match(script, /outputNeedsBuild\(distJs, jsSourceFiles\)/, "JS output should only compare against JS sources");
assert.doesNotMatch(script, /Math\.min\(getMtimeMs\(distCss\), getMtimeMs\(distJs\)\)/, "one stale output timestamp must not invalidate the other pipeline");

console.log("DM Screen build cache tests passed");
