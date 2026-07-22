"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const schema = require("../../src/engine/items/item-automation-schema");
const registryApi = require("../../src/engine/items/item-automation-registry");
const itemCatalog = require("../../src/engine/items/item-catalog");
const resources = require("../../src/engine/items/item-resource-state");
const effects = require("../../src/engine/effects/effect-state");
const lifecycle = require("../../src/engine/effects/effect-lifecycle");
const statuses = require("../../src/engine/conditions/statuses");
const actions = require("../../src/engine/combat/action-definitions");
const resolution = require("../../src/engine/combat/resolution-engine");
const economy = require("../../src/engine/combat/turn-economy");

const root = path.resolve(__dirname, "../..");
const catalogData = JSON.parse(fs.readFileSync(path.join(root, "src/data/items/items.json"), "utf8"));
const overlay = JSON.parse(fs.readFileSync(path.join(root, "src/data/items/item-automation.json"), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

assert.strictEqual(schema.validateOverlay(overlay).ok, true, "the shipped overlay must satisfy its schema");
const registry = registryApi.createItemAutomationRegistry({ overlay, catalog: catalogData });
assert.strictEqual(registry.size, 5);
itemCatalog.setItemAutomationRegistry(registry);

const censerEntry = registry.entries().find((entry) => entry.match.name === "Devotee's Censer");
const censer = itemCatalog.collectCatalogRecords(catalogData.item).map((record) => record.item)
  .find((item) => item.catalogId === censerEntry.catalogId);
assert.ok(censer, "Devotee's Censer specific flail variant must resolve by catalog identity");
const profile = itemCatalog.itemAutomationProfile(censer);
assert.deepStrictEqual(profile.weapon.damage, { dice: "1d8", type: "B" }, "base flail damage must remain canonical");
assert.strictEqual(profile.attackRiders[0].damageComponents[0].formula, "1d8");
assert.strictEqual(profile.attackRiders[0].damageComponents[0].type, "radiant");
assert.strictEqual(profile.actions[0].activation.type, "bonusAction");
assert.deepStrictEqual(profile.actions[0].actionCost, [{ type: "bonusAction", amount: 1 }]);
assert.deepStrictEqual(profile.actions[0].requirements, { owned: true, equipped: true, attuned: true });
assert.deepStrictEqual(profile.actions[0].createsEffect.area, { shape: "emanation", radius: 10, unit: "feet", anchor: "sourceActor", movesWithAnchor: true });
assert.strictEqual(profile.actions[0].createsEffect.visibility.obscuresVision, false);
assert.strictEqual(profile.actions[0].createsEffect.duration.combatRounds, 10);

const beltEntry = registry.entries().find((entry) => entry.match.name === "Belt of Dwarvenkind");
assert.ok(beltEntry, "Belt of Dwarvenkind must resolve by catalog identity");
const belt = itemCatalog.collectCatalogRecords(catalogData.item).map((record) => record.item)
  .find((item) => item.catalogId === beltEntry.catalogId);
const beltProfile = itemCatalog.itemAutomationProfile(belt);
assert.strictEqual(beltProfile.modifiers.length, 2);
assert.deepStrictEqual(beltProfile.modifiers[0].effects.abilityBonuses, [{ ability: "CON", amount: 2, maximum: 20 }]);
assert.deepStrictEqual(beltProfile.modifiers[0].effects.languages, ["Dwarvish"]);
assert.strictEqual(beltProfile.modifiers[0].effects.rollAdvantages[0].skill, "Persuasion");
assert.deepStrictEqual(beltProfile.modifiers[1].requirements.raceExcludes, ["dwarf", "duergar"]);
assert.deepStrictEqual(beltProfile.modifiers[1].effects.senses, [{ type: "darkvision", range: 60, unit: "feet" }]);
assert.deepStrictEqual(beltProfile.modifiers[1].effects.defenses.resistances, ["poison"]);

const balanceEntry = registry.entries().find((entry) => entry.match.name === "Balance Card");
assert.ok(balanceEntry, "Balance Card must resolve by catalog identity");
const balance = itemCatalog.collectCatalogRecords(catalogData.item).map((record) => record.item)
  .find((item) => item.catalogId === balanceEntry.catalogId);
const balanceProfile = itemCatalog.itemAutomationProfile(balance);
assert.strictEqual(balanceProfile.actions[0].activation.type, "action");
assert.deepStrictEqual(balanceProfile.actions[0].savingThrow, { ability: "CON", dc: 17, onSuccess: "none" });
assert.deepStrictEqual(balanceProfile.actions[0].damageComponents.map(({ formula, type, critical }) => ({ formula, type, critical })), [
  { formula: "4d8", type: "necrotic", critical: "none" }
]);
assert.deepStrictEqual(balanceProfile.actions[0].selfHealing, { kind: "equalToDamageDealt" });
assert.strictEqual(balanceProfile.resources.definitions[0].recovery.trigger, "dawn");

const capeEntry = registry.entries().find((entry) => entry.match.name === "Cape of the Mountebank");
assert.ok(capeEntry, "Cape of the Mountebank must resolve by catalog identity");
const cape = itemCatalog.collectCatalogRecords(catalogData.item).map((record) => record.item)
  .find((item) => item.catalogId === capeEntry.catalogId);
const capeProfile = itemCatalog.itemAutomationProfile(cape);
assert.deepStrictEqual(capeProfile.actions[0].spell, { name: "Dimension Door", source: "XPHB", castLevel: 4 });
assert.deepStrictEqual(capeProfile.actions[0].requirements.equipmentModes, ["worn"]);
assert.strictEqual(capeProfile.resources.definitions[0].max, 1);
assert.strictEqual(capeProfile.resources.definitions[0].recovery.trigger, "dawn");

const medalEntry = registry.entries().find((entry) => entry.match.name === "Medal of Muscle");
assert.ok(medalEntry, "Medal of Muscle must resolve by catalog identity");
const medal = itemCatalog.collectCatalogRecords(catalogData.item).map((record) => record.item)
  .find((item) => item.catalogId === medalEntry.catalogId);
const medalProfile = itemCatalog.itemAutomationProfile(medal);
assert.strictEqual(medalProfile.actions[0].oneTime, true);
assert.deepStrictEqual(medalProfile.actions[0].activatesStatus, {
  id: "medal-of-muscle-strength",
  duration: { unit: "hour", value: 1 }
});
const medalStatusEffects = statuses.collectStatusEffects(["medal-of-muscle-strength"]);
assert.strictEqual(medalStatusEffects.checkModeByAbility.STR, "advantage");
assert.strictEqual(medalStatusEffects.saveModeByAbility.STR, "advantage");
assert.strictEqual(statuses.findStatusDefinition("medal-of-muscle-strength").playerSelectable, false);

const attack = actions.createAttackActionDefinition({
  name: "Devotee's Censer",
  attackBonus: 6,
  damage: "1d8+3",
  damageType: "bludgeoning",
  damageComponents: [
    { id: "weapon-base", formula: "1d8+3", type: "bludgeoning", source: "weapon", trigger: "onHit", critical: "doubleDice", sourceCatalogId: censer.catalogId },
    ...profile.attackRiders[0].damageComponents
  ]
});
assert.deepStrictEqual(attack.damageComponents.map((component) => component.type), ["bludgeoning", "radiant"]);
assert.strictEqual(resolution.triggeredDamageComponents(attack, { attackRoll: { hit: true } }).length, 2, "hit includes the rider");
assert.strictEqual(resolution.triggeredDamageComponents(attack, { attackRoll: { hit: false } }).length, 0, "miss excludes on-hit damage");
assert.strictEqual(actions.criticalDamageFormula("1d8+3"), "2d8+3", "critical doubles dice but not the fixed modifier");
assert.strictEqual(actions.criticalDamageFormula("1d8"), "2d8", "critical applies independently to the radiant component");
const otherAttack = actions.createAttackActionDefinition({ name: "Other Flail", attackBonus: 6, damage: "1d8+3", damageType: "bludgeoning" });
assert.strictEqual(otherAttack.damageComponents.length, 1, "the rider is not globally attached to another item attack");

let turn = economy.createTurnEconomy();
const capability = profile.actions[0];
const resourceDefinition = profile.resources.definitions[0];
let resourceStore = resources.ensureResourceState({}, censer.catalogId, resourceDefinition).nextStore;
const resourceKey = resources.resourceStateKey(censer.catalogId, resourceDefinition.resourceId);
const capabilityAction = {
  actionCost: capability.actionCost,
  resourceCosts: capability.resourceCosts,
  resolutionSteps: ["confirmResult"]
};
let session = resolution.createResolution(capabilityAction, turn, { transactionId: "censer-cancel", resources: { [resourceKey]: 1 } });
let cancelled = resolution.cancelResolution(session);
assert.strictEqual(cancelled.ok, true);
assert.strictEqual(resourceStore[resourceKey].current, 1, "cancel does not mutate persisted uses");
session = resolution.createResolution(capabilityAction, turn, { transactionId: "censer-confirm", resources: { [resourceKey]: 1 } });
const confirmed = resolution.confirmResolution(session);
assert.strictEqual(confirmed.ok, true);
assert.strictEqual(confirmed.economy.bonusActionsRemaining, 0, "activation spends a Bonus Action");
assert.strictEqual(confirmed.resources[resourceKey], 0, "confirmed transaction spends the declared use");
resourceStore = resources.adjustResourceState(resourceStore, censer.catalogId, resourceDefinition, -1).nextStore;
assert.strictEqual(resourceStore[resourceKey].current, 0);
const blocked = resolution.createResolution(capabilityAction, turn, { resources: { [resourceKey]: 0 } });
assert.strictEqual(blocked.status, "blocked", "the capability cannot be reused while depleted");
assert.strictEqual(resources.processRecoveryEvent(resourceStore, "longRest", [resourceDefinition]).nextStore[resourceKey].current, 0, "Long Rest is not dawn");
const dawn = resources.processRecoveryEvent(resourceStore, "dawn", [resourceDefinition]);
assert.strictEqual(dawn.nextStore[resourceKey].current, 1, "dawn restores the declared resource");

const effect = effects.createEffectInstance(capability.createsEffect, {
  sourceCatalogId: censer.catalogId,
  sourceCapabilityId: capability.capabilityId,
  sourceActorId: "actor:paladin"
}, { instanceId: "effect:censer:1", now: 1000 });
assert.strictEqual(effect.remainingRounds, 10);
assert.strictEqual(effect.area.radius, 10);
let effectState = [effect];
for (let round = 1; round <= 10; round += 1) {
  const dispatched = lifecycle.dispatchEffectEvent(effectState, "sourceTurnStart", {
    sourceActorId: "actor:paladin",
    selectedTargetActorIds: ["actor:paladin", "actor:ally"]
  });
  assert.strictEqual(dispatched.executions.length, 1, `source turn ${round} triggers healing once`);
  assert.strictEqual(dispatched.executions[0].effect.formula, "1d4");
  effectState = dispatched.state;
}
assert.strictEqual(effectState[0].active, false, "the effect expires after ten source turns");
assert.strictEqual(lifecycle.dispatchEffectEvent([effect], "targetTurnStart", { targetActorId: "actor:ally" }).executions.length, 0,
  "the Censer hook does not trigger at each target's turn start");
assert.deepStrictEqual(JSON.parse(JSON.stringify(effect)), effect, "effect instances survive save/load serialization");
const migrated = effects.migrateLegacyItemEffects([], { "item:legacy": { active: true } });
assert.strictEqual(migrated[0].legacyManual, true, "legacy manual effect markers remain visible");

function invalidOverlay(mutator) {
  const value = clone(overlay);
  mutator(value);
  return value;
}
assert.throws(() => registryApi.createItemAutomationRegistry({ overlay: invalidOverlay((value) => { value.items[0].match.name = "Missing"; }), catalog: catalogData }), /resolved to 0/);
assert.throws(() => registryApi.createItemAutomationRegistry({ overlay: { schemaVersion: 1, items: [{ match: { name: "Twin", source: "TST" }, resources: [], capabilities: [] }] }, catalog: { item: [{ name: "Twin", source: "TST" }, { name: "Twin", source: "TST" }] } }), /resolved to 2/);
for (const [label, mutate, pattern] of [
  ["duplicate capability", (value) => value.items[0].capabilities.push(clone(value.items[0].capabilities[0])), /duplicate capability ID/],
  ["unknown resource", (value) => { value.items[0].capabilities[1].resourceCosts[0].resourceId = "missing"; }, /unknown resource/],
  ["invalid trigger", (value) => { value.items[0].capabilities[0].trigger.event = "afterLunch"; }, /trigger.event is not supported/],
  ["invalid dice", (value) => { value.items[0].capabilities[0].damage[0].formula = "many dice"; }, /formula is not/],
  ["invalid damage type", (value) => { value.items[0].capabilities[0].damage[0].type = "sunshine"; }, /damage type/],
  ["invalid area", (value) => { value.items[0].capabilities[1].createsEffect.area.radius = 0; }, /radius must be greater/],
  ["invalid item status", (value) => { value.items[4].capabilities[0].activatesStatus.id = "not valid"; }, /activatesStatus.id/],
  ["one-time modifier", (value) => { value.items[1].capabilities[0].oneTime = true; }, /oneTime is only supported/]
]) {
  const validation = schema.validateOverlay(invalidOverlay(mutate));
  assert.strictEqual(validation.ok, false, `${label} must be rejected`);
  assert.match(validation.errors.join("\n"), pattern);
}
const invalidModifier = clone(overlay);
invalidModifier.items[1].capabilities[0].effects.abilityBonuses[0].ability = "LUCK";
assert.match(schema.validateOverlay(invalidModifier).errors.join("\n"), /ability is not supported/);
const invalidSave = clone(overlay);
invalidSave.items[2].capabilities[0].savingThrow.dc = 31;
assert.match(schema.validateOverlay(invalidSave).errors.join("\n"), /savingThrow\.dc/);
const invalidSpell = clone(overlay);
invalidSpell.items[3].capabilities[0].spell.source = "";
assert.match(schema.validateOverlay(invalidSpell).errors.join("\n"), /spell requires name and source/);

assert.strictEqual(catalogData.item.length, 2253, "automation overlay must not change the authoritative catalog count");
const mundane = itemCatalog.itemAutomationProfile(catalogData.item.find((item) => item.name === "Club"));
assert.deepStrictEqual(mundane.capabilities, [], "items without overlay keep their existing profile plus empty compiled arrays");

console.log("Declarative item automation, item actions/spells, persistent modifiers, resources, and lifecycle verified");
