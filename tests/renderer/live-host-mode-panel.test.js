const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");

assert.match(source, /\{activeMode === "direct-internet" \? \(\s*<section[^>]*>\s*<div[^>]*>\s*<h3[^>]*>Direct Internet Host/);
assert.match(source, /\{activeMode === "tailscale" \? \(\s*<section[^>]*>\s*<div[^>]*>\s*<h3[^>]*>Tailscale connection/);
assert.match(source, /\{activeMode === "lan" \? \(\s*<section[^>]*>\s*<h3[^>]*>Local network \(LAN only\)<\/h3>/);
assert.match(source, /activeMode === "tailscale" \? \(\s*<span[^>]*>\{testLabel\(selfTests\.tailscale/);

console.log("Live host mode panel visibility verified.");
