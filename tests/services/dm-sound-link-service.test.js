const assert = require("assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const soundLinkService = require("../../src/services/dm-sound-link-service");

async function withTemporaryDirectory(callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "dnd-sound-links-"));
  try {
    await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

(async () => {
  await withTemporaryDirectory(async (directory) => {
    assert.deepStrictEqual(await soundLinkService.loadSoundLinks(directory), []);
    const saved = await soundLinkService.saveSoundLinks(directory, [
      {
        id: "sound-youtube-1",
        name: "Forest ambience",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ"
      },
      {
        id: "bad",
        name: "Ignored",
        url: "https://example.com/video",
        videoId: "invalid"
      }
    ]);
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].kind, "youtube");
    assert.strictEqual(saved[0].name, "Forest ambience");
    assert.strictEqual(saved[0].videoId, "dQw4w9WgXcQ");
    assert.deepStrictEqual(await soundLinkService.loadSoundLinks(directory), saved);
  });
  console.log("dm-sound-link-service tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
