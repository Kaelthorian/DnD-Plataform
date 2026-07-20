(function createCombatResolutionModule(globalScope, factory) {
  const turnEconomy = typeof require === "function" ? require("./turn-economy.js") : globalScope.dndTurnEconomyEngine;
  const api = factory(turnEconomy);
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndCombatResolutionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function combatResolutionFactory(turnEconomy) {
  "use strict";

  function transactionId() {
    return `combat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function normalizeResourceLedger(resources = {}) {
    if (!resources || typeof resources !== "object" || Array.isArray(resources)) return {};
    return Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, Math.max(0, Number(value) || 0)]));
  }

  function validateResourceCosts(action = {}, resources = {}) {
    const ledger = normalizeResourceLedger(resources);
    const costs = (Array.isArray(action.resourceCosts) ? action.resourceCosts : []).map((cost) => ({
      key: String(cost?.key || ""),
      amount: Math.max(0, Number(cost?.amount) || 0)
    })).filter((cost) => cost.key && cost.amount > 0);
    const invalid = costs.find((cost) => (ledger[cost.key] || 0) < cost.amount);
    return invalid
      ? { ok: false, reason: `Insufficient ${invalid.key}.`, costs, ledger }
      : { ok: true, reason: "", costs, ledger };
  }

  function createResolution(action, economy, options = {}) {
    if (!action || typeof action !== "object") throw new Error("Combat action is required.");
    const id = String(options.transactionId || transactionId());
    const resourceValidation = validateResourceCosts(action, options.resources);
    const reservation = resourceValidation.ok
      ? turnEconomy.reserveAction(economy, action, id)
      : { ok: false, reason: resourceValidation.reason, state: turnEconomy.normalizeTurnEconomy(economy), reservation: null };
    return {
      id,
      action,
      economy: reservation.state,
      projectedEconomy: reservation.projected || turnEconomy.projectedTurnEconomy(reservation.state),
      reservation: reservation.reservation,
      resourceCosts: resourceValidation.costs,
      resources: resourceValidation.ledger,
      status: reservation.ok ? "resolving" : "blocked",
      blockedReason: reservation.reason || "",
      steps: Array.isArray(action.resolutionSteps) && action.resolutionSteps.length ? [...action.resolutionSteps] : ["confirmResult"],
      stepIndex: 0,
      results: {},
      busy: false,
      confirmed: false,
      cancelled: false,
      startedAt: new Date().toISOString()
    };
  }

  function currentStep(session) {
    return session?.steps?.[session.stepIndex] || null;
  }

  function update(session, patch) {
    return { ...session, ...patch, results: { ...(session?.results || {}), ...(patch?.results || {}) } };
  }

  function beginProcessing(session) {
    if (!session || session.status !== "resolving" || session.busy) return { ok: false, session, reason: "Action is already being processed." };
    return { ok: true, session: update(session, { busy: true }) };
  }

  function finishProcessing(session) {
    return update(session, { busy: false });
  }

  function recordTarget(session, target = {}) {
    return update(session, { results: { target: { name: String(target.name || "").trim(), ac: Number.isFinite(Number(target.ac)) ? Number(target.ac) : null } } });
  }

  function recordAttackRoll(session, roll = {}) {
    const natural = Number(roll.natural ?? roll.d20);
    const total = Number(roll.total);
    const targetAc = Number(session?.results?.target?.ac);
    const hasAc = Number.isFinite(targetAc) && targetAc > 0;
    const critical = natural === 20;
    const automaticMiss = natural === 1;
    const hit = automaticMiss ? false : critical ? true : hasAc && Number.isFinite(total) ? total >= targetAc : null;
    return update(session, {
      results: {
        attackRoll: { ...roll, natural, total, critical, automaticMiss, hit, targetAc: hasAc ? targetAc : null }
      }
    });
  }

  function resolveAttackOutcome(session, hit) {
    const attackRoll = session?.results?.attackRoll;
    if (!attackRoll) return session;
    return update(session, { results: { attackRoll: { ...attackRoll, hit: Boolean(hit), dmResolved: true } } });
  }

  function recordSavingThrow(session, result = {}) {
    const outcome = ["failed", "passed", "pending"].includes(result.outcome) ? result.outcome : "pending";
    return update(session, { results: { savingThrow: { ...result, outcome } } });
  }

  function recordAbilityCheck(session, result = {}) {
    return update(session, { results: { abilityCheck: { ...result } } });
  }

  function recordDamageRoll(session, result = {}) {
    return update(session, { results: { damageRoll: { ...result, total: Number(result.total) || 0 } } });
  }

  function recordDamageRolls(session, rolls = []) {
    const damageRolls = (Array.isArray(rolls) ? rolls : []).map((roll, index) => ({
      ...roll,
      id: String(roll?.id || `damage-${index + 1}`),
      formula: String(roll?.formula || ""),
      type: String(roll?.type || ""),
      total: Number(roll?.total) || 0
    }));
    const total = damageRolls.reduce((sum, roll) => sum + roll.total, 0);
    const compatibility = damageRolls.length === 1
      ? { ...damageRolls[0] }
      : { total, components: damageRolls.map((roll) => ({ ...roll })) };
    return update(session, { results: { damageRolls, damageRoll: compatibility } });
  }

  function triggeredDamageComponents(action = {}, results = {}) {
    return (Array.isArray(action.damageComponents) ? action.damageComponents : [])
      .filter((component) => component.trigger !== "onHit" || results.attackRoll?.hit === true);
  }

  function confirmConcentrationReplacement(session, confirmed = true) {
    return update(session, { results: { concentrationReplacementConfirmed: Boolean(confirmed) } });
  }

  function canResolveStep(session, step = currentStep(session)) {
    if (!session || session.status !== "resolving") return { ok: false, reason: session?.blockedReason || "Action is not active." };
    if (step === "selectTarget" && session.action.targetRequired && !session.results.target?.name) return { ok: false, reason: "Select a valid target." };
    if (step === "attackRoll" && !session.results.attackRoll) return { ok: false, reason: "Roll to Hit first." };
    if (step === "savingThrow" && !session.results.savingThrow) return { ok: false, reason: "Resolve the Saving Throw first." };
    if (step === "abilityCheck" && session.action.checkRequired && !session.results.abilityCheck) return { ok: false, reason: "Resolve the ability check first." };
    if (step === "damageRoll") {
      const attack = session.results.attackRoll;
      if (attack && attack.hit !== true && !session.action.rollDamageOnMiss) return { ok: false, reason: attack.hit === false ? "A Miss does not allow a normal Damage Roll." : "The hit must be resolved before damage." };
      const save = session.results.savingThrow;
      if (save?.outcome === "pending") return { ok: false, reason: "Resolve the Saving Throw before damage." };
      if (!session.results.damageRoll && !session.results.damageRolls?.length) return { ok: false, reason: "Roll Damage first." };
    }
    return { ok: true, reason: "" };
  }

  function advanceResolution(session) {
    const validation = canResolveStep(session);
    if (!validation.ok) return { ok: false, reason: validation.reason, session };
    const nextIndex = Math.min(session.steps.length - 1, session.stepIndex + 1);
    return { ok: true, session: update(session, { stepIndex: nextIndex }) };
  }

  function validateResolutionForConfirmation(session) {
    if (session.action.targetRequired && session.steps.includes("selectTarget") && !session.results.target?.name) {
      return { ok: false, reason: "Select a valid target." };
    }
    if (session.steps.includes("attackRoll") && !session.results.attackRoll) return { ok: false, reason: "Roll to Hit first." };
    if (session.steps.includes("savingThrow") && (!session.results.savingThrow || session.results.savingThrow.outcome === "pending")) {
      return { ok: false, reason: "Resolve the Saving Throw first." };
    }
    if (session.steps.includes("abilityCheck") && session.action.checkRequired && !session.results.abilityCheck) {
      return { ok: false, reason: "Resolve the ability check first." };
    }
    if (session.steps.includes("damageRoll")) {
      const missed = session.results.attackRoll?.hit === false && !session.action.rollDamageOnMiss;
      const savedForNone = session.results.savingThrow?.outcome === "passed" && session.action.saveDamageRule === "none";
      if (!missed && !savedForNone && !session.results.damageRoll && !session.results.damageRolls?.length) return { ok: false, reason: "Roll Damage first." };
    }
    return { ok: true, reason: "" };
  }

  function confirmResolution(session, actionPatch = {}) {
    if (!session || session.status !== "resolving") return { ok: false, reason: "Action is not active.", session };
    const resolutionValidation = validateResolutionForConfirmation(session);
    if (!resolutionValidation.ok) return { ok: false, reason: resolutionValidation.reason, session };
    const action = { ...session.action, ...actionPatch };
    if (action.requiresConcentration && session.economy?.concentration && !session.results.concentrationReplacementConfirmed) {
      return { ok: false, reason: "Replacing Concentration requires confirmation.", session };
    }
    let economyForCommit = session.economy;
    if (Object.prototype.hasOwnProperty.call(actionPatch, "actionCost")) {
      economyForCommit = turnEconomy.cancelReservation(economyForCommit, session.id).state;
      const replacement = turnEconomy.reserveAction(economyForCommit, action, session.id);
      if (!replacement.ok) return { ok: false, reason: replacement.reason, session };
      economyForCommit = replacement.state;
    }
    const committed = turnEconomy.commitReservation(economyForCommit, session.id, action);
    if (!committed.ok) return { ok: false, reason: committed.reason, session };
    const resources = { ...session.resources };
    (session.resourceCosts || []).forEach((cost) => {
      resources[cost.key] = Math.max(0, (resources[cost.key] || 0) - cost.amount);
    });
    return {
      ok: true,
      economy: committed.state,
      resources,
      session: update(session, {
        action,
        economy: committed.state,
        projectedEconomy: committed.state,
        resources,
        status: "complete",
        confirmed: true,
        busy: false,
        completedAt: new Date().toISOString()
      })
    };
  }

  function cancelResolution(session) {
    if (!session) return { ok: false, session, economy: null };
    const cancelled = turnEconomy.cancelReservation(session.economy, session.id);
    return {
      ok: true,
      economy: cancelled.state,
      session: update(session, {
        economy: cancelled.state,
        projectedEconomy: cancelled.state,
        status: "cancelled",
        cancelled: true,
        busy: false,
        cancelledAt: new Date().toISOString()
      })
    };
  }

  return {
    createResolution,
    currentStep,
    beginProcessing,
    finishProcessing,
    recordTarget,
    recordAttackRoll,
    resolveAttackOutcome,
    recordSavingThrow,
    recordAbilityCheck,
    recordDamageRoll,
    recordDamageRolls,
    triggeredDamageComponents,
    confirmConcentrationReplacement,
    canResolveStep,
    advanceResolution,
    validateResolutionForConfirmation,
    confirmResolution,
    cancelResolution,
    normalizeResourceLedger,
    validateResourceCosts
  };
});
