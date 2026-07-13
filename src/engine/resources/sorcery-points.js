(function createSorceryPointModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndSorceryPointEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function sorceryPointFactory() {
  "use strict";

  const SPELL_SLOT_CREATION_RULES = Object.freeze({
    1: Object.freeze({ cost: 2, minimumSorcererLevel: 2 }),
    2: Object.freeze({ cost: 3, minimumSorcererLevel: 3 }),
    3: Object.freeze({ cost: 5, minimumSorcererLevel: 5 }),
    4: Object.freeze({ cost: 6, minimumSorcererLevel: 7 }),
    5: Object.freeze({ cost: 7, minimumSorcererLevel: 9 })
  });

  function parseNonNegativeInteger(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }

  function getMaximumSorceryPoints(sorcererLevel) {
    const level = Math.min(20, parseNonNegativeInteger(sorcererLevel));
    return level >= 2 ? level : 0;
  }

  function ensureSorceryPointData(data, sorcererLevel) {
    const maximum = getMaximumSorceryPoints(sorcererLevel);
    const hasCurrent = data && typeof data === "object" && Number.isFinite(Number.parseInt(data.current, 10));
    const hasPreviousMaximum = data && typeof data === "object" && Number.isFinite(Number.parseInt(data.maximum, 10));
    const previousMaximum = hasPreviousMaximum ? parseNonNegativeInteger(data.maximum) : 0;
    const newlyUnlocked = maximum > 0 && hasPreviousMaximum && previousMaximum === 0;
    const current = hasCurrent && !newlyUnlocked ? parseNonNegativeInteger(data.current) : maximum;
    return { current: Math.min(maximum, current), maximum };
  }

  function spendSorceryPoints(data, amount, sorcererLevel) {
    const pointData = ensureSorceryPointData(data, sorcererLevel);
    const cost = parseNonNegativeInteger(amount);
    if (cost <= 0) return { success: false, reason: "invalid-amount", data: pointData, spent: 0 };
    if (pointData.current < cost) return { success: false, reason: "insufficient-points", data: pointData, spent: 0 };
    return {
      success: true,
      reason: "",
      data: { ...pointData, current: pointData.current - cost },
      spent: cost
    };
  }

  function gainSorceryPoints(data, amount, sorcererLevel) {
    const pointData = ensureSorceryPointData(data, sorcererLevel);
    const requested = parseNonNegativeInteger(amount);
    if (requested <= 0) return { success: false, reason: "invalid-amount", data: pointData, gained: 0 };
    const current = Math.min(pointData.maximum, pointData.current + requested);
    const gained = current - pointData.current;
    return {
      success: gained > 0,
      reason: gained > 0 ? "" : "at-maximum",
      data: { ...pointData, current },
      gained
    };
  }

  function ensureTemporarySpellSlots(slots) {
    const normalized = {};
    for (let level = 1; level <= 5; level += 1) {
      const count = parseNonNegativeInteger(slots?.[level] ?? slots?.[String(level)]);
      if (count > 0) normalized[level] = count;
    }
    return normalized;
  }

  function temporarySpellSlotCount(slots, slotLevel) {
    const level = parseNonNegativeInteger(slotLevel);
    return ensureTemporarySpellSlots(slots)[level] || 0;
  }

  function convertSpellSlotToSorceryPoints({ data, sorcererLevel, slotLevel, remainingSlots } = {}) {
    const level = parseNonNegativeInteger(slotLevel);
    const remaining = parseNonNegativeInteger(remainingSlots);
    const pointData = ensureSorceryPointData(data, sorcererLevel);
    if (level < 1 || level > 9) return { success: false, reason: "invalid-slot-level", data: pointData, remainingSlots: remaining, gained: 0 };
    if (remaining <= 0) return { success: false, reason: "slot-unavailable", data: pointData, remainingSlots: remaining, gained: 0 };
    if (pointData.current + level > pointData.maximum) {
      return { success: false, reason: "would-exceed-maximum", data: pointData, remainingSlots: remaining, gained: 0 };
    }
    const gain = gainSorceryPoints(pointData, level, sorcererLevel);
    if (!gain.success) return { success: false, reason: gain.reason, data: gain.data, remainingSlots: remaining, gained: 0 };
    return { success: true, reason: "", data: gain.data, remainingSlots: remaining - 1, gained: gain.gained };
  }

  function getSpellSlotCreationRule(slotLevel) {
    return SPELL_SLOT_CREATION_RULES[parseNonNegativeInteger(slotLevel)] || null;
  }

  function createTemporarySpellSlot({ data, temporarySpellSlots, sorcererLevel, slotLevel } = {}) {
    const level = parseNonNegativeInteger(slotLevel);
    const pointData = ensureSorceryPointData(data, sorcererLevel);
    const slots = ensureTemporarySpellSlots(temporarySpellSlots);
    const rule = getSpellSlotCreationRule(level);
    if (!rule) return { success: false, reason: "invalid-slot-level", data: pointData, temporarySpellSlots: slots, cost: 0 };
    if (getMaximumSorceryPoints(sorcererLevel) < rule.minimumSorcererLevel) {
      return { success: false, reason: "sorcerer-level-too-low", data: pointData, temporarySpellSlots: slots, cost: rule.cost };
    }
    const spend = spendSorceryPoints(pointData, rule.cost, sorcererLevel);
    if (!spend.success) return { success: false, reason: spend.reason, data: spend.data, temporarySpellSlots: slots, cost: rule.cost };
    return {
      success: true,
      reason: "",
      data: spend.data,
      temporarySpellSlots: { ...slots, [level]: (slots[level] || 0) + 1 },
      cost: rule.cost
    };
  }

  function restoreSorceryPointsOnLongRest(data, sorcererLevel) {
    const pointData = ensureSorceryPointData(data, sorcererLevel);
    return { current: pointData.maximum, maximum: pointData.maximum };
  }

  function removeTemporarySpellSlots() {
    return {};
  }

  return {
    SPELL_SLOT_CREATION_RULES,
    getMaximumSorceryPoints,
    ensureSorceryPointData,
    spendSorceryPoints,
    gainSorceryPoints,
    ensureTemporarySpellSlots,
    temporarySpellSlotCount,
    convertSpellSlotToSorceryPoints,
    getSpellSlotCreationRule,
    createTemporarySpellSlot,
    restoreSorceryPointsOnLongRest,
    removeTemporarySpellSlots,
    GetMaximumSP: getMaximumSorceryPoints,
    SpendSP: spendSorceryPoints,
    GainSP: gainSorceryPoints,
    ConvertSpellSlotToSP: convertSpellSlotToSorceryPoints,
    CreateSpellSlot: createTemporarySpellSlot,
    RestoreSPOnLongRest: restoreSorceryPointsOnLongRest,
    RemoveTemporarySpellSlots: removeTemporarySpellSlots
  };
});
