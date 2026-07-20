(function createEffectLifecycleModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndEffectLifecycle = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function effectLifecycleFactory() {
  "use strict";

  const SUPPORTED_EVENTS = Object.freeze([
    "onActivate", "onHit", "sourceTurnStart", "sourceTurnEnd",
    "targetTurnStart", "targetTurnEnd", "shortRest", "longRest", "dawn"
  ]);

  function dispatchEffectEvent(state = [], event, context = {}) {
    if (!SUPPORTED_EVENTS.includes(event)) return { state: [...state], executions: [], expired: [], changed: false, unsupported: true };
    const executions = [];
    const expired = [];
    let changed = false;
    const nextState = (Array.isArray(state) ? state : []).map((input) => {
      const effect = { ...input, hooks: Array.isArray(input?.hooks) ? input.hooks : [] };
      if (!effect.active) return effect;
      if (context.instanceId && String(context.instanceId) !== String(effect.instanceId)) return effect;
      const sourceMatches = !context.sourceActorId || !effect.sourceActorId || String(context.sourceActorId) === String(effect.sourceActorId);
      const targetMatches = !context.targetActorId || (effect.targetActorIds || []).map(String).includes(String(context.targetActorId));
      effect.hooks.forEach((hook, hookIndex) => {
        if (hook?.event !== event) return;
        if (event.startsWith("source") && !sourceMatches) return;
        if (event.startsWith("target") && !targetMatches) return;
        executions.push({
          executionId: `${effect.instanceId}::${event}:${hookIndex}`,
          instanceId: effect.instanceId,
          definitionId: effect.definitionId,
          sourceActorId: effect.sourceActorId,
          remainingRounds: event === "sourceTurnStart" && Number.isInteger(effect.remainingRounds)
            ? Math.max(0, effect.remainingRounds - 1)
            : effect.remainingRounds,
          event,
          targets: hook.targets || "declaredTargets",
          selectedTargetActorIds: Array.isArray(context.selectedTargetActorIds) ? [...context.selectedTargetActorIds] : [],
          area: effect.area ? { ...effect.area } : null,
          visibility: effect.visibility ? { ...effect.visibility } : {},
          effect: hook.effect ? { ...hook.effect } : null
        });
      });
      if (event === "sourceTurnStart" && sourceMatches && Number.isInteger(effect.remainingRounds)) {
        const remainingRounds = Math.max(0, effect.remainingRounds - 1);
        changed = true;
        if (remainingRounds === 0) {
          expired.push(effect.instanceId);
          return { ...effect, remainingRounds, active: false };
        }
        return { ...effect, remainingRounds };
      }
      return effect;
    });
    return { state: nextState, executions, expired, changed: changed || executions.length > 0, unsupported: false };
  }

  return Object.freeze({ SUPPORTED_EVENTS, dispatchEffectEvent });
});
