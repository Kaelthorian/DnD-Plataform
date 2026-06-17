(function createResourceStateModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndResourceStateEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function resourceStateFactory() {
  "use strict";

  function ensureResourceState(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) return {};
    return state;
  }

  function parseResourceMaximum(max) {
    const parsed = Number.parseInt(max, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  function parseResourceSpent(value, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(max, parsed));
  }

  function getResourceUseInfo({ key, max, state } = {}) {
    const parsedMax = parseResourceMaximum(max);
    if (!parsedMax || !key) return null;
    const resourceState = ensureResourceState(state);
    const spent = parseResourceSpent(resourceState[key], parsedMax);
    return { key, max: parsedMax, spent, remaining: parsedMax - spent };
  }

  function spendResourceUse({ key, max, state } = {}) {
    const resourceState = ensureResourceState(state);
    const info = getResourceUseInfo({ key, max, state: resourceState });
    if (!info) return { changed: false, state: resourceState, info: null, nextInfo: null };
    if (info.remaining <= 0) return { changed: false, state: resourceState, info, nextInfo: info };
    const nextState = { ...resourceState, [key]: info.spent + 1 };
    return {
      changed: true,
      state: nextState,
      info,
      nextInfo: getResourceUseInfo({ key, max, state: nextState })
    };
  }

  function isMagicInitiateGrantUsable(grant) {
    return Boolean(grant?.prepared) && grant?.level === 1 && Boolean(grant?.key);
  }

  function getMagicInitiateUseInfo({ grant, state } = {}) {
    if (!isMagicInitiateGrantUsable(grant)) return null;
    const info = getResourceUseInfo({ key: grant.key, max: 1, state });
    return info ? { ...info, grant } : null;
  }

  function spendMagicInitiateUse({ grant, state } = {}) {
    const resourceState = ensureResourceState(state);
    const info = getMagicInitiateUseInfo({ grant, state: resourceState });
    if (!info) return { changed: false, state: resourceState, info: null, nextInfo: null };
    if (info.remaining <= 0) return { changed: false, state: resourceState, info, nextInfo: info };
    const nextState = { ...resourceState, [grant.key]: info.spent + 1 };
    return {
      changed: true,
      state: nextState,
      info,
      nextInfo: getMagicInitiateUseInfo({ grant, state: nextState })
    };
  }

  function resetResourceState() {
    return {};
  }

  return {
    ensureResourceState,
    getResourceUseInfo,
    spendResourceUse,
    getMagicInitiateUseInfo,
    spendMagicInitiateUse,
    resetResourceState
  };
});
