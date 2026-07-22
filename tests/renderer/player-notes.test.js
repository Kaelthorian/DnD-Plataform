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
  "notesLinkForm",
  "notesLinkUrl",
  "notesTags",
  "notesTagLibrary",
  "notesTagColors",
  "notesMainFolderSelect",
  "notesCreateMainFolderButton",
  "notesMainFolderForm",
  "notesMainFolderName",
  "notesCategoryBrowser",
  "notesCategoryBrowserList",
  "notesCategoryNewButton",
  "notesTemplateList",
  "notesTaskList",
  "notesTreeContextMenu",
  "notesTreeFolderForm",
  "notesTreeDeleteButton",
  "notesShareToggle"
].forEach((id) => assert.ok(html.includes(`id="${id}"`), `player notes UI is missing ${id}`));

assert.ok(renderer.includes('"notes"') && renderer.includes("setSidebarView(\"notes\")"), "sidebar navigation does not support notes");
assert.ok(renderer.includes("PLAYER_NOTES_STORAGE_KEY"), "player notes do not have a local storage key");
assert.ok(renderer.includes("PLAYER_NOTE_TAG_COLORS"), "player note tag colors are not modeled");
assert.ok(renderer.includes("playerNotesRenderFolderTree"), "player note folders are not rendered as a tree");
assert.ok(renderer.includes("children.append(...directNotes.map(createNoteRow))"), "player notes are not nested below their folders");
assert.ok(!html.includes('id="notesLibraryList"'), "player notes still use a separate card list below the folder tree");
assert.ok(renderer.includes('addEventListener("contextmenu"'), "the folder and note tree has no secondary-click menu");
assert.ok(renderer.includes('addEventListener("dragstart"') && renderer.includes('addEventListener("drop"'), "folder and note nesting is not draggable");
assert.ok(renderer.includes("playerNotesFolderContains"), "folder drag and drop does not protect against nesting cycles");
assert.ok(renderer.includes("playerNotesDeleteFolder") && renderer.includes("playerNotesDeleteNote"), "the tree context menu cannot delete folders and notes");
assert.ok(renderer.includes("entry.parentId = parentId") && renderer.includes("note.folderId = parentId"), "folder deletion does not preserve its nested content");
assert.ok(!renderer.includes('if (!folders.length) folders.push({ id: "campaign"'), "deleting the final folder is not persistent");
assert.ok(!html.includes('class="notes-info-card"'), "the removed Note Info card is still present");
assert.ok(!html.includes('id="notesCloseTemplatesButton"'), "Templates still has a close control");
assert.ok(!html.includes('type="datetime-local"'), "Tasks still exposes the unwanted date/time field");
assert.ok(!html.includes('id="notesPreviewToggle"'), "player notes still require an Edit/Preview mode toggle");
assert.ok(renderer.includes("playerNotesRenderCategoryBrowser"), "player note category browser is not wired");
assert.ok(html.includes('data-i18n="notes.mainFolder"') && !html.includes('data-i18n="notes.linkedEntities"'), "Linked Entities was not replaced by Main folder");
assert.ok(renderer.includes("playerNotesCreateForCategory") && renderer.includes("notesCategoryNewButton?.addEventListener"), "category views cannot create notes");
assert.ok(renderer.includes("playerNotesEnsureCategoryMainFolder") && renderer.includes("playerNotesAssignMainFolder"), "category folders cannot receive active notes");
assert.ok(renderer.includes("playerNotesCreateMainFolder") && renderer.includes('parentId: "", category: ""'), "custom main folders cannot be created at the tree root");
assert.ok(renderer.includes('version: 4') && renderer.includes("folder.category"), "main-folder category metadata is not persisted");
assert.ok(renderer.includes("playerNotesCategoryForFolder(targetFolderId)"), "tree creation does not inherit its category folder");
assert.ok(renderer.includes("parseObsidianMarkdown"), "player notes do not use the Obsidian Markdown parser");
assert.ok(renderer.includes("tokenizeObsidianInline"), "player notes do not use Obsidian inline syntax");
assert.ok(renderer.includes("playerNotesPreviewCache"), "player note Markdown previews are not cached");
assert.ok(renderer.includes("playerNotesRenderActiveSelection"), "player note selection does not have a targeted render path");
assert.ok(renderer.includes("playerNotesScheduleShare"), "player notes sharing is not wired");
assert.ok(renderer.includes("playerNotesInsertImage"), "local note image insertion is not wired");
assert.ok(renderer.includes('notesBodyInput?.addEventListener("paste"') && renderer.includes("playerNotesInsertImageFiles"), "clipboard image paste is not wired through local attachments");
assert.ok(renderer.includes("attachments: []"), "local note attachments are not persisted with the notes store");
assert.ok(renderer.includes("reminderAt"), "player note reminders are not persisted");
assert.ok(renderer.includes('payload?.type === "dm:notes:upsert"'), "incoming shared notes are not handled");
assert.ok(renderer.includes('payload?.type === "dm:notes:remove"'), "shared note removal is not handled");
assert.ok(styles.includes(".notes-workspace"), "player notes workspace styles are missing");
assert.ok(styles.includes(".notes-template-list"), "player notes template styles are missing");
assert.ok(styles.includes(".notes-task-list"), "player notes task styles are missing");
assert.ok(styles.includes(".notes-tag-library"), "player notes tag library styles are missing");
assert.ok(styles.includes(".notes-folder-row"), "player notes folder tree styles are missing");
assert.ok(styles.includes(".notes-tree-children"), "player note tree path connectors are missing");
assert.ok(styles.includes(".notes-tree-note-button"), "player note tree leaf styles are missing");
assert.ok(styles.includes(".notes-category-browser"), "player notes category browser styles are missing");
assert.ok(renderer.includes("const PLAYER_NOTE_BROWSE_CATEGORIES = PLAYER_NOTES_CATEGORIES"), "not all note modules use the category browser");
assert.ok(renderer.includes('chip.className = "notes-category-note-tag"'), "category rows do not render their tags");
assert.ok(styles.includes(".notes-category-note-tags"), "category tag chip styles are missing");
assert.ok(styles.includes(".notes-main-folder-control") && styles.includes(".notes-category-new-button"), "main-folder or category creation styles are missing");
assert.ok(styles.includes(".notes-body-preview"), "player notes Obsidian preview styles are missing");
assert.ok(html.includes('id="notesBodyInput" contenteditable="true"'), "player notes body is not a single visual editing surface");
assert.ok(styles.includes(".notes-rich-editor") && !styles.includes(".notes-live-editor"), "player notes still use a split editor/preview layout");
assert.ok(renderer.includes("findMarkdownRichShortcut") && renderer.includes("playerNotesApplyTypedMarkdownShortcut"), "typed Markdown does not become visual formatting");
assert.ok(renderer.includes("playerNotesRichEditorMarkdown") && renderer.includes("playerNotesSyncRichEditor"), "visual note content is not serialized back to Markdown");
assert.ok(renderer.includes('notesBodyInput?.addEventListener("input"') && renderer.includes("playerNotesApplyTypedMarkdownShortcut();"), "the visual editor does not process formatting while typing");
assert.ok(styles.includes("../../assets/textures/parchment.webp"), "player notes do not use the local parchment texture");
assert.ok(html.includes('data-note-command="image"'), "player notes image command is missing");
[
  "undo", "redo", "heading", "bold", "italic", "underline", "strike", "bullet", "numbered", "task", "quote", "code", "highlight", "link", "image", "table"
].forEach((command) => assert.ok(html.includes(`data-note-command="${command}"`), `player notes toolbar is missing ${command}`));
assert.ok(renderer.includes("nativeCommands") && renderer.includes("playerNotesWrapRichSelection"), "player notes toolbar is not connected to rich formatting commands");
assert.ok(renderer.includes("playerNotesOpenLinkForm") && renderer.includes("playerNotesApplyLink"), "the rich editor link control is not functional");
assert.ok(renderer.includes('button.addEventListener("mousedown"'), "toolbar buttons do not preserve the textarea selection on click");
assert.ok(!renderer.includes('window.prompt("URL"'), "the link toolbar still depends on a native URL prompt");
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
