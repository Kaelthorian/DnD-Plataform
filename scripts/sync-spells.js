const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const spellData = require(path.join(repoRoot, "src", "engine", "spells", "spell-data.js"));
const defaultOutput = path.join(repoRoot, "src", "data", "spells", "spells.json");
const defaultManifest = path.join(repoRoot, "src", "data", "spells", "spells.manifest.json");

function parseArgs(argv) {
  const options = { source: "", reference: "", output: defaultOutput, manifest: defaultManifest, baselineRef: "", check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") options.check = true;
    else if (arg === "--source") options.source = argv[++index] || "";
    else if (arg === "--reference") options.reference = argv[++index] || "";
    else if (arg === "--output") options.output = path.resolve(argv[++index] || defaultOutput);
    else if (arg === "--manifest") options.manifest = path.resolve(argv[++index] || defaultManifest);
    else if (arg === "--baseline-ref") options.baselineRef = argv[++index] || "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.source) throw new Error("Usage: node scripts/sync-spells.js --source <canonical.json> [--reference <spells.md>] [--check]");
  options.source = path.resolve(options.source);
  if (options.reference) options.reference = path.resolve(options.reference);
  return options;
}

function readBaselineFromGit(ref) {
  const safeDirectory = repoRoot.replace(/\\/g, "/");
  const raw = childProcess.execFileSync("git", [
    "-c",
    `safe.directory=${safeDirectory}`,
    "show",
    `${ref}:src/data/spells/spells.json`
  ], { cwd: repoRoot, encoding: "utf8" });
  return JSON.parse(raw);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function canonicalSortKey(spell) {
  return [spellData.normalizeSpellName(spell?.name), String(spell?.source || "").toLowerCase(), Number(spell?.level) || 0].join("|");
}

function canonicalDigest(spells) {
  const normalized = [...spells]
    .sort((left, right) => canonicalSortKey(left).localeCompare(canonicalSortKey(right)))
    .map(stableValue);
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function fileDigest(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sourceForLocalSpell(spell) {
  return spell?.source || spellData.sourceFromLegacyDescription(spell?.description) || "Legacy";
}

function identityKey(spell) {
  return [spellData.normalizeSpellName(spell?.name), String(sourceForLocalSpell(spell)).trim().toLowerCase(), Number(spell?.level) || 0].join("|");
}

function duplicateNameGroups(spells) {
  const groups = new Map();
  spells.forEach((spell) => {
    const key = spellData.normalizeSpellName(spell.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ name: spell.name, source: spell.source, level: spell.level });
  });
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => group.sort((left, right) => canonicalSortKey(left).localeCompare(canonicalSortKey(right))))
    .sort((left, right) => canonicalSortKey(left[0]).localeCompare(canonicalSortKey(right[0])));
}

function levelCounts(spells) {
  const counts = Object.fromEntries(Array.from({ length: 10 }, (_unused, level) => [level, 0]));
  spells.forEach((spell) => {
    const level = Number(spell.level);
    if (Number.isInteger(level) && level >= 0 && level <= 9) counts[level] += 1;
  });
  return counts;
}

function behaviorCounts(spells) {
  const counts = {
    spellAttack: 0,
    savingThrow: 0,
    damage: 0,
    concentration: 0,
    area: 0,
    material: 0,
    costlyMaterial: 0,
    consumedMaterial: 0,
    optionalMaterial: 0,
    ritual: 0,
    healing: 0,
    temporaryHitPoints: 0,
    conditionInflict: 0,
    scaling: 0,
    foundryIcon: 0,
    fallbackIcon: 0
  };
  spells.forEach((spell) => {
    const profile = spellData.spellBehaviorProfile(spell);
    if (profile.attacks.length) counts.spellAttack += 1;
    if (profile.savingThrows.length) counts.savingThrow += 1;
    if (profile.damageTypes.length) counts.damage += 1;
    if (profile.concentration) counts.concentration += 1;
    if (profile.areaTags.length) counts.area += 1;
    if (profile.material) counts.material += 1;
    if (profile.material?.cost) counts.costlyMaterial += 1;
    if (profile.material?.consume === true) counts.consumedMaterial += 1;
    if (profile.material?.consume === "optional") counts.optionalMaterial += 1;
    if (profile.ritual) counts.ritual += 1;
    if (profile.healing) counts.healing += 1;
    if (profile.temporaryHitPoints) counts.temporaryHitPoints += 1;
    if (profile.conditions.length) counts.conditionInflict += 1;
    if (profile.scaling) counts.scaling += 1;
    if (spell.foundryImg) counts.foundryIcon += 1;
    else counts.fallbackIcon += 1;
  });
  return counts;
}

function markdownSummary(referencePath) {
  if (!referencePath) return null;
  const text = fs.readFileSync(referencePath, "utf8");
  const headings = [...text.matchAll(/^####\s+(.+?)\s*$/gm)].map((match) => match[1].trim());
  return {
    sha256: fileDigest(referencePath),
    headings: headings.length,
    uniqueNormalizedNames: new Set(headings.map(spellData.normalizeSpellName)).size
  };
}

function buildCatalog(canonical, existing) {
  const canonicalNames = new Set(canonical.map((spell) => spellData.normalizeSpellName(spell.name)));
  const existingNames = new Set(existing.map((spell) => spellData.normalizeSpellName(spell.name)));
  const existingIdentities = new Set(existing.map(identityKey));
  const canonicalUniqueNames = new Set(canonicalNames);
  const localOnly = existing
    .filter((spell) => !canonicalNames.has(spellData.normalizeSpellName(spell.name)))
    .map(spellData.normalizeLegacySpell);
  const canonicalRecords = canonical.map(spellData.normalizeCanonicalSpell);
  const combined = [...canonicalRecords, ...localOnly]
    .sort((left, right) => Number(left.level) - Number(right.level)
      || String(left.name).localeCompare(String(right.name), "en")
      || String(left.source).localeCompare(String(right.source), "en"));
  return {
    records: combined,
    audit: {
      previousRecords: existing.length,
      canonicalRecords: canonical.length,
      canonicalUniqueNames: canonicalUniqueNames.size,
      existingNamesUpdated: [...canonicalUniqueNames].filter((name) => existingNames.has(name)).length,
      newCanonicalNames: [...canonicalUniqueNames].filter((name) => !existingNames.has(name)).length,
      additionalCanonicalVariants: canonical.length - canonicalUniqueNames.size,
      exactExistingRecords: canonical.filter((spell) => existingIdentities.has(identityKey(spell))).length,
      newCanonicalRecords: [...canonicalUniqueNames].filter((name) => !existingNames.has(name)).length + canonical.length - canonicalUniqueNames.size,
      localOnlyPreserved: localOnly.length,
      totalRecords: combined.length
    }
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const canonical = readJson(options.source);
  if (!Array.isArray(canonical)) throw new Error("Canonical spell JSON must be a top-level array.");
  const existing = options.baselineRef
    ? readBaselineFromGit(options.baselineRef)
    : fs.existsSync(options.output)
    ? readJson(options.output)
    : [];
  if (!Array.isArray(existing)) throw new Error("Existing spell database must be a top-level array.");

  const { records, audit: computedAudit } = buildCatalog(canonical, existing);
  const previousManifest = fs.existsSync(options.manifest) ? readJson(options.manifest) : null;
  const currentAlreadyCanonical = !options.baselineRef && existing.some((spell) => spell?.canonical);
  const audit = currentAlreadyCanonical && previousManifest?.audit
    ? {
      ...computedAudit,
      previousRecords: previousManifest.audit.previousRecords,
      existingNamesUpdated: previousManifest.audit.existingNamesUpdated,
      exactExistingRecords: previousManifest.audit.exactExistingRecords,
      newCanonicalNames: previousManifest.audit.newCanonicalNames,
      additionalCanonicalVariants: previousManifest.audit.additionalCanonicalVariants,
      newCanonicalRecords: previousManifest.audit.newCanonicalRecords
    }
    : computedAudit;
  const manifest = {
    schemaVersion: 1,
    canonicalSource: "spells-sublist-data.json",
    canonicalSha256: canonicalDigest(canonical),
    inputFileSha256: fileDigest(options.source),
    reference: markdownSummary(options.reference),
    audit,
    levels: levelCounts(canonical),
    behavior: behaviorCounts(canonical),
    duplicateNames: duplicateNameGroups(canonical)
  };
  const nextData = `${JSON.stringify(records, null, 2)}\n`;
  const nextManifest = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.check) {
    const currentData = fs.existsSync(options.output) ? fs.readFileSync(options.output, "utf8") : "";
    const currentManifest = fs.existsSync(options.manifest) ? fs.readFileSync(options.manifest, "utf8") : "";
    if (currentData !== nextData || currentManifest !== nextManifest) {
      console.error("Spell catalog is not synchronized with the canonical source.");
      process.exitCode = 1;
      return;
    }
  } else {
    fs.writeFileSync(options.output, nextData);
    fs.writeFileSync(options.manifest, nextManifest);
  }

  console.log(JSON.stringify({ ok: true, check: options.check, ...audit, canonicalSha256: manifest.canonicalSha256 }, null, 2));
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
  behaviorCounts,
  buildCatalog,
  canonicalDigest,
  duplicateNameGroups,
  identityKey,
  levelCounts,
  stableValue
};
