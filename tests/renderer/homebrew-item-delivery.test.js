const assert = require("assert");
const fs = require("fs");
const path = require("path");

const dmScreen = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/dm-screen/src/main.jsx"), "utf8");
const characterSheet = fs.readFileSync(path.join(__dirname, "../../src/app/renderer/index.html"), "utf8");
const liveServer = fs.readFileSync(path.join(__dirname, "../../src/services/live-sheet-server.js"), "utf8");

assert.match(dmScreen, /function homebrewItemFromDraft\(draft\)[\s\S]*?normalizeHomebrewItem\(/,
  "new DM homebrew items must receive a stable snapshot identity");
assert.match(dmScreen, /function HomebrewItemGrantModal\([\s\S]*?Cantidad[\s\S]*?Jugadores conectados/,
  "the DM must be able to select players and a quantity for a homebrew item");
assert.match(dmScreen, /function giveHomebrewItemToPlayers\([\s\S]*?updatePlayerSheet\([\s\S]*?__homebrewItems/,
  "homebrew delivery must update the player sheet and send the item snapshot");
assert.match(dmScreen, /onGiveHomebrewItem=\{openHomebrewItemGrant\}/,
  "homebrew resource notes must expose the delivery action");

assert.match(characterSheet, /function findHomebrewItemData\([\s\S]*?homebrewItemsStore\(\)/,
  "the character sheet must resolve delivered homebrew snapshots");
assert.match(characterSheet, /function applyLiveSheetPatch\([\s\S]*?patch\.__homebrewItems[\s\S]*?sheetMeta\.homebrewItems/,
  "the player must merge delivered homebrew snapshots into sheet metadata");
assert.match(characterSheet, /function equipmentItemKey\([\s\S]*?reference\.homebrewId/,
  "homebrew inventory entries must have identity-safe equipment state keys");
assert.match(characterSheet, /buildItemDrawerContent\([\s\S]*?item\.homebrewProperties[\s\S]*?Propiedades homebrew/,
  "the player item drawer must show homebrew functionality metadata");

assert.match(liveServer, /normalizedKey === "__homebrewItems"[\s\S]*?sanitizeHomebrewItems\(value\)/,
  "the Live Sheet server must validate homebrew item snapshots in patches");

console.log("Homebrew item delivery and player inventory wiring verified");
