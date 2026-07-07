const assert = require("assert");
const fs = require("fs");
const path = require("path");

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

console.log("class-level3-mechanics.test.js passed");
