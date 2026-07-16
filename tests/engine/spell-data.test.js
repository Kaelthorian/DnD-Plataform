const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const spells = require(path.join(repoRoot, "src", "data", "spells", "spells.json"));
const manifest = require(path.join(repoRoot, "src", "data", "spells", "spells.manifest.json"));
const spellData = require(path.join(repoRoot, "src", "engine", "spells", "spell-data.js"));
const {
  behaviorCounts,
  canonicalDigest,
  duplicateNameGroups,
  levelCounts
} = require(path.join(repoRoot, "scripts", "sync-spells.js"));
const { compileSpellSchema, validate } = require(path.join(repoRoot, "scripts", "validate-spells.js"));

function spell(name, source = "") {
  const matches = spells.filter((entry) => entry.name === name && (!source || entry.source === source));
  assert.equal(matches.length, 1, `Expected one ${name}${source ? ` (${source})` : ""} record.`);
  return matches[0];
}

function identity(entry) {
  return [
    spellData.normalizeSpellName(entry.name),
    String(entry.source || "").trim().toLowerCase(),
    Number(entry.level)
  ].join("|");
}

// The generated database, manifest, and schema are one reproducible unit.
const report = validate({ silent: true });
assert.equal(report.ok, true, report.errors.join("\n"));
assert.equal(spells.length, 834);
assert.equal(report.canonicalRecords, 809);
assert.equal(report.canonicalUniqueNames, 805);
assert.equal(report.localOnlyPreserved, 25);
assert.equal(report.spellReferences, 117);
assert.equal(report.uniqueSpellReferences, 57);
assert.deepStrictEqual(report.behavior, manifest.behavior);

const validateSchema = compileSpellSchema();
spells.forEach((entry) => {
  assert.equal(validateSchema(entry), true, `${entry.name}: ${JSON.stringify(validateSchema.errors)}`);
});
const invalidCanonical = structuredClone(spell("Acid Splash", "XPHB"));
delete invalidCanonical.time;
assert.equal(validateSchema(invalidCanonical), false, "Canonical spells must include casting time data.");

const canonicalSpells = spells.filter((entry) => entry.canonical === true);
const legacySpells = spells.filter((entry) => entry.canonical === false);
const canonicalRaw = canonicalSpells.map(spellData.canonicalSpellObject);
assert.equal(canonicalRaw.every(Boolean), true);
assert.equal(canonicalDigest(canonicalRaw), manifest.canonicalSha256);
assert.deepStrictEqual(levelCounts(canonicalRaw), manifest.levels);
assert.deepStrictEqual(behaviorCounts(canonicalRaw), manifest.behavior);
assert.deepStrictEqual(duplicateNameGroups(canonicalRaw), manifest.duplicateNames);

const derivedCanonicalFields = [
  "id",
  "description",
  "classSources",
  "raceSources",
  "subclasses",
  "concentration",
  "ritual",
  "materialComponent",
  "icon",
  "iconFallback",
  "canonical"
];
canonicalSpells.forEach((entry, index) => {
  const raw = canonicalRaw[index];
  derivedCanonicalFields.forEach((field) => {
    assert.equal(Object.prototype.hasOwnProperty.call(raw, field), false, `${entry.name}: leaked derived ${field}.`);
  });
  assert.deepStrictEqual(spellData.normalizeCanonicalSpell(raw), entry, `${entry.name}: canonical round trip drifted.`);
});
legacySpells.forEach((entry) => {
  assert.equal(spellData.canonicalSpellObject(entry), null);
  assert.deepStrictEqual(spellData.normalizeLegacySpell(entry), entry, `${entry.name}: legacy normalization drifted.`);
});

// IDs preserve meaningful punctuation, while exact identities remain unique.
assert.equal(new Set(spells.map((entry) => entry.id)).size, spells.length);
assert.equal(new Set(spells.map(identity)).size, spells.length);
assert.notEqual(spellData.normalizeSpellName("Gate Warden"), spellData.normalizeSpellName("Gate-Warden"));
assert.notEqual(spellData.createSpellId("Gate Warden", "PHB"), spellData.createSpellId("Gate-Warden", "PHB"));
assert.equal(spell("Melf's Acid Arrow", "XPHB").id, "melf-u27-s-acid-arrow--xphb");
assert.equal(spell("Antipathy/Sympathy", "XPHB").id, "antipathy-u2f-sympathy--xphb");

assert.deepStrictEqual(manifest.duplicateNames, [
  [
    { name: "Acid Rain", source: "GuideDrakkenheim", level: 5 },
    { name: "Acid Rain", source: "HelianasGuidetoMonsterHunting", level: 3 }
  ],
  [
    { name: "Preserve", source: "GrimHollowPG24", level: 0 },
    { name: "Preserve", source: "HelianasGuidetoMonsterHunting", level: 2 }
  ],
  [
    { name: "Purge Contamination", source: "DungeonsDrakkenheim", level: 3 },
    { name: "Purge Contamination", source: "GuideDrakkenheim", level: 3 },
    { name: "Purge Contamination", source: "MonstersOfDrakkenheim", level: 3 }
  ]
]);

// Rich 5etools tags and entry objects render into usable plain text.
assert.equal(spellData.strip5eTags("{@scaledamage 10d4|4-9|2d4}"), "2d4");
assert.equal(spellData.strip5eTags("{@scaledice 2d4|3-9|1d4}"), "1d4");
assert.equal(spellData.strip5eTags("{@item Artisan's Tools|XPHB|Artisan Tool}"), "Artisan Tool");
assert.equal(spellData.strip5eTags("{@action Opportunity Attack|XPHB|Opportunity Attacks}"), "Opportunity Attacks");
assert.equal(spellData.strip5eTags("{@quickref Cover||3||half cover}"), "half cover");
assert.equal(spellData.strip5eTags("{@adventure level of contamination|DungeonsDrakkenheim|12}"), "level of contamination");
assert.equal(spellData.strip5eTags("{@variantrule Proficiency|XPHB|Proficiency Bonus}"), "Proficiency Bonus");
assert.equal(canonicalSpells.some((entry) => /\{@[^}]+}/.test(entry.description)), false);

assert.match(spell("Magecraft", "ExploringEberron24").description, /Choose an Artisan Tool or Herbalism Kit/);
assert.match(spell("Traveler's Enigma", "ChroniclesOfEberron").description, /the Trinkets table in the Player's Handbook/);
assert.match(spell("Fizban's Platinum Shield", "FTD").description, /Cover\. The creature has half cover\./);
assert.match(spell("Jim's Magic Missile", "AI").description, /— Jim Darkmagic/);
assert.match(spell("Chaos Bolt", "XGE").description, /d8 \| Damage Type\n1 \| Acid[\s\S]*8 \| Thunder/);
assert.match(spell("Summon Lesser Demons", "XGE").description, /1-2 \| Two demons of challenge rating 1 or lower/);
assert.match(spell("Hellish Rebuke", "XPHB").description, /damage increases by 1d10 for each spell slot level above 1/);
assert.doesNotMatch(spell("Hellish Rebuke", "XPHB").description, /damage increases by 2d10/);
assert.match(spell("Vitriolic Sphere", "XPHB").description, /initial damage increases by 2d4 for each spell slot level above 4/);
assert.doesNotMatch(spell("Vitriolic Sphere", "XPHB").description, /initial damage increases by 10d4/);
assert.match(spell("Blood Bolt", "CrookedMoon24").description, /Temporary Hit Points equal to your Proficiency Bonus/);
assert.match(spell("Delerium Orb", "DungeonsDrakkenheim").description, /gain one level of contamination/);
assert.match(spell("Light", "XPHB").description, /Bright Light[\s\S]*Dim Light/);

// Representative behavior profiles cover the shared spell-resolution categories.
const acidSplash = spell("Acid Splash", "XPHB");
assert.equal(acidSplash.level, 0);
assert.equal(acidSplash.school, "V");
assert.deepStrictEqual(acidSplash.classes, ["Sorcerer", "Wizard", "Artificer"]);
assert.equal(spellData.formatCastingTime(acidSplash), "Action");
assert.equal(spellData.formatRange(acidSplash), "60 feet");
assert.equal(spellData.formatComponents(acidSplash), "V, S");
assert.equal(spellData.formatDuration(acidSplash), "Instantaneous");
assert.deepStrictEqual(spellData.spellBehaviorProfile(acidSplash).savingThrows, ["DEX"]);
assert.deepStrictEqual(spellData.spellBehaviorProfile(acidSplash).damageTypes, ["acid"]);
assert.deepStrictEqual(spellData.spellBehaviorProfile(acidSplash).areaTags, ["MT"]);
assert.equal(spellData.cantripScalingExpression(acidSplash, 1), "1d6");
assert.equal(spellData.cantripScalingExpression(acidSplash, 5), "2d6");
assert.equal(spellData.cantripScalingExpression(acidSplash, 11), "3d6");
assert.equal(spellData.cantripScalingExpression(acidSplash, 17), "4d6");

const alarm = spellData.spellBehaviorProfile(spell("Alarm", "XPHB"));
assert.equal(alarm.ritual, true);
assert.deepStrictEqual(alarm.material, { text: "a bell and silver wire", cost: 0, consume: false });

const blade = spellData.spellBehaviorProfile(spell("Blade of Disaster", "FRHoF"));
assert.deepStrictEqual(blade.attacks, ["M"]);
assert.deepStrictEqual(blade.damageTypes, ["force"]);
assert.equal(blade.concentration, true);

assert.equal(spellData.spellBehaviorProfile(spell("Cure Wounds", "XPHB")).healing, true);
assert.equal(spellData.spellBehaviorProfile(spell("False Life", "XPHB")).temporaryHitPoints, true);
assert.equal(spellData.spellHasEmbeddedWeaponAttack(spell("Booming Blade", "TCE")), true);
assert.equal(spellData.spellHasEmbeddedWeaponAttack(spell("Green-Flame Blade", "TCE")), true);
assert.equal(spellData.spellHasEmbeddedWeaponAttack(spell("True Strike", "XPHB")), true);
assert.equal(spellData.spellHasDeferredAttackDamage(spell("Hex", "XPHB")), true);
assert.equal(spellData.spellHasDeferredAttackDamage(spell("Hunter's Mark", "XPHB")), true);
assert.equal(spellData.spellHasDeferredAttackDamage(spell("Booming Blade", "TCE")), false);
assert.equal(spellData.directSelfTemporaryHitPointsExpression(spell("Arcane Aegis", "GrimHollowPG24")), "2d10");
assert.equal(spellData.directSelfTemporaryHitPointsExpression(spell("Armor of Agathys", "XPHB")), "5");
assert.equal(spellData.directSelfTemporaryHitPointsExpression(spell("False Life", "XPHB")), "2d4+4");
assert.equal(spellData.directSelfTemporaryHitPointsExpression(spell("Tenser's Transformation", "XGE")), "50");
assert.equal(spellData.directSelfTemporaryHitPointsExpression(spell("Negative Energy Flood", "XGE")), "");
assert.equal(spellData.directSelfTemporaryHitPointsExpression(spell("Sanguine Shield", "GrimHollowPG24")), "");
assert.equal(spellData.directSelfTemporaryHitPointsExpression(spell("Guardian of Nature", "XGE")), "");
const holdPerson = spellData.spellBehaviorProfile(spell("Hold Person", "XPHB"));
assert.deepStrictEqual(holdPerson.savingThrows, ["WIS"]);
assert.deepStrictEqual(holdPerson.conditions, ["paralyzed"]);
assert.equal(holdPerson.concentration, true);
assert.deepStrictEqual(spell("Revivify", "XPHB").materialComponent, {
  text: "a diamond worth 300+ GP, which the spell consumes",
  cost: 30000,
  consume: true
});
assert.equal(spell("Summon Lesser Demons", "XGE").materialComponent.consume, "optional");
assert.equal(spell("Summon Greater Demon", "XGE").materialComponent.consume, "optional");
assert.equal(manifest.behavior.consumedMaterial, 65);
assert.equal(manifest.behavior.optionalMaterial, 2);

const expectedLegacyNames = [
  "Acid Arrow",
  "Arcanist's Magic Aura",
  "Dark Star",
  "Encode Thoughts",
  "Flock of Familiars",
  "Fortune's Favor",
  "Galder's Speedy Courier",
  "Galder's Tower",
  "Gift of Alacrity",
  "Gravity Fissure",
  "Gravity Sinkhole",
  "Hideous Laughter",
  "Immovable Object",
  "Linked Glyphs",
  "Magnify Gravity",
  "Pulse Wave",
  "Ravenous Void",
  "Reality Break",
  "Resilient Sphere",
  "Sapping Sting",
  "Summon Draconic Spirit",
  "Temporal Shunt",
  "Tether Essence",
  "Time Ravage",
  "Wristpocket"
];
assert.deepStrictEqual(legacySpells.map((entry) => entry.name).sort(), expectedLegacyNames);
const canonicalNames = new Set(canonicalSpells.map((entry) => spellData.normalizeSpellName(entry.name)));
assert.equal(legacySpells.some((entry) => canonicalNames.has(spellData.normalizeSpellName(entry.name))), false);
assert.equal(spells.some((entry) => entry.name === "Charm Monster" && entry.source === "XGE" && !entry.canonical), false);

console.log(JSON.stringify({
  ok: true,
  records: spells.length,
  canonicalRecords: canonicalSpells.length,
  legacyRecords: legacySpells.length,
  canonicalSha256: manifest.canonicalSha256
}, null, 2));
