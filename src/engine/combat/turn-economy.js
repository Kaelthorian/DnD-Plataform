(function createTurnEconomyModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndTurnEconomyEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function turnEconomyFactory() {
  "use strict";

  const ECONOMY_KEYS = Object.freeze({
    action: "actionsRemaining",
    bonusAction: "bonusActionsRemaining",
    reaction: "reactionsRemaining",
    movement: "movementRemaining",
    objectInteraction: "objectInteractionsRemaining"
  });

  function finiteNonNegative(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }

  function turnId() {
    return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function cloneReservations(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([key, reservation]) => [key, {
      ...reservation,
      costs: Array.isArray(reservation?.costs) ? reservation.costs.map((cost) => ({ ...cost })) : []
    }]));
  }

  function normalizeTurnEconomy(state = {}, defaults = {}) {
    const speed = finiteNonNegative(state.movementTotal ?? defaults.speed, 30);
    const legacySpent = state.spent && typeof state.spent === "object" ? state.spent : {};
    const actionsTotal = finiteNonNegative(state.actionsTotal ?? defaults.actions, 1);
    const bonusTotal = finiteNonNegative(state.bonusActionsTotal ?? defaults.bonusActions, 1);
    const reactionsTotal = finiteNonNegative(state.reactionsTotal ?? defaults.reactions, 1);
    const objectTotal = finiteNonNegative(state.objectInteractionsTotal ?? defaults.objectInteractions, 1);
    return {
      active: state.active !== false,
      ended: Boolean(state.ended),
      turn: Math.max(1, Number.parseInt(state.turn ?? defaults.turn, 10) || 1),
      round: Math.max(1, Number.parseInt(state.round ?? defaults.round, 10) || 1),
      actionsTotal,
      bonusActionsTotal: bonusTotal,
      reactionsTotal,
      movementTotal: speed,
      objectInteractionsTotal: objectTotal,
      actionsRemaining: finiteNonNegative(state.actionsRemaining, Math.max(0, actionsTotal - finiteNonNegative(legacySpent.action))),
      bonusActionsRemaining: finiteNonNegative(state.bonusActionsRemaining, Math.max(0, bonusTotal - finiteNonNegative(legacySpent.bonus))),
      reactionsRemaining: finiteNonNegative(state.reactionsRemaining, reactionsTotal),
      movementRemaining: finiteNonNegative(state.movementRemaining, speed),
      objectInteractionsRemaining: finiteNonNegative(state.objectInteractionsRemaining, objectTotal),
      attacksUsedInCurrentAttackAction: finiteNonNegative(state.attacksUsedInCurrentAttackAction),
      maxAttacksPerAttackAction: Math.max(1, Number.parseInt(state.maxAttacksPerAttackAction ?? defaults.maxAttacksPerAttackAction, 10) || 1),
      attackActionActive: Boolean(state.attackActionActive),
      turnStartedAt: state.turnStartedAt || new Date().toISOString(),
      turnEndedAt: state.turnEndedAt || "",
      turnId: state.turnId || turnId(),
      prone: Boolean(state.prone),
      concentration: state.concentration && typeof state.concentration === "object" ? { ...state.concentration } : null,
      readyAction: state.readyAction && typeof state.readyAction === "object" ? { ...state.readyAction } : null,
      effects: Array.isArray(state.effects) ? state.effects.map((effect) => ({ ...effect })) : [],
      oncePerTurnUses: state.oncePerTurnUses && typeof state.oncePerTurnUses === "object" ? { ...state.oncePerTurnUses } : {},
      reservations: cloneReservations(state.reservations),
      levelOnePlusSpellCast: Boolean(state.levelOnePlusSpellCast),
      bonusActionSpellCast: Boolean(state.bonusActionSpellCast),
      quickenedSpellUsed: Boolean(state.quickenedSpellUsed)
    };
  }

  function createTurnEconomy(options = {}) {
    const effects = options.effects || {};
    const actions = effects.actionsBlocked ? 0 : finiteNonNegative(options.actions, 1) + finiteNonNegative(effects.additionalActions);
    const bonusActions = effects.bonusActionsBlocked ? 0 : finiteNonNegative(options.bonusActions, 1);
    const reactions = effects.reactionsBlocked ? 0 : finiteNonNegative(options.reactions, 1);
    const baseSpeed = finiteNonNegative(options.speed, 30);
    const speed = effects.speedOverride != null
      ? finiteNonNegative(effects.speedOverride)
      : Math.max(0, Math.floor((baseSpeed + (Number(effects.speedBonus) || 0)) * (Number(effects.speedMultiplier) || 1)));
    return normalizeTurnEconomy({
      active: true,
      ended: false,
      turn: options.turn,
      round: options.round,
      actionsTotal: actions,
      bonusActionsTotal: bonusActions,
      reactionsTotal: reactions,
      movementTotal: speed,
      objectInteractionsTotal: finiteNonNegative(options.objectInteractions, 1),
      actionsRemaining: actions,
      bonusActionsRemaining: bonusActions,
      reactionsRemaining: reactions,
      movementRemaining: speed,
      objectInteractionsRemaining: finiteNonNegative(options.objectInteractions, 1),
      maxAttacksPerAttackAction: options.maxAttacksPerAttackAction,
      prone: Boolean(options.prone),
      effects: Array.isArray(options.activeEffects) ? options.activeEffects : [],
      oncePerTurnUses: {},
      reservations: {},
      turnStartedAt: options.turnStartedAt || new Date().toISOString(),
      turnId: options.turnId || turnId()
    }, options);
  }

  function startTurn(previous = {}, options = {}) {
    const normalized = normalizeTurnEconomy(previous, options);
    return createTurnEconomy({
      ...options,
      turn: options.turn ?? normalized.turn + 1,
      round: options.round ?? normalized.round,
      speed: options.speed ?? normalized.movementTotal,
      reactions: options.reactionAvailable === false ? 0 : (options.reactions ?? normalized.reactionsTotal),
      maxAttacksPerAttackAction: options.maxAttacksPerAttackAction ?? normalized.maxAttacksPerAttackAction,
      prone: options.prone ?? normalized.prone
    });
  }

  function endTurn(state) {
    const next = normalizeTurnEconomy(state);
    return {
      ...next,
      active: false,
      ended: true,
      turnEndedAt: new Date().toISOString(),
      reservations: {}
    };
  }

  function normalizeActionCosts(action = {}, state = {}) {
    const raw = Array.isArray(action.actionCost) ? action.actionCost : action.actionCost ? [action.actionCost] : [];
    const costs = raw.map((cost) => {
      if (typeof cost === "string") return { type: cost, amount: 1 };
      return { type: cost?.type || "none", amount: finiteNonNegative(cost?.amount, 1) };
    }).filter((cost) => cost.type !== "none" && cost.amount > 0);
    if (action.attackAction) {
      const current = projectedTurnEconomy(state);
      if (current.attackActionActive && current.attacksUsedInCurrentAttackAction < current.maxAttacksPerAttackAction) {
        return costs.filter((cost) => cost.type !== "action");
      }
    }
    return costs;
  }

  function projectedTurnEconomy(state) {
    const next = normalizeTurnEconomy(state);
    Object.values(next.reservations).forEach((reservation) => {
      (reservation.costs || []).forEach((cost) => {
        const key = ECONOMY_KEYS[cost.type];
        if (key) next[key] = Math.max(0, next[key] - finiteNonNegative(cost.amount, 1));
      });
    });
    return next;
  }

  function validateAction(state, action = {}) {
    const projected = projectedTurnEconomy(state);
    if ((!projected.active || projected.ended) && !action.allowOutsideTurn) return { ok: false, reason: "Turn has ended." };
    if (action.disabledReason) return { ok: false, reason: String(action.disabledReason) };
    if (action.oncePerTurnKey && projected.oncePerTurnUses[action.oncePerTurnKey]) {
      return { ok: false, reason: `${action.title || "This feature"} has already been used this turn.` };
    }
    if (action.attackAction && projected.attackActionActive && projected.attacksUsedInCurrentAttackAction >= projected.maxAttacksPerAttackAction) {
      return { ok: false, reason: "No attacks remain in the current Attack action." };
    }
    const costs = normalizeActionCosts(action, state);
    for (const cost of costs) {
      const key = ECONOMY_KEYS[cost.type];
      if (!key) continue;
      if (finiteNonNegative(projected[key]) < cost.amount) {
        const labels = {
          action: "No Action remaining.",
          bonusAction: "No Bonus Action remaining.",
          reaction: "No Reaction remaining.",
          movement: "Insufficient movement.",
          objectInteraction: "No Object Interaction remaining. Use Utilize for another significant interaction."
        };
        return { ok: false, reason: labels[cost.type] || `Insufficient ${cost.type}.` };
      }
    }
    return { ok: true, reason: "", costs };
  }

  function reserveAction(state, action = {}, reservationId = "") {
    const next = normalizeTurnEconomy(state);
    const id = String(reservationId || action.transactionId || "").trim() || `reservation-${Date.now()}`;
    if (next.reservations[id]) return { ok: false, duplicate: true, reason: "Action is already being processed.", state: next, reservation: next.reservations[id] };
    const validation = validateAction(next, action);
    if (!validation.ok) return { ...validation, state: next, reservation: null };
    const reservation = {
      id,
      actionKey: String(action.key || action.id || "action"),
      costs: validation.costs,
      attackAction: Boolean(action.attackAction),
      createdAt: new Date().toISOString()
    };
    next.reservations[id] = reservation;
    return { ok: true, state: next, reservation, projected: projectedTurnEconomy(next) };
  }

  function commitReservation(state, reservationId, action = {}) {
    const next = normalizeTurnEconomy(state);
    const reservation = next.reservations[String(reservationId || "")];
    if (!reservation) return { ok: false, reason: "Action reservation no longer exists.", state: next };
    reservation.costs.forEach((cost) => {
      const key = ECONOMY_KEYS[cost.type];
      if (key) next[key] = Math.max(0, finiteNonNegative(next[key]) - finiteNonNegative(cost.amount, 1));
    });
    if (reservation.attackAction || action.attackAction) {
      if (!next.attackActionActive) {
        next.attackActionActive = true;
        next.attacksUsedInCurrentAttackAction = 0;
      }
      next.attacksUsedInCurrentAttackAction = Math.min(next.maxAttacksPerAttackAction, next.attacksUsedInCurrentAttackAction + 1);
    }
    if (action.effect === "dash") next.movementRemaining += next.movementTotal;
    if (action.effect === "dropProne") next.prone = true;
    if (action.effect === "standUp") next.prone = false;
    if (action.effect === "actionSurge") {
      next.actionsTotal += 1;
      next.actionsRemaining += 1;
    }
    if (action.readyAction) next.readyAction = { ...action.readyAction };
    if (action.oncePerTurnKey) next.oncePerTurnUses[action.oncePerTurnKey] = true;
    if (action.concentration) next.concentration = { ...action.concentration };
    delete next.reservations[reservation.id];
    return { ok: true, state: next, reservation };
  }

  function cancelReservation(state, reservationId) {
    const next = normalizeTurnEconomy(state);
    const id = String(reservationId || "");
    const existed = Boolean(next.reservations[id]);
    delete next.reservations[id];
    return { ok: existed, state: next };
  }

  function attacksRemaining(state) {
    const current = projectedTurnEconomy(state);
    if (!current.attackActionActive) return current.maxAttacksPerAttackAction;
    return Math.max(0, current.maxAttacksPerAttackAction - current.attacksUsedInCurrentAttackAction);
  }

  return {
    ECONOMY_KEYS,
    normalizeTurnEconomy,
    createTurnEconomy,
    startTurn,
    endTurn,
    projectedTurnEconomy,
    normalizeActionCosts,
    validateAction,
    reserveAction,
    commitReservation,
    cancelReservation,
    attacksRemaining
  };
});
