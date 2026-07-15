(function createRestStateModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndRestStateEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function restStateFactory() {
  "use strict";

  function parseInteger(value) {
    const parsed = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function nonNegativeInteger(value, fallback = 0) {
    const parsed = parseInteger(value);
    return parsed == null ? fallback : Math.max(0, parsed);
  }

  function normalizeCounter(value, maximum = null) {
    const parsed = parseInteger(value);
    if (parsed == null) return 0;
    const nonNegative = Math.max(0, parsed);
    return maximum == null ? nonNegative : Math.min(nonNegative, Math.max(0, maximum));
  }

  function normalizeHitDiceState({ available, total, characterLevel, classHitDieFaces, derivedTotal = false } = {}) {
    const parsedTotal = parseInteger(total);
    const level = nonNegativeInteger(characterLevel);
    const faces = nonNegativeInteger(classHitDieFaces);
    const derived = parsedTotal == null && level > 0 && faces > 0 ? level : null;
    const maximum = parsedTotal != null ? Math.max(0, parsedTotal) : (derived ?? 0);
    const parsedAvailable = parseInteger(available);
    const nextAvailable = parsedAvailable == null ? maximum : normalizeCounter(parsedAvailable, maximum);
    return {
      available: nextAvailable,
      total: maximum,
      derivedTotal: Boolean(derivedTotal) || derived != null,
      faces,
      changed: String(available ?? "") !== String(nextAvailable) || String(total ?? "") !== String(maximum)
    };
  }

  function randomDie(faces, rng = Math.random) {
    const size = nonNegativeInteger(faces);
    if (!size) return 0;
    const raw = typeof rng === "function" ? rng(size) : Math.random();
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= size && Number.isInteger(numeric)) return numeric;
    if (Number.isFinite(numeric) && numeric >= 0 && numeric < 1) return Math.floor(numeric * size) + 1;
    return Math.min(size, Math.max(1, Math.floor(numeric) || 1));
  }

  function spendHitDie({ available, total, currentHitPoints, maxHitPoints, hitDieFaces, constitutionModifier = 0, rng } = {}) {
    const dice = normalizeHitDiceState({ available, total, classHitDieFaces: hitDieFaces });
    const current = Math.max(0, nonNegativeInteger(currentHitPoints));
    const maximum = Math.max(0, nonNegativeInteger(maxHitPoints));
    if (dice.available <= 0) {
      return { changed: false, reason: "no-hit-dice", available: dice.available, total: dice.total, currentHitPoints: current, healing: 0, roll: 0 };
    }
    if (current >= maximum) {
      return { changed: false, reason: "hp-full", available: dice.available, total: dice.total, currentHitPoints: current, healing: 0, roll: 0 };
    }
    const roll = randomDie(dice.faces, rng);
    const constitution = parseInteger(constitutionModifier) ?? 0;
    const healing = Math.max(1, roll + constitution);
    const nextHitPoints = Math.min(maximum, current + healing);
    return {
      changed: true,
      reason: "",
      available: dice.available - 1,
      total: dice.total,
      currentHitPoints: nextHitPoints,
      healing: nextHitPoints - current,
      roll,
      requestedHealing: healing
    };
  }

  function recoverAllHitDice({ total, available } = {}) {
    const normalized = normalizeHitDiceState({ total, available });
    return { available: normalized.total, total: normalized.total };
  }

  function normalizeRestState(state) {
    const source = state && typeof state === "object" && !Array.isArray(state) ? state : {};
    const kind = ["short", "long"].includes(source.kind) ? source.kind : "";
    return {
      ...source,
      kind,
      elapsedMinutes: Math.max(0, nonNegativeInteger(source.elapsedMinutes)),
      interrupted: Boolean(source.interrupted),
      lastHitDie: source.lastHitDie && typeof source.lastHitDie === "object" ? { ...source.lastHitDie } : null
    };
  }

  function normalizeRecharge(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "none";
    if (/short\s+or\s+long|long\s+or\s+short/.test(text)) return "short-long";
    if (/short/.test(text)) return "short";
    if (/long/.test(text)) return "long";
    if (/none|never|custom/.test(text)) return "none";
    return "unknown";
  }

  function resourceRechargeKind(resource = {}, fallbackParser = null) {
    const explicit = resource.recharge ?? resource.rechargeType ?? resource.rechargeOn ?? resource.restRecharge;
    if (explicit != null) {
      const normalized = normalizeRecharge(typeof explicit === "object" ? explicit.type || explicit.kind || explicit.name : explicit);
      if (normalized !== "unknown") return normalized;
    }
    if (typeof fallbackParser === "function") {
      const parsed = normalizeRecharge(fallbackParser(resource));
      if (parsed !== "unknown") return parsed;
    }
    return "unknown";
  }

  function resourceRecoversOn(kind, rest) {
    const normalized = normalizeRecharge(kind);
    return rest === "short"
      ? normalized === "short" || normalized === "short-long"
      : normalized === "long" || normalized === "short-long";
  }

  function recoverResourceStateByRecharge({ state, resources = [], rest, fallbackParser } = {}) {
    const source = state && typeof state === "object" && !Array.isArray(state) ? state : {};
    const next = { ...source };
    const recoveredKeys = [];
    (Array.isArray(resources) ? resources : []).forEach((resource) => {
      const key = String(resource?.key || "").trim();
      if (!key || !resourceRecoversOn(resourceRechargeKind(resource, fallbackParser), rest)) return;
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        delete next[key];
        recoveredKeys.push(key);
      }
    });
    return { state: next, recoveredKeys };
  }

  function normalizeSheetMeta(meta, { characterLevel = 0, classHitDieFaces = 0 } = {}) {
    const source = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
    const normalized = { ...source };
    normalized.featureUses = normalizeNumericMap(source.featureUses);
    normalized.featurePools = normalizeNumericMap(source.featurePools);
    normalized.sorceryPoints = normalizeSorceryPoints(source.sorceryPoints);
    normalized.temporarySpellSlots = normalizeNumericMap(source.temporarySpellSlots, { omitZero: true });
    normalized.exhaustionLevel = Math.min(6, normalizeCounter(source.exhaustionLevel));
    normalized.activeStatuses = Array.isArray(source.activeStatuses)
      ? [...new Set(source.activeStatuses.map((id) => String(id || "").trim()).filter(Boolean))]
      : [];
    normalized.longRestActive = Boolean(source.longRestActive);
    normalized.shortRestActive = Boolean(source.shortRestActive);
    normalized.restState = normalizeRestState(source.restState);
    if (normalized.longRestActive && !normalized.restState.kind) normalized.restState = { kind: "long", elapsedMinutes: 0, interrupted: false, lastHitDie: null };
    if (normalized.shortRestActive && !normalized.restState.kind) normalized.restState = { kind: "short", elapsedMinutes: 0, interrupted: false, lastHitDie: null };
    const hitDice = normalizeHitDiceState({
      available: source.hitDice?.available,
      total: source.hitDice?.total,
      characterLevel,
      classHitDieFaces,
      derivedTotal: source.hitDice?.derivedTotal
    });
    delete hitDice.changed;
    normalized.hitDice = hitDice;
    return normalized;
  }

  function normalizeNumericMap(value, { omitZero = false } = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result = {};
    Object.entries(value).forEach(([key, raw]) => {
      const normalizedKey = String(key || "").trim();
      if (!normalizedKey) return;
      const parsed = parseInteger(raw);
      if (parsed == null || parsed < 0) return;
      const number = parsed;
      if (!omitZero || number > 0) result[normalizedKey] = number;
    });
    return result;
  }

  function normalizeSorceryPoints(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const maximum = normalizeCounter(value.maximum);
    return { current: Math.min(maximum, normalizeCounter(value.current)), maximum };
  }

  return {
    normalizeCounter,
    normalizeHitDiceState,
    spendHitDie,
    recoverAllHitDice,
    normalizeRestState,
    normalizeRecharge,
    resourceRechargeKind,
    resourceRecoversOn,
    recoverResourceStateByRecharge,
    normalizeSheetMeta
  };
});
