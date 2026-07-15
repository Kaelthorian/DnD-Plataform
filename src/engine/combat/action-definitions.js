(function createCombatActionDefinitionsModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndCombatActionDefinitions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function combatActionDefinitionsFactory() {
  "use strict";

  const RESOLUTION_STEPS = Object.freeze({
    selectTarget: "selectTarget",
    chooseVariant: "chooseVariant",
    attackRoll: "attackRoll",
    savingThrow: "savingThrow",
    abilityCheck: "abilityCheck",
    damageRoll: "damageRoll",
    resourceChoice: "resourceChoice",
    applyEffect: "applyEffect",
    confirmResult: "confirmResult"
  });

  const ACTION_CATEGORIES = Object.freeze({
    attacks: "attacks",
    spells: "spells",
    actions: "actions",
    bonusActions: "bonusActions",
    movement: "movement",
    reactions: "reactions",
    items: "items",
    features: "features"
  });

  function definition({ id, name, cost = "action", category = ACTION_CATEGORIES.actions, steps = [RESOLUTION_STEPS.confirmResult], ...rest }) {
    return {
      id,
      key: id,
      name,
      title: name,
      category,
      actionCost: cost === "none" ? [] : [{ type: cost, amount: 1 }],
      resolutionSteps: [...steps],
      source: "core",
      ...rest
    };
  }

  function createUniversalActionDefinitions({ speed = 30, prone = false } = {}) {
    return [
      definition({ id: "core:attack", name: "Attack", steps: [RESOLUTION_STEPS.chooseVariant, RESOLUTION_STEPS.confirmResult], attackAction: true, description: "Choose an available weapon, unarmed strike, Grapple, or Shove." }),
      definition({ id: "core:dash", name: "Dash", effect: "dash", description: `Gain ${speed} feet of additional movement this turn.` }),
      definition({ id: "core:disengage", name: "Disengage", description: "Your movement doesn't provoke Opportunity Attacks for the rest of this turn." }),
      definition({ id: "core:dodge", name: "Dodge", effect: "dodging", description: "Attacks against you have Disadvantage and you make Dexterity saves with Advantage while the rule applies." }),
      definition({ id: "core:help", name: "Help", steps: [RESOLUTION_STEPS.selectTarget, RESOLUTION_STEPS.confirmResult], description: "Assist an ally with a valid task or attack." }),
      definition({ id: "core:hide", name: "Hide", steps: [RESOLUTION_STEPS.abilityCheck, RESOLUTION_STEPS.confirmResult], description: "Attempt a Dexterity (Stealth) check where hiding is possible." }),
      definition({ id: "core:ready", name: "Ready", steps: [RESOLUTION_STEPS.chooseVariant, RESOLUTION_STEPS.confirmResult], description: "Choose an action and a perceptible trigger. Executing it later consumes your Reaction." }),
      definition({ id: "core:search", name: "Search", steps: [RESOLUTION_STEPS.abilityCheck, RESOLUTION_STEPS.confirmResult], description: "Make an appropriate check to find a concealed creature or object." }),
      definition({ id: "core:study", name: "Study", steps: [RESOLUTION_STEPS.abilityCheck, RESOLUTION_STEPS.confirmResult], description: "Recall or analyze information with an appropriate Intelligence check." }),
      definition({ id: "core:influence", name: "Influence", steps: [RESOLUTION_STEPS.selectTarget, RESOLUTION_STEPS.abilityCheck, RESOLUTION_STEPS.confirmResult], description: "Attempt to influence a creature; the DM determines attitude and DC." }),
      definition({ id: "core:utilize", name: "Utilize", category: ACTION_CATEGORIES.items, description: "Use an object that requires an Action or a second significant interaction." }),
      definition({ id: "core:magic", name: "Magic", description: "Use a magical item, feature, or spell that requires the Magic action." }),
      definition({ id: "core:grapple", name: "Grapple", category: ACTION_CATEGORIES.attacks, steps: [RESOLUTION_STEPS.selectTarget, RESOLUTION_STEPS.abilityCheck, RESOLUTION_STEPS.applyEffect, RESOLUTION_STEPS.confirmResult], attackAction: true, description: "Attempt a Grapple in place of an attack. Requires a valid target and a free hand." }),
      definition({ id: "core:shove", name: "Shove", category: ACTION_CATEGORIES.attacks, steps: [RESOLUTION_STEPS.selectTarget, RESOLUTION_STEPS.chooseVariant, RESOLUTION_STEPS.abilityCheck, RESOLUTION_STEPS.applyEffect, RESOLUTION_STEPS.confirmResult], attackAction: true, description: "Push a valid target or knock it Prone in place of an attack." }),
      definition({ id: "core:improvised", name: "Improvised Action", steps: [RESOLUTION_STEPS.chooseVariant, RESOLUTION_STEPS.abilityCheck, RESOLUTION_STEPS.confirmResult], description: "Describe the attempt. It remains pending until the DM resolves any non-automatable consequence." }),
      definition({ id: "core:movement", name: "Movement", cost: "movement", actionCost: [], category: ACTION_CATEGORIES.movement, steps: [RESOLUTION_STEPS.chooseVariant, RESOLUTION_STEPS.confirmResult], variableCost: true, description: `Move up to ${speed} feet, split before and after actions.` }),
      definition({ id: "core:stand-up", name: "Stand Up", cost: "movement", category: ACTION_CATEGORIES.movement, effect: "standUp", actionCost: [{ type: "movement", amount: Math.ceil(speed / 2) }], disabledReason: !prone ? "You are not Prone." : speed <= 0 ? "Insufficient movement." : "", description: "Spend half your Speed to stand from Prone." }),
      definition({ id: "core:drop-prone", name: "Drop Prone", cost: "none", category: ACTION_CATEGORIES.movement, effect: "dropProne", disabledReason: prone ? "You are already Prone." : "", description: "Drop Prone without spending an action or movement." }),
      definition({ id: "core:object-interaction", name: "Object Interaction", cost: "objectInteraction", category: ACTION_CATEGORIES.items, description: "Draw, stow, or interact with one object when the free interaction applies." }),
      definition({ id: "core:speak", name: "Speak Briefly", cost: "none", description: "Brief communication has no action cost, subject to the DM's limits." }),
      definition({ id: "core:drop-object", name: "Drop Object", cost: "none", category: ACTION_CATEGORIES.items, description: "Dropping an object normally has no action cost." }),
      definition({ id: "core:end-turn", name: "End Turn", cost: "none", steps: [RESOLUTION_STEPS.confirmResult], effect: "endTurn", description: "End the current turn even if resources remain." })
    ];
  }

  function createAttackActionDefinition(row = {}, overrides = {}) {
    const bonus = Number(row.attackBonus);
    const hasAttackRoll = !row.noAttackRoll && Number.isFinite(bonus);
    const hasDamage = Boolean(row.damage && row.damage !== "--");
    const costType = row.actionType === "bonus" ? "bonusAction" : row.actionType === "reaction" ? "reaction" : "action";
    return definition({
      id: overrides.id || `attack:${String(row.name || "attack").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: overrides.name || row.name || "Attack",
      category: ACTION_CATEGORIES.attacks,
      cost: costType,
      attackAction: costType === "action",
      targetRequired: true,
      steps: [
        RESOLUTION_STEPS.selectTarget,
        ...(hasAttackRoll ? [RESOLUTION_STEPS.attackRoll] : []),
        ...(hasDamage ? [RESOLUTION_STEPS.damageRoll] : []),
        RESOLUTION_STEPS.applyEffect,
        RESOLUTION_STEPS.confirmResult
      ],
      attack: { ...row },
      description: row.description || "",
      formula: hasAttackRoll ? `d20${bonus >= 0 ? "+" : ""}${bonus}` : "",
      damageFormula: row.damage || "",
      damageType: row.damageType || "",
      range: row.range || "",
      ...overrides
    });
  }

  function savingThrowAbility(description = "") {
    const match = String(description).match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw\b/i);
    return match ? match[1].slice(0, 3).toUpperCase() : "";
  }

  function createSpellActionDefinition(spellEntry = {}, row = {}, overrides = {}) {
    const spell = spellEntry.spell || spellEntry;
    const description = String(spell?.description || row.description || "");
    const saveAbility = savingThrowAbility(description);
    const healing = /\bregains?\b[^.]{0,80}\bHit Points?\b|\bhealing\b/i.test(description);
    const explicitlyUsesAttackRoll = /\b(?:make|makes) (?:a|an) (?:melee |ranged )?spell attack\b|\bspell attack roll\b|\bmake an attack roll\b/i.test(description);
    const hasAttackRoll = !saveAbility && !healing && !row.noAttackRoll && explicitlyUsesAttackRoll && Number.isFinite(Number(row.attackBonus));
    const hasDamage = Boolean(row.damage && row.damage !== "--");
    const automaticDamage = hasDamage && !hasAttackRoll && !saveAbility;
    const requiresConcentration = Boolean(spell?.concentration) || /\bConcentration\b/i.test(description);
    const saveDamageRule = saveAbility
      ? /half as much damage on a successful/i.test(description)
        ? "half"
        : /no damage on a successful|takes no damage on a successful/i.test(description)
        ? "none"
        : "manual"
      : "";
    const timeUnit = String(spell?.time?.[0]?.unit || "action").toLowerCase();
    const cost = timeUnit === "bonus" ? "bonusAction" : timeUnit === "reaction" ? "reaction" : "action";
    const steps = [RESOLUTION_STEPS.selectTarget];
    if (hasAttackRoll) steps.push(RESOLUTION_STEPS.attackRoll);
    if (saveAbility) steps.push(RESOLUTION_STEPS.savingThrow);
    if (hasDamage || healing) steps.push(RESOLUTION_STEPS.damageRoll);
    steps.push(RESOLUTION_STEPS.applyEffect, RESOLUTION_STEPS.confirmResult);
    return definition({
      id: overrides.id || `spell:${String(spellEntry.name || spell?.name || row.name || "spell").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: overrides.name || spellEntry.name || spell?.name || row.name || "Spell",
      category: ACTION_CATEGORIES.spells,
      cost,
      steps,
      spell: { ...spellEntry },
      targetRequired: !/\bRange:\s*Self\b|\byourself\b/i.test(description),
      attack: { ...row },
      saveAbility,
      healing,
      automaticDamage,
      requiresConcentration,
      concentration: requiresConcentration ? { name: overrides.name || spellEntry.name || spell?.name || row.name || "Spell" } : null,
      saveDamageRule,
      formula: hasAttackRoll ? `d20${Number(row.attackBonus) >= 0 ? "+" : ""}${Number(row.attackBonus)}` : "",
      damageFormula: row.damage || "",
      damageType: row.damageType || "",
      range: spell?.range || null,
      components: spell?.components || null,
      description,
      ...overrides
    });
  }

  function maxAttacksFromFeatureText(features = [], level = 1) {
    let maximum = 1;
    const text = (Array.isArray(features) ? features : [features]).map((feature) => String(feature?.description || feature?.text || feature || "")).join("\n");
    if (/\battack three times\b|\bthree attacks instead of one\b/i.test(text)) maximum = Math.max(maximum, 3);
    if (/\battack twice\b|\btwo attacks instead of one\b|\bExtra Attack\b/i.test(text)) maximum = Math.max(maximum, 2);
    if (/\battack four times\b|\bfour attacks instead of one\b/i.test(text) && Number(level) >= 20) maximum = Math.max(maximum, 4);
    return maximum;
  }

  return {
    RESOLUTION_STEPS,
    ACTION_CATEGORIES,
    createUniversalActionDefinitions,
    createAttackActionDefinition,
    createSpellActionDefinition,
    maxAttacksFromFeatureText,
    savingThrowAbility
  };
});
