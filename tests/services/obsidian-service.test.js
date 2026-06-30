const assert = require("assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const { ObsidianService } = require("../../src/services/obsidian-service");

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnd-obsidian-service-"));
  const userDataPath = path.join(root, "user-data");
  const vaultPath = path.join(root, "vault");
  const outsidePath = path.join(root, "outside.md");
  let service = null;

  try {
    await writeFile(path.join(vaultPath, "Session 1.md"), "# Session One\n\nOpening scene.");
    await writeFile(path.join(vaultPath, "Nested", "NPC.md"), "# The Smith\n\nA useful contact.");
    await writeFile(path.join(vaultPath, ".obsidian", "Hidden.md"), "# Hidden");
    await writeFile(path.join(vaultPath, ".git", "Git.md"), "# Git");
    await writeFile(path.join(vaultPath, "node_modules", "Package.md"), "# Package");
    await writeFile(path.join(vaultPath, ".trash", "Deleted.md"), "# Deleted");
    await writeFile(path.join(vaultPath, "image.png"), "not really an image");
    await writeFile(outsidePath, "# Outside");

    service = new ObsidianService({ userDataPath });
    await service.setVaultPath(vaultPath);

    const vault = await service.getVault();
    assert.strictEqual(vault.configured, true);
    assert.strictEqual(vault.exists, true);
    assert.strictEqual(vault.name, "vault");

    const notes = await service.listNotes();
    assert.deepStrictEqual(notes.map((note) => note.relativePath).sort(), [
      "Nested/NPC.md",
      "Session 1.md"
    ]);
    assert.strictEqual(notes.find((note) => note.relativePath === "Session 1.md").title, "Session One");
    assert.strictEqual(notes.find((note) => note.relativePath === "Nested/NPC.md").excerpt, "The Smith A useful contact.");

    const searched = await service.listNotes("smith");
    assert.deepStrictEqual(searched.map((note) => note.relativePath), ["Nested/NPC.md"]);

    const note = await service.readNote("Nested/NPC.md");
    assert.strictEqual(note.title, "The Smith");
    assert.ok(note.markdown.includes("useful contact"));

    const written = await service.writeNote("Nested/NPC.md", "# Updated Smith\n\nChanged in DM Screen.");
    assert.strictEqual(written.title, "Updated Smith");
    assert.strictEqual(written.markdown, "# Updated Smith\n\nChanged in DM Screen.");
    assert.strictEqual((await fs.readFile(path.join(vaultPath, "Nested", "NPC.md"), "utf8")), "# Updated Smith\n\nChanged in DM Screen.");

    await assert.rejects(() => service.readNote("../outside.md"), /Path escapes/);
    await assert.rejects(() => service.writeNote("../outside.md", "# Nope"), /Path escapes/);
    await assert.rejects(() => service.getAssetUrl("../outside.md"), /Path escapes/);
    await assert.rejects(() => service.getAssetUrl("Session 1.md"), /File type is not allowed/);

    const assetUrl = await service.getAssetUrl("image.png");
    assert.ok(assetUrl.startsWith("file:"));
  } finally {
    service?.closeWatchers?.();
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
