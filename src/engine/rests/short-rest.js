(function createShortRestModule(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndShortRestEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function shortRestFactory(globalScope) {
  "use strict";

  function fallbackComputeSpellSlotFieldUpdates() { return []; }
  function fallbackRecoverResourceState({ state } = {}) {
    return state && typeof state === "object" && !Array.isArray(state) ? { ...state } : {};
  }
  function getRestStateEngine() { return globalScope?.dndRestStateEngine || {}; }
  function getComputeSpellSlotFieldUpdates() {
    return typeof globalScope?.dndLongRestEngine?.computeSpellSlotFieldUpdates === "function"
      ? globalScope.dndLongRestEngine.computeSpellSlotFieldUpdates
      : fallbackComputeSpellSlotFieldUpdates;
  }
  function getRecoverResourceState() {
    return typeof globalScope?.dndResourceStateEngine?.recoverResourceState === "function"
      ? globalScope.dndResourceStateEngine.recoverResourceState
      : fallbackRecoverResourceState;
  }

  function computeShortRestRecovery({
    slotTotals = [],
    remainingByLevel = {},
    resourceState = {},
    recoverResourceKeys = [],
    restoreSpellSlots = false,
    currentHitPoints,
    maxHitPoints,
    hitDiceAvailable,
    hitDiceTotal
  } = {}) {
    const recovery = {
      spellSlotUpdates: getComputeSpellSlotFieldUpdates()({ slotTotals, remainingByLevel, resetRemaining: restoreSpellSlots }),
      nextResourceState: getRecoverResourceState()({ state: resourceState, keys: recoverResourceKeys })
    };
    if (currentHitPoints !== undefined || maxHitPoints !== undefined || hitDiceAvailable !== undefined || hitDiceTotal !== undefined) {
      recovery.hitDice = {
        available: Math.max(0, Number.parseInt(hitDiceAvailable, 10) || 0),
        total: Math.max(0, Number.parseInt(hitDiceTotal, 10) || 0)
      };
      recovery.currentHitPoints = currentHitPoints;
      recovery.maxHitPoints = maxHitPoints;
    }
    return recovery;
  }

  function getShortRestTransition({ characterReady, shortRestActive } = {}) {
    if (!characterReady) return { nextShortRestActive: Boolean(shortRestActive), shouldRestoreResources: true };
    const nextShortRestActive = !Boolean(shortRestActive);
    return { nextShortRestActive, shouldRestoreResources: !nextShortRestActive };
  }

  function hasZeroHitPoints(value) {
    const text = String(value ?? "").trim();
    return text !== "" && Number.isFinite(Number(value)) && Number(value) <= 0;
  }

  function resolveShortRest({
    characterReady,
    shortRestActive,
    longRestActive,
    currentHitPoints,
    ...recoveryOptions
  } = {}) {
    if (longRestActive) return { nextShortRestActive: Boolean(shortRestActive), shouldRestoreResources: false, mode: "blocked", recovery: null };
    if (!shortRestActive && hasZeroHitPoints(currentHitPoints)) {
      return { nextShortRestActive: false, shouldRestoreResources: false, mode: "blocked", recovery: null, reason: "zero-hit-points" };
    }
    const transition = getShortRestTransition({ characterReady, shortRestActive });
    const mode = !characterReady ? "instant" : transition.nextShortRestActive ? "start" : "finish";
    return {
      ...transition,
      mode,
      recovery: transition.shouldRestoreResources
        ? computeShortRestRecovery({ currentHitPoints, ...recoveryOptions })
        : null
    };
  }

  function spendHitDie(options = {}) {
    const spend = getRestStateEngine().spendHitDie;
    if (typeof spend !== "function") return { changed: false, reason: "engine-unavailable" };
    return spend(options);
  }

  function resolveShortRestInterruption({ reason = "", shortRestRecovery = null } = {}) {
    return {
      interrupted: true,
      reason: String(reason || "interrupted"),
      recovery: null,
      shortRestRecovery
    };
  }

  return {
    computeShortRestRecovery,
    getShortRestTransition,
    resolveShortRest,
    spendHitDie,
    resolveShortRestInterruption
  };
});
