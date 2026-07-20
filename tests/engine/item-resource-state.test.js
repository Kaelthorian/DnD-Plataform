"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const itemResources = require("../../src/engine/items/item-resource-state");
const itemCatalog = require("../../src/engine/items/item-catalog");

const charges = itemResources.resourceDefinition({ resources: { charges: 5, reload: null } });
assert.deepStrictEqual(charges, { kind: "charges", max: 5 });
assert.deepStrictEqual(
  itemResources.resourceDefinition({ resources: { charges: null, reload: 6 } }),
  { kind: "reload", max: 6 }
);
assert.strictEqual(itemResources.resourceDefinition({ resources: { charges: "1d6" } }), null,
  "dice expressions must not be treated as fixed maxima");

const catalogId = "item:wand-of-testing|TST|root";
const initialized = itemResources.ensureItemResourceState({}, catalogId, charges);
assert.strictEqual(initialized.changed, true);
assert.deepStrictEqual(initialized.state, { current: 5, max: 5, kind: "charges" });
assert.deepStrictEqual(initialized.nextStore[catalogId], initialized.state,
  "resource state must persist under the stable catalog identity");

const idempotent = itemResources.ensureItemResourceState(initialized.nextStore, catalogId, charges);
assert.strictEqual(idempotent.changed, false, "reading initialized state must be idempotent");
assert.strictEqual(idempotent.nextStore, initialized.nextStore, "an idempotent read must preserve store identity");

const spent = itemResources.adjustItemResourceState(initialized.nextStore, catalogId, charges, -2);
assert.strictEqual(spent.applied, true);
assert.strictEqual(spent.state.current, 3);
const underflow = itemResources.adjustItemResourceState(spent.nextStore, catalogId, charges, -99);
assert.strictEqual(underflow.state.current, 0, "spending must be bounded at zero");
assert.strictEqual(itemResources.normalizeResourceRecord({ current: -4, max: 5 }, charges).current, 0,
  "a corrupted persisted value must normalize back inside the lower bound");
const overflow = itemResources.adjustItemResourceState(underflow.nextStore, catalogId, charges, 99);
assert.strictEqual(overflow.state.current, 5, "recovery must be bounded at the declared maximum");

const expandedFull = itemResources.ensureItemResourceState(initialized.nextStore, catalogId, { kind: "charges", max: 7 });
assert.strictEqual(expandedFull.state.current, 7, "a full resource should remain full when the catalog maximum changes");
const reducedPartial = itemResources.ensureItemResourceState(spent.nextStore, catalogId, { kind: "charges", max: 2 });
assert.strictEqual(reducedPartial.state.current, 2, "a partial resource must clamp when the catalog maximum is reduced");

assert.strictEqual(itemResources.declaredAttachedSpellChargeCost({ usage: "charges", cost: "2" }), 2);
assert.strictEqual(itemResources.declaredAttachedSpellChargeCost({ usage: "charges", cost: "1d3" }), null,
  "variable spell costs require manual adjudication");
assert.strictEqual(itemResources.declaredAttachedSpellChargeCost({ usage: "daily", cost: "1" }), null,
  "only explicit charge usage may consume the charge pool");

assert.strictEqual(itemResources.inferItemActionType("As a Bonus Action, you can activate it."), "bonus");
assert.strictEqual(itemResources.inferItemActionType("You can use a bonus action to activate it."), "bonus");
assert.strictEqual(itemResources.inferItemActionType("Using your Reaction, activate the ward."), "reaction");
assert.strictEqual(itemResources.inferItemActionType("You may use your reaction to trigger the ward."), "reaction");
assert.strictEqual(itemResources.inferItemActionType("Take the Magic action to invoke it."), "action");
assert.strictEqual(itemResources.inferItemActionType("As a Magic action, you can invoke it."), "action");
assert.strictEqual(itemResources.inferItemActionType("You can use an action to invoke it."), "action");
assert.strictEqual(itemResources.inferItemActionType("Use an Object action to unfold it."), "objectInteraction");
assert.strictEqual(itemResources.inferItemActionType("The item might react to danger."), "",
  "incidental action words must not create combat actions");
assert.deepStrictEqual(itemResources.inferItemActionTypes("As an action, activate one property. As a reaction, activate another."), ["reaction", "action"]);
assert.strictEqual(itemResources.inferUniqueItemActionType("As an action, activate one property. As a reaction, activate another."), "",
  "mixed-timing item text must not collapse into one invented generic action");
assert.strictEqual(itemResources.inferUniqueItemActionType("As a Bonus Action, drink this potion."), "bonus");

assert.strictEqual(itemResources.spellTimingActionType({ time: [{ unit: "action" }] }), "action");
assert.strictEqual(itemResources.spellTimingActionType({ time: [{ unit: "bonus" }] }), "bonus");
assert.strictEqual(itemResources.spellTimingActionType({ time: [{ unit: "reaction" }] }), "reaction");
assert.strictEqual(itemResources.spellTimingActionType({ time: [{ unit: "minute", number: 1 }] }), "",
  "long-cast spells must not become one-turn item actions");

const root = path.resolve(__dirname, "../..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/items/items.json"), "utf8")).item;
const spells = JSON.parse(fs.readFileSync(path.join(root, "src/data/spells/spells.json"), "utf8"));
const findSpell = (reference) => spells.find((spell) => (
  String(spell.name || "").toLowerCase() === String(reference.name || "").toLowerCase()
  && (!reference.source || String(spell.source || "").toLowerCase() === String(reference.source).toLowerCase())
));

const wand = itemCatalog.itemAutomationProfile(catalog.find((item) => item.name === "Wand of Fireballs" && item.source === "XDMG"));
assert.deepStrictEqual(wand.spells.attached.map((spell) => ({
  name: spell.name,
  cost: itemResources.declaredAttachedSpellChargeCost(spell),
  type: itemResources.spellTimingActionType(findSpell(spell), "")
})), [{ name: "fireball", cost: 1, type: "action" }]);

const staff = itemCatalog.itemAutomationProfile(catalog.find((item) => item.name === "Staff of Defense" && item.source === "PaBTSO"));
assert.deepStrictEqual(staff.spells.attached.map((spell) => ({
  name: spell.name,
  cost: itemResources.declaredAttachedSpellChargeCost(spell),
  type: itemResources.spellTimingActionType(findSpell(spell), "")
})), [
  { name: "mage armor", cost: 1, type: "action" },
  { name: "shield", cost: 2, type: "reaction" }
]);

const guardianEmblem = itemCatalog.itemAutomationProfile(catalog.find((item) => item.name === "Guardian Emblem" && item.source === "TCE"));
assert.ok(itemResources.inferItemActionTypes(guardianEmblem.description).length > 1);
assert.strictEqual(itemResources.inferUniqueItemActionType(guardianEmblem.description), "",
  "Guardian Emblem has separate action/reaction properties and requires property-level guidance");

const healingPotion = itemCatalog.itemAutomationProfile(catalog.find((item) => item.name === "Potion of Healing" && item.source === "XDMG"));
assert.strictEqual(itemResources.inferUniqueItemActionType(healingPotion.description), "bonus",
  "the 2024 healing potion must keep its declared Bonus Action");
const acid = itemCatalog.itemAutomationProfile(catalog.find((item) => item.name === "Acid" && item.source === "XPHB"));
assert.strictEqual(itemResources.inferUniqueItemActionType(acid.description), "",
  "an attack-replacement consumable must remain manual until per-attack economy is modeled");

console.log("Item resource state and safe action inference verified");
