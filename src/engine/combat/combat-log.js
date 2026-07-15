(function createCombatLogModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndCombatLogEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function combatLogFactory() {
  "use strict";

  function cleanArray(values) {
    return (Array.isArray(values) ? values : []).filter((value) => value != null && value !== "");
  }

  function optionalNumber(value) {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function createCombatLogEvent(input = {}) {
    return {
      id: input.id || `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actor: String(input.actor || "Character"),
      action: String(input.action || "Action"),
      target: String(input.target || ""),
      timestamp: input.timestamp || new Date().toISOString(),
      turn: Math.max(1, Number.parseInt(input.turn, 10) || 1),
      round: Math.max(1, Number.parseInt(input.round, 10) || 1),
      formulas: cleanArray(input.formulas),
      dice: cleanArray(input.dice),
      modifiers: cleanArray(input.modifiers),
      rollMode: String(input.rollMode || "normal"),
      attackTotal: optionalNumber(input.attackTotal),
      hit: typeof input.hit === "boolean" ? input.hit : null,
      damage: optionalNumber(input.damage),
      damageType: String(input.damageType || ""),
      healing: optionalNumber(input.healing),
      savingThrows: cleanArray(input.savingThrows),
      resourcesConsumed: cleanArray(input.resourcesConsumed),
      effectsApplied: cleanArray(input.effectsApplied),
      modifierSources: cleanArray(input.modifierSources),
      attacksRemaining: optionalNumber(input.attacksRemaining),
      pendingDmResolution: Boolean(input.pendingDmResolution),
      detail: String(input.detail || "")
    };
  }

  function appendCombatLog(log = [], event, limit = 100) {
    const normalized = createCombatLogEvent(event);
    return [normalized, ...(Array.isArray(log) ? log : [])].slice(0, Math.max(1, limit));
  }

  function formatCombatLogEvent(event = {}) {
    const lines = [];
    const target = event.target ? ` ${event.target}` : "";
    lines.push(`${event.actor} uses ${event.action}${target ? ` on${target}` : ""}.`);
    if (event.formulas?.length) lines.push(`Formula${event.formulas.length === 1 ? "" : "s"}: ${event.formulas.join(" | ")}.`);
    if (event.dice?.length) lines.push(`Dice: ${event.dice.map((die) => typeof die === "object" ? JSON.stringify(die) : die).join(", ")}.`);
    if (event.modifiers?.length) lines.push(`Modifiers: ${event.modifiers.map((modifier) => (
      modifier && typeof modifier === "object"
        ? `${modifier.label || "Modifier"} ${Number(modifier.value) >= 0 ? "+" : ""}${modifier.value}`
        : String(modifier)
    )).join(", ")}.`);
    if (event.rollMode && event.rollMode !== "normal") lines.push(`Roll mode: ${event.rollMode}.`);
    if (event.attackTotal != null) lines.push(`Hit Roll: ${event.attackTotal}${event.hit == null ? " (DM resolution pending)" : event.hit ? " — Hit" : " — Miss"}.`);
    if (event.damage != null) lines.push(`Damage: ${event.damage}${event.damageType ? ` ${event.damageType}` : ""}.`);
    if (event.healing != null) lines.push(`Healing: ${event.healing}.`);
    if (event.savingThrows?.length) lines.push(`Saving Throw: ${event.savingThrows.join("; ")}.`);
    if (event.resourcesConsumed?.length) lines.push(`Resources: ${event.resourcesConsumed.join(", ")}.`);
    if (event.effectsApplied?.length) lines.push(`Effects: ${event.effectsApplied.join(", ")}.`);
    if (event.attacksRemaining != null) lines.push(`${event.attacksRemaining} attack${event.attacksRemaining === 1 ? "" : "s"} remain${event.attacksRemaining === 1 ? "s" : ""} in this Attack action.`);
    if (event.pendingDmResolution) lines.push("Pending DM resolution.");
    if (event.detail) lines.push(event.detail);
    return lines.join("\n");
  }

  return { createCombatLogEvent, appendCombatLog, formatCombatLogEvent };
});
