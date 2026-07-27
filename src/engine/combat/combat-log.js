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
      targetId: String(input.targetId || ""),
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
      damageComponents: cleanArray(input.damageComponents).map((component) => ({
        id: String(component?.id || ""),
        formula: String(component?.formula || ""),
        type: String(component?.type || ""),
        total: Number(component?.total) || 0
      })),
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
    const target = event.target ? ` -> ${event.target}` : "";
    lines.push(`${event.actor}: ${event.action}${target}`);

    if (event.attackTotal != null) {
      const outcome = event.hit == null ? "DM" : event.hit ? "Hit" : "Miss";
      lines.push(`Attack: ${event.attackTotal} - ${outcome}`);
    }

    if (event.damageComponents?.length) {
      event.damageComponents.forEach((component) => {
        const label = component.type ? component.type[0].toUpperCase() + component.type.slice(1) : "Damage";
        lines.push(`${label}: ${component.formula || "roll"} = ${component.total}`);
      });
      lines.push(`Damage total: ${event.damageComponents.reduce((sum, component) => sum + component.total, 0)}`);
    } else if (event.damage != null) {
      lines.push(`${event.damageType || "Damage"}: ${event.damage}`);
    }

    if (event.healing != null) lines.push(`Healing: ${event.healing}`);
    if (event.savingThrows?.length) lines.push(`Save: ${event.savingThrows.join("; ")}`);
    if (event.formulas?.length && event.attackTotal == null && !event.damageComponents?.length && event.damage == null) {
      lines.push(`Roll: ${event.formulas.join(" | ")}`);
    }
    if (event.resourcesConsumed?.length) lines.push(`Cost: ${event.resourcesConsumed.join(", ")}`);
    if (event.effectsApplied?.length) lines.push(`Effects: ${event.effectsApplied.join(", ")}`);
    if (event.attacksRemaining != null) lines.push(`Attacks left: ${event.attacksRemaining}`);
    if (event.pendingDmResolution) lines.push("Pending DM resolution");
    return lines.join("\n");
  }

  return { createCombatLogEvent, appendCombatLog, formatCombatLogEvent };
});
