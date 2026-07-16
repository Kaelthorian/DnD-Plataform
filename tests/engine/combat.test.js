const assert = require("assert");
const economyEngine = require("../../src/engine/combat/turn-economy.js");
const actions = require("../../src/engine/combat/action-definitions.js");
const resolution = require("../../src/engine/combat/resolution-engine.js");
const combatLog = require("../../src/engine/combat/combat-log.js");
const advisor = require("../../src/engine/actions/action-advisor.js");

function action(overrides = {}) {
  return {
    key: "test:action",
    title: "Test Action",
    actionCost: [{ type: "action", amount: 1 }],
    resolutionSteps: ["confirmResult"],
    ...overrides
  };
}

function successfulAttackSession(economy, overrides = {}) {
  const attack = action({
    key: "attack:shortsword",
    title: "Shortsword",
    attackAction: true,
    targetRequired: true,
    resolutionSteps: ["selectTarget", "attackRoll", "damageRoll", "confirmResult"],
    ...overrides
  });
  let session = resolution.createResolution(attack, economy, { transactionId: overrides.transactionId || `tx-${Math.random()}` });
  session = resolution.recordTarget(session, { name: "Goblin", ac: 15 });
  session = resolution.recordAttackRoll(session, { natural: 14, total: 19, dice: [14] });
  session = resolution.recordDamageRoll(session, { total: 8, dice: [5] });
  return session;
}

// 1. Normal turn economy.
const base = economyEngine.createTurnEconomy({ speed: 30 });
assert.equal(base.actionsRemaining, 1);
assert.equal(base.bonusActionsRemaining, 1);
assert.equal(base.reactionsRemaining, 1);
assert.equal(base.movementRemaining, 30);
assert.equal(base.objectInteractionsRemaining, 1);

// 2. Attack consumes one Action.
let committed = resolution.confirmResolution(successfulAttackSession(base));
assert.equal(committed.ok, true);
assert.equal(committed.economy.actionsRemaining, 0);

// 3. Extra Attack stays inside the same Attack action.
let extraEconomy = economyEngine.createTurnEconomy({ speed: 30, maxAttacksPerAttackAction: 2 });
let first = resolution.confirmResolution(successfulAttackSession(extraEconomy, { transactionId: "extra-1" }));
assert.equal(first.economy.actionsRemaining, 0);
assert.equal(first.economy.attacksUsedInCurrentAttackAction, 1);
let second = resolution.confirmResolution(successfulAttackSession(first.economy, { transactionId: "extra-2" }));
assert.equal(second.ok, true);
assert.equal(second.economy.actionsRemaining, 0);
assert.equal(second.economy.attacksUsedInCurrentAttackAction, 2);

// 4. No attacks remain after the active Attack action is exhausted.
const exhaustedAttack = resolution.createResolution(action({ attackAction: true }), second.economy, { transactionId: "extra-3" });
assert.equal(exhaustedAttack.status, "blocked");
assert.match(exhaustedAttack.blockedReason, /No attacks remain/i);

// 5. Damage cannot be confirmed before Hit Roll.
let incomplete = resolution.createResolution(action({ resolutionSteps: ["attackRoll", "damageRoll", "confirmResult"] }), base);
assert.match(resolution.confirmResolution(incomplete).reason, /Roll to Hit first/i);

// 6. A miss completes without normal damage, but Damage step itself stays blocked.
let miss = resolution.createResolution(action({ resolutionSteps: ["attackRoll", "damageRoll", "confirmResult"] }), base);
miss = resolution.recordAttackRoll(miss, { natural: 7, total: 10 });
assert.equal(miss.results.attackRoll.hit, null);
miss = resolution.resolveAttackOutcome(miss, false);
assert.match(resolution.canResolveStep({ ...miss, stepIndex: 1 }).reason, /Miss/i);
assert.equal(resolution.confirmResolution(miss).ok, true);

// 7-8. Natural 20 is a critical hit; natural 1 always misses.
let critical = resolution.createResolution(action({ resolutionSteps: ["attackRoll", "damageRoll", "confirmResult"] }), base);
critical = resolution.recordAttackRoll(critical, { natural: 20, total: 20 });
assert.equal(critical.results.attackRoll.critical, true);
assert.equal(critical.results.attackRoll.hit, true);
let fumble = resolution.createResolution(action({ resolutionSteps: ["attackRoll", "confirmResult"] }), base);
fumble = resolution.recordAttackRoll(fumble, { natural: 1, total: 12 });
assert.equal(fumble.results.attackRoll.automaticMiss, true);
assert.equal(fumble.results.attackRoll.hit, false);

// 9. Saving-throw spells do not use an attack roll.
const fireball = actions.createSpellActionDefinition({ name: "Fireball", spell: { name: "Fireball", time: [{ unit: "action" }], description: "Each creature makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one." } }, { name: "Fireball", noAttackRoll: true, damage: "8d6", damageType: "fire" });
assert.equal(fireball.resolutionSteps.includes("savingThrow"), true);
assert.equal(fireball.resolutionSteps.includes("attackRoll"), false);
assert.equal(fireball.saveDamageRule, "half");

// 10. Automatic damage skips Hit Roll and Saving Throw.
const missile = actions.createSpellActionDefinition({ name: "Magic Missile", spell: { name: "Magic Missile", time: [{ unit: "action" }], description: "Each dart strikes and deals 1d4 + 1 Force damage." } }, { name: "Magic Missile", noAttackRoll: true, damage: "1d4+1", damageType: "force" });
assert.equal(missile.automaticDamage, true);
assert.deepEqual(missile.resolutionSteps.filter((step) => ["attackRoll", "savingThrow"].includes(step)), []);

// Structured spell fields take precedence over contradictory prose and expose effect metadata.
const structuredSpell = actions.createSpellActionDefinition({
  name: "Structured Ward",
  spell: {
    id: "structured-ward--xphb",
    name: "Structured Ward",
    source: "XPHB",
    canonical: true,
    time: [{ number: 1, unit: "reaction" }],
    range: { type: "point", distance: { type: "self" } },
    components: { v: true, s: true, m: { text: "diamond dust", cost: 100, consume: true } },
    duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }],
    spellAttack: [],
    savingThrow: ["dexterity", "wisdom"],
    damageInflict: ["fire", "radiant"],
    conditionInflict: ["blinded"],
    areaTags: ["S"],
    miscTags: ["HL", "THP"],
    meta: { ritual: true },
    description: "Make a ranged spell attack. The target makes a Wisdom saving throw and takes 4d6 Cold damage."
  }
}, {
  name: "Structured Ward",
  attackBonus: 8,
  damage: "4d6",
  damageType: "cold"
}, {
  id: "spell:reaction:structured-ward",
  name: "Cast Structured Ward"
});
assert.equal(structuredSpell.id, "spell:reaction:structured-ward--xphb");
assert.equal(structuredSpell.spellId, "structured-ward--xphb");
assert.equal(structuredSpell.spellSource, "XPHB");
assert.deepEqual(structuredSpell.actionCost, [{ type: "reaction", amount: 1 }]);
assert.equal(structuredSpell.targetRequired, false);
assert.equal(structuredSpell.resolutionSteps.includes("attackRoll"), false);
assert.equal(structuredSpell.resolutionSteps.includes("savingThrow"), true);
assert.equal(structuredSpell.resolutionSteps.includes("damageRoll"), true);
assert.equal(structuredSpell.saveAbility, "WIS");
assert.deepEqual(structuredSpell.saveAbilities, ["DEX", "WIS"]);
assert.equal(structuredSpell.damageType, "fire");
assert.deepEqual(structuredSpell.damageTypes, ["fire", "radiant"]);
assert.deepEqual(structuredSpell.conditions, ["blinded"]);
assert.deepEqual(structuredSpell.areaTags, ["S"]);
assert.deepEqual(structuredSpell.areaOfEffect, { tags: ["S"], range: { type: "point", distance: { type: "self" } } });
assert.equal(structuredSpell.requiresConcentration, true);
assert.deepEqual(structuredSpell.concentration, { id: "structured-ward--xphb", name: "Structured Ward", source: "XPHB" });
assert.equal(structuredSpell.ritual, true);
assert.deepEqual(structuredSpell.materialComponent, { text: "diamond dust", cost: 100, consume: true });
assert.equal(structuredSpell.healing, true);
assert.equal(structuredSpell.temporaryHitPoints, true);

// Fixed/manual healing metadata must not create an impossible required roll.
const fixedHealing = actions.createSpellActionDefinition({
  name: "Aid",
  spell: {
    canonical: true,
    name: "Aid",
    source: "XPHB",
    time: [{ number: 1, unit: "action" }],
    duration: [{ type: "instant" }],
    miscTags: ["HL"],
    damageInflict: [],
    savingThrow: [],
    spellAttack: [],
    description: "Each target's Hit Point maximum and current Hit Points increase by 5."
  }
}, { name: "Aid", noAttackRoll: true, damage: "" });
assert.equal(fixedHealing.healing, true);
assert.equal(fixedHealing.resolutionSteps.includes("damageRoll"), false);

// Additional-attack-damage buffs are effects at cast time, not immediate damage.
const deferredHex = actions.createSpellActionDefinition({
  name: "Hex",
  spell: {
    canonical: true,
    name: "Hex",
    source: "XPHB",
    time: [{ number: 1, unit: "bonus" }],
    duration: [{ type: "timed", duration: { type: "hour", amount: 1 }, concentration: true }],
    miscTags: ["AAD"],
    damageInflict: ["necrotic"],
    savingThrow: [],
    spellAttack: [],
    description: "Until the spell ends, you deal an extra 1d6 Necrotic damage whenever you hit the target with an attack roll."
  }
}, { name: "Hex", noAttackRoll: true, damage: "1d6", damageType: "necrotic" });
assert.equal(deferredHex.deferredAttackDamage, true);
assert.equal(deferredHex.embeddedWeaponAttack, false);
assert.equal(deferredHex.automaticDamage, false);
assert.equal(deferredHex.resolutionSteps.includes("attackRoll"), false);
assert.equal(deferredHex.resolutionSteps.includes("damageRoll"), false);

const deferredSaveRider = actions.createSpellActionDefinition({
  name: "Fount of Moonlight",
  spell: {
    canonical: true,
    name: "Fount of Moonlight",
    source: "XPHB",
    time: [{ number: 1, unit: "action" }],
    duration: [{ type: "timed", duration: { type: "minute", amount: 10 }, concentration: true }],
    miscTags: ["AAD"],
    damageInflict: ["radiant"],
    savingThrow: ["constitution"],
    spellAttack: [],
    description: "Until the spell ends, your attacks deal extra Radiant damage; a creature hit later makes a Constitution saving throw."
  }
}, { name: "Fount of Moonlight", noAttackRoll: true, damage: "2d6", damageType: "radiant" });
assert.equal(deferredSaveRider.deferredAttackDamage, true);
assert.equal(deferredSaveRider.embeddedWeaponAttack, false);
assert.equal(deferredSaveRider.resolutionSteps.includes("savingThrow"), false);
assert.equal(deferredSaveRider.resolutionSteps.includes("attackRoll"), false);
assert.equal(deferredSaveRider.resolutionSteps.includes("damageRoll"), false);

// Weapon-attack cantrips resolve the combined weapon row immediately.
function embeddedWeaponCantrip(name, source, description, damageInflict, row = {}) {
  return actions.createSpellActionDefinition({
    name,
    spell: {
      canonical: true,
      name,
      source,
      level: 0,
      time: [{ number: 1, unit: "action" }],
      duration: [{ type: "instant" }],
      miscTags: ["AAD"],
      damageInflict,
      savingThrow: [],
      spellAttack: name === "True Strike" ? [] : ["M"],
      description
    }
  }, {
    name,
    noAttackRoll: false,
    attackBonus: 7,
    damage: "1d8+4+1d6",
    damageType: "slashing",
    damageTypes: ["slashing", ...damageInflict],
    ...row
  });
}

const boomingBlade = embeddedWeaponCantrip(
  "Booming Blade",
  "TCE",
  "You brandish the weapon used in the spell's casting and make a melee attack with it against one creature within 5 feet of you.",
  ["thunder"]
);
const greenFlameBlade = embeddedWeaponCantrip(
  "Green-Flame Blade",
  "TCE",
  "You brandish the weapon used in the spell's casting and make a melee attack with it against one creature within 5 feet of you.",
  ["fire"]
);
const trueStrike = embeddedWeaponCantrip(
  "True Strike",
  "XPHB",
  "You make one attack with the weapon used in the spell's casting.",
  ["radiant"]
);

[boomingBlade, greenFlameBlade, trueStrike].forEach((spellAction) => {
  assert.equal(spellAction.embeddedWeaponAttack, true);
  assert.equal(spellAction.targetRequired, true);
  assert.equal(spellAction.spellBehavior.embeddedWeaponAttack, true);
  assert.equal(spellAction.deferredAttackDamage, false);
  assert.equal(spellAction.spellBehavior.deferredAttackDamage, false);
  assert.equal(spellAction.resolutionSteps.includes("attackRoll"), true);
  assert.equal(spellAction.resolutionSteps.includes("damageRoll"), true);
  assert.equal(spellAction.damageType, "slashing");
  assert.equal(spellAction.damageTypes.includes("slashing"), true);
});
assert.deepEqual(boomingBlade.damageTypes, ["slashing", "thunder"]);
assert.deepEqual(greenFlameBlade.damageTypes, ["slashing", "fire"]);
assert.deepEqual(trueStrike.damageTypes, ["slashing", "radiant"]);

const embeddedOverride = actions.createSpellActionDefinition({
  name: "Custom Weapon Spell",
  spell: {
    canonical: true,
    name: "Custom Weapon Spell",
    source: "HB",
    level: 0,
    time: [{ number: 1, unit: "action" }],
    duration: [{ type: "instant" }],
    miscTags: ["AAD"],
    damageInflict: ["force"],
    savingThrow: [],
    spellAttack: [],
    description: "Resolve the weapon attack described by this spell."
  }
}, {
  name: "Custom Weapon Spell",
  embeddedWeaponAttack: true,
  noAttackRoll: false,
  attackBonus: 7,
  damage: "1d8+4",
  damageType: "piercing"
});
assert.equal(embeddedOverride.embeddedWeaponAttack, true);
assert.equal(embeddedOverride.resolutionSteps.includes("attackRoll"), true);
assert.equal(embeddedOverride.resolutionSteps.includes("damageRoll"), true);
assert.deepEqual(embeddedOverride.damageTypes, ["piercing"]);

// Multi-save metadata uses the first actual save in prose as the cast-time save.
const multiSave = actions.createSpellActionDefinition({
  name: "Harrowing Ballad",
  spell: {
    canonical: true,
    name: "Harrowing Ballad",
    source: "CrookedMoon24",
    time: [{ number: 1, unit: "action" }],
    duration: [{ type: "timed", duration: { type: "minute", amount: 1 } }],
    miscTags: [],
    damageInflict: ["psychic"],
    savingThrow: ["constitution", "intelligence"],
    spellAttack: [],
    description: "The target makes an Intelligence saving throw. Later it has Disadvantage on Constitution saving throws made to maintain Concentration."
  }
}, { name: "Harrowing Ballad", noAttackRoll: true, damage: "1d6", damageType: "psychic" });
assert.equal(multiSave.saveAbility, "INT");
assert.deepEqual(multiSave.saveAbilities, ["CON", "INT"]);

// Mutually exclusive multi-mode spells remain guided instead of forcing every attack/save/damage branch at once.
const guidedMultiMode = actions.createSpellActionDefinition({
  name: "Bigby's Hand",
  spell: {
    canonical: true,
    name: "Bigby's Hand",
    source: "XPHB",
    time: [{ number: 1, unit: "action" }],
    duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }],
    spellAttack: ["M"],
    savingThrow: ["dexterity", "strength"],
    damageInflict: ["force", "bludgeoning"],
    description: "When you cast the spell and as a Bonus Action on your later turns, choose one of the following effects: Clenched Fist makes a melee spell attack; Grasping Hand requires a Strength saving throw."
  }
}, { name: "Bigby's Hand", attackBonus: 8, damage: "5d8", damageType: "force" });
assert.equal(guidedMultiMode.guidedMultiMode, true);
assert.deepEqual(guidedMultiMode.saveAbilities, ["DEX", "STR"]);
assert.equal(guidedMultiMode.resolutionSteps.includes("attackRoll"), false);
assert.equal(guidedMultiMode.resolutionSteps.includes("savingThrow"), false);
assert.equal(guidedMultiMode.resolutionSteps.includes("damageRoll"), false);

[
  ["Symbol", "Choose which effect the symbol creates; different effects require Constitution, Wisdom, or Intelligence saving throws."],
  ["Illusory Dragon", "As a Bonus Action, breathe on creatures that make an Intelligence saving throw; its appearance first requires a Wisdom saving throw."],
  ["Octarine Spray", "Each creature makes a Constitution saving throw, then roll a d8 to determine a ray that might require a Wisdom saving throw."]
].forEach(([name, description]) => {
  const action = actions.createSpellActionDefinition({
    name,
    spell: {
      canonical: true,
      name,
      source: "TEST",
      time: [{ number: 1, unit: "action" }],
      duration: [{ type: "timed", duration: { type: "minute", amount: 1 } }],
      spellAttack: [],
      savingThrow: ["constitution", "wisdom", "intelligence"],
      damageInflict: ["force"],
      description
    }
  }, { name, noAttackRoll: true, damage: "4d6", damageType: "force" });
  assert.equal(action.guidedMultiMode, true, `${name} must remain guided`);
  assert.equal(action.resolutionSteps.includes("savingThrow"), false);
  assert.equal(action.resolutionSteps.includes("damageRoll"), false);
});

// Legacy spell records still derive combat behavior from prose.
const legacyRay = actions.createSpellActionDefinition({
  name: "Legacy Ray",
  spell: { name: "Legacy Ray", time: [{ unit: "action" }], description: "Make a ranged spell attack. On a hit, the target takes 2d6 Force damage." }
}, { name: "Legacy Ray", attackBonus: 7, damage: "2d6", damageType: "force" });
assert.equal(legacyRay.id, "spell:legacy-ray");
assert.equal(legacyRay.resolutionSteps.includes("attackRoll"), true);
assert.equal(legacyRay.damageType, "force");

// 11. Dash adds current Speed to remaining movement on commit.
const dash = actions.createUniversalActionDefinitions({ speed: 30 }).find((entry) => entry.id === "core:dash");
const dashResult = resolution.confirmResolution(resolution.createResolution(dash, base));
assert.equal(dashResult.economy.movementRemaining, 60);

// 12. Standing consumes half movement and clears Prone.
const proneEconomy = economyEngine.createTurnEconomy({ speed: 30, prone: true });
const stand = actions.createUniversalActionDefinitions({ speed: 30, prone: true }).find((entry) => entry.id === "core:stand-up");
const stood = resolution.confirmResolution(resolution.createResolution(stand, proneEconomy));
assert.equal(stood.economy.movementRemaining, 15);
assert.equal(stood.economy.prone, false);

// 13. One Bonus Action blocks all other Bonus Actions.
const bonus = action({ actionCost: [{ type: "bonusAction", amount: 1 }] });
const bonusSpent = resolution.confirmResolution(resolution.createResolution(bonus, base));
assert.equal(bonusSpent.economy.bonusActionsRemaining, 0);
assert.equal(resolution.createResolution(bonus, bonusSpent.economy).status, "blocked");

// 14. A used Reaction cannot be repeated.
const reaction = action({ actionCost: [{ type: "reaction", amount: 1 }] });
const reactionSpent = resolution.confirmResolution(resolution.createResolution(reaction, base));
assert.equal(reactionSpent.economy.reactionsRemaining, 0);
assert.equal(resolution.createResolution(reaction, reactionSpent.economy).status, "blocked");

// 15. Cancelling releases reservations and consumes nothing.
const pending = resolution.createResolution(action(), base, { transactionId: "cancel-me" });
assert.equal(pending.projectedEconomy.actionsRemaining, 0);
const cancelled = resolution.cancelResolution(pending);
assert.equal(cancelled.economy.actionsRemaining, 1);
assert.deepEqual(cancelled.economy.reservations, {});

// 16. Processing lock prevents a double click.
const processing = resolution.beginProcessing(pending);
assert.equal(processing.ok, true);
assert.equal(resolution.beginProcessing(processing.session).ok, false);

// 17. A spell slot is consumed exactly once at confirmation.
const slotAction = action({ resourceCosts: [{ key: "slot:1", amount: 1 }] });
const slotSession = resolution.createResolution(slotAction, base, { resources: { "slot:1": 2 }, transactionId: "slot" });
const slotCommit = resolution.confirmResolution(slotSession);
assert.equal(slotCommit.resources["slot:1"], 1);
assert.equal(resolution.confirmResolution(slotCommit.session).ok, false);

// 18. Ammunition uses the same transactional resource contract.
const ammoAction = action({ resourceCosts: [{ key: "ammo:arrow", amount: 1 }] });
const ammoCommit = resolution.confirmResolution(resolution.createResolution(ammoAction, base, { resources: { "ammo:arrow": 1 } }));
assert.equal(ammoCommit.resources["ammo:arrow"], 0);
assert.equal(resolution.createResolution(ammoAction, base, { resources: { "ammo:arrow": 0 } }).status, "blocked");

// 19. Incapacitated economy exposes no Actions, Bonus Actions, or Reactions.
const incapacitated = economyEngine.createTurnEconomy({ speed: 30, effects: { actionsBlocked: true, bonusActionsBlocked: true, reactionsBlocked: true } });
assert.equal(incapacitated.actionsRemaining, 0);
assert.equal(incapacitated.bonusActionsRemaining, 0);
assert.equal(incapacitated.reactionsRemaining, 0);
assert.match(resolution.createResolution(action(), incapacitated).blockedReason, /No Action/i);

// 20. Ending the turn blocks new actions.
const ended = economyEngine.endTurn(base);
assert.equal(resolution.createResolution(action(), ended).status, "blocked");

// 21. Action Surge adds an Action without changing Bonus Action count.
const surge = action({ actionCost: [], effect: "actionSurge" });
const surged = resolution.confirmResolution(resolution.createResolution(surge, base));
assert.equal(surged.economy.actionsRemaining, 2);
assert.equal(surged.economy.bonusActionsRemaining, 1);

// 22. Cunning Action changes valid uses, not the Bonus Action total.
const cunningOptions = ["Dash", "Disengage", "Hide"].map((title) => action({ title, actionCost: [{ type: "bonusAction", amount: 1 }] }));
assert.equal(cunningOptions.length, 3);
assert.equal(base.bonusActionsTotal, 1);

// 23. Once-per-turn resources such as Sneak Attack cannot be repeated.
const sneak = action({ oncePerTurnKey: "sneak-attack", actionCost: [] });
const sneakUsed = resolution.confirmResolution(resolution.createResolution(sneak, base));
assert.equal(resolution.createResolution(sneak, sneakUsed.economy).status, "blocked");

// 24. Replacing Concentration requires explicit confirmation.
const concentrating = { ...base, concentration: { name: "Bless" } };
const concentrationAction = action({ requiresConcentration: true, concentration: { name: "Fly" } });
let concentrationSession = resolution.createResolution(concentrationAction, concentrating);
assert.match(resolution.confirmResolution(concentrationSession).reason, /requires confirmation/i);
concentrationSession = resolution.confirmConcentrationReplacement(concentrationSession, true);
const concentrationCommit = resolution.confirmResolution(concentrationSession);
assert.equal(concentrationCommit.economy.concentration.name, "Fly");

// Concentration survives turn rollover unless the caller explicitly clears it.
const nextConcentrationTurn = economyEngine.startTurn(concentrationCommit.economy);
assert.deepEqual(nextConcentrationTurn.concentration, { name: "Fly" });
assert.notStrictEqual(nextConcentrationTurn.concentration, concentrationCommit.economy.concentration);
assert.equal(economyEngine.startTurn(concentrationCommit.economy, { concentration: null }).concentration, null);

// 25. Combat log preserves exact roll/resource breakdown fields.
const event = combatLog.createCombatLogEvent({
  actor: "Kael",
  action: "Shortsword",
  target: "Goblin",
  attackTotal: 19,
  hit: true,
  damage: 8,
  damageType: "Piercing",
  formulas: ["d20 + 3 DEX + 2 Proficiency", "1d6 + 3"],
  dice: [14, 5],
  modifiers: [3, 2, 3],
  resourcesConsumed: ["Action"],
  attacksRemaining: 1
});
const formatted = combatLog.formatCombatLogEvent(event);
assert.match(formatted, /Hit Roll: 19/);
assert.match(formatted, /Formulas: d20 \+ 3 DEX \+ 2 Proficiency \| 1d6 \+ 3/);
assert.match(formatted, /Dice: 14, 5/);
assert.match(formatted, /Modifiers: 3, 2, 3/);
assert.match(formatted, /Damage: 8 Piercing/);
assert.match(formatted, /Resources: Action/);
assert.match(formatted, /1 attack remains/);

// Universal list includes every required baseline action and no generic free-action counter.
const universalNames = new Set(actions.createUniversalActionDefinitions({ speed: 30 }).map((entry) => entry.name));
["Attack", "Dash", "Disengage", "Dodge", "Help", "Hide", "Ready", "Search", "Study", "Influence", "Utilize", "Magic", "Grapple", "Shove", "Improvised Action", "Movement", "Stand Up", "Drop Prone", "Object Interaction", "End Turn"].forEach((name) => assert.equal(universalNames.has(name), true, `Missing ${name}`));
assert.equal([...universalNames].some((name) => /free action/i.test(name)), false);

const registry = advisor.createActionRegistry();
registry.register({ id: "rich", getActions: () => ({ actions: [{
  key: "rich:attack",
  title: "Rich Attack",
  type: "action",
  category: "attacks",
  actionCost: [{ type: "action", amount: 1 }],
  resolutionSteps: ["attackRoll", "damageRoll"],
  attackAction: true,
  attack: { damage: "1d6+3" }
}] }) });
const rich = registry.collect().actions[0];
assert.equal(rich.category, "attacks");
assert.deepEqual(rich.actionCost, [{ type: "action", amount: 1 }]);
assert.deepEqual(rich.resolutionSteps, ["attackRoll", "damageRoll"]);
assert.equal(rich.attack.damage, "1d6+3");

console.log("combat engine tests passed");
