const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const repoRoot = path.resolve(__dirname, "..");
const spellData = require(path.join(repoRoot, "src", "engine", "spells", "spell-data.js"));
const {
  behaviorCounts,
  canonicalDigest,
  duplicateNameGroups,
  levelCounts,
  stableValue
} = require("./sync-spells.js");
const spellsPath = path.join(repoRoot, "src", "data", "spells", "spells.json");
const manifestPath = path.join(repoRoot, "src", "data", "spells", "spells.manifest.json");
const schemaPath = path.join(repoRoot, "src", "data", "spells", "spell.schema.json");
const classesPath = path.join(repoRoot, "src", "data", "classes", "classes.json");

const DERIVED_FIELDS = [
  "id",
  "classes",
  "races",
  "subclasses",
  "description",
  "concentration",
  "ritual",
  "materialComponent",
  "icon",
  "iconFallback",
  "canonical"
];

function fail(errors, message) {
  errors.push(message);
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  values.forEach((value) => {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  });
  return [...repeated];
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function compileSpellSchema() {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, jsonPointers: true, schemaId: "auto" });
  return ajv.compile(schema);
}

function schemaErrorText(validationErrors = []) {
  return validationErrors.slice(0, 8).map((error) => {
    const location = error.dataPath || error.instancePath || "/";
    return `${location} ${error.message}`;
  }).join("; ");
}

function collectSpellReferences(value, owner, references = []) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\{@spell\s+([^}|]+)(?:\|([^}|]*))?(?:\|[^}]*)?}/gi)) {
      references.push({
        owner,
        name: String(match[1] || "").trim(),
        source: String(match[2] || "").trim()
      });
    }
    return references;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectSpellReferences(entry, owner, references));
    return references;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectSpellReferences(entry, owner, references));
  }
  return references;
}

function validateDerivedFields(errors, spell, expected, label) {
  DERIVED_FIELDS.forEach((field) => {
    try {
      assert.deepStrictEqual(spell[field], expected[field]);
    } catch (_error) {
      fail(errors, `${label}: derived ${field} does not match normalized source data.`);
    }
  });
}

function validate(options = {}) {
  const errors = [];
  const warnings = [];
  const spells = JSON.parse(fs.readFileSync(spellsPath, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const classes = JSON.parse(fs.readFileSync(classesPath, "utf8"));
  const validateSchema = compileSpellSchema();
  if (!Array.isArray(spells)) throw new Error("spells.json must be an array");

  const canonicalSpells = spells.filter((spell) => spell?.canonical === true);
  const legacySpells = spells.filter((spell) => spell?.canonical === false);
  const canonical = canonicalSpells.map(spellData.canonicalSpellObject);
  if (canonical.some((spell) => !spell)) fail(errors, "A canonical record could not be reconstructed.");

  if (canonical.length !== manifest.audit?.canonicalRecords) {
    fail(errors, `Canonical record count mismatch: expected ${manifest.audit?.canonicalRecords}, found ${canonical.length}.`);
  }
  if (legacySpells.length !== manifest.audit?.localOnlyPreserved) {
    fail(errors, `Legacy record count mismatch: expected ${manifest.audit?.localOnlyPreserved}, found ${legacySpells.length}.`);
  }
  if (spells.length !== manifest.audit?.totalRecords) {
    fail(errors, `Total record count mismatch: expected ${manifest.audit?.totalRecords}, found ${spells.length}.`);
  }

  const canonicalNames = new Set(canonical.map((spell) => spellData.normalizeSpellName(spell?.name)));
  if (canonicalNames.size !== manifest.audit?.canonicalUniqueNames) {
    fail(errors, `Canonical unique-name mismatch: expected ${manifest.audit?.canonicalUniqueNames}, found ${canonicalNames.size}.`);
  }
  if (canonical.length - canonicalNames.size !== manifest.audit?.additionalCanonicalVariants) {
    fail(errors, "Canonical variant count does not match the manifest.");
  }

  const digest = canonicalDigest(canonical);
  if (digest !== manifest.canonicalSha256) {
    fail(errors, `Canonical field digest mismatch: expected ${manifest.canonicalSha256}, found ${digest}.`);
  }
  const actualLevels = levelCounts(canonical);
  if (stableJson(actualLevels) !== stableJson(manifest.levels)) fail(errors, "Canonical level counts do not match the manifest.");
  const actualBehavior = behaviorCounts(canonical);
  if (stableJson(actualBehavior) !== stableJson(manifest.behavior)) fail(errors, "Canonical behavior counts do not match the manifest.");
  const actualDuplicateNames = duplicateNameGroups(canonical);
  if (stableJson(actualDuplicateNames) !== stableJson(manifest.duplicateNames)) {
    fail(errors, "Canonical duplicate-name groups do not match the manifest.");
  }

  const spellNameKeys = new Set(spells.map((spell) => spellData.normalizeSpellName(spell?.name)));
  const spellIdentityKeys = new Set(spells.map((spell) => [
    spellData.normalizeSpellName(spell?.name),
    String(spell?.source || "").trim().toLowerCase()
  ].join("|")));
  const spellReferences = [];
  canonical.forEach((spell) => collectSpellReferences(spell, spell?.name || "Unknown spell", spellReferences));
  const missingSpellReferences = spellReferences.filter((reference) => {
    const nameKey = spellData.normalizeSpellName(reference.name);
    if (!spellNameKeys.has(nameKey)) return true;
    if (!reference.source) return false;
    return !spellIdentityKeys.has(`${nameKey}|${reference.source.toLowerCase()}`);
  });
  missingSpellReferences.forEach((reference) => {
    fail(errors, `${reference.owner}: unresolved spell reference ${reference.name}${reference.source ? ` (${reference.source})` : ""}.`);
  });

  const ids = spells.map((spell) => String(spell?.id || "").trim());
  duplicates(ids.filter(Boolean)).forEach((id) => fail(errors, `Duplicate spell id: ${id}`));
  const exactKeys = spells.map((spell) => [
    spellData.normalizeSpellName(spell?.name),
    String(spell?.source || "").trim().toLowerCase(),
    Number(spell?.level)
  ].join("|"));
  duplicates(exactKeys).forEach((key) => fail(errors, `Duplicate spell identity: ${key}`));

  const supportedClasses = new Set((Array.isArray(classes) ? classes : []).map((entry) => spellData.normalizeSpellName(entry?.name)));
  const referencedClasses = new Set();
  let foundryIcons = 0;
  let fallbackIcons = 0;
  spells.forEach((spell, index) => {
    const label = spell?.name || `record ${index}`;
    if (!validateSchema(spell)) fail(errors, `${label}: schema validation failed: ${schemaErrorText(validateSchema.errors)}`);

    if (!spell?.id) fail(errors, `${label}: missing id.`);
    const expectedId = spellData.createSpellId(spell?.name, spell?.source);
    if (spell?.id && spell.id !== expectedId) fail(errors, `${label}: id ${spell.id} does not match ${expectedId}.`);
    if (!String(spell?.name || "").trim()) fail(errors, `Record ${index}: missing name.`);
    if (!String(spell?.source || "").trim()) fail(errors, `${label}: missing source.`);
    if (!Number.isInteger(spell?.level) || spell.level < 0 || spell.level > 9) fail(errors, `${label}: invalid level.`);
    if (!String(spell?.school || "").trim()) fail(errors, `${label}: missing school.`);
    if (!Array.isArray(spell?.classes)) fail(errors, `${label}: classes must be an array.`);
    if (spell?.races != null && !Array.isArray(spell.races)) fail(errors, `${label}: races must be an array when present.`);
    if (!String(spell?.description || "").trim()) fail(errors, `${label}: missing rendered description.`);

    if (spell?.canonical === true) {
      const raw = spellData.canonicalSpellObject(spell);
      const expected = spellData.normalizeCanonicalSpell(raw);
      validateDerivedFields(errors, spell, expected, label);
    } else if (spell?.canonical === false) {
      const expected = spellData.normalizeLegacySpell(spell);
      validateDerivedFields(errors, spell, expected, label);
      if (spellData.canonicalSpellObject(spell) !== null) fail(errors, `${label}: legacy record reconstructed as canonical.`);
    } else {
      fail(errors, `${label}: canonical must be explicitly true or false.`);
    }

    duplicates((spell.classes || []).map(spellData.normalizeSpellName)).forEach((name) => fail(errors, `${label}: duplicate class ${name}.`));
    duplicates((spell.races || []).map(spellData.normalizeSpellName)).forEach((name) => fail(errors, `${label}: duplicate race ${name}.`));
    (spell.classes || []).forEach((name) => referencedClasses.add(spellData.normalizeSpellName(name)));
    if (spell.icon) {
      foundryIcons += 1;
      if (!/^https:\/\//i.test(spell.icon)) fail(errors, `${label}: non-HTTPS external icon reference.`);
    } else {
      fallbackIcons += 1;
      if (!/^school:[a-z0-9-]+$/i.test(spell.iconFallback || "")) fail(errors, `${label}: invalid icon fallback.`);
    }
    if (/\{@[^}]+}/.test(String(spell.description || ""))) {
      fail(errors, `${label}: unresolved 5etools tag in stored description.`);
    }
  });

  const unsupportedClasses = [...referencedClasses].filter((name) => name && !supportedClasses.has(name)).sort();
  if (unsupportedClasses.length) warnings.push(`Spell classes without a local class definition: ${unsupportedClasses.join(", ")}.`);

  const report = {
    ok: errors.length === 0,
    records: spells.length,
    canonicalRecords: canonical.length,
    canonicalUniqueNames: canonicalNames.size,
    localOnlyPreserved: legacySpells.length,
    ids: ids.filter(Boolean).length,
    duplicateNameGroups: actualDuplicateNames.length,
    spellReferences: spellReferences.length,
    uniqueSpellReferences: new Set(spellReferences.map((reference) => spellData.normalizeSpellName(reference.name))).size,
    foundryIcons: actualBehavior.foundryIcon,
    fallbackIcons: actualBehavior.fallbackIcon,
    allRecordFoundryIcons: foundryIcons,
    allRecordFallbackIcons: fallbackIcons,
    behavior: actualBehavior,
    unsupportedClasses,
    warnings,
    errors
  };
  if (!options.silent) {
    const stream = errors.length ? console.error : console.log;
    stream(JSON.stringify(report, null, 2));
  }
  return report;
}

if (require.main === module) {
  try {
    const report = validate();
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error?.stack || error);
    process.exitCode = 1;
  }
}

module.exports = { collectSpellReferences, compileSpellSchema, validate };
