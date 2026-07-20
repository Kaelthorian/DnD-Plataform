(function createItemCapabilityCompilerModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndItemCapabilityCompiler = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function itemCapabilityCompilerFactory() {
  "use strict";

  function actionCostFor(type) {
    if (!type || type === "none") return [];
    return [{ type, amount: 1 }];
  }

  function compileDamage(catalogId, capabilityId, damage = [], trigger = "onHit") {
    return damage.map((component, index) => ({
      id: component.id || `${capabilityId}-damage-${index + 1}`,
      definitionId: `${catalogId}::capability:${capabilityId}:damage:${component.id || index + 1}`,
      formula: String(component.formula),
      type: String(component.type).toLowerCase(),
      source: "itemCapability",
      sourceCatalogId: catalogId,
      sourceCapabilityId: capabilityId,
      trigger,
      critical: component.critical || "doubleDice"
    }));
  }

  function compileItemAutomation(definition, item) {
    const catalogId = String(item.catalogId || "");
    const resources = (definition.resources || []).map((resource) => ({
      resourceId: resource.id,
      definitionId: `${catalogId}::resource:${resource.id}`,
      catalogId,
      name: resource.name || resource.id,
      max: Number(resource.max),
      kind: resource.kind || "uses",
      recovery: {
        trigger: resource.recovery.trigger,
        amount: resource.recovery.amount
      }
    }));
    const capabilities = (definition.capabilities || []).map((capability) => {
      const capabilityId = capability.id;
      const trigger = capability.trigger?.event || "onActivate";
      return {
        ...capability,
        capabilityId,
        definitionId: `${catalogId}::capability:${capabilityId}`,
        sourceCatalogId: catalogId,
        name: capability.name || capabilityId,
        requirements: { owned: false, equipped: false, attuned: false, ...(capability.requirements || {}) },
        resourceCosts: (capability.resourceCosts || []).map((cost) => ({
          catalogId,
          resourceId: cost.resourceId,
          key: `${catalogId}::${cost.resourceId}`,
          amount: Number(cost.amount)
        })),
        damageComponents: compileDamage(catalogId, capabilityId, capability.damage || [], trigger),
        actionCost: actionCostFor(capability.activation?.type),
        savingThrow: capability.savingThrow ? {
          ...capability.savingThrow,
          ability: String(capability.savingThrow.ability).toUpperCase(),
          dc: Number(capability.savingThrow.dc),
          onSuccess: capability.savingThrow.onSuccess || "manual"
        } : null,
        selfHealing: capability.selfHealing ? { ...capability.selfHealing } : null,
        activatesStatus: capability.activatesStatus ? {
          ...capability.activatesStatus,
          duration: capability.activatesStatus.duration ? { ...capability.activatesStatus.duration, value: Number(capability.activatesStatus.duration.value) } : null
        } : null,
        oneTime: capability.oneTime === true,
        spell: capability.spell ? {
          ...capability.spell,
          ...(capability.spell.castLevel == null ? {} : { castLevel: Number(capability.spell.castLevel) })
        } : null,
        effects: capability.effects ? {
          ...capability.effects,
          abilityBonuses: (capability.effects.abilityBonuses || []).map((bonus) => ({ ...bonus, ability: String(bonus.ability).toUpperCase(), amount: Number(bonus.amount), ...(bonus.maximum == null ? {} : { maximum: Number(bonus.maximum) }) })),
          languages: [...(capability.effects.languages || [])],
          senses: (capability.effects.senses || []).map((sense) => ({ ...sense, range: Number(sense.range) })),
          defenses: capability.effects.defenses ? Object.fromEntries(Object.entries(capability.effects.defenses).map(([key, values]) => [key, [...values]])) : null,
          rollAdvantages: (capability.effects.rollAdvantages || []).map((advantage) => ({ ...advantage }))
        } : null,
        createsEffect: capability.createsEffect ? {
          ...capability.createsEffect,
          definitionId: `${catalogId}::capability:${capabilityId}:effect:${capability.createsEffect.id}`,
          sourceCatalogId: catalogId,
          sourceCapabilityId: capabilityId
        } : null
      };
    });
    return {
      catalogId,
      match: { ...definition.match },
      resources,
      capabilities,
      attackRiders: capabilities.filter((capability) => capability.kind === "attackRider"),
      actions: capabilities.filter((capability) => capability.kind === "action" || capability.kind === "reaction"),
      modifiers: capabilities.filter((capability) => capability.kind === "modifier"),
      manualCapabilities: capabilities.filter((capability) => capability.kind === "manual")
    };
  }

  function augmentItemAutomationProfile(profile, compiled) {
    if (!compiled) return {
      ...profile,
      resources: { ...profile.resources, definitions: [] },
      capabilities: [],
      attackRiders: [],
      actions: [],
      modifiers: [],
      manualCapabilities: []
    };
    return {
      ...profile,
      resources: { ...profile.resources, definitions: compiled.resources.map((resource) => ({ ...resource })) },
      capabilities: compiled.capabilities.map((capability) => ({ ...capability })),
      attackRiders: compiled.attackRiders.map((capability) => ({ ...capability })),
      actions: compiled.actions.map((capability) => ({ ...capability })),
      modifiers: compiled.modifiers.map((capability) => ({ ...capability })),
      manualCapabilities: compiled.manualCapabilities.map((capability) => ({ ...capability }))
    };
  }

  return Object.freeze({ compileDamage, compileItemAutomation, augmentItemAutomationProfile });
});
