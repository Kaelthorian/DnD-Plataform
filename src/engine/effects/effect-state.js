(function createEffectStateModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndEffectState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function effectStateFactory() {
  "use strict";

  function effectInstanceId(input = {}, now = Date.now(), random = Math.random()) {
    const stablePrefix = [input.sourceCatalogId, input.sourceCapabilityId, input.definitionId]
      .filter(Boolean).join("::").replace(/[^a-z0-9:_-]+/gi, "-");
    return `${stablePrefix || "effect"}::${Number(now)}-${Math.floor(Number(random) * 0xFFFFFF).toString(36)}`;
  }

  function normalizeEffectInstance(effect = {}) {
    const remainingRounds = effect.remainingRounds == null ? null : Math.max(0, Number.parseInt(effect.remainingRounds, 10) || 0);
    return {
      instanceId: String(effect.instanceId || effect.id || ""),
      definitionId: String(effect.definitionId || "legacy:manual"),
      sourceCatalogId: String(effect.sourceCatalogId || effect.catalogId || ""),
      sourceCapabilityId: String(effect.sourceCapabilityId || "legacy-manual"),
      sourceActorId: String(effect.sourceActorId || "character"),
      targetActorIds: Array.isArray(effect.targetActorIds) ? [...new Set(effect.targetActorIds.map(String).filter(Boolean))] : [],
      startedAt: effect.startedAt || new Date(0).toISOString(),
      remainingRounds,
      duration: effect.duration && typeof effect.duration === "object" ? { ...effect.duration } : null,
      area: effect.area && typeof effect.area === "object" ? { ...effect.area } : null,
      visibility: effect.visibility && typeof effect.visibility === "object" ? { ...effect.visibility } : {},
      hooks: Array.isArray(effect.hooks) ? effect.hooks.map((hook) => ({ ...hook, effect: hook?.effect ? { ...hook.effect } : null })) : [],
      active: effect.active !== false && remainingRounds !== 0,
      legacyManual: Boolean(effect.legacyManual)
    };
  }

  function createEffectInstance(definition = {}, context = {}, options = {}) {
    const now = options.now == null ? Date.now() : options.now;
    const duration = definition.duration && typeof definition.duration === "object" ? { ...definition.duration } : null;
    return normalizeEffectInstance({
      instanceId: options.instanceId || effectInstanceId({ ...definition, ...context }, now, options.random == null ? Math.random() : options.random),
      definitionId: definition.definitionId || definition.id,
      sourceCatalogId: context.sourceCatalogId || definition.sourceCatalogId,
      sourceCapabilityId: context.sourceCapabilityId || definition.sourceCapabilityId,
      sourceActorId: context.sourceActorId || "character",
      targetActorIds: context.targetActorIds || [],
      startedAt: new Date(now).toISOString(),
      remainingRounds: duration?.combatRounds ?? null,
      duration,
      area: definition.area,
      visibility: definition.visibility,
      hooks: definition.hooks,
      active: true
    });
  }

  function normalizeEffectState(state) {
    return (Array.isArray(state) ? state : []).map(normalizeEffectInstance).filter((effect) => effect.instanceId);
  }

  function migrateLegacyItemEffects(state, legacyItemEffects = {}, options = {}) {
    const effects = normalizeEffectState(state);
    const existing = new Set(effects.filter((effect) => effect.legacyManual).map((effect) => effect.sourceCatalogId));
    Object.entries(legacyItemEffects && typeof legacyItemEffects === "object" ? legacyItemEffects : {}).forEach(([catalogId, active]) => {
      if (!active || existing.has(catalogId)) return;
      effects.push(normalizeEffectInstance({
        instanceId: `legacy-item-effect::${encodeURIComponent(catalogId)}`,
        definitionId: "legacy:manual-item-effect",
        sourceCatalogId: catalogId,
        sourceCapabilityId: "legacy-manual",
        sourceActorId: options.sourceActorId || "character",
        startedAt: options.startedAt || new Date(0).toISOString(),
        remainingRounds: null,
        active: true,
        legacyManual: true
      }));
    });
    return effects;
  }

  return Object.freeze({ effectInstanceId, normalizeEffectInstance, createEffectInstance, normalizeEffectState, migrateLegacyItemEffects });
});
