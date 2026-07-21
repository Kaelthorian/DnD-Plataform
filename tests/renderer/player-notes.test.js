const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/app/renderer/styles.css"), "utf8");
const server = fs.readFileSync(path.join(root, "src/services/live-sheet-server.js"), "utf8");

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
  "notesTags",
  "notesTemplateList",
  "notesTaskList",
  "notesShareToggle"
].forEach((id) => assert.ok(html.includes(`id="${id}"`), `player notes UI is missing ${id}`));

assert.ok(renderer.includes('"notes"') && renderer.includes("setSidebarView(\"notes\")"), "sidebar navigation does not support notes");
assert.ok(renderer.includes("PLAYER_NOTES_STORAGE_KEY"), "player notes do not have a local storage key");
assert.ok(renderer.includes("playerNotesScheduleShare"), "player notes sharing is not wired");
assert.ok(renderer.includes('payload?.type === "dm:notes:upsert"'), "incoming shared notes are not handled");
assert.ok(renderer.includes('payload?.type === "dm:notes:remove"'), "shared note removal is not handled");
assert.ok(styles.includes(".notes-workspace"), "player notes workspace styles are missing");
assert.ok(styles.includes(".notes-template-list"), "player notes template styles are missing");
assert.ok(styles.includes(".notes-task-list"), "player notes task styles are missing");
assert.ok(server.includes('"player:note:share"'), "live sheet server does not accept shared notes");
assert.ok(server.includes('"dm:notes:state"'), "live sheet server does not replay shared notes");
assert.ok(server.includes("MAX_SHARED_NOTE_BODY_LENGTH"), "shared note size limits are missing");

console.log("player notes renderer integration verified");
