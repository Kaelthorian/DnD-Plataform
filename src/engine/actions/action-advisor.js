(function createActionAdvisorModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndActionAdvisorEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function actionAdvisorFactory() {
  "use strict";

  const ACTION_TYPES = Object.freeze({
    action: "action",
    bonus: "bonus",
    movement: "movement",
    reaction: "reaction"
  });

  const ACTION_TYPE_ORDER = Object.freeze([
    ACTION_TYPES.movement,
    ACTION_TYPES.action,
    ACTION_TYPES.bonus,
    ACTION_TYPES.reaction
  ]);

  const ACTION_TYPE_LABELS = Object.freeze({
    [ACTION_TYPES.action]: "Accion",
    [ACTION_TYPES.bonus]: "Accion Bonus",
    [ACTION_TYPES.movement]: "Movimiento",
    [ACTION_TYPES.reaction]: "Reaccion"
  });

  function normalizeActionType(type) {
    const value = String(type || "").trim().toLowerCase();
    if (value === ACTION_TYPES.action) return ACTION_TYPES.action;
    if (value === ACTION_TYPES.bonus || value === "bonus action") return ACTION_TYPES.bonus;
    if (value === ACTION_TYPES.movement || value === "move") return ACTION_TYPES.movement;
    if (value === ACTION_TYPES.reaction) return ACTION_TYPES.reaction;
    return ACTION_TYPES.action;
  }

  function normalizeProviderResult(result) {
    if (Array.isArray(result)) return { actions: result, resources: [] };
    if (!result || typeof result !== "object") return { actions: [], resources: [] };
    return {
      actions: Array.isArray(result.actions) ? result.actions : [],
      resources: Array.isArray(result.resources) ? result.resources : []
    };
  }

  function normalizeActionDescriptor(action, providerId) {
    if (!action || typeof action !== "object") return null;
    if (action.available === false) return null;
    const title = String(action.title || action.name || "").trim();
    if (!title) return null;
    const type = normalizeActionType(action.type);
    return {
      key: String(action.key || `${providerId}:${type}:${title}`).trim(),
      type,
      title,
      detail: String(action.detail || "").trim(),
      source: String(action.source || providerId || "").trim(),
      sortKey: String(action.sortKey || title).trim().toLowerCase(),
      tags: Array.isArray(action.tags) ? action.tags.filter(Boolean) : []
    };
  }

  function normalizeResourceDescriptor(resource, providerId) {
    if (!resource || typeof resource !== "object") return null;
    const title = String(resource.title || resource.name || "").trim();
    if (!title) return null;
    const key = String(resource.key || `${providerId}:${title}`).trim();
    return {
      key,
      title,
      detail: String(resource.detail || "").trim(),
      source: String(resource.source || providerId || "").trim(),
      remaining: Number.isFinite(resource.remaining) ? resource.remaining : null,
      total: Number.isFinite(resource.total) ? resource.total : null,
      sortKey: String(resource.sortKey || title).trim().toLowerCase()
    };
  }

  function sortActions(actions) {
    const order = new Map(ACTION_TYPE_ORDER.map((type, index) => [type, index]));
    return [...actions].sort((left, right) => {
      const typeDiff = (order.get(left.type) ?? 999) - (order.get(right.type) ?? 999);
      if (typeDiff) return typeDiff;
      return left.sortKey.localeCompare(right.sortKey);
    });
  }

  function sortResources(resources) {
    return [...resources].sort((left, right) => left.sortKey.localeCompare(right.sortKey));
  }

  function dedupeByKey(values) {
    const seen = new Set();
    return values.filter((value) => {
      if (!value?.key || seen.has(value.key)) return false;
      seen.add(value.key);
      return true;
    });
  }

  function groupActionsByType(actions) {
    const grouped = new Map(ACTION_TYPE_ORDER.map((type) => [type, []]));
    sortActions(actions).forEach((action) => {
      if (!grouped.has(action.type)) grouped.set(action.type, []);
      grouped.get(action.type).push(action);
    });
    return grouped;
  }

  function createActionRegistry() {
    const providers = new Map();

    function register(provider) {
      if (!provider || typeof provider !== "object") throw new Error("Action provider invalido");
      const id = String(provider.id || "").trim();
      const getActions = provider.getActions;
      if (!id) throw new Error("Action provider requiere id");
      if (typeof getActions !== "function") throw new Error(`Action provider ${id} requiere getActions()`);
      providers.set(id, {
        id,
        order: Number.isFinite(provider.order) ? provider.order : 0,
        getActions
      });
      return id;
    }

    function unregister(id) {
      providers.delete(String(id || ""));
    }

    function list() {
      return [...providers.values()]
        .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
        .map((provider) => provider.id);
    }

    function collect(context = {}) {
      const normalizedProviders = [...providers.values()]
        .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
      const actions = [];
      const resources = [];
      normalizedProviders.forEach((provider) => {
        const result = normalizeProviderResult(provider.getActions(context));
        result.actions
          .map((action) => normalizeActionDescriptor(action, provider.id))
          .filter(Boolean)
          .forEach((action) => actions.push(action));
        result.resources
          .map((resource) => normalizeResourceDescriptor(resource, provider.id))
          .filter(Boolean)
          .forEach((resource) => resources.push(resource));
      });
      return {
        actions: sortActions(dedupeByKey(actions)),
        resources: sortResources(dedupeByKey(resources)),
        providers: normalizedProviders.map((provider) => provider.id)
      };
    }

    return { register, unregister, list, collect };
  }

  return {
    ACTION_TYPES,
    ACTION_TYPE_LABELS,
    ACTION_TYPE_ORDER,
    normalizeActionType,
    groupActionsByType,
    createActionRegistry
  };
});
