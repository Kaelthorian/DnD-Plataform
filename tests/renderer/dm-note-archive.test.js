const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");

assert.match(source, /function shouldOfferBoardNoteSave\(note\)/);
assert.match(source, /function monsterNoteHasPersistentEdits\(note\)/);
assert.match(source, /note\.monsterCustom \|\| String\(note\.titleOverride \|\| ""\)\.trim\(\)/);
assert.match(source, /normalizeMonsterTextNotes\(note\.monsterTextNotes\)\.length > 0/);
assert.match(source, /function createSavedBoardNote\(note\)/);
assert.match(source, /function restoreSavedBoardNote\(savedNote, index = 0\)/);
assert.match(source, /savedNotes: \[\]/);
assert.match(source, /parsed\.savedNotes\.map\(restoreSavedBoardNote\)\.filter\(Boolean\)/);
assert.match(source, /saveDmBoardState\(notes, view, savedNotes = \[\]\)/);
assert.match(source, /function requestNoteClose\(noteId, closeGroup\)/);
assert.match(source, /function openSavedBoardNotes\(\)/);
assert.match(source, /<span>Load<\/span>/);

console.log("DM note archive wiring verified.");
