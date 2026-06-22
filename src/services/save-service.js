const fs = require("fs/promises");
const path = require("path");

const SAVE_STORE_VERSION = 2;
const SAVE_SLOT_COUNT = 6;
const DEFAULT_ACTIVE_SLOT_ID = "slot-1";

function dataFilePath(userDataPath) {
  return path.join(userDataPath, "character-sheet.json");
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

async function readRawSaveFile(userDataPath) {
  try {
    const raw = await fs.readFile(dataFilePath(userDataPath), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function loadSaveStore(userDataPath) {
  const raw = await readRawSaveFile(userDataPath);
  const normalized = maybeNormalizeSaveStore(raw);
  if (raw != null && JSON.stringify(raw) !== JSON.stringify(normalized)) {
    await saveSaveStore(userDataPath, normalized);
  }
  return normalized;
}

async function saveSaveStore(userDataPath, store) {
  const normalized = maybeNormalizeSaveStore(store);
  await fs.mkdir(userDataPath, { recursive: true });
  const filePath = dataFilePath(userDataPath);
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf8");
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
  clearActiveSlot,
  clearSheet,
  dataFilePath,
  loadSheet,
  loadSaveStore,
  maybeNormalizeSaveStore,
  saveSheet,
  saveSaveStore
};
