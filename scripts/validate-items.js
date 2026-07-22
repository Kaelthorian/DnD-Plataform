"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const itemCatalog = require(path.join(repoRoot, "src", "engine", "items", "item-catalog.js"));
const itemAutomationRegistry = require(path.join(repoRoot, "src", "engine", "items", "item-automation-registry.js"));
const syncItems = require("./sync-items.js");
const defaultCatalog = path.join(repoRoot, "src", "data", "items", "items.json");
const defaultBaseCatalog = path.join(repoRoot, "src", "data", "items", "items-base.json");
const defaultAutomation = path.join(repoRoot, "src", "data", "items", "item-automation.json");

function parseArgs(argv) {
  const options = { catalog: defaultCatalog, baseCatalog: defaultBaseCatalog, automation: defaultAutomation, source: "", reference: "", expectedCount: 2253 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--catalog") options.catalog = path.resolve(argv[++index] || defaultCatalog);
    else if (arg === "--base-catalog") options.baseCatalog = path.resolve(argv[++index] || defaultBaseCatalog);
    else if (arg === "--automation") options.automation = path.resolve(argv[++index] || defaultAutomation);
    else if (arg === "--source") options.source = path.resolve(argv[++index] || "");
    else if (arg === "--reference") options.reference = path.resolve(argv[++index] || "");
    else if (arg === "--expected-count") options.expectedCount = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.expectedCount) || options.expectedCount < 1) throw new Error("--expected-count must be a positive integer.");
  if (Boolean(options.source) !== Boolean(options.reference)) throw new Error("--source and --reference must be supplied together.");
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validate(options = parseArgs([])) {
  const errors = [];
  const warnings = [];
  const itemsData = readJson(options.catalog);
  const baseData = readJson(options.baseCatalog);
  const automationPath = options.automation || (path.resolve(options.catalog) === path.resolve(defaultCatalog) ? defaultAutomation : "");
  const automationData = automationPath ? readJson(automationPath) : { schemaVersion: 1, items: [] };
  const items = Array.isArray(itemsData.item) ? itemsData.item : [];
  const baseItems = Array.isArray(baseData.baseitem) ? baseData.baseitem : [];
  if (!Array.isArray(itemsData.item)) errors.push("items.json.item must be an array.");
  if (!Array.isArray(baseData.baseitem)) errors.push("items-base.json.baseitem must be an array.");
  if (baseItems.length) errors.push(`App-owned items-base.json must contain no active baseitem records; found ${baseItems.length}.`);
  if (Number(itemsData._meta?.expectedActiveRecords) !== items.length) {
    errors.push(`items.json expectedActiveRecords does not match item length ${items.length}.`);
  }

  const identityReport = itemCatalog.validateItemCatalog(items, { expectedCount: options.expectedCount });
  errors.push(...identityReport.errors);
  const allRecords = itemCatalog.collectCatalogRecords(items);
  let automationRegistry = null;
  try {
    automationRegistry = itemAutomationRegistry.createItemAutomationRegistry({ overlay: automationData, catalog: itemsData });
    itemCatalog.setItemAutomationRegistry(automationRegistry);
  } catch (error) {
    errors.push(error.message);
    itemCatalog.setItemAutomationRegistry(null);
  }
  allRecords.forEach((record) => {
    for (const field of ["catalogId", "catalogKey", "catalogVariantToken"]) {
      if (!String(record.item?.[field] || "").trim()) errors.push(`${record.location}: missing generated ${field}.`);
    }
    if (record.specific && !String(record.item?.catalogParentId || "").trim()) errors.push(`${record.location}: missing catalogParentId.`);
  });

  const activeIds = new Set(allRecords.map((record) => record.item?.catalogId).filter(Boolean));
  const tombstones = Array.isArray(itemsData.tombstone) ? itemsData.tombstone : [];
  const tombstoneIds = new Set();
  tombstones.forEach((entry, index) => {
    const label = `tombstone[${index}]`;
    if (!entry?.catalogId || !entry?.name || !entry?.source || !entry?.variantToken) errors.push(`${label}: incomplete historical identity.`);
    if (entry?.unavailable !== true || entry?.removedFromCatalog !== true) errors.push(`${label}: missing unavailable flags.`);
    if (activeIds.has(entry?.catalogId)) errors.push(`${label}: identity is active and retired simultaneously.`);
    if (tombstoneIds.has(entry?.catalogId)) errors.push(`${label}: duplicate retired catalogId.`);
    tombstoneIds.add(entry?.catalogId);
  });

  let weapons = 0;
  let armors = 0;
  let charges = 0;
  let attunement = 0;
  let spells = 0;
  let consumables = 0;
  let vehicles = 0;
  items.forEach((item, index) => {
    const profile = itemCatalog.itemAutomationProfile(item);
    if (profile.weapon.enabled) weapons += 1;
    if (profile.armor.enabled) armors += 1;
    if (profile.resources.charges != null) charges += 1;
    if (profile.attunement.required) attunement += 1;
    if (profile.spells.attached.length) spells += 1;
    if (profile.consumable) consumables += 1;
    if (profile.vehicle.enabled) vehicles += 1;
    if (/\{@[^}]*}/.test(profile.description)) errors.push(`item[${index}] ${item.name}: unresolved 5etools tag in rendered text.`);
  });

  if (options.source) {
    const canonical = readJson(options.source);
    if (!Array.isArray(canonical)) errors.push("Canonical source must be a top-level array.");
    else {
      try {
        syncItems.validateMarkdownReference(options.reference, canonical);
      } catch (error) {
        errors.push(error.message);
      }
      const storedCanonical = JSON.stringify(syncItems.stableValue(items, { stripGenerated: true }));
      const sourceCanonical = JSON.stringify(syncItems.stableValue(canonical, { stripGenerated: true }));
      if (storedCanonical !== sourceCanonical) {
        errors.push("Active app-owned catalog does not exactly match the canonical JSON after generated metadata is removed.");
      }
    }
  }

  for (const field of ["itemProperty", "itemType", "itemMastery"]) {
    if (!Array.isArray(baseData[field])) warnings.push(`items-base.json.${field} is not an array.`);
  }
  itemCatalog.setItemAutomationRegistry(null);
  const report = {
    ok: errors.length === 0,
    records: items.length,
    specificVariants: identityReport.specificVariants,
    identities: identityReport.identities,
    automationDefinitions: automationRegistry?.size || 0,
    tombstones: tombstones.length,
    baseItems: baseItems.length,
    categories: { weapons, armors, charges, attunement, spells, consumables, vehicles },
    warnings,
    errors
  };
  return report;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = validate(options);
  const stream = report.ok ? console.log : console.error;
  stream(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
  return report;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error?.stack || error);
    process.exitCode = 1;
  }
}

module.exports = { main, parseArgs, validate };
