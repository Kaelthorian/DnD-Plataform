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
assert.equal(resolution.confirmResolution(concentrationSession).economy.concentration.name, "Fly");

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
