"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const syncItems = require(path.join(repoRoot, "scripts", "sync-items.js"));
const validateItems = require(path.join(repoRoot, "scripts", "validate-items.js"));

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function markdown(items) {
  return items.map((item) => `#### ${item.name}\n\n${item.name} rules.\n`).join("\n---\n\n");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function descriptorPath(descriptor, manifestPath) {
  if (descriptor.relativeTo === "manifest" || !path.isAbsolute(descriptor.path)) {
    return path.resolve(path.dirname(manifestPath), descriptor.path);
  }
  return descriptor.path;
}

function optionsFor(root, source, reference) {
  return {
    source,
    reference,
    apply: false,
    check: false,
    restoreBackup: false,
    expectedCount: 3,
    catalog: path.join(root, "app", "items.json"),
    baseCatalog: path.join(root, "app", "items-base.json"),
    preview: path.join(root, "audit", "preview.json"),
    backupDir: path.join(root, "audit", "backups"),
    backupManifest: path.join(root, "audit", "manifest.json"),
    vendorItems: path.join(root, "vendor-items.json"),
    vendorBaseItems: path.join(root, "vendor-items-base.json")
  };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-item-sync-"));
try {
  const unchanged = { name: "Kept Item", source: "TST", rarity: "none", entries: ["Same."] };
  const oldUpdated = { name: "Updated Item", source: "TST", rarity: "common", entries: ["Old."] };
  const newUpdated = { ...oldUpdated, rarity: "rare", entries: ["New {@dice 1d4} value."] };
  const deleted = { name: "Deleted Item", source: "OLD", rarity: "none", entries: ["Retire."] };
  const baseOnly = { name: "Base Only", source: "OLD", type: "G", rarity: "none", entries: [] };
  const created = {
    name: "Created Template",
    source: "NEW",
    type: "GV",
    rarity: "uncommon",
    entries: ["Created."],
    variants: [{
      base: { name: "Dagger", source: "TST" },
      specificVariant: {
        name: "Created Dagger",
        source: "NEW",
        baseItem: "dagger|tst",
        genericVariant: { name: "Created Template", source: "NEW" },
        entries: []
      }
    }]
  };
  const oldSpecificVariant = structuredClone(created.variants[0].specificVariant);
  const canonical = [unchanged, newUpdated, created];
  const source = path.join(tempRoot, "canonical.json");
  const reference = path.join(tempRoot, "canonical.md");
  writeJson(source, canonical);
  fs.writeFileSync(reference, markdown(canonical));
  writeJson(path.join(tempRoot, "vendor-items.json"), {
    _meta: { internalCopies: ["item"] },
    item: [unchanged, oldUpdated, deleted, oldSpecificVariant],
    itemGroup: []
  });
  writeJson(path.join(tempRoot, "vendor-items-base.json"), {
    _meta: { internalCopies: ["itemType"] },
    baseitem: [structuredClone(oldUpdated), baseOnly],
    itemProperty: [],
    itemType: [],
    itemTypeAdditionalEntries: [],
    itemEntry: [],
    itemMastery: []
  });

  const options = optionsFor(tempRoot, source, reference);
  const dryRun = syncItems.run(options);
  assert.equal(dryRun.applied, false);
  assert.deepStrictEqual(
    { create: dryRun.create, update: dryRun.update, delete: dryRun.delete, unchanged: dryRun.unchanged },
    { create: 1, update: 1, delete: 2, unchanged: 2 }
  );
  assert.equal(fs.existsSync(options.catalog), false, "dry-run must not create the active catalog");
  const preview = JSON.parse(fs.readFileSync(options.preview, "utf8"));
  assert.equal(preview.baseline.rawRecords, 6);
  assert.equal(preview.baseline.uniqueRecords, 5);
  assert.equal(preview.baseline.duplicateRecordsRemoved, 1);
  assert.equal(preview.baseline.uniqueAddressableIdentities, 5);
  assert.equal(preview.summary.finalSelectableIdentities, 4);
  assert.deepStrictEqual(preview.update[0].changedFields, ["entries", "rarity"]);

  options.apply = true;
  const applied = syncItems.run(options);
  assert.equal(applied.applied, true);
  const active = JSON.parse(fs.readFileSync(options.catalog, "utf8"));
  const base = JSON.parse(fs.readFileSync(options.baseCatalog, "utf8"));
  assert.equal(active.item.length, 3);
  assert.equal(active._meta.expectedActiveRecords, 3);
  assert.equal(base.baseitem.length, 0);
  assert.equal(active.tombstone.some((entry) => entry.name === "Deleted Item" && entry.unavailable === true), true);
  assert.equal(active.tombstone.some((entry) => entry.name === "Base Only" && entry.removedFromCatalog === true), true);
  assert.equal(preview.summary.delete, active.tombstone.length, "preview deletes and generated tombstones must describe the same identities");
  assert.equal(active.item[2].variants[0].specificVariant.catalogParentId, active.item[2].catalogId);
  const validation = validateItems.validate({ catalog: options.catalog, baseCatalog: options.baseCatalog, source, reference, expectedCount: 3 });
  assert.equal(validation.ok, true, validation.errors.join("\n"));

  const firstCatalog = fs.readFileSync(options.catalog, "utf8");
  const firstBase = fs.readFileSync(options.baseCatalog, "utf8");
  const firstPreview = fs.readFileSync(options.preview, "utf8");
  const firstManifest = fs.readFileSync(options.backupManifest, "utf8");
  const manifestData = JSON.parse(firstManifest);
  assert.equal(manifestData.schemaVersion, 2);
  assert.equal(manifestData.backups[0].baseline.items.relativeTo, "manifest");
  assert.equal(path.isAbsolute(manifestData.backups[0].baseline.items.path), false, "backup payloads must be portable relative to the manifest");
  assert.equal(manifestData.backups[0].outputs.items.relativeTo, "manifest");
  assert.equal(path.isAbsolute(manifestData.backups[0].outputs.items.path), false, "output descriptors must not retain stale absolute paths");
  const second = syncItems.run(options);
  assert.equal(second.applied, false);
  assert.equal(second.noOp, true);
  assert.equal(second.create, 0);
  assert.equal(second.update, 0);
  assert.equal(second.delete, 0);
  assert.equal(second.unchanged, 4);
  assert.equal(fs.readFileSync(options.catalog, "utf8"), firstCatalog, "second apply must not rewrite catalog data");
  assert.equal(fs.readFileSync(options.baseCatalog, "utf8"), firstBase, "second apply must not rewrite base metadata");
  assert.equal(fs.readFileSync(options.preview, "utf8"), firstPreview, "second apply must preserve the destructive preview");
  assert.equal(fs.readFileSync(options.backupManifest, "utf8"), firstManifest, "second apply must not append a restore point");

  options.apply = false;
  options.check = true;
  const checked = syncItems.run(options);
  assert.equal(checked.ok, true);

  const restoreOptions = {
    ...options,
    apply: false,
    check: false,
    restoreBackup: true
  };
  const changedCatalog = `${JSON.stringify({ changedAfterApply: true }, null, 2)}\n`;
  fs.writeFileSync(options.catalog, changedCatalog);
  assert.throws(() => syncItems.run(restoreOptions), /changed after apply/i, "restore must refuse a catalog changed after apply");
  assert.equal(fs.readFileSync(options.catalog, "utf8"), changedCatalog);
  assert.equal(fs.readFileSync(options.baseCatalog, "utf8"), firstBase, "refusal must not touch the other restore target");
  fs.writeFileSync(options.catalog, firstCatalog);

  const itemBackupPath = descriptorPath(manifestData.backups[0].baseline.items, options.backupManifest);
  const baseBackupPath = descriptorPath(manifestData.backups[0].baseline.baseItems, options.backupManifest);
  const hiddenBaseBackupPath = `${baseBackupPath}.missing`;
  fs.renameSync(baseBackupPath, hiddenBaseBackupPath);
  try {
    assert.throws(() => syncItems.run(restoreOptions), /backup source is missing/i);
    assert.equal(fs.readFileSync(options.catalog, "utf8"), firstCatalog, "missing payload must not change the catalog");
    assert.equal(fs.readFileSync(options.baseCatalog, "utf8"), firstBase, "missing payload must not change base metadata");
  } finally {
    fs.renameSync(hiddenBaseBackupPath, baseBackupPath);
  }

  const safetyManifest = path.join(path.dirname(options.backupManifest), "safety-manifest.json");
  const safetyManifestData = structuredClone(manifestData);
  const distinguishableBaseOutput = `${JSON.stringify({ outputState: "must survive failed restore" }, null, 2)}\n`;
  safetyManifestData.backups[0].outputs.baseItems.sha256 = sha256(distinguishableBaseOutput);
  writeJson(safetyManifest, safetyManifestData);
  const validItemBackup = fs.readFileSync(itemBackupPath);
  fs.writeFileSync(options.baseCatalog, distinguishableBaseOutput);
  fs.writeFileSync(itemBackupPath, "corrupt gzip");
  try {
    assert.throws(
      () => syncItems.run({ ...restoreOptions, backupManifest: safetyManifest }),
      /compressed backup hash mismatch|valid gzip payload/i
    );
    assert.equal(fs.readFileSync(options.catalog, "utf8"), firstCatalog, "corrupt payload must not change the catalog");
    assert.equal(
      fs.readFileSync(options.baseCatalog, "utf8"),
      distinguishableBaseOutput,
      "all payloads must be verified before the first restore write"
    );
  } finally {
    fs.writeFileSync(itemBackupPath, validItemBackup);
    fs.writeFileSync(options.baseCatalog, firstBase);
  }

  const outsideBackupPath = path.join(tempRoot, "outside-items.gz");
  fs.copyFileSync(itemBackupPath, outsideBackupPath);
  const outsideManifest = path.join(path.dirname(options.backupManifest), "outside-manifest.json");
  const outsideManifestData = structuredClone(manifestData);
  outsideManifestData.backups[0].baseline.items.path = path.relative(path.dirname(outsideManifest), outsideBackupPath).split(path.sep).join("/");
  outsideManifestData.backups[0].baseline.items.relativeTo = "manifest";
  writeJson(outsideManifest, outsideManifestData);
  assert.throws(
    () => syncItems.run({ ...restoreOptions, backupManifest: outsideManifest }),
    /outside the configured backup directory/i,
    "schema 2 payloads must remain under the configured backup directory"
  );
  assert.equal(fs.readFileSync(options.catalog, "utf8"), firstCatalog);
  assert.equal(fs.readFileSync(options.baseCatalog, "utf8"), firstBase);

  const relocatedRoot = path.join(tempRoot, "relocated");
  const relocatedAudit = path.join(relocatedRoot, "audit");
  const relocatedManifest = path.join(relocatedAudit, "manifest.json");
  fs.mkdirSync(relocatedAudit, { recursive: true });
  fs.copyFileSync(options.backupManifest, relocatedManifest);
  fs.cpSync(options.backupDir, path.join(relocatedAudit, "backups"), { recursive: true });
  const relocatedOptions = {
    ...options,
    apply: false,
    check: false,
    restoreBackup: true,
    catalog: path.join(relocatedRoot, "app", "items.json"),
    baseCatalog: path.join(relocatedRoot, "app", "items-base.json"),
    backupDir: path.join(relocatedAudit, "backups"),
    backupManifest: relocatedManifest
  };
  const parsedRelocatedRestore = syncItems.parseArgs([
    "--restore-backup", relocatedManifest,
    "--catalog", relocatedOptions.catalog,
    "--base-catalog", relocatedOptions.baseCatalog
  ]);
  assert.equal(parsedRelocatedRestore.backupDir, path.join(relocatedAudit, "backups"),
    "CLI restore must derive the portable backup directory from the selected manifest");
  const relocated = syncItems.run(relocatedOptions);
  assert.equal(relocated.restored, true);
  assert.equal(relocated.catalog, relocatedOptions.catalog);
  assert.equal(relocated.baseCatalog, relocatedOptions.baseCatalog);
  assert.equal(JSON.parse(fs.readFileSync(relocatedOptions.catalog, "utf8")).item.length, 5);
  assert.equal(JSON.parse(fs.readFileSync(relocatedOptions.baseCatalog, "utf8")).baseitem.length, 0);
  assert.equal(fs.readFileSync(options.catalog, "utf8"), firstCatalog, "relocated restore must not overwrite the original manifest output");
  assert.equal(fs.readFileSync(options.baseCatalog, "utf8"), firstBase, "relocated restore must not overwrite the original base catalog");

  const legacyManifestData = structuredClone(manifestData);
  legacyManifestData.schemaVersion = 1;
  for (const descriptor of [legacyManifestData.backups[0].baseline.items, legacyManifestData.backups[0].baseline.baseItems]) {
    descriptor.path = path.resolve(path.dirname(options.backupManifest), descriptor.path);
    delete descriptor.relativeTo;
  }
  legacyManifestData.backups[0].outputs.items = {
    ...legacyManifestData.backups[0].outputs.items,
    path: options.catalog
  };
  legacyManifestData.backups[0].outputs.baseItems = {
    ...legacyManifestData.backups[0].outputs.baseItems,
    path: options.baseCatalog
  };
  delete legacyManifestData.backups[0].outputs.items.relativeTo;
  delete legacyManifestData.backups[0].outputs.baseItems.relativeTo;
  const legacyManifest = path.join(tempRoot, "legacy-manifest.json");
  writeJson(legacyManifest, legacyManifestData);

  options.check = false;
  options.restoreBackup = true;
  options.backupManifest = legacyManifest;
  const restored = syncItems.run(options);
  assert.equal(restored.restored, true);
  const restoredItems = JSON.parse(fs.readFileSync(options.catalog, "utf8"));
  const restoredBase = JSON.parse(fs.readFileSync(options.baseCatalog, "utf8"));
  assert.equal(restoredItems.item.length, 5, "restore must recreate the deduplicated pre-sync active catalog");
  assert.equal(restoredItems._meta.expectedActiveRecords, 5);
  assert.equal(restoredBase.baseitem.length, 0);
  assert.equal(restoredItems.item.filter((item) => item.name === "Updated Item").length, 1);

  const additiveRoot = path.join(tempRoot, "additive");
  fs.mkdirSync(additiveRoot);
  const additiveSource = path.join(additiveRoot, "items.json");
  const additiveReference = path.join(additiveRoot, "items.md");
  const existingTemplate = {
    name: "Existing Template",
    source: "TST",
    type: "GV",
    variants: [{
      base: { name: "Dagger", source: "TST" },
      specificVariant: { name: "Existing Blade", source: "NEW", baseItem: "dagger|tst", entries: [] }
    }, {
      base: { name: "Dagger", source: "TST" },
      specificVariant: { name: "Existing Upgrade", source: "NEW", baseItem: "dagger|tst", entries: [] }
    }]
  };
  const baselineExistingTemplate = {
    ...structuredClone(existingTemplate),
    variants: [structuredClone(existingTemplate.variants[0])]
  };
  const newTemplate = {
    name: "New Template",
    source: "NEW",
    type: "GV",
    variants: [{
      base: { name: "Dagger", source: "TST" },
      specificVariant: { name: "New Blade", source: "NEW", baseItem: "dagger|tst", entries: [] }
    }]
  };
  const duplicateFlatVariant = structuredClone(newTemplate.variants[0].specificVariant);
  const additiveItems = [existingTemplate, newTemplate, duplicateFlatVariant];
  writeJson(additiveSource, additiveItems);
  fs.writeFileSync(additiveReference, markdown(additiveItems));
  const additiveOptions = optionsFor(additiveRoot, additiveSource, additiveReference);
  additiveOptions.addMissing = true;
  additiveOptions.expectedCount = 1;
  writeJson(additiveOptions.vendorItems, { _meta: { internalCopies: ["item"] }, item: [baselineExistingTemplate], itemGroup: [] });
  writeJson(additiveOptions.vendorBaseItems, { _meta: {}, baseitem: [], itemProperty: [], itemType: [], itemMastery: [] });
  const additiveDryRun = syncItems.run(additiveOptions);
  assert.equal(additiveDryRun.applied, false);
  assert.equal(additiveDryRun.create, 3, "additive sync must report all new variant identities");
  assert.equal(additiveDryRun.update, 1, "additive sync must report a variant appended to an existing template");
  const additivePreview = JSON.parse(fs.readFileSync(additiveOptions.preview, "utf8"));
  assert.equal(additivePreview.additive.sourceDuplicateRecordsIgnored, 1);
  assert.equal(additivePreview.additive.addressableCreated, 3);
  additiveOptions.apply = true;
  const additiveApplied = syncItems.run(additiveOptions);
  assert.equal(additiveApplied.applied, true);
  const additiveCatalog = JSON.parse(fs.readFileSync(additiveOptions.catalog, "utf8"));
  const additiveManifest = JSON.parse(fs.readFileSync(additiveOptions.backupManifest, "utf8"));
  assert.equal(additiveManifest.backups[0].source.records, 3);
  assert.equal(additiveManifest.backups[0].source.mode, "additive");
  assert.equal(additiveManifest.backups[0].source.mergedRecords, 2);
  assert.equal(additiveCatalog.item.length, 2, "additive sync must retain existing roots and add only the new root");
  assert.equal(additiveCatalog.item[0].variants.length, 2, "existing roots receive only missing variants");
  assert.equal(additiveCatalog.item[1].variants.length, 1, "new roots retain their variants");
  additiveOptions.apply = false;
  additiveOptions.check = true;
  assert.equal(syncItems.run(additiveOptions).ok, true, "additive sync must be idempotent");

  const duplicateRoot = path.join(tempRoot, "duplicate");
  fs.mkdirSync(duplicateRoot);
  const duplicateSource = path.join(duplicateRoot, "canonical.json");
  const duplicateReference = path.join(duplicateRoot, "canonical.md");
  const duplicates = [unchanged, structuredClone(unchanged)];
  writeJson(duplicateSource, duplicates);
  fs.writeFileSync(duplicateReference, markdown(duplicates));
  const duplicateOptions = optionsFor(duplicateRoot, duplicateSource, duplicateReference);
  duplicateOptions.expectedCount = 2;
  writeJson(duplicateOptions.vendorItems, { _meta: {}, item: [], itemGroup: [] });
  writeJson(duplicateOptions.vendorBaseItems, { _meta: {}, baseitem: [], itemProperty: [], itemType: [], itemMastery: [] });
  assert.throws(() => syncItems.run(duplicateOptions), /duplicate item identity/i);
  assert.equal(fs.existsSync(duplicateOptions.catalog), false);

  const corruptBackupRoot = path.join(tempRoot, "corrupt-existing-backup");
  fs.mkdirSync(corruptBackupRoot);
  const corruptBackupOptions = optionsFor(corruptBackupRoot, source, reference);
  fs.copyFileSync(path.join(tempRoot, "vendor-items.json"), corruptBackupOptions.vendorItems);
  fs.copyFileSync(path.join(tempRoot, "vendor-items-base.json"), corruptBackupOptions.vendorBaseItems);
  corruptBackupOptions.apply = true;
  syncItems.run(corruptBackupOptions);
  const corruptBackupManifest = JSON.parse(fs.readFileSync(corruptBackupOptions.backupManifest, "utf8"));
  const corruptExistingPayload = descriptorPath(corruptBackupManifest.backups[0].baseline.items, corruptBackupOptions.backupManifest);
  fs.rmSync(path.dirname(corruptBackupOptions.catalog), { recursive: true, force: true });
  fs.rmSync(corruptBackupOptions.backupManifest);
  fs.writeFileSync(corruptExistingPayload, "not a gzip payload");
  assert.throws(
    () => syncItems.run(corruptBackupOptions),
    /content-addressed backup is not a valid gzip payload/i,
    "apply must not reuse a corrupt content-addressed gzip"
  );
  assert.equal(fs.existsSync(corruptBackupOptions.catalog), false, "failed backup validation must not create the catalog");
  assert.equal(fs.existsSync(corruptBackupOptions.baseCatalog), false, "failed backup validation must not create base metadata");
  assert.equal(fs.existsSync(corruptBackupOptions.backupManifest), false, "failed backup validation must not append a restore point");

  const rollbackRoot = path.join(tempRoot, "rollback-write");
  fs.mkdirSync(rollbackRoot);
  const rollbackTarget = path.join(rollbackRoot, "first.json");
  const blockingPath = path.join(rollbackRoot, "not-a-directory");
  fs.writeFileSync(rollbackTarget, "before");
  fs.writeFileSync(blockingPath, "blocker");
  assert.throws(() => syncItems.writeFilesWithRollback([
    { path: rollbackTarget, contents: "after" },
    { path: path.join(blockingPath, "second.json"), contents: "unreachable" }
  ]));
  assert.equal(fs.readFileSync(rollbackTarget, "utf8"), "before", "a later write failure must roll back earlier targets");

  const wrongReference = path.join(tempRoot, "wrong-order.md");
  fs.writeFileSync(wrongReference, markdown([...canonical].reverse()));
  assert.throws(() => syncItems.validateMarkdownReference(wrongReference, canonical), /order mismatch/i);

  const additiveReferenceWithExtra = path.join(tempRoot, "additive-extra.md");
  fs.writeFileSync(additiveReferenceWithExtra, `#### Extra audit section\n\nNot an item.\n\n${markdown([canonical[0]])}`);
  const additiveReferenceAudit = syncItems.validateMarkdownReference(
    additiveReferenceWithExtra,
    [canonical[0]],
    { allowExtraHeadings: true }
  );
  assert.deepStrictEqual(additiveReferenceAudit.extraHeadings, ["Extra audit section"]);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Item synchronization tests passed");
