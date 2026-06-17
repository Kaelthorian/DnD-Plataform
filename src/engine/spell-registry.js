const handlers = new Map();

function normalizeSpellId(id) {
  return String(id || "").trim().toLowerCase();
}

function validateHandler(id, handler) {
  if (!id) throw new Error("Spell handler id is required");
  if (!handler || typeof handler !== "object") throw new Error(`Spell handler '${id}' must be an object`);
  if (handler.apply != null && typeof handler.apply !== "function") {
    throw new Error(`Spell handler '${id}' apply must be a function`);
  }
}

function registerSpellHandler(id, handler) {
  const key = normalizeSpellId(id);
  validateHandler(key, handler);
  if (handlers.has(key)) throw new Error(`Spell handler '${key}' is already registered`);
  handlers.set(key, Object.freeze({ id: key, ...handler }));
  return handlers.get(key);
}

function getSpellHandler(id) {
  return handlers.get(normalizeSpellId(id)) || null;
}

function listSpellHandlers() {
  return [...handlers.values()];
}

function clearSpellHandlersForTests() {
  handlers.clear();
}

module.exports = {
  clearSpellHandlersForTests,
  getSpellHandler,
  listSpellHandlers,
  normalizeSpellId,
  registerSpellHandler
};
