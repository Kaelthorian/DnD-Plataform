(function createLongRestModule(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndLongRestEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function longRestFactory(globalScope) {
  "use strict";

  function fallbackResetResourceState() {
    return {};
  }

  function getResetResourceState() {
    const reset = globalScope?.dndResourceStateEngine?.resetResourceState;
    return typeof reset === "function" ? reset : fallbackResetResourceState;
  }

  function readLevelValue(source, level) {
    if (Array.isArray(source)) return source[level - 1];
    if (source && typeof source === "object") return source[level];
    return undefined;
  }

  function parseSpellSlotTotal(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  }

  function parseSpellSlotRemaining(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function computeSpellSlotFieldUpdates({ slotTotals = [], remainingByLevel = {}, resetRemaining = false } = {}) {
    const updates = [];
    for (let level = 1; level <= 9; level += 1) {
      const total = parseSpellSlotTotal(readLevelValue(slotTotals, level));
      const currentRemaining = parseSpellSlotRemaining(readLevelValue(remainingByLevel, level));
      let remainingValue = "";
      if (total) {
        if (resetRemaining || currentRemaining == null) remainingValue = String(total);
        else remainingValue = String(Math.max(0, Math.min(currentRemaining, total)));
      }
      updates.push({
        level,
        total,
        totalValue: total ? String(total) : "",
        remainingValue
      });
    }
    return updates;
  }

  function computeLongRestRecovery({ slotTotals = [], remainingByLevel = {}, currentHitPoints = "", maxHitPoints = "" } = {}) {
    const nextResourceState = getResetResourceState()();
    return {
      spellSlotUpdates: computeSpellSlotFieldUpdates({
        slotTotals,
        remainingByLevel,
        resetRemaining: true
      }),
      featureUses: nextResourceState,
      nextResourceState,
      currentHitPoints: String(maxHitPoints || "").trim() ? maxHitPoints : currentHitPoints
    };
  }

  function getLongRestTransition({ characterReady, longRestActive } = {}) {
    if (!characterReady) {
      return {
        nextLongRestActive: Boolean(longRestActive),
        shouldRestoreResources: true
      };
    }
    const nextLongRestActive = !Boolean(longRestActive);
    return {
      nextLongRestActive,
      shouldRestoreResources: !nextLongRestActive
    };
  }

  function resolveLongRest({
    characterReady,
    longRestActive,
    slotTotals = [],
    remainingByLevel = {},
    currentHitPoints = "",
    maxHitPoints = ""
  } = {}) {
    const transition = getLongRestTransition({ characterReady, longRestActive });
    const mode = !characterReady
      ? "instant"
      : transition.nextLongRestActive
        ? "start"
        : "finish";
    return {
      ...transition,
      mode,
      recovery: transition.shouldRestoreResources
        ? computeLongRestRecovery({
            slotTotals,
            remainingByLevel,
            currentHitPoints,
            maxHitPoints
          })
        : null
    };
  }

  return {
    computeSpellSlotFieldUpdates,
    computeLongRestRecovery,
    getLongRestTransition,
    resolveLongRest
  };
});
