const assert = require("assert");
const {
  clearFeatHandlersForTests,
  getFeatHandler,
  listFeatHandlers,
  normalizeFeatId,
  registerFeatHandler
} = require("../../src/engine/feat-registry");

clearFeatHandlersForTests();

assert.strictEqual(normalizeFeatId(" Alert "), "alert");
assert.strictEqual(getFeatHandler("missing"), null);

const handler = registerFeatHandler("Alert", {
  apply: () => ({ changed: false })
});

assert.strictEqual(handler.id, "alert");
assert.strictEqual(getFeatHandler("ALERT"), handler);
assert.deepStrictEqual(listFeatHandlers(), [handler]);
assert.throws(() => registerFeatHandler("alert", {}), /already registered/);
assert.throws(() => registerFeatHandler("", {}), /id is required/);
assert.throws(() => registerFeatHandler("bad", { apply: true }), /apply must be a function/);

clearFeatHandlersForTests();
