(function createItemAutomationSchemaModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndItemAutomationSchema = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function itemAutomationSchemaFactory() {
  "use strict";

  const SCHEMA_VERSION = 1;
  const SUPPORTED_TRIGGERS = Object.freeze([
    "onActivate", "onHit", "sourceTurnStart", "sourceTurnEnd",
    "targetTurnStart", "targetTurnEnd", "shortRest", "longRest", "dawn"
  ]);
  const ACTION_TYPES = Object.freeze(["action", "bonusAction", "reaction", "objectInteraction", "none"]);
  const CAPABILITY_KINDS = Object.freeze(["attackRider", "action", "reaction", "modifier", "manual"]);
  const DAMAGE_TYPES = Object.freeze([
    "acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
    "piercing", "poison", "psychic", "radiant", "slashing", "thunder"
  ]);
  const AREA_SHAPES = Object.freeze(["emanation", "cone", "cube", "cylinder", "line", "radius", "sphere"]);
  const AREA_UNITS = Object.freeze(["feet", "meters"]);
  const EFFECT_KINDS = Object.freeze(["healing", "damage", "condition", "manual"]);
  const ABILITY_KEYS = Object.freeze(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
  const MODIFIER_ROLLS = Object.freeze(["skillCheck", "savingThrow"]);
  const SENSE_TYPES = Object.freeze(["darkvision", "blindsight", "truesight", "tremorsense"]);
  const SAVE_DAMAGE_RULES = Object.freeze(["none", "half", "manual"]);
  const SELF_HEALING_KINDS = Object.freeze(["equalToDamageDealt"]);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function stableId(value) {
    return /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/.test(String(value || ""));
  }

  function isDiceFormula(value) {
    const formula = String(value || "").replace(/\s+/g, "");
    if (!formula || !/\d*d\d+/i.test(formula)) return false;
    return /^[+-]?(?:\d*d\d+|\d+)(?:[+-](?:\d*d\d+|\d+))*$/i.test(formula);
  }

  function validateDamage(damage, path, errors) {
    if (!Array.isArray(damage) || !damage.length) {
      errors.push(`${path} must contain at least one damage component.`);
      return;
    }
    const ids = new Set();
    damage.forEach((component, index) => {
      const label = `${path}[${index}]`;
      if (!isPlainObject(component)) {
        errors.push(`${label} must be an object.`);
        return;
      }
      if (component.id != null) {
        if (!stableId(component.id)) errors.push(`${label}.id must be a stable kebab-case ID.`);
        if (ids.has(component.id)) errors.push(`${path} contains duplicate damage ID ${component.id}.`);
        ids.add(component.id);
      }
      if (!isDiceFormula(component.formula)) errors.push(`${label}.formula is not a supported dice formula.`);
      if (!DAMAGE_TYPES.includes(String(component.type || "").toLowerCase())) errors.push(`${label}.type is not a supported damage type.`);
      if (![
        "doubleDice", "none"
      ].includes(component.critical || "doubleDice")) errors.push(`${label}.critical is not supported.`);
    });
  }

  function validateArea(area, path, errors) {
    if (!isPlainObject(area)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (!AREA_SHAPES.includes(area.shape)) errors.push(`${path}.shape is not supported.`);
    if (!Number.isFinite(Number(area.radius)) || Number(area.radius) <= 0) errors.push(`${path}.radius must be greater than zero.`);
    if (!AREA_UNITS.includes(area.unit)) errors.push(`${path}.unit is not supported.`);
    if (area.anchor !== "sourceActor") errors.push(`${path}.anchor must be sourceActor.`);
    if (typeof area.movesWithAnchor !== "boolean") errors.push(`${path}.movesWithAnchor must be boolean.`);
  }

  function validateEffect(effect, path, errors) {
    if (!isPlainObject(effect) || !stableId(effect.id)) {
      errors.push(`${path}.id must be a stable kebab-case ID.`);
      return;
    }
    const duration = effect.duration;
    if (!isPlainObject(duration) || !Number.isFinite(Number(duration.value)) || Number(duration.value) <= 0) {
      errors.push(`${path}.duration must have a positive value.`);
    }
    if (duration?.combatRounds != null && (!Number.isInteger(Number(duration.combatRounds)) || Number(duration.combatRounds) <= 0)) {
      errors.push(`${path}.duration.combatRounds must be a positive integer.`);
    }
    if (effect.area != null) validateArea(effect.area, `${path}.area`, errors);
    if (!Array.isArray(effect.hooks) || !effect.hooks.length) errors.push(`${path}.hooks must contain at least one hook.`);
    (effect.hooks || []).forEach((hook, index) => {
      const label = `${path}.hooks[${index}]`;
      if (!SUPPORTED_TRIGGERS.includes(hook?.event)) errors.push(`${label}.event is not supported.`);
      if (!isPlainObject(hook?.effect)) errors.push(`${label}.effect must be an object.`);
      if (hook?.effect && !EFFECT_KINDS.includes(hook.effect.kind)) errors.push(`${label}.effect.kind is not supported; use manual for guided resolution.`);
      if (["healing", "damage"].includes(hook?.effect?.kind) && !isDiceFormula(hook.effect.formula)) errors.push(`${label}.effect.formula is invalid.`);
    });
  }

  function validateModifierEffects(effects, path, errors) {
    if (!isPlainObject(effects)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    const supportedKeys = ["abilityBonuses", "languages", "senses", "defenses", "rollAdvantages"];
    if (!supportedKeys.some((key) => Array.isArray(effects[key]) ? effects[key].length : isPlainObject(effects[key]))) {
      errors.push(`${path} must declare at least one supported modifier effect.`);
    }
    (effects.abilityBonuses || []).forEach((bonus, index) => {
      const label = `${path}.abilityBonuses[${index}]`;
      if (!ABILITY_KEYS.includes(String(bonus?.ability || "").toUpperCase())) errors.push(`${label}.ability is not supported.`);
      if (!Number.isInteger(Number(bonus?.amount)) || Number(bonus.amount) === 0) errors.push(`${label}.amount must be a non-zero integer.`);
      if (bonus?.maximum != null && (!Number.isInteger(Number(bonus.maximum)) || Number(bonus.maximum) < 1 || Number(bonus.maximum) > 30)) {
        errors.push(`${label}.maximum must be an integer from 1 to 30.`);
      }
    });
    (effects.languages || []).forEach((language, index) => {
      if (!String(language || "").trim()) errors.push(`${path}.languages[${index}] must be a non-empty language name.`);
    });
    (effects.senses || []).forEach((sense, index) => {
      const label = `${path}.senses[${index}]`;
      if (!SENSE_TYPES.includes(sense?.type)) errors.push(`${label}.type is not supported.`);
      if (!Number.isFinite(Number(sense?.range)) || Number(sense.range) <= 0) errors.push(`${label}.range must be greater than zero.`);
      if (sense?.unit !== "feet") errors.push(`${label}.unit must be feet.`);
    });
    if (effects.defenses != null) {
      if (!isPlainObject(effects.defenses)) errors.push(`${path}.defenses must be an object.`);
      else ["resistances", "immunities", "vulnerabilities"].forEach((key) => {
        (effects.defenses[key] || []).forEach((type, index) => {
          if (!DAMAGE_TYPES.includes(String(type || "").toLowerCase())) errors.push(`${path}.defenses.${key}[${index}] is not a supported damage type.`);
        });
      });
    }
    (effects.rollAdvantages || []).forEach((advantage, index) => {
      const label = `${path}.rollAdvantages[${index}]`;
      if (!MODIFIER_ROLLS.includes(advantage?.roll)) errors.push(`${label}.roll is not supported.`);
      if (advantage?.ability != null && !ABILITY_KEYS.includes(String(advantage.ability).toUpperCase())) errors.push(`${label}.ability is not supported.`);
      if (!String(advantage?.label || "").trim()) errors.push(`${label}.label is required for contextual guidance.`);
    });
  }

  function validateStatusActivation(status, path, errors) {
    if (!isPlainObject(status) || !stableId(status.id)) {
      errors.push(`${path}.id must be a stable kebab-case ID.`);
      return;
    }
    if (status.duration == null) return;
    if (!isPlainObject(status.duration) || !Number.isFinite(Number(status.duration.value)) || Number(status.duration.value) <= 0) {
      errors.push(`${path}.duration must have a positive value.`);
      return;
    }
    if (!String(status.duration.unit || "").trim()) errors.push(`${path}.duration.unit is required.`);
  }

  function validateItemDefinition(definition, index, errors) {
    const path = `items[${index}]`;
    if (!isPlainObject(definition?.match) || !definition.match.name || !definition.match.source) {
      errors.push(`${path}.match requires name and source.`);
    }
    const resourceIds = new Set();
    (definition.resources || []).forEach((resource, resourceIndex) => {
      const label = `${path}.resources[${resourceIndex}]`;
      if (!stableId(resource?.id)) errors.push(`${label}.id must be a stable kebab-case ID.`);
      if (resourceIds.has(resource?.id)) errors.push(`${path} contains duplicate resource ID ${resource?.id}.`);
      resourceIds.add(resource?.id);
      if (!Number.isInteger(Number(resource?.max)) || Number(resource.max) <= 0) errors.push(`${label}.max must be a positive integer.`);
      if (!SUPPORTED_TRIGGERS.includes(resource?.recovery?.trigger)) errors.push(`${label}.recovery.trigger is not supported.`);
      const amount = resource?.recovery?.amount;
      if (amount !== "full" && (!Number.isInteger(Number(amount)) || Number(amount) <= 0)) errors.push(`${label}.recovery.amount must be full or a positive integer.`);
    });
    const capabilityIds = new Set();
    (definition.capabilities || []).forEach((capability, capabilityIndex) => {
      const label = `${path}.capabilities[${capabilityIndex}]`;
      if (!stableId(capability?.id)) errors.push(`${label}.id must be a stable kebab-case ID.`);
      if (capabilityIds.has(capability?.id)) errors.push(`${path} contains duplicate capability ID ${capability?.id}.`);
      capabilityIds.add(capability?.id);
      if (!CAPABILITY_KINDS.includes(capability?.kind)) errors.push(`${label}.kind is not supported.`);
      if (capability?.trigger && !SUPPORTED_TRIGGERS.includes(capability.trigger.event)) errors.push(`${label}.trigger.event is not supported.`);
      if (capability?.activation && !ACTION_TYPES.includes(capability.activation.type)) errors.push(`${label}.activation.type is not supported.`);
      if (capability?.kind === "attackRider" && capability?.trigger?.source !== "thisItemAttack") errors.push(`${label}.trigger.source must be thisItemAttack.`);
      if (capability?.kind === "modifier") validateModifierEffects(capability.effects, `${label}.effects`, errors);
      if (capability?.kind !== "modifier" && capability?.effects != null) errors.push(`${label}.effects is only supported for modifier capabilities.`);
      if (capability?.activatesStatus != null) {
        if (!['action', 'reaction'].includes(capability?.kind)) errors.push(`${label}.activatesStatus is only supported for action or reaction capabilities.`);
        validateStatusActivation(capability.activatesStatus, `${label}.activatesStatus`, errors);
      }
      if (capability?.oneTime != null) {
        if (typeof capability.oneTime !== "boolean") errors.push(`${label}.oneTime must be boolean.`);
        if (capability.oneTime === true && !["action", "reaction"].includes(capability?.kind)) {
          errors.push(`${label}.oneTime is only supported for action or reaction capabilities.`);
        }
      }
      if (capability?.savingThrow != null) {
        const savingThrow = capability.savingThrow;
        if (!isPlainObject(savingThrow)) errors.push(`${label}.savingThrow must be an object.`);
        else {
          if (!ABILITY_KEYS.includes(String(savingThrow.ability || "").toUpperCase())) errors.push(`${label}.savingThrow.ability is not supported.`);
          if (!Number.isInteger(Number(savingThrow.dc)) || Number(savingThrow.dc) < 1 || Number(savingThrow.dc) > 30) errors.push(`${label}.savingThrow.dc must be an integer from 1 to 30.`);
          if (!SAVE_DAMAGE_RULES.includes(savingThrow.onSuccess || "manual")) errors.push(`${label}.savingThrow.onSuccess is not supported.`);
        }
      }
      if (capability?.selfHealing != null) {
        if (!isPlainObject(capability.selfHealing) || !SELF_HEALING_KINDS.includes(capability.selfHealing.kind)) {
          errors.push(`${label}.selfHealing.kind is not supported.`);
        }
      }
      if (capability?.spell != null) {
        const spell = capability.spell;
        if (!isPlainObject(spell) || !String(spell.name || "").trim() || !String(spell.source || "").trim()) {
          errors.push(`${label}.spell requires name and source.`);
        }
        if (spell?.castLevel != null && (!Number.isInteger(Number(spell.castLevel)) || Number(spell.castLevel) < 0 || Number(spell.castLevel) > 9)) {
          errors.push(`${label}.spell.castLevel must be an integer from 0 to 9.`);
        }
      }
      if (capability?.target != null) {
        const target = capability.target;
        if (!isPlainObject(target) || target.type !== "creature") errors.push(`${label}.target.type must be creature.`);
        if (typeof target?.required !== "boolean") errors.push(`${label}.target.required must be boolean.`);
        if (target?.range != null && (!Number.isFinite(Number(target.range)) || Number(target.range) <= 0)) errors.push(`${label}.target.range must be greater than zero.`);
        if (target?.unit != null && target.unit !== "feet") errors.push(`${label}.target.unit must be feet.`);
      }
      if (capability?.requirements?.equipmentModes != null) {
        const modes = capability.requirements.equipmentModes;
        if (!Array.isArray(modes) || modes.some((mode) => !["worn", "held", "carried", "attuned"].includes(mode))) {
          errors.push(`${label}.requirements.equipmentModes contains an unsupported mode.`);
        }
      }
      if (capability?.requirements?.raceExcludes != null) {
        const exclusions = capability.requirements.raceExcludes;
        if (!Array.isArray(exclusions) || exclusions.some((race) => !String(race || "").trim())) {
          errors.push(`${label}.requirements.raceExcludes must contain non-empty race tags.`);
        }
      }
      if (capability?.damage != null) validateDamage(capability.damage, `${label}.damage`, errors);
      (capability?.resourceCosts || []).forEach((cost, costIndex) => {
        if (!resourceIds.has(cost?.resourceId)) errors.push(`${label}.resourceCosts[${costIndex}] references an unknown resource.`);
        if (!Number.isInteger(Number(cost?.amount)) || Number(cost.amount) <= 0) errors.push(`${label}.resourceCosts[${costIndex}].amount must be positive.`);
      });
      if (capability?.createsEffect) validateEffect(capability.createsEffect, `${label}.createsEffect`, errors);
    });
  }

  function validateOverlay(overlay) {
    const errors = [];
    if (!isPlainObject(overlay)) return { ok: false, errors: ["Overlay must be an object."] };
    if (overlay.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
    if (!Array.isArray(overlay.items)) errors.push("items must be an array.");
    else overlay.items.forEach((definition, index) => validateItemDefinition(definition, index, errors));
    return { ok: errors.length === 0, errors };
  }

  return Object.freeze({
    SCHEMA_VERSION,
    SUPPORTED_TRIGGERS,
    ACTION_TYPES,
    CAPABILITY_KINDS,
    DAMAGE_TYPES,
    AREA_SHAPES,
    AREA_UNITS,
    EFFECT_KINDS,
    ABILITY_KEYS,
    MODIFIER_ROLLS,
    SENSE_TYPES,
    SAVE_DAMAGE_RULES,
    SELF_HEALING_KINDS,
    isDiceFormula,
    validateOverlay
  });
});
