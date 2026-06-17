const handlers = new Map();

function normalizeFeatId(id) {
  return String(id || "").trim().toLowerCase();
}

function validateHandler(id, handler) {
  if (!id) throw new Error("Feat handler id is required");
  if (!handler || typeof handler !== "object") throw new Error(`Feat handler '${id}' must be an object`);
  if (handler.apply != null && typeof handler.apply !== "function") {
    throw new Error(`Feat handler '${id}' apply must be a function`);
  }
}

function registerFeatHandler(id, handler) {
  const key = normalizeFeatId(id);
  validateHandler(key, handler);
  if (handlers.has(key)) throw new Error(`Feat handler '${key}' is already registered`);
  handlers.set(key, Object.freeze({ id: key, ...handler }));
  return handlers.get(key);
}

function getFeatHandler(id) {
  return handlers.get(normalizeFeatId(id)) || null;
}

function listFeatHandlers() {
  return [...handlers.values()];
}

function clearFeatHandlersForTests() {
  handlers.clear();
}

module.exports = {
  clearFeatHandlersForTests,
  getFeatHandler,
  listFeatHandlers,
  normalizeFeatId,
  registerFeatHandler
};
