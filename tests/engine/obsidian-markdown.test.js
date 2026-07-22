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

const table = engine.parseObsidianMarkdown("| Item | Details |\n| --- | --- |\n| Key | Opens the vault |");
assert.strictEqual(table[0]?.type, "table");
assert.deepStrictEqual(table[0]?.headers, ["Item", "Details"]);
assert.deepStrictEqual(table[0]?.rows?.[0], ["Key", "Opens the vault"]);

const underline = engine.tokenizeObsidianInline("Read the __secret__ name.");
assert.strictEqual(underline[1]?.type, "underline");
assert.strictEqual(underline[1]?.text, "secret");

[
  ["** AAA **", "bold", " AAA "],
  ["*italic*", "italic", "italic"],
  ["__underline__", "underline", "underline"],
  ["~~strike~~", "strike", "strike"],
  ["==highlight==", "highlight", "highlight"],
  ["`code`", "code", "code"]
].forEach(([source, type, text]) => {
  const shortcut = engine.findMarkdownRichShortcut(source, source.length);
  assert.strictEqual(shortcut?.type, type);
  assert.strictEqual(shortcut?.text, text);
  assert.deepStrictEqual([shortcut?.start, shortcut?.end], [0, source.length]);
});
const richLink = engine.findMarkdownRichShortcut("[Open](https://example.com)");
assert.deepStrictEqual({ type: richLink?.type, text: richLink?.text, href: richLink?.href }, { type: "link", text: "Open", href: "https://example.com" });
assert.strictEqual(engine.findMarkdownRichShortcut("**unfinished*"), null);

function applyToolbarEdit(markdown, command, start, end, options) {
  const edit = engine.createMarkdownToolbarEdit(command, markdown, start, end, options);
  assert.ok(edit, `${command} should produce a toolbar edit`);
  return {
    ...edit,
    markdown: `${markdown.slice(0, edit.start)}${edit.replacement}${markdown.slice(edit.end)}`
  };
}

const bold = applyToolbarEdit("dragon", "bold", 0, 6);
assert.strictEqual(bold.markdown, "**dragon**");
assert.deepStrictEqual([bold.selectionStart, bold.selectionEnd], [2, 8]);
assert.strictEqual(applyToolbarEdit(bold.markdown, "bold", 0, bold.markdown.length).markdown, "dragon");
const emptyBold = applyToolbarEdit("", "bold", 0, 0);
assert.strictEqual(emptyBold.markdown, "****");
assert.deepStrictEqual([emptyBold.selectionStart, emptyBold.selectionEnd], [2, 2]);
[
  ["italic", "*dragon*", "italic"],
  ["underline", "__dragon__", "underline"],
  ["strike", "~~dragon~~", "strike"],
  ["highlight", "==dragon==", "highlight"],
  ["code", "`dragon`", "code"]
].forEach(([command, expected, tokenType]) => {
  const edit = applyToolbarEdit("dragon", command, 0, 6);
  assert.strictEqual(edit.markdown, expected);
  assert.strictEqual(engine.tokenizeObsidianInline(edit.markdown)[0]?.type, tokenType);
});

const bullets = applyToolbarEdit("alpha\nbeta", "bullet", 0, 10);
assert.strictEqual(bullets.markdown, "- alpha\n- beta");
assert.strictEqual(applyToolbarEdit(bullets.markdown, "bullet", 0, bullets.markdown.length).markdown, "alpha\nbeta");
assert.strictEqual(applyToolbarEdit("alpha\nbeta", "numbered", 0, 10).markdown, "1. alpha\n2. beta");
assert.strictEqual(applyToolbarEdit("alpha\nbeta", "task", 0, 10).markdown, "- [ ] alpha\n- [ ] beta");
assert.strictEqual(applyToolbarEdit("alpha\nbeta", "quote", 0, 10).markdown, "> alpha\n> beta");
assert.strictEqual(applyToolbarEdit("before\ntitle\nafter", "heading", 9, 9).markdown, "before\n## title\nafter");

const link = applyToolbarEdit("Open ", "link", 5, 5, { linkLabel: "link" });
assert.strictEqual(link.markdown, "Open [link](https://)");
assert.strictEqual(link.selectionStart, link.selectionEnd);
assert.strictEqual(link.replacement.slice(link.selectionStart - 8, link.selectionStart), "https://");

const fencedCode = applyToolbarEdit("Before code\nline here after", "code", 7, 21);
assert.ok(fencedCode.markdown.includes("\n```\ncode\nline here\n```\n"), "multiline code should be fenced on block boundaries");
const fencedSelectionStart = fencedCode.markdown.indexOf("```");
const fencedSelectionEnd = fencedCode.markdown.lastIndexOf("```") + 3;
assert.ok(!applyToolbarEdit(fencedCode.markdown, "code", fencedSelectionStart, fencedSelectionEnd).markdown.includes("```"), "multiline code should toggle its fence off");
assert.strictEqual(applyToolbarEdit("\nalpha", "bullet", 0, 0).markdown, "- \nalpha", "line commands at document start should not skip a leading blank line");
const tableEdit = applyToolbarEdit("BeforeAfter", "table", 6, 6, { tableColumnOne: "Name", tableColumnTwo: "Details" });
assert.strictEqual(tableEdit.markdown, "Before\n| Name | Details |\n| --- | --- |\n|  |  |\nAfter");
assert.ok(engine.parseObsidianMarkdown(tableEdit.markdown).some((block) => block.type === "table"), "toolbar table should parse as a table block");

console.log("Obsidian Markdown empty-block progress verified");
