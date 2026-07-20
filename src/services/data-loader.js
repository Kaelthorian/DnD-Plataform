const fs = require("fs/promises");
const path = require("path");
const { Worker } = require("worker_threads");

const SRC_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(SRC_ROOT, "..");
const APP_DATA_ROOT = path.join(SRC_ROOT, "data");
const RENDERER_ASSETS_ROOT = path.join(SRC_ROOT, "app", "renderer", "assets");
const VENDOR_DATA_ROOT = path.join(PROJECT_ROOT, "vendor", "5etools-src-main", "data");
const ITEM_CACHE_VERSION = 3;
const ITEM_AUTOMATION_SCHEMA_VERSION = 1;
const itemCatalogLoads = new Map();

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

function itemCatalogCachePath(userDataPath) {
  if (!userDataPath) return "";
  return path.join(userDataPath, "data-cache", `items-catalog-v${ITEM_CACHE_VERSION}.bin`);
}

function loadItemsInWorker({ itemsPath, baseItemsPath, automationPath, cachePath }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "workers", "item-data-worker.js"), {
      workerData: {
        cacheVersion: ITEM_CACHE_VERSION,
        itemsPath,
        baseItemsPath,
        automationPath,
        automationSchemaVersion: ITEM_AUTOMATION_SCHEMA_VERSION,
        cachePath
      }
    });
    let settled = false;
    worker.once("message", (message) => {
      settled = true;
      if (!message?.ok) {
        reject(new Error(message?.error || "Item catalog worker failed."));
        return;
      }
      resolve({ ...message.data, cacheMeta: message.meta || {} });
    });
    worker.once("error", (error) => {
      settled = true;
      reject(error);
    });
    worker.once("exit", (code) => {
      if (!settled && code !== 0) reject(new Error(`Item catalog worker exited with code ${code}.`));
    });
  });
}

async function loadItemsDirect(itemsPath, baseItemsPath, automationPath) {
  const [items, baseItems, automation] = await Promise.all([readJson(itemsPath), readJson(baseItemsPath), readJson(automationPath)]);
  return { items, baseItems, automation, cacheMeta: { source: "direct-fallback" } };
}

function loadItems(userDataPath = "", options = {}) {
  const itemsPath = options.itemsPath || appDataPath("items", "items.json");
  const baseItemsPath = options.baseItemsPath || appDataPath("items", "items-base.json");
  const automationPath = options.automationPath || appDataPath("items", "item-automation.json");
  const cachePath = options.cachePath === undefined ? itemCatalogCachePath(userDataPath) : options.cachePath;
  const loadKey = `${itemsPath}|${baseItemsPath}|${automationPath}|schema:${ITEM_AUTOMATION_SCHEMA_VERSION}|${cachePath || "no-cache"}`;
  if (itemCatalogLoads.has(loadKey)) return itemCatalogLoads.get(loadKey);
  const load = loadItemsInWorker({ itemsPath, baseItemsPath, automationPath, cachePath })
    .catch(() => loadItemsDirect(itemsPath, baseItemsPath, automationPath));
  itemCatalogLoads.set(loadKey, load);
  return load;
}

function clearItemCatalogMemoryCache() {
  itemCatalogLoads.clear();
}

function loadConditionsDiseases() {
  return readJson(vendorDataPath("conditionsdiseases.json"));
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
  loadConditionsDiseases,
  loadLanguages,
  clearItemCatalogMemoryCache,
  ITEM_CACHE_VERSION,
  ITEM_AUTOMATION_SCHEMA_VERSION,
  paths: {
    APP_DATA_ROOT,
    RENDERER_ASSETS_ROOT,
    VENDOR_DATA_ROOT
  }
};
