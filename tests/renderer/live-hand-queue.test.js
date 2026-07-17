const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rendererSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/renderer.js"), "utf8");
const serverSource = fs.readFileSync(path.join(__dirname, "../../src/services/live-sheet-server.js"), "utf8");

const dmScreenSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");
const sheetSource = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/index.html"), "utf8");
assert.match(rendererSource, /class="live-vtt-hand-panel" aria-live="polite"/);
assert.match(rendererSource, /function normalizeLiveVttHandQueue\(entries\)/);
assert.match(rendererSource, /function renderLiveVttHandQueue\(entries = liveVttHandQueue\)/);
assert.match(rendererSource, /ownHand\.position/);
assert.match(rendererSource, /payload\?\.type === "dm:hand:queue"/);
assert.match(rendererSource, /setLiveVttHandRaised\(Boolean\(payload\.raised\), payload\.reason \|\| "sync"\)/);
assert.match(serverSource, /type: "dm:hand:queue",\s+raisedHands/);
assert.match(serverSource, /reason: "dm",\s+raisedHands: this\.getRaisedHands\(\)/);
assert.match(serverSource, /reason: "self",\s+raisedHands: handResult\.raisedHands/);

console.log("Live player hand queue wiring verified.");
assert.match(dmScreenSource, /function openLiveCharacterEquipmentPicker\(note\)[\s\S]*openResourcePicker\("item", null, \{ targetNoteId: note\.id \}\)/);
assert.match(dmScreenSource, /function openResourcePicker\(kind, spawnPoint = null, \{ search = "", selectedEntry = null, targetNoteId = "" \} = \{\}\)[\s\S]*setResourcePickerTargetNoteId\(targetNoteId\)/);
assert.match(dmScreenSource, /function addResourcePickerEntry\(entry\)[\s\S]*updateLiveCharacterField\(targetNote\.id, "Equipment", nextEquipment\)/);
assert.match(dmScreenSource, /function CharacterEquipmentBlock[\s\S]*onChooseItem\?\.\(\)[\s\S]*\+ Sumar item/);
assert.match(dmScreenSource, /activeNote\.kind === "character" \? \([\s\S]*?<CharacterNote[\s\S]*?onChooseEquipmentItem=\{openLiveCharacterEquipmentPicker\}/);
assert.match(dmScreenSource, /const remoteCharacterLevel = clamp\(Math\.trunc\(parseCharacterNumber\(character\.level, 1\)\), 1, 20\)/);
assert.match(dmScreenSource, /aria-label="Bajar nivel"[\s\S]*?commitCharacterField\("CharacterLevel", String\(remoteCharacterLevel - 1\)\)/);
assert.match(dmScreenSource, /aria-label="Subir nivel"[\s\S]*?commitCharacterField\("CharacterLevel", String\(remoteCharacterLevel \+ 1\)\)/);
assert.match(sheetSource, /function handleLockedSheetEvent\(event\) \{\s*if \(isApplyingLiveSheetPatch\) return;/);
assert.match(sheetSource, /function applyLiveSheetPatch\(patch\)[\s\S]*?isApplyingLiveSheetPatch = true;[\s\S]*?finally \{\s*isApplyingLiveSheetPatch = false;/);
