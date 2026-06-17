const assert = require("assert");
const {
  clearSpellHandlersForTests,
  getSpellHandler,
  listSpellHandlers,
  normalizeSpellId,
  registerSpellHandler
} = require("../../src/engine/spell-registry");

clearSpellHandlersForTests();

assert.strictEqual(normalizeSpellId(" Magic Missile "), "magic missile");
assert.strictEqual(getSpellHandler("missing"), null);

const handler = registerSpellHandler("Magic Missile", {
  apply: () => ({ changed: false })
});

assert.strictEqual(handler.id, "magic missile");
assert.strictEqual(getSpellHandler("MAGIC MISSILE"), handler);
assert.deepStrictEqual(listSpellHandlers(), [handler]);
assert.throws(() => registerSpellHandler("magic missile", {}), /already registered/);
assert.throws(() => registerSpellHandler("", {}), /id is required/);
assert.throws(() => registerSpellHandler("bad", { apply: true }), /apply must be a function/);

clearSpellHandlersForTests();
