(function createCombatActionDefinitionsModule(globalScope, factory) {
  const spellData = typeof require === "function"
    ? require("../spells/spell-data.js")
    : globalScope.dndSpellDataEngine;
  const api = factory(spellData);
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndCombatActionDefinitions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function combatActionDefinitionsFactory(spellData) {
  "use strict";

  spellData = spellData || {};

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

  function normalizeDamageComponent(component = {}, index = 0) {
    return {
      id: String(component.id || `damage-${index + 1}`),
      formula: String(component.formula || ""),
      type: String(component.type || ""),
      source: String(component.source || "weapon"),
      trigger: String(component.trigger || "onHit"),
      critical: String(component.critical || "doubleDice"),
      sourceCatalogId: String(component.sourceCatalogId || ""),
      sourceCapabilityId: String(component.sourceCapabilityId || "")
    };
  }

  function attackDamageComponents(row = {}) {
    const declared = Array.isArray(row.damageComponents)
      ? row.damageComponents.map(normalizeDamageComponent).filter((component) => component.formula)
      : [];
    if (declared.length) return declared;
    if (!row.damage || row.damage === "--") return [];
    return [normalizeDamageComponent({ id: "weapon-base", formula: row.damage, type: row.damageType })];
  }

  function criticalDamageFormula(formula, policy = "doubleDice") {
    const value = String(formula || "");
    if (policy !== "doubleDice") return value;
    return value.replace(/(\d*)d(\d+)/gi, (_match, count, faces) => `${Math.max(1, Number(count) || 1) * 2}d${faces}`);
  }

  function createAttackActionDefinition(row = {}, overrides = {}) {
    const bonus = Number(row.attackBonus);
    const hasAttackRoll = !row.noAttackRoll && Number.isFinite(bonus);
    const damageComponents = attackDamageComponents(row);
    const hasDamage = damageComponents.length > 0;
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
      damageComponents,
      description: row.description || "",
      formula: hasAttackRoll ? `d20${bonus >= 0 ? "+" : ""}${bonus}` : "",
      damageFormula: row.damage || damageComponents[0]?.formula || "",
      damageType: row.damageType || damageComponents[0]?.type || "",
      range: row.range || "",
      ...overrides
    });
  }

  function savingThrowAbility(description = "") {
    const match = String(description).match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw\b/i);
    return match ? match[1].slice(0, 3).toUpperCase() : "";
  }

  function cleanStringList(values = []) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function materialComponentForSpell(spell = {}) {
    if (typeof spellData.spellMaterialComponent === "function") {
      return spellData.spellMaterialComponent(spell);
    }
    const material = spell.materialComponent || spell.components?.m;
    if (!material) return null;
    if (typeof material === "string") return { text: material, cost: 0, consume: false };
    return {
      text: String(material.text || "").trim(),
      cost: Math.max(0, Number(material.cost) || 0),
      consume: Boolean(material.consume)
    };
  }

  function spellProfile(spell = {}) {
    if (typeof spellData.spellBehaviorProfile === "function") {
      return spellData.spellBehaviorProfile(spell);
    }
    const abilityCodes = {
      strength: "STR",
      dexterity: "DEX",
      constitution: "CON",
      intelligence: "INT",
      wisdom: "WIS",
      charisma: "CHA"
    };
    const miscTags = Array.isArray(spell.miscTags) ? spell.miscTags : [];
    return {
      attacks: cleanStringList(spell.spellAttack),
      savingThrows: cleanStringList(spell.savingThrow).map((ability) => abilityCodes[ability.toLowerCase()] || ability.slice(0, 3).toUpperCase()),
      damageTypes: cleanStringList(spell.damageInflict),
      conditions: cleanStringList(spell.conditionInflict),
      areaTags: cleanStringList(spell.areaTags),
      concentration: typeof spell.concentration === "boolean"
        ? spell.concentration
        : (Array.isArray(spell.duration) ? spell.duration : []).some((duration) => Boolean(duration?.concentration)),
      ritual: typeof spell.ritual === "boolean" ? spell.ritual : Boolean(spell.meta?.ritual),
      material: materialComponentForSpell(spell),
      healing: miscTags.includes("HL"),
      temporaryHitPoints: miscTags.includes("THP"),
      range: spell.range || null,
      duration: spell.duration || null
    };
  }

  function owns(spell, key) {
    return Boolean(spell) && Object.prototype.hasOwnProperty.call(spell, key);
  }

  function legacySpellSource(spell = {}) {
    return String(spell.source || spell.description?.match(/\bSource:\s*([^.]+)/i)?.[1] || "").trim();
  }

  function spellIdPart(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "spell";
  }

  function spellIdentity(spellEntry, spell, spellName) {
    const explicitId = String(spell?.id || spellEntry?.id || "").trim();
    if (explicitId) return { id: explicitId, stable: true };
    const source = legacySpellSource(spell) || String(spellEntry?.source || "").trim();
    if (source) {
      const id = typeof spellData.createSpellId === "function"
        ? spellData.createSpellId(spellName, source)
        : `${spellIdPart(spellName)}--${spellIdPart(source)}`;
      return { id, stable: true };
    }
    return { id: spellIdPart(spellName), stable: false };
  }

  function sourceAwareSpellActionId(requestedId, identity, spellName) {
    const fallback = `spell:${spellIdPart(spellName)}`;
    const requested = String(requestedId || "").trim();
    if (!identity.stable) return requested || fallback;
    if (!requested) return `spell:${identity.id}`;
    if (requested === `spell:${identity.id}` || requested.endsWith(`:${identity.id}`)) return requested;
    const segments = requested.split(":");
    if (segments[0] === "spell" && segments.length > 1) {
      segments[segments.length - 1] = identity.id;
      return segments.join(":");
    }
    return `${requested}:${identity.id}`;
  }

  function rangeIsSelf(range) {
    if (typeof range === "string") return /\bself\b/i.test(range);
    if (!range || typeof range !== "object") return false;
    const type = String(range.type || "point").toLowerCase();
    const distanceType = String(range.distance?.type || "").toLowerCase();
    if (distanceType === "self") return true;
    return ["cone", "cube", "cylinder", "emanation", "line", "radius", "sphere"].includes(type);
  }

  function rangeIsArea(range) {
    if (!range || typeof range !== "object") return false;
    return ["cone", "cube", "cylinder", "emanation", "line", "radius", "sphere"].includes(String(range.type || "").toLowerCase());
  }

  function hasEmbeddedWeaponAttack(spell = {}, description = "") {
    if (typeof spellData.spellHasEmbeddedWeaponAttack === "function") {
      return spellData.spellHasEmbeddedWeaponAttack(spell);
    }
    if (!Array.isArray(spell.miscTags) || !spell.miscTags.includes("AAD")) return false;
    return /\bbrandish\b[^.]{0,160}\bweapon\b[^.]{0,160}\bmake (?:a|one) (?:melee |ranged )?attack\b/i.test(description)
      || /\bmake (?:a|one) (?:melee |ranged )?attack with the weapon used in the spell(?:'|\u2019)s casting\b/i.test(description);
  }

  function spellRequiresCombat(spellEntry = {}, row = {}) {
    const spell = spellEntry?.spell || spellEntry || {};
    if (typeof row.requiresCombat === "boolean") return row.requiresCombat;
    if (typeof spell.requiresCombat === "boolean") return spell.requiresCombat;

    const description = String(spell.description || "");
    const profile = spellProfile(spell);
    const canonical = spell?.canonical === true;
    const attackMetadataKnown = canonical || owns(spell, "spellAttack");
    const saveMetadataKnown = canonical || owns(spell, "savingThrow");
    const damageMetadataKnown = canonical || owns(spell, "damageInflict");
    const conditionMetadataKnown = canonical || owns(spell, "conditionInflict");
    const rowDamageTypes = cleanStringList([
      ...(Array.isArray(row.damageTypes) ? row.damageTypes : row.damageTypes ? [row.damageTypes] : []),
      ...(row.damageType ? [row.damageType] : [])
    ]);
    const hasAttack = Boolean(row.embeddedWeaponAttack)
      || (attackMetadataKnown ? profile.attacks.length > 0 : /\b(?:melee|ranged) spell attack\b|\bmake an attack roll\b/i.test(description));
    const hasSave = saveMetadataKnown ? profile.savingThrows.length > 0 : Boolean(savingThrowAbility(description));
    const hasDamage = (damageMetadataKnown ? profile.damageTypes.length > 0 : rowDamageTypes.length > 0)
      && !profile.healing
      && !profile.temporaryHitPoints
      && !row.healing
      && !row.temporaryHitPoints;
    const hasCombatCondition = conditionMetadataKnown && profile.conditions.length > 0;
    return hasAttack || hasSave || hasDamage || hasCombatCondition;
  }

  function hasDeferredAttackDamage(spell = {}, description = "", embeddedWeaponAttack = false) {
    if (embeddedWeaponAttack) return false;
    if (typeof spellData.spellHasDeferredAttackDamage === "function") {
      return spellData.spellHasDeferredAttackDamage(spell);
    }
    if (!Array.isArray(spell.miscTags) || !spell.miscTags.includes("AAD")) return false;
    const castingCondition = String(spell.time?.[0]?.condition || "");
    if (/\bimmediately after hitting\b/i.test(castingCondition)) return false;
    return (Array.isArray(spell.duration) ? spell.duration : [])
      .some((duration) => String(duration?.type || "").toLowerCase() !== "instant");
  }

  function hasGuidedMultiModeResolution(saveAbilities = [], attackTypes = [], description = "") {
    if (saveAbilities.length < 2) return false;
    if (attackTypes.length > 0) return true;
    return /\b(?:roll (?:on|a d\d+)|consult(?:ing)?|choose (?:one of|which effect)|following effects?|different effects?|mischievous surge|prismatic rays?|layers?)\b/i.test(description)
      || /\b(?:at the start of each of your later turns|as a bonus action(?: on your later turns)?|until the spell ends, you can use your action|you can use a bonus action)\b/i.test(description);
  }

  function createSpellActionDefinition(spellEntry = {}, row = {}, overrides = {}) {
    const spell = spellEntry.spell || spellEntry;
    const spellName = spellEntry.name || spell?.name || row.name || "Spell";
    const description = String(spell?.description || row.description || "");
    const profile = spellProfile(spell);
    const canonical = spell?.canonical === true;
    const attackMetadataKnown = canonical || owns(spell, "spellAttack");
    const saveMetadataKnown = canonical || owns(spell, "savingThrow");
    const damageMetadataKnown = canonical || owns(spell, "damageInflict");
    const conditionMetadataKnown = canonical || owns(spell, "conditionInflict");
    const areaMetadataKnown = canonical || owns(spell, "areaTags");
    const miscMetadataKnown = canonical || owns(spell, "miscTags");
    const concentrationMetadataKnown = canonical || owns(spell, "concentration") || Array.isArray(spell?.duration);
    const ritualMetadataKnown = canonical || owns(spell, "ritual") || owns(spell?.meta, "ritual");
    const materialMetadataKnown = canonical || owns(spell, "materialComponent") || owns(spell?.components, "m");
    const proseSaveAbility = savingThrowAbility(description);
    const saveAbilities = saveMetadataKnown
      ? cleanStringList(profile.savingThrows)
      : proseSaveAbility ? [proseSaveAbility] : [];
    const saveAbility = proseSaveAbility && saveAbilities.includes(proseSaveAbility)
      ? proseSaveAbility
      : saveAbilities[0] || "";
    const healing = miscMetadataKnown
      ? Boolean(profile.healing)
      : /\bregains?\b[^.]{0,80}\bHit Points?\b|\bhealing\b/i.test(description);
    const temporaryHitPoints = miscMetadataKnown
      ? Boolean(profile.temporaryHitPoints)
      : /\btemporary hit points?\b/i.test(description);
    const explicitlyUsesAttackRoll = /\b(?:make|makes) (?:a|an) (?:melee |ranged )?spell attack\b|\bspell attack roll\b|\bmake an attack roll\b/i.test(description);
    const embeddedWeaponAttack = Boolean(row.embeddedWeaponAttack) || hasEmbeddedWeaponAttack(spell, description);
    const attackTypes = attackMetadataKnown ? cleanStringList(profile.attacks) : [];
    const guidedMultiMode = hasGuidedMultiModeResolution(saveAbilities, attackTypes, description);
    const hasAttackEvidence = embeddedWeaponAttack || (attackMetadataKnown ? attackTypes.length > 0 : explicitlyUsesAttackRoll);
    const deferredAttackDamage = hasDeferredAttackDamage(spell, description, embeddedWeaponAttack);
    const hasAttackRoll = !guidedMultiMode
      && !deferredAttackDamage
      && !row.noAttackRoll
      && hasAttackEvidence
      && Number.isFinite(Number(row.attackBonus))
      && (attackMetadataKnown || (!saveAbility && !healing));
    const rowDamageTypes = cleanStringList([
      ...(Array.isArray(row.damageTypes) ? row.damageTypes : row.damageTypes ? [row.damageTypes] : []),
      ...(row.damageType ? [row.damageType] : [])
    ]);
    const damageTypes = embeddedWeaponAttack && rowDamageTypes.length
      ? rowDamageTypes
      : damageMetadataKnown
        ? cleanStringList(profile.damageTypes)
        : rowDamageTypes;
    const damageFormula = row.damage && row.damage !== "--" ? row.damage : "";
    const structuredRollEffect = damageTypes.length > 0 || healing || temporaryHitPoints;
    const hasStructuredRollMetadata = damageMetadataKnown || miscMetadataKnown;
    const hasDamageRoll = !guidedMultiMode
      && !deferredAttackDamage
      && Boolean(damageFormula)
      && (hasStructuredRollMetadata ? structuredRollEffect : true);
    const automaticDamage = hasDamageRoll && damageTypes.length > 0 && !hasAttackRoll && !saveAbility && !healing && !temporaryHitPoints;
    const requiresConcentration = concentrationMetadataKnown
      ? Boolean(profile.concentration)
      : /\bConcentration\b/i.test(description);
    const ritual = ritualMetadataKnown ? Boolean(profile.ritual) : /\bRitual\b/i.test(description);
    const materialComponent = materialMetadataKnown ? profile.material || null : materialComponentForSpell(spell);
    const conditions = conditionMetadataKnown ? cleanStringList(profile.conditions) : [];
    const areaTags = areaMetadataKnown ? cleanStringList(profile.areaTags) : [];
    const range = profile.range || spell?.range || null;
    const duration = profile.duration || spell?.duration || null;
    const areaOfEffect = areaTags.length || rangeIsArea(range) ? { tags: areaTags, range } : null;
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
    if (saveAbility && !guidedMultiMode && !deferredAttackDamage) steps.push(RESOLUTION_STEPS.savingThrow);
    if (hasDamageRoll) steps.push(RESOLUTION_STEPS.damageRoll);
    steps.push(RESOLUTION_STEPS.applyEffect, RESOLUTION_STEPS.confirmResult);
    const identity = spellIdentity(spellEntry, spell, spellName);
    const source = legacySpellSource(spell) || String(spellEntry.source || "").trim();
    const { id: requestedId, name: requestedName, ...definitionOverrides } = overrides;
    const actionId = sourceAwareSpellActionId(requestedId, identity, spellName);
    const actionName = requestedName || spellName;
    return definition({
      id: actionId,
      name: actionName,
      category: ACTION_CATEGORIES.spells,
      cost,
      steps,
      spell: { ...spellEntry },
      spellId: identity.stable ? identity.id : "",
      spellSource: source,
      targetRequired: embeddedWeaponAttack ? true : range ? !rangeIsSelf(range) : !/\bRange:\s*Self\b|\byourself\b/i.test(description),
      requiresCombat: spellRequiresCombat(spellEntry, row),
      attack: { ...row },
      attackTypes,
      saveAbility,
      saveAbilities,
      healing,
      temporaryHitPoints,
      embeddedWeaponAttack,
      deferredAttackDamage,
      guidedMultiMode,
      automaticDamage,
      requiresConcentration,
      concentration: requiresConcentration ? { id: identity.stable ? identity.id : "", name: spellName, source } : null,
      saveDamageRule,
      formula: hasAttackRoll ? `d20${Number(row.attackBonus) >= 0 ? "+" : ""}${Number(row.attackBonus)}` : "",
      damageFormula,
      damageType: damageTypes[0] || "",
      damageTypes,
      conditions,
      areaTags,
      areaOfEffect,
      range,
      duration,
      components: spell?.components || null,
      ritual,
      materialComponent,
      spellBehavior: {
        ...profile,
        attacks: attackTypes,
        savingThrows: saveAbilities,
        damageTypes,
        conditions,
        areaTags,
        concentration: requiresConcentration,
        ritual,
        material: materialComponent,
        healing,
        temporaryHitPoints,
        embeddedWeaponAttack,
        deferredAttackDamage,
        guidedMultiMode,
        requiresCombat: spellRequiresCombat(spellEntry, row),
        range,
        duration
      },
      description,
      ...definitionOverrides
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
    normalizeDamageComponent,
    attackDamageComponents,
    criticalDamageFormula,
    createAttackActionDefinition,
    createSpellActionDefinition,
    spellRequiresCombat,
    maxAttacksFromFeatureText,
    savingThrowAbility
  };
});
