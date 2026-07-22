"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const repoRoot = path.resolve(__dirname, "..");
const itemCatalog = require(path.join(repoRoot, "src", "engine", "items", "item-catalog.js"));
const defaultVendorItems = path.join(repoRoot, "vendor", "5etools-src-main", "data", "items.json");
const defaultVendorBaseItems = path.join(repoRoot, "vendor", "5etools-src-main", "data", "items-base.json");
const defaultCatalog = path.join(repoRoot, "src", "data", "items", "items.json");
const defaultBaseCatalog = path.join(repoRoot, "src", "data", "items", "items-base.json");
const defaultPreview = path.join(repoRoot, "src", "data", "items", "sync-preview.json");
const defaultBackupDirectory = path.join(repoRoot, "src", "data", "items", "backups");
const defaultBackupManifest = path.join(repoRoot, "src", "data", "items", "items-backup.manifest.json");
const GENERATED_FIELDS = new Set(itemCatalog.GENERATED_IDENTITY_FIELDS);

function parseArgs(argv) {
  let backupDirExplicit = false;
  const options = {
    source: "",
    reference: "",
    apply: false,
    check: false,
    addMissing: false,
    restoreBackup: false,
    expectedCount: 2253,
    catalog: defaultCatalog,
    baseCatalog: defaultBaseCatalog,
    preview: defaultPreview,
    backupDir: defaultBackupDirectory,
    backupManifest: defaultBackupManifest,
    vendorItems: defaultVendorItems,
    vendorBaseItems: defaultVendorBaseItems
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--check") options.check = true;
    else if (arg === "--add-missing") options.addMissing = true;
    else if (arg === "--source") options.source = argv[++index] || "";
    else if (arg === "--reference") options.reference = argv[++index] || "";
    else if (arg === "--catalog") options.catalog = path.resolve(argv[++index] || defaultCatalog);
    else if (arg === "--base-catalog") options.baseCatalog = path.resolve(argv[++index] || defaultBaseCatalog);
    else if (arg === "--preview") options.preview = path.resolve(argv[++index] || defaultPreview);
    else if (arg === "--backup-dir") {
      options.backupDir = path.resolve(argv[++index] || defaultBackupDirectory);
      backupDirExplicit = true;
    }
    else if (arg === "--backup-manifest") options.backupManifest = path.resolve(argv[++index] || defaultBackupManifest);
    else if (arg === "--vendor-items") options.vendorItems = path.resolve(argv[++index] || defaultVendorItems);
    else if (arg === "--vendor-base-items") options.vendorBaseItems = path.resolve(argv[++index] || defaultVendorBaseItems);
    else if (arg === "--expected-count") options.expectedCount = Number(argv[++index]);
    else if (arg === "--restore-backup" || arg === "--restore") {
      options.restoreBackup = true;
      if (argv[index + 1] && !argv[index + 1].startsWith("--")) options.backupManifest = path.resolve(argv[++index]);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.apply && options.check) throw new Error("--apply and --check are mutually exclusive.");
  if (!Number.isInteger(options.expectedCount) || options.expectedCount < 1) throw new Error("--expected-count must be a positive integer.");
  if (!options.restoreBackup) {
    if (!options.source || !options.reference) {
      throw new Error("Usage: node scripts/sync-items.js --source <items.json> --reference <items.md> [--apply|--check]");
    }
    options.source = path.resolve(options.source);
    options.reference = path.resolve(options.reference);
  } else if (!backupDirExplicit) {
    options.backupDir = path.join(path.dirname(options.backupManifest), "backups");
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileDigest(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function stableValue(value, options = {}) {
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry, options));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value)
    .filter((key) => !(options.stripGenerated && GENERATED_FIELDS.has(key)))
    .sort()
    .map((key) => [key, stableValue(value[key], options)]));
}

function stableJson(value, options = {}) {
  return JSON.stringify(stableValue(value, options));
}

function catalogDigest(items) {
  return sha256(stableJson([...items].sort((left, right) => itemCatalog.itemCatalogKey(left).localeCompare(itemCatalog.itemCatalogKey(right))), {
    stripGenerated: true
  }));
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function atomicWriteFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  try {
    fs.writeFileSync(temporaryPath, contents);
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function writeFilesWithRollback(entries) {
  const prepared = entries.map(({ path: filePath, contents }) => ({
    path: path.resolve(filePath),
    contents,
    existed: fs.existsSync(filePath),
    previous: fs.existsSync(filePath) ? fs.readFileSync(filePath) : null
  }));
  const pathKeys = prepared.map((entry) => process.platform === "win32" ? entry.path.toLowerCase() : entry.path);
  if (new Set(pathKeys).size !== pathKeys.length) throw new Error("Refusing to write multiple catalog payloads to the same target path.");

  const written = [];
  try {
    for (const entry of prepared) {
      atomicWriteFile(entry.path, entry.contents);
      written.push(entry);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const entry of [...written].reverse()) {
      try {
        if (entry.existed) atomicWriteFile(entry.path, entry.previous);
        else if (fs.existsSync(entry.path)) fs.unlinkSync(entry.path);
      } catch (rollbackError) {
        rollbackErrors.push(`${entry.path}: ${rollbackError.message}`);
      }
    }
    if (rollbackErrors.length) {
      const combined = new Error(`Catalog write failed and rollback was incomplete: ${rollbackErrors.join("; ")}`);
      combined.cause = error;
      throw combined;
    }
    throw error;
  }
}

function manifestRelativeDescriptor(filePath, manifestPath) {
  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(path.dirname(path.resolve(manifestPath)), absolutePath);
  if (!relativePath || path.isAbsolute(relativePath)) return { path: absolutePath };
  return {
    path: relativePath.split(path.sep).join("/"),
    relativeTo: "manifest"
  };
}

function resolveManifestDescriptorPath(descriptor, manifestPath) {
  if (typeof descriptor?.relativePath === "string" && descriptor.relativePath) {
    return path.resolve(path.dirname(path.resolve(manifestPath)), descriptor.relativePath);
  }
  if (typeof descriptor?.path !== "string" || !descriptor.path) return "";
  if (descriptor.relativeTo === "manifest" || descriptor.pathBase === "manifest" || !path.isAbsolute(descriptor.path)) {
    return path.resolve(path.dirname(path.resolve(manifestPath)), descriptor.path);
  }
  return descriptor.path;
}

function pathIsWithinDirectory(filePath, directoryPath) {
  const relative = path.relative(path.resolve(directoryPath), path.resolve(filePath));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function assertPortableBackupPath(backupPath, options = {}) {
  if (Number(options.schemaVersion) < 2) return;
  if (!options.backupDir) throw new Error("Schema 2 backup restore requires a configured backup directory.");
  const backupDirectory = path.resolve(options.backupDir);
  if (!pathIsWithinDirectory(backupPath, backupDirectory)) {
    throw new Error(`Refusing schema 2 backup payload outside the configured backup directory: ${backupPath}.`);
  }
  if (fs.existsSync(backupPath) && fs.existsSync(backupDirectory)) {
    const realBackupPath = fs.realpathSync(backupPath);
    const realBackupDirectory = fs.realpathSync(backupDirectory);
    if (!pathIsWithinDirectory(realBackupPath, realBackupDirectory)) {
      throw new Error(`Refusing schema 2 backup payload outside the configured backup directory: ${backupPath}.`);
    }
  }
}

function validateMarkdownReference(referencePath, canonical, options = {}) {
  const text = fs.readFileSync(referencePath, "utf8");
  const headings = [...text.matchAll(/^####\s+(.+?)\s*$/gm)].map((match) => match[1].trim());
  const errors = [];
  const extraHeadings = [];
  if (!options.allowExtraHeadings) {
    if (headings.length !== canonical.length) errors.push(`Markdown has ${headings.length} item headings; JSON has ${canonical.length} records.`);
    const count = Math.min(headings.length, canonical.length);
    for (let index = 0; index < count; index += 1) {
      if (itemCatalog.normalizeIdentityPart(headings[index]) !== itemCatalog.normalizeIdentityPart(canonical[index]?.name)) {
        errors.push(`Markdown order mismatch at record ${index + 1}: expected ${canonical[index]?.name}, found ${headings[index]}.`);
        if (errors.length >= 12) break;
      }
    }
  } else {
    let jsonIndex = 0;
    let headingIndex = 0;
    while (headingIndex < headings.length && jsonIndex < canonical.length) {
      if (itemCatalog.normalizeIdentityPart(headings[headingIndex]) === itemCatalog.normalizeIdentityPart(canonical[jsonIndex]?.name)) {
        jsonIndex += 1;
        headingIndex += 1;
        continue;
      }
      const nextMatch = headings.slice(headingIndex).findIndex((heading) => (
        itemCatalog.normalizeIdentityPart(heading) === itemCatalog.normalizeIdentityPart(canonical[jsonIndex]?.name)
      ));
      if (nextMatch > 0) {
        extraHeadings.push(...headings.slice(headingIndex, headingIndex + nextMatch));
        headingIndex += nextMatch;
      } else {
        extraHeadings.push(headings[headingIndex]);
        headingIndex += 1;
      }
    }
    if (jsonIndex !== canonical.length) {
      errors.push(`Markdown is missing JSON item heading ${canonical[jsonIndex]?.name || "at end of catalog"}.`);
    }
    if (headingIndex < headings.length) extraHeadings.push(...headings.slice(headingIndex));
  }
  if (errors.length) throw new Error(`Markdown reference does not match the canonical JSON:\n${errors.join("\n")}`);
  return {
    path: referencePath,
    sha256: sha256(text),
    headings: headings.length,
    extraHeadings,
    orderMatches: true
  };
}

function identityDescriptor(item, context = {}) {
  const decorated = item.catalogId ? item : itemCatalog.decorateItem(item, context);
  const descriptor = {
    catalogId: decorated.catalogId,
    name: String(decorated.name || ""),
    source: String(decorated.source || ""),
    variantToken: decorated.catalogVariantToken
  };
  if (decorated.baseItem) descriptor.baseItem = decorated.baseItem;
  return descriptor;
}

function activeRecords(items) {
  return itemCatalog.collectCatalogRecords(itemCatalog.attachCatalogIdentities(items)).map((record) => record.item);
}

function addressableCatalog(items) {
  const raw = activeRecords(items);
  const unique = new Map();
  let duplicateRecords = 0;
  raw.forEach((item) => {
    if (!unique.has(item.catalogId)) {
      unique.set(item.catalogId, item);
      return;
    }
    duplicateRecords += 1;
    if (stableJson(unique.get(item.catalogId), { stripGenerated: true }) !== stableJson(item, { stripGenerated: true })) {
      throw new Error(`Catalog has conflicting records for addressable identity ${item.catalogId}.`);
    }
  });
  return { records: [...unique.values()], rawRecords: raw.length, uniqueRecords: unique.size, duplicateRecords };
}

function dedupeActiveCatalog(itemRecords, baseRecords) {
  const raw = [...itemRecords, ...baseRecords];
  const unique = new Map();
  const duplicates = new Map();
  raw.forEach((item, index) => {
    const key = itemCatalog.itemCatalogKey(item);
    if (!unique.has(key)) {
      unique.set(key, item);
      return;
    }
    const original = unique.get(key);
    if (stableJson(original, { stripGenerated: true }) !== stableJson(item, { stripGenerated: true })) {
      throw new Error(`Baseline has conflicting duplicate identity ${key} at raw record ${index}.`);
    }
    if (!duplicates.has(key)) duplicates.set(key, [original]);
    duplicates.get(key).push(item);
  });
  return {
    records: [...unique.values()],
    rawRecords: raw.length,
    uniqueRecords: unique.size,
    duplicateGroups: duplicates.size,
    duplicateRecords: raw.length - unique.size
  };
}

function currentCatalog(options) {
  const appOwnedExists = fs.existsSync(options.catalog) && fs.existsSync(options.baseCatalog);
  const itemsPath = appOwnedExists ? options.catalog : options.vendorItems;
  const baseItemsPath = appOwnedExists ? options.baseCatalog : options.vendorBaseItems;
  const itemsData = readJson(itemsPath);
  const baseData = readJson(baseItemsPath);
  const itemRecords = Array.isArray(itemsData.item) ? itemsData.item : [];
  const baseRecords = Array.isArray(baseData.baseitem) ? baseData.baseitem : [];
  const deduped = dedupeActiveCatalog(itemRecords, baseRecords);
  const addressable = addressableCatalog(deduped.records);
  return {
    appOwnedExists,
    itemsPath,
    baseItemsPath,
    itemsData,
    baseData,
    itemRecords,
    baseRecords,
    addressable,
    ...deduped
  };
}

function topLevelChangedFields(existing, canonical) {
  const keys = new Set([...Object.keys(existing || {}), ...Object.keys(canonical || {})]);
  return [...keys]
    .filter((key) => !GENERATED_FIELDS.has(key))
    .filter((key) => stableJson(existing?.[key], { stripGenerated: true }) !== stableJson(canonical?.[key], { stripGenerated: true }))
    .sort();
}

function compareCatalogs(canonical, existing) {
  const nextRecords = addressableCatalog(canonical).records;
  const previousRecords = addressableCatalog(existing).records;
  const nextMap = new Map(nextRecords.map((item) => [item.catalogId, item]));
  const previousMap = new Map(previousRecords.map((item) => [item.catalogId, item]));
  const created = [];
  const updated = [];
  const unchanged = [];
  nextRecords.forEach((item) => {
    const previous = previousMap.get(item.catalogId);
    if (!previous) {
      created.push(identityDescriptor(item));
      return;
    }
    const changedFields = topLevelChangedFields(previous, item);
    if (changedFields.length) updated.push({ ...identityDescriptor(item), changedFields });
    else unchanged.push(identityDescriptor(item));
  });
  const deleted = previousRecords
    .filter((item) => !nextMap.has(item.catalogId))
    .map((item) => identityDescriptor(item))
    .sort((left, right) => left.catalogId.localeCompare(right.catalogId));
  return { created, updated, deleted, unchanged };
}

function createTombstones(canonical, previousItems, existingTombstones = []) {
  const active = new Set(addressableCatalog(canonical).records.map((item) => item.catalogId));
  const tombstones = new Map();
  (Array.isArray(existingTombstones) ? existingTombstones : []).forEach((entry) => {
    if (entry?.catalogId) tombstones.set(entry.catalogId, { ...entry });
  });
  addressableCatalog(previousItems).records.forEach((item) => {
    if (active.has(item.catalogId)) return;
    tombstones.set(item.catalogId, {
      ...identityDescriptor(item),
      unavailable: true,
      removedFromCatalog: true
    });
  });
  active.forEach((catalogId) => tombstones.delete(catalogId));
  return [...tombstones.values()].sort((left, right) => left.catalogId.localeCompare(right.catalogId));
}

function sourceVariantRecord(variant) {
  const specificVariant = variant?.specificVariant;
  if (!specificVariant || typeof specificVariant !== "object") return null;
  const baseItem = specificVariant.baseItem
    || (variant.base ? `${variant.base.name || ""}|${variant.base.source || ""}` : "");
  return {
    item: specificVariant,
    specific: true,
    baseItem
  };
}

function sourceRecordKey(record) {
  return itemCatalog.itemCatalogKey(
    record.item,
    record.specific ? { specificVariant: true, baseItem: record.baseItem } : {}
  );
}

function sourceVariantDescriptor(record) {
  const baseItem = String(record.baseItem || record.item?.baseItem || "");
  const [name = "", ...sourceParts] = baseItem.split("|");
  if (!name.trim() || !sourceParts.join("|").trim()) {
    throw new Error(`Specific item variant is missing a valid baseItem identity: ${record.item?.name || "unknown"}.`);
  }
  return {
    base: {
      name: name.trim(),
      source: sourceParts.join("|").trim()
    },
    specificVariant: structuredClone(record.item)
  };
}

function sourceCatalogAudit(sourceItems) {
  const records = itemCatalog.collectCatalogRecords(sourceItems);
  const unique = new Map();
  records.forEach((record) => {
    const key = sourceRecordKey(record);
    const previous = unique.get(key);
    if (!previous) {
      unique.set(key, record);
      return;
    }
    if (stableJson(previous.item, { stripGenerated: true }) !== stableJson(record.item, { stripGenerated: true })) {
      throw new Error(`Additive source has conflicting records for addressable identity ${key}.`);
    }
  });

  const nestedKeys = new Set(records.filter((record) => record.specific).map(sourceRecordKey));
  const validationItems = sourceItems.filter((item) => !nestedKeys.has(itemCatalog.itemCatalogKey(item)));
  const decorated = itemCatalog.attachCatalogIdentities(validationItems);
  const validation = itemCatalog.validateItemCatalog(decorated, {
    expectedCount: decorated.length,
    throwOnError: true
  });
  return {
    records,
    unique,
    validation,
    duplicateRecords: records.length - unique.size,
    filteredTopLevelDuplicates: sourceItems.length - validationItems.length
  };
}

function buildAdditiveCatalog(sourceItems, existingItems) {
  const sourceAudit = sourceCatalogAudit(sourceItems);
  const merged = structuredClone(existingItems);
  const existingRecords = itemCatalog.collectCatalogRecords(merged);
  const existingKeys = new Set(existingRecords.map(sourceRecordKey));
  const addedKeys = new Set();
  const currentRoots = new Map();
  merged.forEach((item, index) => {
    currentRoots.set(itemCatalog.itemCatalogKey(item), { item, index });
  });
  const importedRoots = new Map();
  const sourceOwners = new Map();
  sourceItems.forEach((root) => {
    if (root?.baseItem || root?.genericVariant) return;
    const rootKey = itemCatalog.itemCatalogKey(root);
    (root.variants || []).forEach((variant) => {
      const record = sourceVariantRecord(variant);
      if (record && !sourceOwners.has(sourceRecordKey(record))) {
        sourceOwners.set(sourceRecordKey(record), { root, rootKey });
      }
    });
  });
  const stats = {
    sourceTopLevelRecords: sourceItems.length,
    sourceAddressableRecords: sourceAudit.records.length,
    sourceUniqueAddressableRecords: sourceAudit.unique.size,
    sourceDuplicateRecordsIgnored: sourceAudit.duplicateRecords,
    sourceTopLevelDuplicatesIgnored: sourceAudit.filteredTopLevelDuplicates,
    topLevelCreated: 0,
    variantsAttachedToExisting: 0,
    variantsAttachedToImported: 0,
    standaloneSpecificCreated: 0,
    addressableCreated: 0
  };

  function appendVariant(parent, record, statKey) {
    const key = sourceRecordKey(record);
    if (existingKeys.has(key) || addedKeys.has(key)) return false;
    if (!Array.isArray(parent.variants)) parent.variants = [];
    parent.variants.push(sourceVariantDescriptor(record));
    addedKeys.add(key);
    stats[statKey] += 1;
    return true;
  }

  sourceItems.forEach((sourceRoot) => {
    if (sourceRoot?.baseItem || sourceRoot?.genericVariant) return;
    const rootKey = itemCatalog.itemCatalogKey(sourceRoot);
    const existingRoot = currentRoots.get(rootKey);
    const sourceVariants = (sourceRoot.variants || [])
      .map(sourceVariantRecord)
      .filter(Boolean);
    if (existingRoot) {
      sourceVariants.forEach((record) => appendVariant(existingRoot.item, record, "variantsAttachedToExisting"));
      return;
    }
    if (existingKeys.has(rootKey) || addedKeys.has(rootKey)) return;

    const importedRoot = structuredClone(sourceRoot);
    const retainedVariants = [];
    sourceVariants.forEach((record) => {
      const key = sourceRecordKey(record);
      if (existingKeys.has(key) || addedKeys.has(key)) return;
      retainedVariants.push(sourceVariantDescriptor(record));
      addedKeys.add(key);
    });
    if (Array.isArray(sourceRoot.variants)) importedRoot.variants = retainedVariants;
    merged.push(importedRoot);
    importedRoots.set(rootKey, importedRoot);
    addedKeys.add(rootKey);
    stats.topLevelCreated += 1;
  });

  sourceAudit.unique.forEach((record, key) => {
    if (existingKeys.has(key) || addedKeys.has(key)) return;
    const owner = sourceOwners.get(key);
    if (owner) {
      const currentOwner = currentRoots.get(owner.rootKey);
      if (currentOwner) {
        appendVariant(currentOwner.item, record, "variantsAttachedToExisting");
        return;
      }
      const importedOwner = importedRoots.get(owner.rootKey);
      if (importedOwner) {
        appendVariant(importedOwner, record, "variantsAttachedToImported");
        return;
      }
    }
    merged.push(structuredClone(record.item));
    addedKeys.add(key);
    stats.standaloneSpecificCreated += 1;
  });

  stats.addressableCreated = addedKeys.size;
  return { items: merged, stats, sourceAudit };
}

function buildOutputs(canonical, baseline, options) {
  const decorated = itemCatalog.attachCatalogIdentities(canonical);
  const tombstones = createTombstones(decorated, baseline.records, baseline.itemsData.tombstone);
  const itemsOutput = {
    _meta: {
      ...(baseline.itemsData._meta || { internalCopies: ["item"] }),
      catalogSchemaVersion: 1,
      expectedActiveRecords: decorated.length
    },
    item: decorated,
    itemGroup: [],
    tombstone: tombstones
  };
  const vendorBase = readJson(options.vendorBaseItems);
  const baseOutput = {
    ...vendorBase,
    _meta: { ...(vendorBase._meta || {}), catalogSchemaVersion: 1, expectedActiveRecords: 0 },
    baseitem: []
  };
  return { itemsOutput, baseOutput, tombstones };
}

function buildPreview(canonical, sourcePath, reference, baseline, comparison, outputs, validation) {
  return {
    schemaVersion: 1,
    mode: "pre-apply-preview",
    canonical: {
      path: sourcePath,
      sha256: fileDigest(sourcePath),
      digest: catalogDigest(canonical),
      records: canonical.length,
      specificVariants: validation.specificVariants
    },
    reference,
    baseline: {
      kind: baseline.appOwnedExists ? "app-owned" : "vendor",
      itemsPath: baseline.itemsPath,
      baseItemsPath: baseline.baseItemsPath,
      rawRecords: baseline.rawRecords,
      uniqueRecords: baseline.uniqueRecords,
      duplicateGroups: baseline.duplicateGroups,
      duplicateRecordsRemoved: baseline.duplicateRecords,
      rawAddressableIdentities: baseline.addressable.rawRecords,
      uniqueAddressableIdentities: baseline.addressable.uniqueRecords,
      duplicateAddressableIdentitiesRemoved: baseline.addressable.duplicateRecords
    },
    summary: {
      create: comparison.created.length,
      update: comparison.updated.length,
      delete: comparison.deleted.length,
      unchanged: comparison.unchanged.length,
      finalActiveRecords: canonical.length,
      finalSpecificVariants: validation.specificVariants,
      finalSelectableIdentities: validation.identities,
      finalAddressableIdentities: validation.identities,
      retiredIdentityRecords: outputs.tombstones.length
    },
    create: comparison.created,
    update: comparison.updated,
    delete: comparison.deleted,
    safeguards: {
      sourceJsonIsAuthoritative: true,
      userCharactersUntouched: true,
      userInventoriesUntouched: true,
      userHistoryUntouched: true,
      manualUserCatalogUntouched: true,
      removedItemsRetainedAsTombstones: true,
      vendorBaselineUntouched: true
    },
    validation
  };
}

function backupStorageDescriptor(filePath, raw, options) {
  if (!raw) return null;
  fs.mkdirSync(options.backupDir, { recursive: true });
  const digest = sha256(raw);
  const backupPath = path.join(options.backupDir, `${path.basename(filePath)}-${digest}.gz`);
  if (!fs.existsSync(backupPath)) atomicWriteFile(backupPath, zlib.gzipSync(raw));
  let storedRaw;
  let compressed;
  try {
    compressed = fs.readFileSync(backupPath);
    storedRaw = zlib.gunzipSync(compressed);
  } catch (error) {
    throw new Error(`Existing content-addressed backup is not a valid gzip payload: ${backupPath}.`, { cause: error });
  }
  if (sha256(storedRaw) !== digest || storedRaw.length !== raw.length) {
    throw new Error(`Existing content-addressed backup does not match its expected payload: ${backupPath}.`);
  }
  return {
    kind: "gzip",
    ...manifestRelativeDescriptor(backupPath, options.backupManifest),
    sha256: digest,
    compressedSha256: sha256(compressed),
    bytes: raw.length
  };
}

function baselineBackupDescriptor(baseline, options) {
  const vendorBase = readJson(options.vendorBaseItems);
  const rollbackItems = {
    _meta: {
      ...(baseline.itemsData._meta || { internalCopies: ["item"] }),
      catalogSchemaVersion: 1,
      expectedActiveRecords: baseline.records.length
    },
    item: itemCatalog.attachCatalogIdentities(baseline.records),
    itemGroup: [],
    tombstone: Array.isArray(baseline.itemsData.tombstone) ? baseline.itemsData.tombstone : []
  };
  const rollbackBaseItems = {
    ...vendorBase,
    _meta: { ...(vendorBase._meta || {}), catalogSchemaVersion: 1, expectedActiveRecords: 0 },
    baseitem: []
  };
  const itemsRaw = Buffer.from(jsonText(rollbackItems));
  const baseRaw = Buffer.from(jsonText(rollbackBaseItems));
  return {
    kind: "compressed-app-owned",
    activeRecords: baseline.records.length,
    items: backupStorageDescriptor(options.catalog, itemsRaw, options),
    baseItems: backupStorageDescriptor(options.baseCatalog, baseRaw, options)
  };
}

function appendBackupManifest(options, entry) {
  const current = fs.existsSync(options.backupManifest)
    ? readJson(options.backupManifest)
    : { schemaVersion: 2, backups: [] };
  if (!Array.isArray(current.backups)) throw new Error("Backup manifest has an invalid backups field.");
  current.schemaVersion = Math.max(Number(current.schemaVersion) || 1, 2);
  current.backups.push(entry);
  atomicWriteFile(options.backupManifest, jsonText(current));
}

function outputDescriptor(filePath, text, manifestPath) {
  return {
    ...manifestRelativeDescriptor(filePath, manifestPath),
    sha256: sha256(text),
    bytes: Buffer.byteLength(text)
  };
}

function preserveAppliedPreview(options, sourceSha, baseline) {
  if (!fs.existsSync(options.preview) || !fs.existsSync(options.backupManifest) || !baseline.appOwnedExists) return false;
  try {
    const manifest = readJson(options.backupManifest);
    const last = manifest.backups?.[manifest.backups.length - 1];
    return last?.source?.sha256 === sourceSha
      && last?.outputs?.items?.sha256 === fileDigest(options.catalog)
      && last?.outputs?.baseItems?.sha256 === fileDigest(options.baseCatalog);
  } catch (_error) {
    return false;
  }
}

function readBackupPayload(descriptor, manifestPath, options = {}) {
  const backupPath = resolveManifestDescriptorPath(descriptor, manifestPath);
  assertPortableBackupPath(backupPath, options);
  if (!backupPath || !fs.existsSync(backupPath)) throw new Error(`Backup source is missing: ${backupPath || descriptor?.path || "unknown"}.`);
  if (descriptor.kind === "gzip") {
    if (fileDigest(backupPath) !== descriptor.compressedSha256) throw new Error(`Compressed backup hash mismatch: ${backupPath}.`);
    const raw = zlib.gunzipSync(fs.readFileSync(backupPath));
    if (sha256(raw) !== descriptor.sha256) throw new Error(`Backup payload hash mismatch: ${backupPath}.`);
    return raw;
  }
  if (fileDigest(backupPath) !== descriptor.sha256) throw new Error(`Vendor backup hash mismatch: ${backupPath}.`);
  return fs.readFileSync(backupPath);
}

function restoreBackup(options) {
  if (!fs.existsSync(options.backupManifest)) throw new Error(`Backup manifest does not exist: ${options.backupManifest}`);
  const manifest = readJson(options.backupManifest);
  const entry = manifest.backups?.[manifest.backups.length - 1];
  if (!entry) throw new Error("Backup manifest has no restore points.");
  const restorePairs = [
    { targetPath: options.catalog, output: entry.outputs?.items, baseline: entry.baseline?.items },
    { targetPath: options.baseCatalog, output: entry.outputs?.baseItems, baseline: entry.baseline?.baseItems }
  ];
  for (const { targetPath, output: outputDescriptorValue, baseline: baselineDescriptorValue } of restorePairs) {
    if (!baselineDescriptorValue?.sha256) throw new Error(`Backup manifest has no valid baseline descriptor for ${targetPath}.`);
    if (fs.existsSync(targetPath)) {
      const currentHash = fileDigest(targetPath);
      const allowedHashes = new Set([outputDescriptorValue?.sha256, baselineDescriptorValue.sha256].filter(Boolean));
      if (!allowedHashes.has(currentHash)) {
        throw new Error(`Refusing to overwrite a catalog changed after apply: ${targetPath}.`);
      }
    }
  }
  const restoreContext = {
    schemaVersion: manifest.schemaVersion,
    backupDir: options.backupDir
  };
  const preparedPayloads = restorePairs.map(({ targetPath, baseline }) => ({
    path: targetPath,
    contents: readBackupPayload(baseline, options.backupManifest, restoreContext)
  }));
  writeFilesWithRollback(preparedPayloads);
  const report = {
    ok: true,
    restored: true,
    manifest: options.backupManifest,
    catalog: options.catalog,
    baseCatalog: options.baseCatalog,
    itemsSha256: fileDigest(options.catalog),
    baseItemsSha256: fileDigest(options.baseCatalog)
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function run(options) {
  if (options.restoreBackup) return restoreBackup(options);
  const sourceItems = readJson(options.source);
  if (!Array.isArray(sourceItems)) throw new Error("Canonical item JSON must be a top-level array.");
  const reference = validateMarkdownReference(options.reference, sourceItems, { allowExtraHeadings: options.addMissing });
  const baseline = currentCatalog(options);
  const additive = options.addMissing ? buildAdditiveCatalog(sourceItems, baseline.records) : null;
  const canonical = additive ? additive.items : sourceItems;
  const validation = itemCatalog.validateItemCatalog(canonical, {
    expectedCount: additive ? canonical.length : options.expectedCount,
    throwOnError: true
  });
  const comparison = compareCatalogs(canonical, baseline.records);
  const outputs = buildOutputs(canonical, baseline, options);
  const preview = buildPreview(canonical, options.source, reference, baseline, comparison, outputs, validation);
  if (additive) {
    preview.mode = "pre-apply-additive-preview";
    preview.additive = additive.stats;
    preview.safeguards.sourceJsonIsAuthoritative = false;
    preview.safeguards.sourceJsonIsAdditive = true;
  }
  const itemsText = jsonText(outputs.itemsOutput);
  const baseItemsText = jsonText(outputs.baseOutput);
  const exactItems = fs.existsSync(options.catalog) && stableJson(readJson(options.catalog)) === stableJson(outputs.itemsOutput);
  const exactBaseItems = fs.existsSync(options.baseCatalog) && stableJson(readJson(options.baseCatalog)) === stableJson(outputs.baseOutput);
  const synchronized = comparison.created.length === 0
    && comparison.updated.length === 0
    && comparison.deleted.length === 0
    && baseline.duplicateRecords === 0
    && baseline.addressable.duplicateRecords === 0
    && exactItems
    && exactBaseItems;

  if (options.check) {
    const report = { ok: synchronized, check: true, ...preview.summary };
    console.log(JSON.stringify(report, null, 2));
    if (!synchronized) process.exitCode = 1;
    return report;
  }

  const sourceSha = fileDigest(options.source);
  if (!preserveAppliedPreview(options, sourceSha, baseline)) atomicWriteFile(options.preview, jsonText(preview));
  if (!options.apply) {
    const report = { ok: true, applied: false, preview: options.preview, ...preview.summary };
    console.log(JSON.stringify(report, null, 2));
    return report;
  }
  if (!exactItems || !exactBaseItems) {
    const entry = {
      createdAt: new Date().toISOString(),
      source: {
        path: options.source,
        sha256: sourceSha,
        records: sourceItems.length,
        mode: options.addMissing ? "additive" : "replace",
        mergedRecords: canonical.length
      },
      reference: { path: options.reference, sha256: reference.sha256 },
      baseline: baselineBackupDescriptor(baseline, options),
      vendorBaseline: {
        items: { path: options.vendorItems, sha256: fileDigest(options.vendorItems) },
        baseItems: { path: options.vendorBaseItems, sha256: fileDigest(options.vendorBaseItems) }
      },
      outputs: {
        items: outputDescriptor(options.catalog, itemsText, options.backupManifest),
        baseItems: outputDescriptor(options.baseCatalog, baseItemsText, options.backupManifest)
      },
      preview: { ...manifestRelativeDescriptor(options.preview, options.backupManifest), sha256: fileDigest(options.preview) }
    };
    appendBackupManifest(options, entry);
    atomicWriteFile(options.baseCatalog, baseItemsText);
    atomicWriteFile(options.catalog, itemsText);
  }
  const report = {
    ok: true,
    applied: !exactItems || !exactBaseItems,
    noOp: exactItems && exactBaseItems,
    catalog: options.catalog,
    baseCatalog: options.baseCatalog,
    backupManifest: options.backupManifest,
    ...preview.summary
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function main() {
  return run(parseArgs(process.argv.slice(2)));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error?.stack || error);
    process.exitCode = 1;
  }
}

module.exports = {
  atomicWriteFile,
  addressableCatalog,
  buildOutputs,
  buildPreview,
  catalogDigest,
  compareCatalogs,
  createTombstones,
  currentCatalog,
  dedupeActiveCatalog,
  main,
  parseArgs,
  restoreBackup,
  run,
  stableValue,
  validateMarkdownReference,
  writeFilesWithRollback
};
