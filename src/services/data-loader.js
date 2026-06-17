const fs = require("fs/promises");
const path = require("path");

const SRC_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(SRC_ROOT, "..");
const APP_DATA_ROOT = path.join(SRC_ROOT, "data");
const RENDERER_ASSETS_ROOT = path.join(SRC_ROOT, "app", "renderer", "assets");
const VENDOR_DATA_ROOT = path.join(PROJECT_ROOT, "vendor", "5etools-src-main", "data");

function appDataPath(...segments) {
  return path.join(APP_DATA_ROOT, ...segments);
}

function vendorDataPath(...segments) {
  return path.join(VENDOR_DATA_ROOT, ...segments);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function loadPdfBase64() {
  const pdf = await fs.readFile(path.join(RENDERER_ASSETS_ROOT, "DnD_5E_CharacterSheet_FormFillable.pdf"));
  return pdf.toString("base64");
}

function loadRaces() {
  return readJson(appDataPath("races", "races.json"));
}

function loadBackgrounds() {
  return readJson(appDataPath("backgrounds", "backgrounds.json"));
}

function loadClasses() {
  return readJson(appDataPath("classes", "classes.json"));
}

function loadSpells() {
  return readJson(appDataPath("spells", "spells.json"));
}

function loadFeats() {
  return readJson(vendorDataPath("feats.json"));
}

async function loadItems() {
  const [items, baseItems] = await Promise.all([
    readJson(vendorDataPath("items.json")),
    readJson(vendorDataPath("items-base.json"))
  ]);
  return { items, baseItems };
}

function loadLanguages() {
  return readJson(vendorDataPath("languages.json"));
}

module.exports = {
  loadPdfBase64,
  loadRaces,
  loadBackgrounds,
  loadClasses,
  loadSpells,
  loadFeats,
  loadItems,
  loadLanguages,
  paths: {
    APP_DATA_ROOT,
    RENDERER_ASSETS_ROOT,
    VENDOR_DATA_ROOT
  }
};
