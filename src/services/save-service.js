const fs = require("fs/promises");
const path = require("path");

function dataFilePath(userDataPath) {
  return path.join(userDataPath, "character-sheet.json");
}

async function loadSheet(userDataPath) {
  try {
    const raw = await fs.readFile(dataFilePath(userDataPath), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function saveSheet(userDataPath, data) {
  await fs.mkdir(userDataPath, { recursive: true });
  const filePath = dataFilePath(userDataPath);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  return { savedAt: new Date().toISOString(), path: filePath };
}

async function clearSheet(userDataPath) {
  try {
    await fs.rm(dataFilePath(userDataPath), { force: true });
  } catch {
    return false;
  }
  return true;
}

module.exports = {
  clearSheet,
  dataFilePath,
  loadSheet,
  saveSheet
};
