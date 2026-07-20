"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const itemCatalog = require(path.join(repoRoot, "src", "engine", "items", "item-catalog.js"));

const weapon = {
  name: "Storm-Blade",
  source: "TST",
  type: "M",
  rarity: "rare",
  weapon: true,
  weaponCategory: "martial",
  dmg1: "1d8",
  dmg2: "1d10",
  dmgType: "S",
  range: "20/60",
  property: ["V"],
  mastery: ["Topple|XPHB"],
  bonusWeapon: "+2",
  charges: "1d6",
  recharge: "dawn",
  rechargeAmount: "1d4 + 1",
  reqAttune: "by a fighter",
  attachedSpells: {
    charges: { "2": ["lightning bolt|XPHB"] },
    daily: { "1e": ["fly|XPHB"] },
    will: ["light|XPHB"]
  },
  entries: [
    "Deal {@damage 1d8} damage, then cast {@spell lightning bolt|XPHB|Lightning Bolt} against a {@condition frightened} target.",
    { type: "entries", name: "Recharge", entries: ["Regains {@dice 1d4 + 1} charges at dawn."] }
  ],
  variants: [{
    base: { name: "Longsword", source: "XPHB" },
    specificVariant: {
      name: "Storm Longsword",
      source: "TST",
      baseItem: "longsword|xphb",
      dmg1: "1d8",
      dmgType: "S",
      genericVariant: { name: "Storm-Blade", source: "TST" }
    }
  }]
};

const armor = {
  name: "Quiet Plate",
  source: "TST",
  type: "HA",
  rarity: "very rare",
  armor: true,
  ac: 18,
  bonusAc: "+1",
  dexterityMax: 0,
  strength: "15",
  entries: ["Your AC increases by {=bonusAc}."]
};

const decorated = itemCatalog.attachCatalogIdentities([weapon, armor]);
assert.equal(weapon.catalogId, undefined, "identity attachment must not mutate source records");
assert.equal(decorated[0].catalogVariantToken, "template");
assert.equal(decorated[1].catalogVariantToken, "root");
assert.equal(decorated[0].variants[0].specificVariant.catalogVariantToken, "specific:longsword|xphb");
assert.equal(decorated[0].variants[0].specificVariant.catalogParentId, decorated[0].catalogId);
assert.equal(
  decorated[0].variants[0].specificVariant.catalogId,
  itemCatalog.itemCatalogId({ name: "Storm Longsword", source: "TST", baseItem: "longsword|xphb" }),
  "specific child IDs must be independent from their parent template"
);
assert.notEqual(
  itemCatalog.itemCatalogId({ name: "Gate Warden", source: "TST" }),
  itemCatalog.itemCatalogId({ name: "Gate-Warden", source: "TST" }),
  "punctuation is significant in stable identities"
);

const identityReport = itemCatalog.validateItemCatalog(decorated, { expectedCount: 2 });
assert.equal(identityReport.ok, true, identityReport.errors.join("\n"));
assert.equal(identityReport.records, 2);
assert.equal(identityReport.specificVariants, 1);
assert.equal(identityReport.identities, 3);
const duplicateReport = itemCatalog.validateItemCatalog([weapon, structuredClone(weapon)]);
assert.equal(duplicateReport.ok, false);
assert.match(duplicateReport.errors.join("\n"), /duplicate item identity/i);

const weaponProfile = itemCatalog.itemAutomationProfile(decorated[0]);
assert.deepStrictEqual(weaponProfile.weapon.damage, { dice: "1d8", type: "S" });
assert.deepStrictEqual(weaponProfile.weapon.range, { normal: 20, long: 60 });
assert.equal(weaponProfile.weapon.attackBonus, 2);
assert.equal(weaponProfile.resources.charges, null, "dice expressions must not be truncated to a numeric charge count");
assert.equal(weaponProfile.resources.raw.charges, "1d6");
assert.equal(weaponProfile.attunement.required, true);
assert.deepStrictEqual(
  weaponProfile.spells.attached.map((spell) => [spell.name, spell.source, spell.usage, spell.cost]),
  [
    ["lightning bolt", "XPHB", "charges", "2"],
    ["fly", "XPHB", "daily", "1e"],
    ["light", "XPHB", "will", null]
  ]
);
assert.equal(weaponProfile.description.includes("{@"), false);
assert.match(weaponProfile.description, /Lightning Bolt/);

const armorProfile = itemCatalog.itemAutomationProfile(decorated[1]);
assert.equal(armorProfile.armor.enabled, true);
assert.equal(armorProfile.armor.baseAc, 18);
assert.equal(armorProfile.armor.bonusAc, 1);
assert.match(armorProfile.description, /\+1/);

assert.equal(itemCatalog.strip5eTags("{@dc 15}; {@chance 25}; {@variantrule Proficiency|XPHB|Proficiency Bonus}"), "DC 15; 25%; Proficiency Bonus");
assert.equal(itemCatalog.strip5eTags("{@mystery readable label|SRC}"), "readable label");
assert.equal(itemCatalog.strip5eTags("{@note ({@item Wand|TST})}"), "(Wand)");
assert.equal(itemCatalog.strip5eTags("{@note Bonus {=bonusAc}.}", { bonusAc: "+2" }), "Bonus +2.");
assert.match(itemCatalog.renderEntryText({
  type: "table",
  caption: "Results",
  colLabels: ["d2", "Effect"],
  rows: [["1", "{@condition prone}"], ["2", "{@spell light|XPHB}"]]
}), /d2 \| Effect[\s\S]*prone[\s\S]*light/);

const generatedCatalogPath = path.join(repoRoot, "src", "data", "items", "items.json");
assert.equal(fs.existsSync(generatedCatalogPath), true, "the synchronized app-owned catalog must be versioned");
const realItems = JSON.parse(fs.readFileSync(generatedCatalogPath, "utf8")).item;
const realBaseItems = JSON.parse(fs.readFileSync(path.join(repoRoot, "src", "data", "items", "items-base.json"), "utf8"));
const realReport = itemCatalog.validateItemCatalog(realItems, { expectedCount: 1779 });
assert.equal(realReport.ok, true, realReport.errors.slice(0, 10).join("\n"));
assert.equal(realReport.specificVariants, 2431);
assert.equal(realReport.identities, 4210);

function realItem(name, source) {
  const item = realItems.find((entry) => entry.name === name && entry.source === source);
  assert.ok(item, `missing representative item ${name}|${source}`);
  return item;
}

const longbow = realItem("Longbow", "XPHB");
const longbowProfile = itemCatalog.itemAutomationProfile(longbow);
assert.deepStrictEqual(longbowProfile.weapon.damage, { dice: "1d8", type: "P" });
assert.deepStrictEqual(longbowProfile.weapon.range, { normal: 150, long: 600 });
assert.equal(longbowProfile.weapon.ammunitionType, "arrow|xphb");
assert.deepStrictEqual(longbow.mastery, ["Slow|XPHB"]);

const plate = realItem("Plate Armor", "XPHB");
const plateProfile = itemCatalog.itemAutomationProfile(plate);
assert.equal(plateProfile.armor.baseAc, 18);
assert.equal(plateProfile.armor.strength, 15);
assert.equal(plateProfile.armor.stealthDisadvantage, true);

const lanceReference = itemCatalog.taggedReferenceParts(realItem("Lance", "XPHB").property.find((entry) => typeof entry === "object"));
assert.deepStrictEqual(lanceReference, { code: "2H", source: "XPHB", note: "unless mounted" });
const psychicBladeReference = itemCatalog.taggedReferenceParts(realItem("Psychic Blade", "XPHB").mastery[0]);
assert.equal(psychicBladeReference.code, "Vex");
assert.match(psychicBladeReference.note, /doesn't count against/);

const airshipType = itemCatalog.resolveItemTypeMetadata(realBaseItems.itemType, realItem("Airship", "XPHB").type);
assert.equal(airshipType.abbreviation, "AIR");
assert.match(itemCatalog.renderEntryText(airshipType.entries), /Ship Repair/);
const artisanType = itemCatalog.resolveItemTypeMetadata(realBaseItems.itemType, realItem("Alchemist's Supplies", "XPHB").type);
assert.match(itemCatalog.renderEntryText(artisanType.entries), /Artisan's Tools are each focused on crafting/);

const wand = realItem("Wand of Fireballs", "XDMG");
const wandProfile = itemCatalog.itemAutomationProfile(wand);
assert.equal(wandProfile.resources.charges, 7);
assert.equal(wandProfile.resources.recharge, "dawn");
assert.equal(wandProfile.resources.rechargeAmount, "{@dice 1d6 + 1}");
assert.equal(wandProfile.attunement.required, true);
assert.deepStrictEqual(
  wandProfile.spells.attached.map((spell) => [spell.name, spell.source.toUpperCase(), spell.usage, spell.cost]),
  [["fireball", "XPHB", "charges", "1"]]
);

const professorOrb = realItem("Professor Orb", "WDMM");
assert.equal(professorOrb.attachedSpells.ability, "int");
assert.equal(
  itemCatalog.itemAutomationProfile(professorOrb).spells.attached.some((spell) => spell.name === "int"),
  false,
  "attachedSpells ability metadata must not become a fake spell"
);

assert.equal(itemCatalog.itemAutomationProfile(realItem("Potion of Healing", "XDMG")).consumable, true);
const assassinPoison = realItem("Assassin's Blood", "XDMG");
assert.equal(assassinPoison.poison, true);
assert.deepStrictEqual(assassinPoison.poisonTypes, ["ingested"]);
assert.equal(itemCatalog.itemAutomationProfile(assassinPoison).consumable, true);
assert.equal(itemCatalog.itemAutomationProfile(realItem("Acid", "XPHB")).consumable, true);
assert.equal(itemCatalog.itemAutomationProfile(realItem("Alchemist's Fire", "XPHB")).consumable, true);
assert.equal(itemCatalog.ammunitionBaseName(realItem("Sling Bullets of Althemone", "MOT")), "sling bullet",
  "named magical sling bullets must remain compatible with sling ammunition");
assert.equal(itemCatalog.ammunitionBaseName(realItem("Unbreakable Arrow", "XGE")), "arrow",
  "named arrows without baseItem metadata must remain compatible with bows");
assert.equal(itemCatalog.ammunitionBaseName({ name: "+1 Arrow", source: "XDMG", baseItem: "arrow|xphb" }), "arrow",
  "specific ammunition variants must resolve through their declared base item");
assert.equal(itemCatalog.ammunitionBaseName({ name: "Legacy Bolt", source: "TST", baseItem: "crossbow bolt|phb" }), "bolt",
  "legacy crossbow-bolt references must normalize to the active bolt identity");

assert.equal(itemCatalog.persistentHeldArmorClassBonus(realItem("Staff of Defense", "PaBTSO")), 1);
assert.equal(itemCatalog.persistentHeldArmorClassBonus(realItem("Staff of Power", "XDMG")), 2);
assert.equal(itemCatalog.persistentHeldArmorClassBonus(realItem("Quarterstaff of the Acrobat", "XDMG")), 0,
  "a reaction-only AC bonus must not become a passive held bonus");
assert.equal(itemCatalog.persistentWornArmorClassBonus(realItem("Cloak of Protection", "XDMG")), 1);
assert.equal(itemCatalog.persistentWornArmorClassBonus(realItem("Bracers of Defense", "XDMG")), 0,
  "conditional no-armor AC must remain guided");
assert.deepStrictEqual(itemCatalog.savingThrowBonusProfile(realItem("Chronolometer", "AI")), {
  bonus: 1,
  abilities: ["INT"],
  equipmentModes: ["attuned"]
});
assert.deepStrictEqual(itemCatalog.savingThrowBonusProfile(realItem("Cloak of Protection", "XDMG")), {
  bonus: 1,
  abilities: null,
  equipmentModes: ["worn"]
});
assert.equal(itemCatalog.savingThrowBonusProfile(realItem("Deck of Wonder", "BMT")), null,
  "a temporary card result must not become a passive equipment bonus");
assert.equal(itemCatalog.savingThrowBonusProfile(realItem("Netherese Ring of Protection", "PaBTSO")), null,
  "the conditional +4 disarm protection must not replace the ring's separate +1 rule");
assert.equal(itemCatalog.savingThrowBonusProfile(realItem("Rod of Alertness", "XDMG")), null,
  "a temporary planted aura must remain guided");
assert.equal(itemCatalog.savingThrowBonusProfile(realItem("Statuette of Saint Markovia", "CoS")), null,
  "an alignment-gated bonus must remain guided when alignment is not authoritative");
assert.equal(itemCatalog.spellcastingBonusProfile(realItem("Staff of Power", "XDMG")).attackBonus, 2);
assert.deepStrictEqual(itemCatalog.spellcastingBonusProfile(realItem("+1 Rod of the Pact Keeper", "XDMG")).classes, ["warlock"]);
assert.deepStrictEqual(itemCatalog.spellcastingBonusProfile(realItem("+1 Moon Sickle", "TCE")).classes, ["druid", "ranger"]);
assert.deepStrictEqual(itemCatalog.spellcastingBonusProfile(realItem("Jester's Mask", "BMT")).abilities, ["CHA"]);
assert.deepStrictEqual(itemCatalog.spellcastingBonusProfile(realItem("+1 Rod of the Pact Keeper", "XDMG")).equipmentModes, ["held"]);
assert.deepStrictEqual(itemCatalog.spellcastingBonusProfile(realItem("+1 Amulet of the Devout", "TCE")).equipmentModes, ["worn"]);
assert.equal(itemCatalog.equipmentModesMatch(["held"], ["accessory"]), false,
  "a rod stored as a legacy accessory must not grant a while-held spell bonus");
assert.equal(itemCatalog.equipmentModesMatch(["held"], ["mainHand"]), true);
assert.equal(itemCatalog.equipmentModesMatch(["worn"], ["accessory"]), true);
assert.deepStrictEqual(itemCatalog.persistentDefenseProfile(realItem("Brooch of Shielding", "XDMG")).resistances, ["force"]);
assert.deepStrictEqual(itemCatalog.persistentDefenseProfile(realItem("Armor of Vulnerability (Bludgeoning)", "XDMG")), {
  resistances: ["bludgeoning"],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: []
});
for (const [name, source] of [["Ghost Step Tattoo", "TCE"], ["Moon Card", "BMT"], ["Deck of Many More Things", "BMT"]]) {
  const profile = itemCatalog.persistentDefenseProfile(realItem(name, source));
  assert.equal(Object.values(profile).flat().length, 0, `${name} has only activated or choice-dependent defenses`);
}

assert.equal(
  itemCatalog.preferItemForLegacyName(realItem("Cloak of Billowing", "WttHC"), realItem("Cloak of Billowing", "XDMG")).source,
  "XDMG",
  "legacy name-only inventory must preserve the previous modern-source preference"
);

const airshipProfile = itemCatalog.itemAutomationProfile(realItem("Airship", "XPHB"));
assert.equal(airshipProfile.vehicle.enabled, true);
assert.equal(airshipProfile.vehicle.armorClass, 13);
assert.equal(airshipProfile.vehicle.hitPoints, 300);
assert.equal(airshipProfile.vehicle.crew, 10);
assert.equal(airshipProfile.vehicle.passengers, 20);

const weaponTemplate = realItem("+1 Weapon", "XDMG");
assert.equal(weaponTemplate.variants.length, 51);
assert.equal(weaponTemplate.variants.every((variant) => variant.specificVariant.catalogParentId === weaponTemplate.catalogId), true);

const stormgirdle = realItem("Stormgirdle", "EGW");
assert.deepStrictEqual(stormgirdle.items, [
  "Stormgirdle (Dormant)|EGW",
  "Stormgirdle (Awakened)|EGW",
  "Stormgirdle (Exalted)|EGW"
]);
stormgirdle.items.forEach((reference) => {
  const [name, source] = reference.split("|");
  realItem(name, source);
});

const randomTableText = itemCatalog.renderEntryText(realItem("Bag of Beans", "XDMG").entries);
assert.match(randomTableText, /1d100 \| Effect/);
assert.equal(randomTableText.includes("{@"), false);

console.log("Item catalog engine tests passed");
