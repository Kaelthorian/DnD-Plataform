const assert = require("assert");
const {
  ensureResourceState,
  getResourceUseInfo,
  spendResourceUse,
  getMagicInitiateUseInfo,
  spendMagicInitiateUse,
  resetResourceState
} = require("../../src/engine/resources/resource-state");

assert.deepStrictEqual(ensureResourceState(null), {});
assert.deepStrictEqual(ensureResourceState([]), {});

const state = { "feature|bardic inspiration": "7" };
assert.deepStrictEqual(getResourceUseInfo({
  key: "feature|bardic inspiration",
  max: 5,
  state
}), {
  key: "feature|bardic inspiration",
  max: 5,
  spent: 5,
  remaining: 0
});

const spentOnce = spendResourceUse({
  key: "feat|lucky",
  max: 3,
  state: {}
});
assert.strictEqual(spentOnce.changed, true);
assert.deepStrictEqual(spentOnce.state, { "feat|lucky": 1 });
assert.deepStrictEqual(spentOnce.nextInfo, {
  key: "feat|lucky",
  max: 3,
  spent: 1,
  remaining: 2
});

const spentNone = spendResourceUse({
  key: "feat|lucky",
  max: 3,
  state: { "feat|lucky": 3 }
});
assert.strictEqual(spentNone.changed, false);
assert.deepStrictEqual(spentNone.nextInfo, {
  key: "feat|lucky",
  max: 3,
  spent: 3,
  remaining: 0
});

const magicGrant = {
  key: "magic-initiate|wizard|shield",
  prepared: true,
  level: 1
};

assert.deepStrictEqual(getMagicInitiateUseInfo({
  grant: magicGrant,
  state: {}
}), {
  key: "magic-initiate|wizard|shield",
  max: 1,
  spent: 0,
  remaining: 1,
  grant: magicGrant
});

const spentMagic = spendMagicInitiateUse({
  grant: magicGrant,
  state: {}
});
assert.strictEqual(spentMagic.changed, true);
assert.deepStrictEqual(spentMagic.state, {
  "magic-initiate|wizard|shield": 1
});
assert.strictEqual(spentMagic.nextInfo.remaining, 0);
assert.deepStrictEqual(resetResourceState(), {});
assert.notStrictEqual(resetResourceState(), resetResourceState());
