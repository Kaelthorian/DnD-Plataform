(function createShortRestModule(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndShortRestEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function shortRestFactory(globalScope) {
  "use strict";

  function fallbackComputeSpellSlotFieldUpdates() {
    return [];
  }

  function fallbackRecoverResourceState({ state } = {}) {
    return state && typeof state === "object" && !Array.isArray(state) ? { ...state } : {};
  }

  function getComputeSpellSlotFieldUpdates() {
    const compute = globalScope?.dndLongRestEngine?.computeSpellSlotFieldUpdates;
    return typeof compute === "function" ? compute : fallbackComputeSpellSlotFieldUpdates;
  }

  function getRecoverResourceState() {
    const recover = globalScope?.dndResourceStateEngine?.recoverResourceState;
    return typeof recover === "function" ? recover : fallbackRecoverResourceState;
  }

  function computeShortRestRecovery({
    slotTotals = [],
    remainingByLevel = {},
    resourceState = {},
    recoverResourceKeys = [],
    restoreSpellSlots = false
  } = {}) {
    return {
      spellSlotUpdates: getComputeSpellSlotFieldUpdates()({
        slotTotals,
        remainingByLevel,
        resetRemaining: restoreSpellSlots
      }),
      nextResourceState: getRecoverResourceState()({
        state: resourceState,
        keys: recoverResourceKeys
      })
    };
  }

  function getShortRestTransition({ characterReady, shortRestActive } = {}) {
    if (!characterReady) {
      return {
        nextShortRestActive: Boolean(shortRestActive),
        shouldRestoreResources: true
      };
    }
    const nextShortRestActive = !Boolean(shortRestActive);
    return {
      nextShortRestActive,
      shouldRestoreResources: !nextShortRestActive
    };
  }

  function resolveShortRest({
    characterReady,
    shortRestActive,
    longRestActive,
    slotTotals = [],
    remainingByLevel = {},
    resourceState = {},
    recoverResourceKeys = [],
    restoreSpellSlots = false
  } = {}) {
    if (longRestActive) {
      return {
        nextShortRestActive: Boolean(shortRestActive),
        shouldRestoreResources: false,
        mode: "blocked",
        recovery: null
      };
    }
    const transition = getShortRestTransition({ characterReady, shortRestActive });
    const mode = !characterReady
      ? "instant"
      : transition.nextShortRestActive
        ? "start"
        : "finish";
    return {
      ...transition,
      mode,
      recovery: transition.shouldRestoreResources
        ? computeShortRestRecovery({
            slotTotals,
            remainingByLevel,
            resourceState,
            recoverResourceKeys,
            restoreSpellSlots
          })
        : null
    };
  }

  return {
    computeShortRestRecovery,
    getShortRestTransition,
    resolveShortRest
  };
});
