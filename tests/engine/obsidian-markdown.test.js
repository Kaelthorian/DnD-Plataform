const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "../..");
const enginePath = path.join(root, "src/engine/obsidian-markdown.js");
const engine = require(enginePath);

function parseWithTimeout(markdown) {
  const script = `const engine = require(${JSON.stringify(enginePath)}); process.stdout.write(JSON.stringify(engine.parseObsidianMarkdown(${JSON.stringify(markdown)})));`;
  const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf8", timeout: 1500 });
  assert.notStrictEqual(result.error?.code, "ETIMEDOUT", `Obsidian parser stalled for ${JSON.stringify(markdown)}`);
  assert.strictEqual(result.status, 0, result.stderr || `Obsidian parser exited with ${result.status}`);
  return JSON.parse(result.stdout || "[]");
}

const emptyBullet = parseWithTimeout("- ");
assert.strictEqual(emptyBullet[0]?.type, "list");
assert.strictEqual(emptyBullet[0]?.items?.[0]?.text, "");

const emptyOrdered = parseWithTimeout("1. ");
assert.strictEqual(emptyOrdered[0]?.type, "list");
assert.strictEqual(emptyOrdered[0]?.ordered, true);
assert.strictEqual(emptyOrdered[0]?.items?.[0]?.text, "");

const emptyHeading = parseWithTimeout("# ");
assert.strictEqual(emptyHeading[0]?.type, "heading");
assert.strictEqual(emptyHeading[0]?.text, "");

[
  "## Summary\n\nWhat happened?\n\n## Clues\n\n- \n\n## Loot\n\n- \n",
  "## NPC Profile\n\n## Goals\n\n- \n\n## Secrets\n\n- \n",
  "## Quest\n\n## Leads\n\n- \n\n## Rewards\n\n- \n"
].forEach((template) => {
  const blocks = engine.parseObsidianMarkdown(template);
  assert.ok(blocks.length >= 4, "note template should produce Markdown blocks");
});

console.log("Obsidian Markdown empty-block progress verified");
