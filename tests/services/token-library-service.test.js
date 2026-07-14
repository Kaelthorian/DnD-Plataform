const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  decodeTokenImageDataUrl,
  sanitizeTokenImageName,
  saveTokenLibraryImage
} = require("../../src/services/token-library-service");

const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1jwAAAABJRU5ErkJggg==";

assert.strictEqual(sanitizeTokenImageName("  Ancient / Dragon.png  "), "Ancient - Dragon");
assert.throws(() => decodeTokenImageDataUrl("data:text/plain;base64,SGVsbG8="), /no está permitido/);

const directoryPath = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-token-library-"));
try {
  const first = saveTokenLibraryImage({ directoryPath, name: "Goblin", dataUrl: TINY_PNG });
  const second = saveTokenLibraryImage({ directoryPath, name: "Goblin", dataUrl: TINY_PNG });
  assert.strictEqual(first.fileName, "Goblin.png");
  assert.strictEqual(second.fileName, "Goblin (2).png");
  assert.strictEqual(fs.readFileSync(first.filePath).length > 0, true);
} finally {
  fs.rmSync(directoryPath, { recursive: true, force: true });
}

console.log("token-library-service.test.js: ok");
