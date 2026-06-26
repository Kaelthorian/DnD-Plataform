const assert = require("assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const { runDiagnostics } = require("../../scripts/diagnose-backgrounds");
const saveService = require("../../src/services/save-service");

(async () => {
  const diagnostics = runDiagnostics();
  assert.strictEqual(diagnostics.errors.length, 0, diagnostics.errors.join("\n"));
  assert.strictEqual(diagnostics.localCount, 245, "Background source count changed; audit the selector list before accepting.");
  assert.strictEqual(diagnostics.selectorCount, diagnostics.localCount, "Every local background should appear in the selector.");

  const gateWarden = diagnostics.backgrounds.find((background) => background.name === "Gate Warden");
  const gateHyphenWarden = diagnostics.backgrounds.find((background) => background.name === "Gate-Warden");
  assert(gateWarden, "Gate Warden should be available.");
  assert(gateHyphenWarden, "Gate-Warden should be available.");
  assert.strictEqual(gateWarden.detailName, "Gate Warden", "Gate Warden should use its structured SatO detail.");
  assert.strictEqual(gateHyphenWarden.hasStructuredDetail, false, "Gate-Warden should not inherit Gate Warden detail.");

  const acolyte = diagnostics.backgrounds.find((background) => background.name === "Acolyte");
  assert(acolyte, "Acolyte should be available.");
  assert(acolyte.abilityScoreChoices.includes("Intelligence"), "Acolyte should expose ability-score choices.");
  assert(acolyte.fixedSkills.some((skill) => skill.toLowerCase() === "insight"), "Acolyte should grant Insight.");
  assert(acolyte.fixedSkills.some((skill) => skill.toLowerCase() === "religion"), "Acolyte should grant Religion.");
  assert(acolyte.featRefs.some((feat) => feat.name === "Magic Initiate"), "Acolyte should resolve Magic Initiate.");
  assert(acolyte.equipmentText, "Acolyte should expose equipment text.");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dnd-background-save-"));
  const sheet = {
    CharacterName: "Background Test",
    Background: "Acolyte",
    __sheetMeta: {
      choices: {
        "background:acolyte:ability scores:int wis cha": { INT: 2, WIS: 1 }
      },
      generatedEquipmentSources: {
        "background:equipment": "Calligrapher's Supplies, Book, Robe"
      }
    }
  };
  await saveService.saveSheet(tempDir, sheet);
  const loaded = await saveService.loadSheet(tempDir);
  assert.deepStrictEqual(loaded, sheet, "Background data and sheet metadata should persist in the active save slot.");

  const store = await saveService.loadSaveStore(tempDir);
  store.activeSlotId = "slot-2";
  store.slots[1] = {
    id: "slot-2",
    name: "Other",
    updatedAt: new Date().toISOString(),
    data: { CharacterName: "Other", Background: "Gate-Warden", __sheetMeta: { choices: {} } }
  };
  await saveService.saveSaveStore(tempDir, store);
  const switched = await saveService.loadSaveStore(tempDir);
  assert.strictEqual(switched.activeSlotId, "slot-2", "Active save slot should survive store save/load.");
  assert.strictEqual(switched.slots[0].data.Background, "Acolyte", "Switching slots should not corrupt slot 1 background.");
  assert.strictEqual(switched.slots[1].data.Background, "Gate-Warden", "Switching slots should preserve slot 2 background.");

  await saveService.clearActiveSlot(tempDir, "slot-2");
  const cleared = await saveService.loadSaveStore(tempDir);
  assert.strictEqual(cleared.activeSlotId, "slot-2", "Clearing should keep the requested slot active.");
  assert.strictEqual(cleared.slots[1].data, null, "Clearing a slot should remove background sheet data.");
  assert.strictEqual(cleared.slots[0].data.Background, "Acolyte", "Clearing slot 2 should not touch slot 1 background.");

  console.log("backgrounds.test.js passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
