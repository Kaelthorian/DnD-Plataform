(function createVttMovementModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndVttMovementEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function vttMovementFactory() {
  "use strict";

  const MASTER_TOKEN_SIZE = 56;
  const FEET_PER_MASTER_TOKEN = 5;

  function finiteNonNegative(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }

  function parseSpeedValue(value) {
    if (Number.isFinite(Number(value))) return finiteNonNegative(value);
    if (!value || typeof value !== "string") return null;
    const match = value.match(/(?:walk(?:ing)?\s*)?(\d+(?:\.\d+)?)\s*(?:ft\.?|feet|foot)?/i);
    return match ? finiteNonNegative(match[1]) : null;
  }

  function actorSpeedFeet(actor, fallback = 30) {
    const source = actor && typeof actor === "object" ? actor : {};
    const speedCandidates = [
      source.liveSheetData?.Speed,
      source.liveSheetData?.speed,
      source.character?.speed,
      source.character?.rawData?.Speed,
      source.character?.rawData?.speed,
      source.monsterCustom?.speed,
      source.monster?.speed,
      source.speed
    ];

    for (const candidate of speedCandidates) {
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        const walkingSpeed = parseSpeedValue(candidate.walk ?? candidate.walking);
        if (walkingSpeed !== null) return walkingSpeed;
        for (const value of Object.values(candidate)) {
          const parsed = parseSpeedValue(value);
          if (parsed !== null) return parsed;
        }
        continue;
      }
      const parsed = parseSpeedValue(candidate);
      if (parsed !== null) return parsed;
    }
    return finiteNonNegative(fallback, 30);
  }

  function mapUnitsFromFeet(feet, masterTokenSize = MASTER_TOKEN_SIZE) {
    return finiteNonNegative(feet) * finiteNonNegative(masterTokenSize, MASTER_TOKEN_SIZE) / FEET_PER_MASTER_TOKEN;
  }

  function feetFromMapUnits(distance, masterTokenSize = MASTER_TOKEN_SIZE) {
    const scale = finiteNonNegative(masterTokenSize, MASTER_TOKEN_SIZE) || MASTER_TOKEN_SIZE;
    return finiteNonNegative(distance) / scale * FEET_PER_MASTER_TOKEN;
  }

  function roundFeet(feet) {
    return Math.round(finiteNonNegative(feet) * 10) / 10;
  }

  function formatFeet(feet) {
    const rounded = roundFeet(feet);
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function shapeDimensionsFeet(width, height, masterTokenSize = MASTER_TOKEN_SIZE) {
    return {
      width: roundFeet(feetFromMapUnits(width, masterTokenSize)),
      height: roundFeet(feetFromMapUnits(height, masterTokenSize))
    };
  }

  function resolveMovement({
    startX = 0,
    startY = 0,
    tokenSize = MASTER_TOKEN_SIZE,
    targetCenterX = 0,
    targetCenterY = 0,
    speedFeet = 30,
    usedFeet = 0,
    masterTokenSize = MASTER_TOKEN_SIZE,
    minX = 0,
    minY = 0,
    maxX = Number.POSITIVE_INFINITY,
    maxY = Number.POSITIVE_INFINITY
  } = {}) {
    const size = finiteNonNegative(tokenSize, masterTokenSize);
    const startLeft = Number(startX) || 0;
    const startTop = Number(startY) || 0;
    const startCenterX = startLeft + size / 2;
    const startCenterY = startTop + size / 2;
    const desiredCenterX = Number(targetCenterX) || 0;
    const desiredCenterY = Number(targetCenterY) || 0;
    const deltaX = desiredCenterX - startCenterX;
    const deltaY = desiredCenterY - startCenterY;
    const requestedDistance = Math.hypot(deltaX, deltaY);
    const safeSpeed = finiteNonNegative(speedFeet, 30);
    const safeUsed = Math.min(safeSpeed, finiteNonNegative(usedFeet));
    const remainingFeetBefore = Math.max(0, safeSpeed - safeUsed);
    const maximumDistance = mapUnitsFromFeet(remainingFeetBefore, masterTokenSize);
    const traveledDistance = Math.min(requestedDistance, maximumDistance);
    const ratio = requestedDistance > 0 ? traveledDistance / requestedDistance : 0;
    const unclampedX = startLeft + deltaX * ratio;
    const unclampedY = startTop + deltaY * ratio;
    const x = Math.min(Number(maxX), Math.max(Number(minX) || 0, unclampedX));
    const y = Math.min(Number(maxY), Math.max(Number(minY) || 0, unclampedY));
    const actualDistance = Math.hypot(x - startLeft, y - startTop);
    const distanceFeet = roundFeet(feetFromMapUnits(actualDistance, masterTokenSize));
    const nextUsedFeet = Math.min(safeSpeed, roundFeet(safeUsed + distanceFeet));

    return {
      x,
      y,
      requestedFeet: roundFeet(feetFromMapUnits(requestedDistance, masterTokenSize)),
      distanceFeet,
      speedFeet: safeSpeed,
      usedFeet: nextUsedFeet,
      remainingFeet: roundFeet(Math.max(0, safeSpeed - nextUsedFeet)),
      limited: requestedDistance > maximumDistance + 0.001
    };
  }

  return Object.freeze({
    MASTER_TOKEN_SIZE,
    FEET_PER_MASTER_TOKEN,
    actorSpeedFeet,
    mapUnitsFromFeet,
    feetFromMapUnits,
    roundFeet,
    formatFeet,
    shapeDimensionsFeet,
    resolveMovement
  });
});
