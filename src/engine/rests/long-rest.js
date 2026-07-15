(function createLongRestModule(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndLongRestEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function longRestFactory(globalScope) {
  "use strict";

  function fallbackResetResourceState() { return {}; }

  function getResourceEngine() {
    return globalScope?.dndResourceStateEngine || {};
  }

  function getResetResourceState() {
    return typeof getResourceEngine().resetResourceState === "function"
      ? getResourceEngine().resetResourceState
      : fallbackResetResourceState;
  }

  function readLevelValue(source, level) {
    if (Array.isArray(source)) return source[level - 1];
    if (source && typeof source === "object") return source[level] ?? source[String(level)];
    return undefined;
  }

  function parseSpellSlotTotal(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
      if (total) remainingValue = resetRemaining || currentRemaining == null
        ? String(total)
        : String(Math.max(0, Math.min(currentRemaining, total)));
      updates.push({ level, total, totalValue: total ? String(total) : "", remainingValue });
    }
    return updates;
  }

  function recoverResourceState(state, keys = []) {
    const recover = getResourceEngine().recoverResourceState;
    if (typeof recover === "function") return recover({ state, keys });
    const next = state && typeof state === "object" && !Array.isArray(state) ? { ...state } : {};
    keys.forEach((key) => delete next[key]);
    return next;
  }

  function computeLongRestRecovery({
    slotTotals = [],
    remainingByLevel = {},
    currentHitPoints = "",
    maxHitPoints = "",
    resourceState,
    recoverResourceKeys,
    hitDiceTotal,
    exhaustionLevel,
    heroicInspiration,
    human = false
  } = {}) {
    const hasResourceState = resourceState !== undefined || Array.isArray(recoverResourceKeys);
    const nextResourceState = hasResourceState
      ? recoverResourceState(resourceState, Array.isArray(recoverResourceKeys) ? recoverResourceKeys : [])
      : getResetResourceState()();
    const recovery = {
      spellSlotUpdates: computeSpellSlotFieldUpdates({ slotTotals, remainingByLevel, resetRemaining: true }),
      featureUses: nextResourceState,
      nextResourceState,
      currentHitPoints: String(maxHitPoints || "").trim() ? maxHitPoints : currentHitPoints
    };
    if (hitDiceTotal !== undefined) recovery.hitDice = { available: Math.max(0, Number.parseInt(hitDiceTotal, 10) || 0), total: Math.max(0, Number.parseInt(hitDiceTotal, 10) || 0) };
    if (exhaustionLevel !== undefined) recovery.exhaustionLevel = Math.max(0, Math.min(6, Number.parseInt(exhaustionLevel, 10) || 0) - 1);
    if (heroicInspiration !== undefined) recovery.heroicInspiration = Boolean(heroicInspiration) || Boolean(human);
    if (hitDiceTotal !== undefined || exhaustionLevel !== undefined || heroicInspiration !== undefined) recovery.clearTemporaryHitPoints = true;
    return recovery;
  }

  function getLongRestTransition({ characterReady, longRestActive } = {}) {
    if (!characterReady) return { nextLongRestActive: Boolean(longRestActive), shouldRestoreResources: true };
    const nextLongRestActive = !Boolean(longRestActive);
    return { nextLongRestActive, shouldRestoreResources: !nextLongRestActive };
  }

  function hasZeroHitPoints(value) {
    const text = String(value ?? "").trim();
    return text !== "" && Number.isFinite(Number(value)) && Number(value) <= 0;
  }

  function resolveLongRest({
    characterReady,
    longRestActive,
    shortRestActive,
    currentHitPoints,
    ...recoveryOptions
  } = {}) {
    if (shortRestActive) return { nextLongRestActive: Boolean(longRestActive), shouldRestoreResources: false, mode: "blocked", recovery: null };
    if (!longRestActive && hasZeroHitPoints(currentHitPoints)) {
      return { nextLongRestActive: false, shouldRestoreResources: false, mode: "blocked", recovery: null, reason: "zero-hit-points" };
    }
    const transition = getLongRestTransition({ characterReady, longRestActive });
    const mode = !characterReady ? "instant" : transition.nextLongRestActive ? "start" : "finish";
    return {
      ...transition,
      mode,
      recovery: transition.shouldRestoreResources
        ? computeLongRestRecovery({ currentHitPoints, ...recoveryOptions })
        : null
    };
  }

  function resolveLongRestInterruption({ elapsedMinutes = 0, reason = "", shortRestRecovery = null } = {}) {
    const elapsed = Math.max(0, Number.parseInt(elapsedMinutes, 10) || 0);
    const grantsShortRest = elapsed >= 60;
    return {
      interrupted: true,
      reason: String(reason || "interrupted"),
      elapsedMinutes: elapsed,
      grantsShortRest,
      recovery: grantsShortRest ? shortRestRecovery : null
    };
  }

  return {
    computeSpellSlotFieldUpdates,
    computeLongRestRecovery,
    getLongRestTransition,
    resolveLongRest,
    resolveLongRestInterruption
  };
});
