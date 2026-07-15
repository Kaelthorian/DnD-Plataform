const assert = require("assert");
const fs = require("fs/promises");
const path = require("path");

const saveService = require("../../src/services/save-service");

const fixtureRoot = path.join(__dirname, "..", "..", ".test-tmp", "save-service");

async function resetFixture() {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
  await fs.mkdir(fixtureRoot, { recursive: true });
}

(async () => {
  await resetFixture();
  try {
    const legacySheet = { CharacterName: "Arannis", HPCurrent: "7" };
    await fs.writeFile(saveService.dataFilePath(fixtureRoot), JSON.stringify(legacySheet), "utf8");

    const migrated = await saveService.loadSaveStore(fixtureRoot);
    assert.strictEqual(migrated.version, 2);
    assert.strictEqual(migrated.slots[0].name, "Arannis");
    assert.deepStrictEqual(migrated.slots[0].data, legacySheet);

    const migrationBackup = JSON.parse(await fs.readFile(saveService.backupFilePath(fixtureRoot), "utf8"));
    assert.deepStrictEqual(migrationBackup, legacySheet);

    migrated.slots[0].data.HPCurrent = "9";
    await saveService.saveSaveStore(fixtureRoot, migrated);
    const loaded = await saveService.loadSaveStore(fixtureRoot);
    assert.strictEqual(loaded.slots[0].data.HPCurrent, "9");

    loaded.slots[0].data.HD = "2";
    loaded.slots[0].data.__sheetMeta = { exhaustionLevel: 2, featureUses: { "slot-1": 1 } };
    loaded.slots[1].data = { CharacterName: "Borin", HD: "5", __sheetMeta: { exhaustionLevel: 0, featureUses: {} } };
    await saveService.saveSaveStore(fixtureRoot, loaded);
    const isolatedSlots = await saveService.loadSaveStore(fixtureRoot);
    assert.strictEqual(isolatedSlots.slots[0].data.HD, "2");
    assert.strictEqual(isolatedSlots.slots[0].data.__sheetMeta.exhaustionLevel, 2);
    assert.strictEqual(isolatedSlots.slots[1].data.HD, "5");
    assert.strictEqual(isolatedSlots.slots[1].data.__sheetMeta.exhaustionLevel, 0);
    assert.notStrictEqual(isolatedSlots.slots[0].data.__sheetMeta, isolatedSlots.slots[1].data.__sheetMeta);

    await fs.writeFile(saveService.dataFilePath(fixtureRoot), "{invalid json", "utf8");
    const recovered = await saveService.loadSaveStore(fixtureRoot);
    assert.strictEqual(recovered.slots[0].data.HPCurrent, "9");

    const files = await fs.readdir(fixtureRoot);
    assert.strictEqual(files.some((fileName) => fileName.endsWith(".tmp")), false);
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
