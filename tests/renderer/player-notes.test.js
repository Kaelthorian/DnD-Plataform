const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/app/renderer/styles.css"), "utf8");
const server = fs.readFileSync(path.join(root, "src/services/live-sheet-server.js"), "utf8");
const appIcons = fs.readFileSync(path.join(root, "src/app/renderer/components/icons/app-icons.js"), "utf8");
const dndIcons = fs.readFileSync(path.join(root, "src/app/renderer/components/icons/dnd-icons.js"), "utf8");

[
  "sidebarNotesButton",
  "notesWorkspace",
  "notesNewButton",
  "notesCategoryList",
  "notesFolderList",
  "notesTabs",
  "notesSearchInput",
  "notesTitleInput",
  "notesBodyInput",
  "notesBodyPreview",
  "notesPreviewToggle",
  "notesTags",
  "notesTagLibrary",
  "notesTagColors",
  "notesLinkedTags",
  "notesCategoryBrowser",
  "notesCategoryBrowserList",
  "notesTemplateList",
  "notesTaskList",
  "notesTaskReminderInput",
  "notesWordCount",
  "notesShareToggle"
].forEach((id) => assert.ok(html.includes(`id="${id}"`), `player notes UI is missing ${id}`));

assert.ok(renderer.includes('"notes"') && renderer.includes("setSidebarView(\"notes\")"), "sidebar navigation does not support notes");
assert.ok(renderer.includes("PLAYER_NOTES_STORAGE_KEY"), "player notes do not have a local storage key");
assert.ok(renderer.includes("PLAYER_NOTE_TAG_COLORS"), "player note tag colors are not modeled");
assert.ok(renderer.includes("playerNotesRenderFolderTree"), "player note folders are not rendered as a tree");
assert.ok(renderer.includes("playerNotesRenderCategoryBrowser"), "player note category browser is not wired");
assert.ok(renderer.includes("parseObsidianMarkdown"), "player notes do not use the Obsidian Markdown parser");
assert.ok(renderer.includes("tokenizeObsidianInline"), "player notes do not use Obsidian inline syntax");
assert.ok(renderer.includes("playerNotesPreviewCache"), "player note Markdown previews are not cached");
assert.ok(renderer.includes("playerNotesRenderActiveSelection"), "player note selection does not have a targeted render path");
assert.ok(renderer.includes("playerNotesScheduleShare"), "player notes sharing is not wired");
assert.ok(renderer.includes("playerNotesInsertImage"), "local note image insertion is not wired");
assert.ok(renderer.includes("attachments: []"), "local note attachments are not persisted with the notes store");
assert.ok(renderer.includes("playerNotesWordTotal"), "player notes word count is not wired");
assert.ok(renderer.includes("reminderAt"), "player note reminders are not persisted");
assert.ok(renderer.includes('payload?.type === "dm:notes:upsert"'), "incoming shared notes are not handled");
assert.ok(renderer.includes('payload?.type === "dm:notes:remove"'), "shared note removal is not handled");
assert.ok(styles.includes(".notes-workspace"), "player notes workspace styles are missing");
assert.ok(styles.includes(".notes-template-list"), "player notes template styles are missing");
assert.ok(styles.includes(".notes-task-list"), "player notes task styles are missing");
assert.ok(styles.includes(".notes-tag-library"), "player notes tag library styles are missing");
assert.ok(styles.includes(".notes-folder-row"), "player notes folder tree styles are missing");
assert.ok(styles.includes(".notes-category-browser"), "player notes category browser styles are missing");
assert.ok(styles.includes(".notes-body-preview"), "player notes Obsidian preview styles are missing");
assert.ok(styles.includes("../../assets/textures/parchment.webp"), "player notes do not use the local parchment texture");
assert.ok(html.includes('data-note-command="image"'), "player notes image command is missing");
assert.ok(html.includes("components/icons/app-icons.js"), "the reusable AppIcon layer is not loaded");
assert.ok(appIcons.includes("@typedef {Object} AppIconProps"), "AppIcon props are not typed");
["DiceIcon", "QuestIcon", "NpcIcon", "LocationIcon", "LootIcon", "SpellbookIcon", "CombatIcon", "PotionIcon", "TreasureIcon"]
  .forEach((name) => assert.ok(dndIcons.includes(`${name}:`), `semantic D&D icon export is missing ${name}`));
assert.ok(fs.existsSync(path.join(root, "src/assets/icons/d20-logo.svg")), "local d20 emblem is missing");
assert.ok(fs.existsSync(path.join(root, "src/assets/icons/dragon-emblem.svg")), "local dragon emblem is missing");
assert.ok(fs.existsSync(path.join(root, "src/assets/textures/parchment.webp")), "local parchment texture is missing");
assert.ok(html.includes("../../engine/obsidian-markdown.js"), "shared Obsidian Markdown engine is not loaded by the sheet");
assert.ok(server.includes('"player:note:share"'), "live sheet server does not accept shared notes");
assert.ok(server.includes('"dm:notes:state"'), "live sheet server does not replay shared notes");
assert.ok(server.includes("MAX_SHARED_NOTE_BODY_LENGTH"), "shared note size limits are missing");

const setActiveStart = renderer.indexOf("function playerNotesSetActive(");
const setActiveEnd = renderer.indexOf("\n    function ", setActiveStart + 1);
const setActiveSource = renderer.slice(setActiveStart, setActiveEnd);
assert.ok(!setActiveSource.includes("playerNotesRender();"), "switching notes should not rebuild the whole Notes workspace");
assert.ok(setActiveSource.includes("playerNotesRenderDetails();"), "switching notes should refresh the active note details");
assert.ok(!renderer.includes('notesBodyInput?.addEventListener("input", () => playerNotesUpdate({ body:'), "typing should not rebuild the Notes workspace on every keypress");

console.log("player notes renderer integration verified");
