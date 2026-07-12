const fs = require("fs/promises");
const path = require("path");

const SAVE_STORE_VERSION = 2;
const SAVE_SLOT_COUNT = 6;
const DEFAULT_ACTIVE_SLOT_ID = "slot-1";

function dataFilePath(userDataPath) {
  return path.join(userDataPath, "character-sheet.json");
}

function backupFilePath(userDataPath) {
  return `${dataFilePath(userDataPath)}.bak`;
}

function slotIdForNumber(slotNumber) {
  return `slot-${slotNumber}`;
}

function createEmptySlot(slotNumber) {
  return {
    id: slotIdForNumber(slotNumber),
    name: "",
    updatedAt: "",
    data: null
  };
}

function createEmptyStore() {
  return {
    version: SAVE_STORE_VERSION,
    activeSlotId: DEFAULT_ACTIVE_SLOT_ID,
    slots: Array.from({ length: SAVE_SLOT_COUNT }, (_item, index) => createEmptySlot(index + 1))
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeFieldKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function characterNameFromData(data) {
  if (!isPlainObject(data)) return "";

  const preferredKeys = ["CharacterName", "Character Name", "charactername"];
  for (const key of preferredKeys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  for (const [key, value] of Object.entries(data)) {
    if (normalizeFieldKey(key) !== "charactername") continue;
    const text = String(value || "").trim();
    if (text) return text;
  }

  return "";
}

function normalizeSlot(rawSlot, slotNumber) {
  const fallback = createEmptySlot(slotNumber);
  const data = isPlainObject(rawSlot?.data) ? rawSlot.data : null;
  const explicitName = typeof rawSlot?.name === "string" ? rawSlot.name.trim() : "";
  return {
    id: fallback.id,
    name: characterNameFromData(data) || explicitName,
    updatedAt: typeof rawSlot?.updatedAt === "string" ? rawSlot.updatedAt : "",
    data
  };
}

function maybeNormalizeSaveStore(raw) {
  if (raw == null) return createEmptyStore();

  if (raw?.version === SAVE_STORE_VERSION && Array.isArray(raw?.slots)) {
    const normalized = createEmptyStore();
    const rawSlots = raw.slots.filter(Boolean);
    const rawSlotsById = new Map(rawSlots.map((slot) => [String(slot.id || "").trim(), slot]));
    normalized.slots = normalized.slots.map((slot, index) => normalizeSlot(
      rawSlotsById.get(slot.id) || rawSlots[index],
      index + 1
    ));

    const activeSlotId = String(raw.activeSlotId || "").trim();
    if (normalized.slots.some((slot) => slot.id === activeSlotId)) normalized.activeSlotId = activeSlotId;
    return normalized;
  }

  if (isPlainObject(raw)) {
    const normalized = createEmptyStore();
    normalized.slots[0] = {
      ...normalized.slots[0],
      name: characterNameFromData(raw) || "Slot 1",
      data: raw
    };
    return normalized;
  }

  return createEmptyStore();
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readRawSaveFile(userDataPath) {
  const primaryPath = dataFilePath(userDataPath);
  try {
    return { value: await readJsonFile(primaryPath), recoveredFromBackup: false };
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    try {
      return { value: await readJsonFile(backupFilePath(userDataPath)), recoveredFromBackup: true };
    } catch (backupError) {
      if (error.code === "ENOENT" && backupError.code === "ENOENT") {
        return { value: null, recoveredFromBackup: false };
      }
      throw error;
    }
  }
}

async function loadSaveStore(userDataPath) {
  const { value: raw, recoveredFromBackup } = await readRawSaveFile(userDataPath);
  const normalized = maybeNormalizeSaveStore(raw);
  if (!recoveredFromBackup && raw != null && JSON.stringify(raw) !== JSON.stringify(normalized)) {
    await saveSaveStore(userDataPath, normalized);
  }
  return normalized;
}

async function copyValidPrimaryToBackup(userDataPath) {
  const primaryPath = dataFilePath(userDataPath);
  try {
    await readJsonFile(primaryPath);
    await fs.copyFile(primaryPath, backupFilePath(userDataPath));
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return;
    throw error;
  }
}

async function writeJsonAtomically(userDataPath, value) {
  const filePath = dataFilePath(userDataPath);
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const contents = JSON.stringify(value, null, 2);
  await fs.mkdir(userDataPath, { recursive: true });
  await copyValidPrimaryToBackup(userDataPath);
  try {
    await fs.writeFile(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(temporaryPath);
    } catch (_cleanupError) {
      // The temporary file may not have been created or may already have been renamed.
    }
    throw error;
  }
  return filePath;
}

async function saveSaveStore(userDataPath, store) {
  const normalized = maybeNormalizeSaveStore(store);
  const filePath = await writeJsonAtomically(userDataPath, normalized);
  return { savedAt: new Date().toISOString(), path: filePath, store: normalized };
}

async function loadSheet(userDataPath) {
  const store = await loadSaveStore(userDataPath);
  return store.slots.find((slot) => slot.id === store.activeSlotId)?.data || null;
}

async function saveSheet(userDataPath, data) {
  const store = await loadSaveStore(userDataPath);
  const activeSlotId = store.activeSlotId || DEFAULT_ACTIVE_SLOT_ID;
  const savedAt = new Date().toISOString();
  store.slots = store.slots.map((slot, index) => {
    if (slot.id !== activeSlotId) return slot;
    return {
      ...createEmptySlot(index + 1),
      id: slot.id,
      name: characterNameFromData(data),
      updatedAt: savedAt,
      data: isPlainObject(data) ? data : null
    };
  });
  return saveSaveStore(userDataPath, store);
}

async function clearActiveSlot(userDataPath, slotId) {
  const store = await loadSaveStore(userDataPath);
  const nextActiveSlotId = store.slots.some((slot) => slot.id === slotId) ? slotId : store.activeSlotId;
  store.activeSlotId = nextActiveSlotId || DEFAULT_ACTIVE_SLOT_ID;
  store.slots = store.slots.map((slot, index) => (
    slot.id === store.activeSlotId ? createEmptySlot(index + 1) : slot
  ));
  return saveSaveStore(userDataPath, store);
}

async function clearSheet(userDataPath) {
  await clearActiveSlot(userDataPath);
  return true;
}

module.exports = {
  backupFilePath,
  clearActiveSlot,
  clearSheet,
  dataFilePath,
  loadSheet,
  loadSaveStore,
  maybeNormalizeSaveStore,
  saveSheet,
  saveSaveStore
};
