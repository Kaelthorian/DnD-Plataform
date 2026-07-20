(function createItemResourceStateModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndItemResourceState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function itemResourceStateFactory() {
  "use strict";

  function finiteWholeNumber(value) {
    if (value == null || value === "") return null;
    const text = String(value).trim();
    if (!/^\d+$/.test(text)) return null;
    const number = Number(text);
    return Number.isSafeInteger(number) ? number : null;
  }

  function resourceDefinition(profile = {}) {
    const resources = profile?.resources || profile || {};
    const charges = finiteWholeNumber(resources.charges);
    if (charges != null && charges > 0) return { kind: "charges", max: charges };
    const reload = finiteWholeNumber(resources.reload);
    if (reload != null && reload > 0) return { kind: "reload", max: reload };
    return null;
  }

  function clampCurrent(value, max) {
    const current = Number(value);
    if (!Number.isSafeInteger(current)) return max;
    return Math.max(0, Math.min(max, current));
  }

  function normalizeResourceRecord(record, definition) {
    if (!definition || !Number.isSafeInteger(definition.max) || definition.max <= 0) return null;
    const priorMax = finiteWholeNumber(record?.max);
    const wasFull = priorMax != null && finiteWholeNumber(record?.current) === priorMax;
    const current = wasFull && priorMax !== definition.max
      ? definition.max
      : clampCurrent(record?.current, definition.max);
    return {
      current,
      max: definition.max,
      kind: definition.kind === "reload" ? "reload" : "charges"
    };
  }

  function resourceStateKey(catalogId, resourceId) {
    const itemId = String(catalogId || "").trim();
    const poolId = String(resourceId || "").trim();
    return itemId && poolId ? `${itemId}::${poolId}` : itemId;
  }

  function namedResourceDefinition(definition = {}) {
    const resourceId = String(definition.resourceId || definition.id || "").trim();
    const max = finiteWholeNumber(definition.max);
    if (!resourceId || max == null || max <= 0) return null;
    return {
      resourceId,
      max,
      kind: String(definition.kind || "uses"),
      recovery: definition.recovery && typeof definition.recovery === "object"
        ? { trigger: String(definition.recovery.trigger || ""), amount: definition.recovery.amount }
        : null
    };
  }

  function ensureResourceState(store, catalogId, definition, options = {}) {
    const normalizedDefinition = namedResourceDefinition(definition);
    if (!normalizedDefinition) return { nextStore: store || {}, state: null, key: "", changed: false };
    const source = store && typeof store === "object" && !Array.isArray(store) ? store : {};
    const key = resourceStateKey(catalogId, normalizedDefinition.resourceId);
    const legacyKey = String(catalogId || "").trim();
    const legacyRecord = options.allowLegacy === true && !source[key] ? source[legacyKey] : null;
    const record = source[key] || legacyRecord;
    const state = {
      ...normalizeResourceRecord(record, { max: normalizedDefinition.max, kind: normalizedDefinition.kind }),
      resourceId: normalizedDefinition.resourceId,
      recovery: normalizedDefinition.recovery
    };
    const current = source[key];
    const equal = recordsEqual(current, state)
      && current.resourceId === state.resourceId
      && JSON.stringify(current.recovery || null) === JSON.stringify(state.recovery || null);
    return equal
      ? { nextStore: source, state, key, changed: false, migratedLegacy: false }
      : { nextStore: { ...source, [key]: state }, state, key, changed: true, migratedLegacy: Boolean(legacyRecord) };
  }

  function adjustResourceState(store, catalogId, definition, delta, options = {}) {
    const ensured = ensureResourceState(store, catalogId, definition, options);
    if (!ensured.state) return { ...ensured, applied: false };
    const amount = Number(delta);
    if (!Number.isFinite(amount) || amount === 0) return { ...ensured, applied: false };
    const current = Math.max(0, Math.min(ensured.state.max, ensured.state.current + Math.trunc(amount)));
    if (current === ensured.state.current) return { ...ensured, applied: false };
    const state = { ...ensured.state, current };
    return {
      ...ensured,
      nextStore: { ...ensured.nextStore, [ensured.key]: state },
      state,
      changed: true,
      applied: true
    };
  }

  function processRecoveryEvent(store, event, definitions = []) {
    const trigger = String(event || "").trim();
    let nextStore = store && typeof store === "object" && !Array.isArray(store) ? store : {};
    const recovered = [];
    const declared = Array.isArray(definitions) && definitions.length
      ? definitions
      : Object.entries(nextStore).flatMap(([key, record]) => {
        const resourceId = String(record?.resourceId || "").trim();
        const suffix = resourceId ? `::${resourceId}` : "";
        if (!suffix || !key.endsWith(suffix) || !record?.recovery) return [];
        return [{ ...record, catalogId: key.slice(0, -suffix.length), resourceId }];
      });
    declared.forEach((input) => {
      const catalogId = String(input?.catalogId || "").trim();
      const definition = namedResourceDefinition(input);
      if (!catalogId || !definition || definition.recovery?.trigger !== trigger) return;
      const ensured = ensureResourceState(nextStore, catalogId, definition);
      nextStore = ensured.nextStore;
      const requested = definition.recovery.amount === "full"
        ? ensured.state.max
        : Math.min(ensured.state.max, ensured.state.current + Math.max(0, Number(definition.recovery.amount) || 0));
      if (requested === ensured.state.current) return;
      const state = { ...ensured.state, current: requested };
      nextStore = { ...nextStore, [ensured.key]: state };
      recovered.push({ key: ensured.key, catalogId, resourceId: definition.resourceId, before: ensured.state.current, after: requested });
    });
    return { nextStore, recovered, changed: recovered.length > 0 };
  }

  function recordsEqual(left, right) {
    return Boolean(left && right
      && left.current === right.current
      && left.max === right.max
      && left.kind === right.kind);
  }

  function ensureItemResourceState(store, catalogId, definition) {
    const id = String(catalogId || "").trim();
    const source = store && typeof store === "object" && !Array.isArray(store) ? store : {};
    if (!id || !definition) return { nextStore: source, state: null, changed: false };
    const state = normalizeResourceRecord(source[id], definition);
    if (!state) return { nextStore: source, state: null, changed: false };
    if (recordsEqual(source[id], state)) return { nextStore: source, state, changed: false };
    return { nextStore: { ...source, [id]: state }, state, changed: true };
  }

  function adjustItemResourceState(store, catalogId, definition, delta) {
    const ensured = ensureItemResourceState(store, catalogId, definition);
    if (!ensured.state) return { ...ensured, applied: false };
    const amount = Number(delta);
    if (!Number.isFinite(amount) || amount === 0) return { ...ensured, applied: false };
    const current = Math.max(0, Math.min(ensured.state.max, ensured.state.current + Math.trunc(amount)));
    if (current === ensured.state.current) return { ...ensured, applied: false };
    const state = { ...ensured.state, current };
    return {
      nextStore: { ...ensured.nextStore, [String(catalogId).trim()]: state },
      state,
      changed: true,
      applied: true
    };
  }

  function declaredAttachedSpellChargeCost(spell = {}) {
    if (String(spell.usage || "").trim().toLowerCase() !== "charges") return null;
    const cost = finiteWholeNumber(spell.cost);
    return cost != null && cost > 0 ? cost : null;
  }

  function declaredAttachedSpellUse(spell = {}) {
    const usage = String(spell.usage || "").trim().toLowerCase();
    const match = String(spell.cost || "").trim().match(/^(\d+)(e)?$/i);
    if (!match || !["daily", "rest", "limited"].includes(usage)) return null;
    const max = finiteWholeNumber(match[1]);
    if (max == null || max <= 0) return null;
    return {
      usage,
      max,
      each: Boolean(match[2]),
      recovery: usage === "daily" ? { trigger: "dawn", amount: "full" }
        : usage === "rest" ? { trigger: "longRest", amount: "full" }
          : null
    };
  }

  function inferItemActionTypes(text) {
    const value = String(text || "");
    if (!value.trim()) return [];
    const types = [];
    if (/\b(?:as|using) (?:a|your) reaction\b|\b(?:can|may) use (?:a|your) reaction\b|\btake the Reaction\b/i.test(value)) types.push("reaction");
    if (/\b(?:as|using) (?:a|your) bonus action\b|\b(?:can|may) use (?:a|your) bonus action\b|\btake the Bonus Action\b/i.test(value)) types.push("bonus");
    if (/\bUse an Object action\b|\bobject interaction\b/i.test(value)) types.push("objectInteraction");
    if (/\b(?:as|using) (?:an?|your) action\b|\bas (?:a|the) Magic action\b|\b(?:can|may) use (?:an?|your) action\b|\b(?:take|use) (?:an?|the|your) Magic action\b/i.test(value)) types.push("action");
    return [...new Set(types)];
  }

  function inferItemActionType(text) {
    return inferItemActionTypes(text)[0] || "";
  }

  function inferUniqueItemActionType(text) {
    const types = inferItemActionTypes(text);
    return types.length === 1 ? types[0] : "";
  }

  function spellTimingActionType(spell, fallback = "action") {
    const firstTime = Array.isArray(spell?.time) ? spell.time[0] : null;
    const unit = String(firstTime?.unit || "").trim().toLowerCase();
    if (unit === "bonus") return "bonus";
    if (unit === "reaction") return "reaction";
    if (unit === "action") return "action";
    if (!unit) return String(fallback || "");
    return "";
  }

  return {
    finiteWholeNumber,
    resourceDefinition,
    normalizeResourceRecord,
    ensureItemResourceState,
    adjustItemResourceState,
    resourceStateKey,
    namedResourceDefinition,
    ensureResourceState,
    adjustResourceState,
    processRecoveryEvent,
    declaredAttachedSpellChargeCost,
    declaredAttachedSpellUse,
    inferItemActionTypes,
    inferItemActionType,
    inferUniqueItemActionType,
    spellTimingActionType
  };
});
