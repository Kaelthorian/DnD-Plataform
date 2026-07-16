"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/app/renderer/styles.css"), "utf8");

const statusRule = styles.match(/\n\s*\.status\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";

assert.match(html, /const STATUS_VISIBLE_MS = 5000;/, "status popup should remain visible for five seconds");
assert.match(html, /setTimeout\(\(\) => status\.classList\.remove\("visible"\), STATUS_VISIBLE_MS\)/, "showStatus should use the shared five-second duration");
assert.match(statusRule, /padding:\s*10px 16px;/, "status popup padding should be doubled");
assert.match(statusRule, /font:\s*600 22px\/1\.35/, "status popup text should be twice the previous size");
assert.match(statusRule, /max-width:\s*min\(640px, calc\(100vw - 32px\)\);/, "large status messages should remain inside the viewport");
assert.match(styles, /\.status\.visible\s*\{[\s\S]*?opacity:\s*1;/, "status popup fade visibility contract is missing");

console.log("status popup duration and sizing verified");
