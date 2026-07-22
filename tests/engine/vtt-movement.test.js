const assert = require("assert");
const movement = require("../../src/engine/combat/vtt-movement.js");

assert.equal(movement.MASTER_TOKEN_SIZE, 56);
assert.equal(movement.feetFromMapUnits(56), 5);
assert.equal(movement.mapUnitsFromFeet(30), 336);
assert.deepEqual(movement.shapeDimensionsFeet(112, 56), { width: 10, height: 5 });

assert.equal(movement.actorSpeedFeet({ liveSheetData: { Speed: "35" } }), 35);
assert.equal(movement.actorSpeedFeet({ monster: { speed: { walk: 25, fly: 60 } } }), 25);
assert.equal(movement.actorSpeedFeet({ monsterCustom: { speed: "40 ft., swim 30 ft." } }), 40);

const fullMove = movement.resolveMovement({
  startX: 0,
  startY: 0,
  tokenSize: 56,
  targetCenterX: 140,
  targetCenterY: 28,
  speedFeet: 30
});
assert.equal(fullMove.x, 112);
assert.equal(fullMove.distanceFeet, 10);
assert.equal(fullMove.remainingFeet, 20);
assert.equal(fullMove.limited, false);

const limitedMove = movement.resolveMovement({
  startX: 0,
  startY: 0,
  tokenSize: 56,
  targetCenterX: 700,
  targetCenterY: 28,
  speedFeet: 30,
  usedFeet: 20
});
assert.equal(limitedMove.x, 112);
assert.equal(limitedMove.distanceFeet, 10);
assert.equal(limitedMove.remainingFeet, 0);
assert.equal(limitedMove.limited, true);

const diagonalMove = movement.resolveMovement({
  startX: 0,
  startY: 0,
  tokenSize: 56,
  targetCenterX: 364,
  targetCenterY: 364,
  speedFeet: 30
});
assert.ok(Math.abs(Math.hypot(diagonalMove.x, diagonalMove.y) - 336) < 0.01);
assert.equal(diagonalMove.distanceFeet, 30);

console.log("VTT movement scale, speed parsing, and turn limits verified.");
