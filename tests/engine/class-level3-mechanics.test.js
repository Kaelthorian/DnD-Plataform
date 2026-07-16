const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const CLASS_DIR = path.join(ROOT, "vendor", "5etools-src-main", "data", "class");
const RENDERER = fs.readFileSync(path.join(ROOT, "src", "app", "renderer", "index.html"), "utf8");

const classes = {
  wizard: {
    features: {
      1: ["Arcane Recovery", "Ritual Adept", "Spellcasting"],
      2: ["Scholar"],
      3: ["Wizard Subclass"]
    },
    cantrips: [3, 3, 3],
    slots: [[2], [3], [4, 2]],
    prepared: [4, 5, 6]
  },
  warlock: {
    features: {
      1: ["Eldritch Invocation Options", "Eldritch Invocations", "Pact Magic"],
      2: ["Magical Cunning"],
      3: ["Warlock Subclass"]
    },
    cantrips: [2, 2, 2],
    slots: [[1], [2], [0, 2]],
    prepared: [2, 3, 4]
  },
  fighter: {
    features: {
      1: ["Fighting Style", "Second Wind", "Weapon Mastery"],
      2: ["Action Surge", "Tactical Mind"],
      3: ["Fighter Subclass"]
    },
    resources: { "Second Wind": [2, 2, 2] }
  },
  paladin: {
    features: {
      1: ["Lay on Hands", "Spellcasting", "Weapon Mastery"],
      2: ["Fighting Style", "Paladin's Smite"],
      3: ["Channel Divinity", "Divine Sense", "Paladin Subclass"]
    },
    slots: [[2], [2], [3]],
    prepared: [2, 3, 4],
    resources: { "Channel Divinity": [0, 0, 2] }
  },
  bard: {
    features: {
      1: ["Bardic Inspiration", "Spellcasting"],
      2: ["Expertise", "Jack of All Trades"],
      3: ["Bard Subclass"]
    },
    cantrips: [2, 2, 2],
    slots: [[2], [3], [4, 2]],
    prepared: [4, 5, 6]
  },
  sorcerer: {
    features: {
      1: ["Innate Sorcery", "Spellcasting"],
      2: ["Font of Magic", "Metamagic", "Metamagic Options"],
      3: ["Sorcerer Subclass"]
    },
    cantrips: [4, 4, 4],
    slots: [[2], [3], [4, 2]],
    prepared: [2, 4, 6],
    resources: { "Sorcery Points": [0, 2, 3] }
  },
  rogue: {
    features: {
      1: ["Expertise", "Sneak Attack", "Thieves' Cant", "Weapon Mastery"],
      2: ["Cunning Action"],
      3: ["Rogue Subclass", "Steady Aim"]
    },
    resources: { "Sneak Attack": ["1d6", "1d6", "2d6"] }
  },
  ranger: {
    features: {
      1: ["Favored Enemy", "Spellcasting", "Weapon Mastery"],
      2: ["Deft Explorer", "Fighting Style"],
      3: ["Ranger Subclass"]
    },
    slots: [[2], [2], [3]],
    prepared: [2, 3, 4],
    resources: { "Favored Enemy": [2, 2, 2] }
  }
};

function loadClass(slug) {
  const file = JSON.parse(fs.readFileSync(path.join(CLASS_DIR, `class-${slug}.json`), "utf8"));
  const classItem = file.class.find((item) => item.name.toLowerCase() === slug);
  assert.ok(classItem, `${slug} class item exists`);
  return { file, classItem };
}

function stripTags(value) {
  return String(value || "").replace(/\{@[^}]+ ([^}|]+)(?:\|[^}]*)?}/g, "$1");
}

function flattenForTest(entry) {
  if (typeof entry === "string") return stripTags(entry);
  if (Array.isArray(entry)) return entry.map(flattenForTest).filter(Boolean).join(" ");
  if (!entry || typeof entry !== "object") return "";
  return [entry.name ? `${entry.name}.` : "", flattenForTest(entry.entries), flattenForTest(entry.items)]
    .filter(Boolean)
    .join(" ");
}

function extractRendererFunction(name) {
  const start = RENDERER.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `renderer defines ${name}`);
  let depth = 0;
  let seenBody = false;
  for (let index = start; index < RENDERER.length; index += 1) {
    const char = RENDERER[index];
    if (char === "{") {
      depth += 1;
      seenBody = true;
    } else if (char === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return RENDERER.slice(start, index + 1);
    }
  }
  assert.fail(`could not extract ${name}`);
}

function tableColumnValues(classItem, label, count = 3) {
  for (const group of classItem.classTableGroups || []) {
    const index = (group.colLabels || []).findIndex((item) => stripTags(item).toLowerCase() === label.toLowerCase());
    if (index < 0) continue;
    return (group.rows || []).slice(0, count).map((row) => row[index]);
  }
  return null;
}

function trimTrailingZeros(row) {
  const values = [...row];
  while (values.length && !values[values.length - 1]) values.pop();
  return values;
}

function effectiveSubclassOptions(file, classItem) {
  const byName = new Map();
  for (const subclass of file.subclass || []) {
    if (subclass.className !== classItem.name) continue;
    if (subclass.classSource && subclass.classSource !== classItem.source && subclass.source !== classItem.source) continue;
    const key = String(subclass.shortName || subclass.name || "").toLowerCase();
    const previous = byName.get(key);
    if (!previous || subclass.classSource === classItem.source || subclass.source === classItem.source) byName.set(key, subclass);
  }
  return [...byName.values()];
}

for (const [slug, spec] of Object.entries(classes)) {
  const { file, classItem } = loadClass(slug);

  for (const [level, expected] of Object.entries(spec.features)) {
    const actual = (file.classFeature || [])
      .filter((feature) => feature.className === classItem.name && feature.classSource === classItem.source && Number(feature.level) === Number(level))
      .map((feature) => feature.name);
    for (const name of expected) assert.ok(actual.includes(name), `${slug} L${level} has ${name}`);
  }

  if (spec.cantrips) {
    const cantrips = tableColumnValues(classItem, "Cantrips");
    assert.deepStrictEqual(cantrips, spec.cantrips, `${slug} cantrips L1-3`);
  }

  if (spec.slots) {
    const spellTable = (classItem.classTableGroups || []).find((group) => Array.isArray(group.rowsSpellProgression));
    const slots = spellTable
      ? (spellTable.rowsSpellProgression || []).slice(0, 3).map(trimTrailingZeros)
      : tableColumnValues(classItem, "Spell Slots").map((count, index) => {
        const slotLevel = Number.parseInt(tableColumnValues(classItem, "Slot Level")[index], 10);
        const row = Array.from({ length: slotLevel }, () => 0);
        row[slotLevel - 1] = Number.parseInt(count, 10);
        return trimTrailingZeros(row);
      });
    assert.deepStrictEqual(slots, spec.slots, `${slug} slots L1-3`);
  }

  if (spec.prepared) {
    assert.deepStrictEqual(classItem.preparedSpellsProgression.slice(0, 3), spec.prepared, `${slug} prepared spells L1-3`);
  }

  for (const [label, expected] of Object.entries(spec.resources || {})) {
    const actual = label === "Sneak Attack"
      ? tableColumnValues(classItem, label).map((item) => `${item.toRoll[0].number}d${item.toRoll[0].faces}`)
      : tableColumnValues(classItem, label).map((item) => Number.parseInt(item, 10));
    assert.deepStrictEqual(actual, expected, `${slug} ${label} L1-3`);
  }

  const subclassChoiceLevel = Object.entries(spec.features).find(([, names]) => names.some((name) => /Subclass$/.test(name)))?.[0];
  if (subclassChoiceLevel) {
    const options = effectiveSubclassOptions(file, classItem);
    assert.ok(options.length > 0, `${slug} exposes subclass options`);
    const optionsWithLevel3Features = options.filter((subclass) => (file.subclassFeature || []).some((feature) => (
      feature.className === classItem.name
      && feature.classSource === classItem.source
      && String(feature.subclassShortName || "").toLowerCase() === String(subclass.shortName || subclass.name || "").toLowerCase()
      && feature.subclassSource === subclass.source
      && Number(feature.level) === Number(subclassChoiceLevel)
    )));
    assert.ok(optionsWithLevel3Features.length > 0, `${slug} has functional level ${subclassChoiceLevel} subclass mechanics`);
  }
}

assert.ok(/function preparedSpellsProgressionForCharacter\(\)/.test(RENDERER), "renderer reads class prepared spell progression");
assert.ok(!/className !== "paladin"/.test(RENDERER), "prepared spell alerts are not Paladin-only");
assert.ok(/"second wind", "favored enemy"/.test(RENDERER), "renderer tracks class-table resource uses for Fighter and Ranger");
assert.ok(/once\|twice\|thrice/.test(RENDERER), "renderer parses multi-use free spell casts");
assert.ok(/const THIRD_CASTER_SLOTS/.test(RENDERER), "renderer has third-caster slot progression");
assert.ok(/progression === "1\/3"/.test(RENDERER), "renderer applies third-caster slot progression");
assert.ok(/function selectedSubclassSpellcastingSource\(\)/.test(RENDERER), "renderer can use subclass spellcasting data");
assert.ok(/spellcastingSourceForCharacter\(\)\?\.cantripProgression/.test(RENDERER), "renderer reads subclass cantrip progression");
assert.ok(/spellcastingSourceForCharacter\(\)\?\.preparedSpellsProgression/.test(RENDERER), "renderer reads subclass prepared-spell progression");
assert.ok(/collectBucket\(group\.expanded, true\)/.test(RENDERER), "renderer reads subclass expanded spell lists");
assert.ok(/item\.choose \|\| item\.all \|\| item/.test(RENDERER), "renderer parses expanded spell filters");
assert.ok(/structuredSpellHasClass\(spell, grant\.className\)/.test(RENDERER), "renderer matches subclass expanded class spell filters through structured spell metadata");
assert.ok(/spellcastingSourceForCharacter\(\)\?\.spellcastingAbility/.test(RENDERER), "renderer uses subclass spellcasting ability");
assert.ok(/function canLearnCantrip\(spellName\)[\s\S]*return spellMatchesSelection\(spell, 0\);/.test(RENDERER), "renderer learns subclass-expanded cantrips");
assert.ok(/function getAccessibleCantripOptions\(snapshot = null\)[\s\S]*spellMatchesSelection\(spell, 0, snapshot\)[\s\S]*!autoCantrips\.has/.test(RENDERER), "renderer lists subclass-expanded cantrips, reuses the render snapshot, and excludes auto cantrips");
assert.ok(/function sorceryPointsResourceInfo\(\)[\s\S]*resource:\$\{name\}/.test(RENDERER), "renderer exposes a shared Sorcery Points resource pool");
assert.ok(/name === "sorcery point" \|\| name === "sorcery points"/.test(RENDERER), "Sorcerer features consume the shared Sorcery Points pool");
assert.ok(/"Sorcery Points"/.test(RENDERER), "attacks and spellcasting panel renders the Sorcery Points counter");
assert.ok(/prepared-resource-counters/.test(RENDERER), "resource counters share a compact horizontal group");
assert.ok(/spellSlotsForCharacter\(\)\.forEach\(\(maximum, index\) =>/.test(RENDERER), "attacks and spellcasting panel renders every available spell-slot level");
assert.ok(/`L\$\{level\}`/.test(RENDERER), "spell slots use the same compact resource-counter format");
assert.ok(/prepared-resource-orb/.test(RENDERER), "resource counters render as compact adjacent spheres");
assert.ok(/orb\.textContent = `\$\{remaining\}\/\$\{maximum\}`/.test(RENDERER), "each resource sphere displays its remaining over maximum value");

{
  const { file } = loadClass("fighter");
  const feature = (file.classFeature || []).find((item) => item.name === "Weapon Mastery" && item.source === "XPHB" && Number(item.level) === 1);
  assert.ok(feature, "Fighter exposes Weapon Mastery at level 1");
  const featureText = flattenForTest(feature.entries);
  assert.ok(/three kinds/i.test(featureText), "Fighter level 1 chooses three Weapon Mastery weapons");
  assert.ok(/weapon drills and change one/i.test(featureText), "Fighter Weapon Mastery includes one Weapon Drills replacement after a Long Rest");

  const itemData = JSON.parse(fs.readFileSync(path.join(ROOT, "vendor", "5etools-src-main", "data", "items-base.json"), "utf8"));
  const masteryDefinitions = new Set((itemData.itemMastery || []).map((item) => `${item.name}|${item.source}`));
  const selectableWeapons = (itemData.baseitem || []).filter((item) => item.source === "XPHB" && item.weapon && item.mastery?.length);
  assert.ok(selectableWeapons.length >= 3, "packaged XPHB data exposes enough real weapons for the Fighter level 1 picker");
  assert.ok(selectableWeapons.every((item) => item.mastery.every((ref) => masteryDefinitions.has(ref))), "every selectable XPHB weapon resolves to a packaged mastery definition");
  assert.ok(/item\.source === "XPHB" && item\.weapon && item\.mastery\?\.length/.test(extractRendererFunction("weaponMasteryOptionsForFeature")), "renderer builds Weapon Mastery choices from the packaged XPHB weapons");

  const featureDetectionContext = {
    normalizeName: (value) => String(value || "").trim().toLowerCase(),
    flattenEntryText: flattenForTest
  };
  vm.runInNewContext(extractRendererFunction("isWeaponMasteryFeature"), featureDetectionContext);
  assert.strictEqual(featureDetectionContext.isWeaponMasteryFeature(feature, "mastery properties"), true, "mixed-case Weapon Mastery feature name opens the choice flow even when rendered tag text is abbreviated");
  assert.ok(/isWeaponMasteryFeature\(feature, text\)/.test(extractRendererFunction("featureChoiceSpecs")), "feature choice specs use normalized Weapon Mastery detection");
  assert.ok(/await waitForItemCatalog\(\)/.test(extractRendererFunction("showFeatureDrawer")), "Features & Traits waits for the weapon catalog before rendering choices");

  let characterLevel = 1;
  const countContext = {
    normalizeName: (value) => String(value || "").trim().toLowerCase(),
    getCharacterLevel: () => characterLevel,
    flattenEntryText: flattenForTest,
    countWordToNumber: (value) => ({ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }[value] || 0)
  };
  vm.runInNewContext(extractRendererFunction("weaponMasteryCountForFeature"), countContext);
  for (const [level, expected] of [[1, 3], [4, 4], [9, 5], [16, 6]]) {
    characterLevel = level;
    assert.strictEqual(countContext.weaponMasteryCountForFeature(feature), expected, `Fighter level ${level} has ${expected} Weapon Mastery choices`);
  }

  const drillContext = {};
  vm.runInNewContext([
    extractRendererFunction("weaponMasteryChoiceDifference"),
    extractRendererFunction("canApplyWeaponMasteryDrillChange")
  ].join("\n"), drillContext);
  const initial = ["weapon-mastery:Longsword", "weapon-mastery:Longbow", "weapon-mastery:Maul"];
  assert.strictEqual(drillContext.canApplyWeaponMasteryDrillChange([], initial, 3), true, "initial Weapon Mastery choices are not treated as a drill replacement");
  assert.strictEqual(drillContext.canApplyWeaponMasteryDrillChange(initial, [initial[0], initial[1]], 3), true, "Weapon Drills allows removing one old weapon before choosing its replacement");
  assert.strictEqual(drillContext.canApplyWeaponMasteryDrillChange(initial, [initial[0], initial[1], "weapon-mastery:Greatsword"], 3), true, "Weapon Drills allows one complete replacement");
  assert.strictEqual(drillContext.canApplyWeaponMasteryDrillChange(initial, [initial[0], "weapon-mastery:Greatsword", "weapon-mastery:Rapier"], 3), false, "Weapon Drills rejects replacing two choices in one Long Rest");
  const longRestSource = extractRendererFunction("longRestSpellResources");
  assert.ok(/snapshotWeaponMasteryChoicesForLongRest\(\)/.test(longRestSource), "starting a Long Rest snapshots Weapon Mastery choices");
  assert.ok(/weaponMasteryRestSelectionsComplete\(\)/.test(longRestSource), "finishing a Long Rest requires a complete Weapon Drills replacement");
  assert.ok(/restoreWeaponMasteryChoicesFromInterruptedLongRest\(\)/.test(extractRendererFunction("interruptActiveRest")), "interrupting a Long Rest restores pre-drill Weapon Mastery choices");
  assert.ok(/dataset\.weaponMasteryChoice = "true"/.test(RENDERER), "Weapon Mastery choices have an explicit Character Ready lock exception");
}

{
  const { file } = loadClass("rogue");
  const arcaneTrickster = (file.subclass || []).find((subclass) => subclass.name === "Arcane Trickster" && subclass.source === "XPHB");
  assert.ok(arcaneTrickster, "Rogue has Arcane Trickster subclass");
  assert.strictEqual(arcaneTrickster.spellcastingAbility, "int", "Arcane Trickster casts with Intelligence");
  assert.strictEqual(arcaneTrickster.casterProgression, "1/3", "Arcane Trickster uses third-caster slots");
  assert.deepStrictEqual(arcaneTrickster.cantripProgression.slice(0, 3), [0, 0, 2], "Arcane Trickster has two chosen cantrips at level 3");
  assert.deepStrictEqual(arcaneTrickster.preparedSpellsProgression.slice(0, 3), [0, 0, 3], "Arcane Trickster prepares three spells at level 3");
  const additionalSpells = arcaneTrickster.additionalSpells?.[0] || {};
  assert.ok(JSON.stringify(additionalSpells.known || {}).includes("mage hand|xphb#c"), "Arcane Trickster auto-knows Mage Hand at level 3");
  assert.ok(JSON.stringify(additionalSpells.expanded || {}).includes("level=0|class=Wizard"), "Arcane Trickster can choose Wizard cantrips");
  assert.ok(JSON.stringify(additionalSpells.expanded || {}).includes("level=1|class=Wizard"), "Arcane Trickster can choose level 1 Wizard spells");
  const level3Features = (file.subclassFeature || []).filter((feature) => (
    feature.subclassShortName === "Arcane Trickster"
    && feature.subclassSource === "XPHB"
    && Number(feature.level) === 3
  ));
  assert.ok(level3Features.some((feature) => feature.name === "Spellcasting"), "Arcane Trickster has Spellcasting at level 3");
  assert.ok(level3Features.some((feature) => feature.name === "Mage Hand Legerdemain"), "Arcane Trickster has Mage Hand Legerdemain at level 3");
}

{
  const { file } = loadClass("sorcerer");
  const divineSoul = (file.subclass || []).find((subclass) => subclass.name === "Divine Soul" && subclass.source === "XGE" && subclass.classSource === "XPHB");
  assert.ok(divineSoul, "Sorcerer exposes the XGE Divine Soul adapted to level 3");

  const features = (file.subclassFeature || []).filter((feature) => (
    feature.subclassShortName === "Divine Soul"
    && feature.subclassSource === "XGE"
    && feature.classSource === "XPHB"
  ));
  const featureByName = (name) => features.find((feature) => feature.name === name);
  assert.deepStrictEqual(
    features.filter((feature) => ["Divine Magic", "Favored by the Gods", "Empowered Healing", "Otherworldly Wings", "Unearthly Recovery"].includes(feature.name)).map((feature) => feature.level),
    [3, 3, 6, 14, 18],
    "Divine Soul gains every feature at the adapted Sorcerer levels"
  );

  const divineMagic = featureByName("Divine Magic");
  const divineMagicText = flattenForTest(divineMagic.entries);
  assert.ok(/cleric spell list or the sorcerer spell list/i.test(divineMagicText), "Divine Magic expands every Sorcerer spell choice to Cleric spells");
  const affinityOptions = divineMagic.entries.find((entry) => entry?.type === "options")?.entries || [];
  assert.deepStrictEqual(
    affinityOptions.map((option) => [option.name, option.entry.match(/\{@spell ([^}]+)}/)?.[1]]),
    [
      ["Good", "cure wounds"],
      ["Evil", "inflict wounds"],
      ["Law", "bless"],
      ["Chaos", "bane"],
      ["Neutrality", "protection from evil and good"]
    ],
    "Divine Magic preserves the five mutually exclusive affinity spell choices"
  );

  const expanded = divineSoul.additionalSpells?.find((group) => group.name === "Divine Magic")?.expanded?._ || [];
  assert.deepStrictEqual(expanded.map((item) => item.all), Array.from({ length: 10 }, (_, level) => `level=${level}|class=Cleric`), "Divine Magic exposes Cleric cantrips and spell levels 1-9");
  const affinityGroups = divineSoul.additionalSpells.filter((group) => group.requiredChoice);
  assert.deepStrictEqual(affinityGroups.map((group) => group.requiredChoice), ["Good", "Evil", "Law", "Chaos", "Neutrality"], "only the selected Divine Affinity grants its bonus spell");

  const favored = featureByName("Favored by the Gods");
  assert.ok(/fail a saving throw or miss with an attack roll/i.test(flattenForTest(favored.entries)), "Favored by the Gods applies to failed saves and missed attacks");
  assert.ok(/2d4/.test(flattenForTest(favored.entries)), "Favored by the Gods adds 2d4");
  assert.ok(/short or long rest/i.test(flattenForTest(favored.entries)), "Favored by the Gods refreshes on either rest");
  assert.strictEqual(favored.activation, "triggered", "Favored by the Gods is tracked as a no-action trigger");

  const healing = featureByName("Empowered Healing");
  assert.strictEqual(healing.consumes?.name, "Sorcery Points", "Empowered Healing consumes the shared Sorcery Points pool");
  assert.ok(/within 5 feet/i.test(flattenForTest(healing.entries)), "Empowered Healing enforces its 5-foot ally range");
  assert.ok(/reroll any number of those dice once/i.test(flattenForTest(healing.entries)), "Empowered Healing rerolls any chosen healing dice once");
  assert.ok(/only once per turn/i.test(flattenForTest(healing.entries)), "Empowered Healing is limited to once per turn");

  assert.ok(/bonus action[\s\S]*flying speed of 30 feet/i.test(flattenForTest(featureByName("Otherworldly Wings").entries)), "Otherworldly Wings grants persistent 30-foot flight as a bonus action");
  const recoveryText = flattenForTest(featureByName("Unearthly Recovery").entries);
  assert.ok(/bonus action when you have fewer than half/i.test(recoveryText), "Unearthly Recovery requires being below half HP and uses a bonus action");
  assert.ok(/equal to half your hit point maximum/i.test(recoveryText), "Unearthly Recovery heals half maximum HP");
  assert.ok(/finish a long rest/i.test(recoveryText), "Unearthly Recovery refreshes on a long rest");

  const activeSubclassSpellGrantsSource = extractRendererFunction("activeSubclassSpellGrants");
  const spellGrantContext = {
    selectedSubclassForCharacter: () => divineSoul,
    getCharacterLevel: () => 3,
    subclassFeaturesForCharacter: () => features.filter((feature) => feature.level <= 3),
    featureChoiceKey: (feature) => feature.name,
    selectedFeatureChoices: (key) => key === "Divine Magic" ? ["Good"] : [],
    normalizeName: (value) => String(value || "").toLowerCase(),
    collectAdditionalSpellItems: (value, prepared) => (Array.isArray(value) ? value : [value]).map((item) => {
      if (typeof item === "string") return { spellName: item.split("|")[0], level: 1, prepared };
      const match = String(item?.all || "").match(/level=(\d+)\|class=([^|]+)/i);
      return match ? { level: Number(match[1]), className: match[2], count: 1, prepared } : null;
    }).filter(Boolean)
  };
  vm.runInNewContext(activeSubclassSpellGrantsSource, spellGrantContext);
  const grants = spellGrantContext.activeSubclassSpellGrants();
  assert.ok(grants.some((grant) => grant.className === "Cleric" && grant.level === 0), "renderer retains generic Cleric-list cantrip grants");
  assert.ok(grants.some((grant) => grant.className === "Cleric" && grant.level === 9), "renderer retains generic Cleric-list level 9 grants");
  assert.ok(grants.some((grant) => grant.spellName === "cure wounds"), "renderer grants the selected Good affinity spell");
  assert.ok(!grants.some((grant) => grant.spellName === "inflict wounds"), "renderer does not grant unselected affinity spells");
}

{
  const { file } = loadClass("paladin");
  const genieSplendor = (file.subclassFeature || []).find((feature) => feature.name === "Genie's Splendor");
  assert.ok(genieSplendor, "Paladin Noble Genies has Genie's Splendor");
  assert.ok(/base Armor Class equals 10 plus your Dexterity and Charisma modifiers/.test(flattenForTest(genieSplendor.entries)), "Genie's Splendor uses DEX plus CHA for unarmored AC");

  const featureEffectSource = extractRendererFunction("featureEffectEntries");
  const featureEffectContext = {
    generatedFeaturesAndTraitsEntries: () => [{
      type: "classFeature",
      feature: genieSplendor,
      description: flattenForTest(genieSplendor.entries)
    }],
    flattenEntryText: flattenForTest
  };
  vm.runInNewContext(featureEffectSource, featureEffectContext);
  assert.ok(
    featureEffectContext.featureEffectEntries().some((entry) => entry.title === "Genie's Splendor"),
    "Genie's Splendor remains an active passive effect after choosing its skill"
  );

  const source = extractRendererFunction("baseArmorClassCandidatesFromFeatures");
  let featureEntries = [{
    title: "Genie's Splendor",
    description: "When you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers. You can use a Shield and still gain this benefit."
  }];
  const context = {
    featureEffectEntries: () => featureEntries,
    isArmorItem: (item) => Boolean(item?.armor),
    abilityModifierByName: (name) => ({ strength: 0, str: 0, intelligence: 0, int: 0 }[String(name || "").toLowerCase()] ?? null)
  };
  vm.runInNewContext(source, context);
  const plain = (value) => JSON.parse(JSON.stringify(value));

  assert.deepStrictEqual(
    plain(context.baseArmorClassCandidatesFromFeatures(4, 1, 0, 4, null)),
    [{ ac: 18, allowsShield: true }],
    "Genie's Splendor calculates 10 + DEX + CHA while unarmored"
  );
  assert.deepStrictEqual(
    plain(context.baseArmorClassCandidatesFromFeatures(2, 1, 0, 3, { armor: true })),
    [{ ac: 15, allowsShield: true }],
    "Genie's Splendor calculates 10 + DEX + CHA even while wearing armor"
  );

  featureEntries = [{ title: "Natural Defense", description: "When you aren't wearing armor, your base AC is 13 + your Dexterity modifier." }];
  assert.deepStrictEqual(
    plain(context.baseArmorClassCandidatesFromFeatures(2, 1, 0, 3, null)),
    [{ ac: 15, allowsShield: true }],
    "feature AC parser still handles single-modifier formulas"
  );
  assert.deepStrictEqual(
    plain(context.baseArmorClassCandidatesFromFeatures(2, 1, 0, 3, { armor: true })),
    [],
    "other no-armor AC features still require no armor"
  );
}

console.log("class-level3-mechanics.test.js passed");
